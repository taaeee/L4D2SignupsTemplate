/**
 * Centralized Match & Platform Utilities
 */

export const extractPlatformUsername = (channelOrUrl?: string | null): string => {
  if (!channelOrUrl) return "";
  let clean = channelOrUrl.trim();
  clean = clean.replace(/^https?:\/\//i, "");
  clean = clean.replace(/^www\./i, "");
  clean = clean.replace(/^(twitch\.tv|kick\.com|youtube\.com|youtu\.be)\//i, "");
  clean = clean.replace(/^(c\/|user\/|channel\/)/i, "");
  clean = clean.split("/")[0].split("?")[0];
  return clean.replace(/^@/, "") || channelOrUrl;
};

export const parseTeamData = (team: any) => {
  let logo = team?.logo_url || null;
  let tag = "";
  let countries: any[] = [];
  let answers: any = {};

  if (team?.logo_url && typeof team.logo_url === "string" && team.logo_url.startsWith("{")) {
    try {
      const parsed = JSON.parse(team.logo_url);
      logo = parsed.url || parsed.logo || null;
      tag = parsed.tag || "";
      countries = Array.isArray(parsed.countries) ? parsed.countries : [];
      answers = parsed.answers || {};
    } catch {}
  }

  return { logo, tag, countries, answers };
};

export const parsePlayerRoleTitle = (roleVal: any): string => {
  if (!roleVal) return "Miembro";
  if (typeof roleVal === "string" && roleVal.startsWith("{")) {
    try {
      const parsed = JSON.parse(roleVal);
      return parsed.title || "Miembro";
    } catch {
      return roleVal;
    }
  }
  return String(roleVal);
};

export const detectPlatform = (url?: string | null): "twitch" | "kick" | "youtube" | "generic" => {
  if (!url) return "generic";
  const lower = url.toLowerCase();
  if (lower.includes("twitch.tv") || lower.includes("twitch")) return "twitch";
  if (lower.includes("kick.com") || lower.includes("kick")) return "kick";
  if (lower.includes("youtube.com") || lower.includes("youtu.be")) return "youtube";
  return "generic";
};

export const formatYoutubeUrl = (channelOrUrl?: string | null) => {
  if (!channelOrUrl) return "https://youtube.com";
  const trimmed = channelOrUrl.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  if (trimmed.startsWith("@")) {
    return `https://www.youtube.com/${trimmed}`;
  }
  if (trimmed.startsWith("UC") && trimmed.length >= 20) {
    return `https://www.youtube.com/channel/${trimmed}`;
  }
  return `https://www.youtube.com/@${trimmed}`;
};

export const formatYoutubeEmbedUrl = (channelOrUrl?: string | null) => {
  if (!channelOrUrl) return "";
  const trimmed = channelOrUrl.trim();
  if (trimmed.includes("/embed/")) return trimmed;
  const videoMatch = trimmed.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|live\/))([\w-]{11})/);
  if (videoMatch && videoMatch[1]) {
    return `https://www.youtube.com/embed/${videoMatch[1]}?autoplay=1`;
  }
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return `https://www.youtube.com/embed/${trimmed}?autoplay=1`;
  }
  return `https://www.youtube.com/embed/live_stream?channel=${encodeURIComponent(trimmed)}&autoplay=1`;
};

