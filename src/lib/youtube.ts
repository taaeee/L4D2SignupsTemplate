export interface YoutubeChannelInfo {
  valid: boolean;
  channelId?: string;
  title: string;
  handle: string;
  url: string;
  avatar?: string | null;
}

export function formatYoutubeChannel(input?: string | null): string | null {
  if (!input) return null;
  const val = input.trim();
  if (!val) return null;
  if (val.startsWith("http://") || val.startsWith("https://")) {
    return val;
  }
  if (val.startsWith("@")) {
    return `https://youtube.com/${val}`;
  }
  if (val.startsWith("UC") && val.length >= 20) {
    return `https://youtube.com/channel/${val}`;
  }
  return `https://youtube.com/@${val}`;
}

export async function validateAndResolveYoutubeChannel(input: string): Promise<YoutubeChannelInfo | null> {
  if (!input || !input.trim()) return null;
  const raw = input.trim();
  const apiKey = process.env.YOUTUBE_API_KEY || process.env.GOOGLE_API_KEY;

  // Extract handle or channelId from URL if URL was provided
  let identifier = raw;
  if (raw.includes("youtube.com/")) {
    const parts = raw.split("youtube.com/")[1].split("/")[0].split("?")[0];
    identifier = parts;
  }

  const formattedUrl = formatYoutubeChannel(identifier) || raw;
  const defaultHandle = identifier.startsWith("@") ? identifier : `@${identifier}`;

  if (!apiKey) {
    // If no server API key configured, return cleanly formatted channel
    return {
      valid: true,
      title: identifier.replace(/^@/, ""),
      handle: defaultHandle,
      url: formattedUrl,
    };
  }

  try {
    let url = "";
    if (identifier.startsWith("UC") && identifier.length >= 20) {
      url = `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${encodeURIComponent(identifier)}&key=${apiKey}`;
    } else {
      const handleToQuery = identifier.startsWith("@") ? identifier : `@${identifier}`;
      url = `https://www.googleapis.com/youtube/v3/channels?part=snippet&forHandle=${encodeURIComponent(handleToQuery)}&key=${apiKey}`;
    }

    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (res.ok) {
      const data = await res.json();
      if (data.items && data.items.length > 0) {
        const item = data.items[0];
        const snippet = item.snippet || {};
        const title = snippet.title || identifier;
        const handle = snippet.customUrl || defaultHandle;
        const channelUrl = snippet.customUrl ? `https://youtube.com/${snippet.customUrl.startsWith("@") ? snippet.customUrl : "@" + snippet.customUrl}` : `https://youtube.com/channel/${item.id}`;

        return {
          valid: true,
          channelId: item.id,
          title,
          handle: handle.startsWith("@") ? handle : `@${handle}`,
          url: channelUrl,
          avatar: snippet.thumbnails?.default?.url || null,
        };
      }
    }
  } catch (e) {
    console.warn("YouTube public API query warning:", e);
  }

  return {
    valid: true,
    title: identifier.replace(/^@/, ""),
    handle: defaultHandle,
    url: formattedUrl,
  };
}
