let cachedAppToken: { token: string; expiresAt: number } | null = null;
const cachedTwitchUsers: Map<string, { data: any; expiresAt: number }> = new Map();

export async function getTwitchAppToken(): Promise<string | null> {
  if (cachedAppToken && cachedAppToken.expiresAt > Date.now() + 60000) {
    return cachedAppToken.token;
  }

  const clientId = process.env.TWITCH_CLIENT_ID;
  const clientSecret = process.env.TWITCH_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);

    const res = await fetch("https://id.twitch.tv/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "client_credentials",
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) return null;
    const data = await res.json();
    if (data.access_token) {
      cachedAppToken = {
        token: data.access_token,
        expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
      };
      return data.access_token;
    }
  } catch (e) {
    console.error("Error getting Twitch app token:", e);
  }
  return null;
}

export async function getTwitchUserById(twitchUserId: string) {
  if (!twitchUserId) return null;

  // Check cache (15 minutes TTL)
  const cached = cachedTwitchUsers.get(twitchUserId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const token = await getTwitchAppToken();
  const clientId = process.env.TWITCH_CLIENT_ID;
  if (!token || !clientId) return null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);

    const res = await fetch(`https://api.twitch.tv/helix/users?id=${twitchUserId}`, {
      headers: {
        "Client-ID": clientId,
        "Authorization": `Bearer ${token}`,
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) return null;
    const data = await res.json();
    if (data.data && data.data.length > 0) {
      const user = data.data[0]; // { id, login, display_name, profile_image_url, description }
      cachedTwitchUsers.set(twitchUserId, {
        data: user,
        expiresAt: Date.now() + 1000 * 60 * 15, // 15 minutes
      });
      return user;
    }
  } catch (e) {
    console.error("Error fetching Twitch user by id:", e);
  }
  return null;
}