export const resolveStreamInfo = (streamUrl?: string | null, casterObj?: any) => {
  const raw = (streamUrl || "").trim();
  const twitchChan = (casterObj?.twitch_channel || "").trim();
  const kickChan = (casterObj?.kick_channel || "").trim();
  const ytChan = (casterObj?.youtube_channel || "").trim();
  const primaryPlatform = casterObj?.primary_platform || "";

  let platform: "twitch" | "kick" | "youtube" = "twitch";
  let channel = "";
  let directUrl = "";

  const lowerRaw = raw.toLowerCase();

  if (lowerRaw.includes("kick.com") || lowerRaw.startsWith("kick:")) {
    platform = "kick";
    channel = raw.replace(/^https?:\/\/(www\.)?kick\.com\//i, "").replace(/^kick:/i, "").replace(/^\//, "").split("/")[0] || "";
    directUrl = `https://kick.com/${channel}`;
  } else if (lowerRaw.includes("youtube.com") || lowerRaw.includes("youtu.be")) {
    platform = "youtube";
    channel = raw;
    directUrl = formatYoutubeUrl(raw);
  } else if (lowerRaw.includes("twitch.tv") || lowerRaw.startsWith("twitch:")) {
    platform = "twitch";
    channel = raw.replace(/^https?:\/\/(www\.)?twitch\.tv\//i, "").replace(/^twitch:/i, "").replace(/^\//, "").split("/")[0] || "";
    directUrl = `https://twitch.tv/${channel}`;
  } else if (raw) {
    if (primaryPlatform === "kick" || (kickChan && raw.toLowerCase() === kickChan.toLowerCase())) {
      platform = "kick";
      channel = kickChan ? kickChan.replace(/^https?:\/\/(www\.)?kick\.com\//i, "").trim() : raw;
      directUrl = `https://kick.com/${channel}`;
    } else if (primaryPlatform === "youtube" || (ytChan && raw.toLowerCase() === ytChan.toLowerCase())) {
      platform = "youtube";
      channel = ytChan || raw;
      directUrl = formatYoutubeUrl(channel);
    } else if (kickChan && !twitchChan) {
      platform = "kick";
      channel = kickChan.replace(/^https?:\/\/(www\.)?kick\.com\//i, "").trim();
      directUrl = `https://kick.com/${channel}`;
    } else if (ytChan && !twitchChan && !kickChan) {
      platform = "youtube";
      channel = ytChan;
      directUrl = formatYoutubeUrl(channel);
    } else {
      channel = raw.replace(/^https?:\/\/(www\.)?twitch\.tv\//i, "").replace(/^@/, "").trim();
      directUrl = `https://twitch.tv/${channel}`;
      platform = "twitch";
    }
  } else {
    if (primaryPlatform === "kick" && kickChan) {
      platform = "kick";
      channel = kickChan.replace(/^https?:\/\/(www\.)?kick\.com\//i, "").trim();
      directUrl = `https://kick.com/${channel}`;
    } else if (primaryPlatform === "youtube" && ytChan) {
      platform = "youtube";
      channel = ytChan;
      directUrl = formatYoutubeUrl(ytChan);
    } else if (twitchChan) {
      platform = "twitch";
      channel = twitchChan.replace(/^https?:\/\/(www\.)?twitch\.tv\//i, "").trim();
      directUrl = `https://twitch.tv/${channel}`;
    } else if (kickChan) {
      platform = "kick";
      channel = kickChan.replace(/^https?:\/\/(www\.)?kick\.com\//i, "").trim();
      directUrl = `https://kick.com/${channel}`;
    } else if (ytChan) {
      platform = "youtube";
      channel = ytChan;
      directUrl = formatYoutubeUrl(ytChan);
    }
  }

  return {
    platform,
    channel,
    directUrl,
    isKick: platform === "kick",
    isYoutube: platform === "youtube",
    isTwitch: platform === "twitch",
    platformName: platform === "kick" ? "Kick" : platform === "youtube" ? "YouTube" : "Twitch",
    brandColor: platform === "kick" ? "#53FC18" : platform === "youtube" ? "#EF4444" : "#9146FF",
  };
};

/**
 * Standardized status calculation for matches across client and server.
 * Ensures 0-0 walkover/forfeit matches with a declared winner_id and completed status
 * are properly recognized as "completed".
 */
export const getMatchStatus = (m: any): "live" | "completed" | "upcoming" => {
  if (m.status === "in_progress" || m.is_live) return "live";

  const hasScore =
    m.score1 !== null &&
    m.score1 !== undefined &&
    m.score2 !== null &&
    m.score2 !== undefined &&
    (m.score1 > 0 || m.score2 > 0);

  const isCompleted =
    hasScore ||
    m.is_completed === true ||
    (m.status === "completed" && Boolean(m.winner_id));

  return isCompleted ? "completed" : "upcoming";
};
