let cachedKickAppToken: { token: string; expiresAt: number } | null = null;
const cachedKickUsers: Map<string, { data: any; expiresAt: number }> = new Map();

export async function getKickAppToken(): Promise<string | null> {
  if (cachedKickAppToken && cachedKickAppToken.expiresAt > Date.now() + 60000) {
    return cachedKickAppToken.token;
  }

  const clientId = process.env.KICK_CLIENT_ID;
  const clientSecret = process.env.KICK_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);

    const res = await fetch("https://id.kick.com/oauth/token", {
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
      cachedKickAppToken = {
        token: data.access_token,
        expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
      };
      return data.access_token;
    }
  } catch (e) {
    console.error("Error getting Kick app token:", e);
  }
  return null;
}

export async function getKickUserById(kickUserId: string) {
  if (!kickUserId) return null;

  // Check cache (15 minutes TTL)
  const cached = cachedKickUsers.get(kickUserId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const token = await getKickAppToken();
  if (!token) return null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);

    const res = await fetch(`https://api.kick.com/public/v1/users?id=${kickUserId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) return null;
    const data = await res.json();
    if (data.data && data.data.length > 0) {
      const user = data.data[0]; // { user_id, name, email, profile_picture }
      cachedKickUsers.set(kickUserId, {
        data: user,
        expiresAt: Date.now() + 1000 * 60 * 15, // 15 minutes
      });
      return user;
    }
  } catch (e) {
    console.error("Error fetching Kick user by id:", e);
  }
  return null;
}
