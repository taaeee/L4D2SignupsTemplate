import { supabaseAdmin } from "@/lib/supabase-admin";
import { getTwitchUserById } from "@/lib/twitch";
import { getKickUserById } from "@/lib/kick";

export interface EnrichedCasterData {
  twitch_channel: string | null;
  kick_channel: string | null;
  youtube_channel: string | null;
  alias?: string | null;
}

export async function getUserStreamingChannels(
  userId: string,
  existing?: { twitch_channel?: string | null; kick_channel?: string | null; youtube_channel?: string | null }
): Promise<EnrichedCasterData> {
  let twitch_channel: string | null = existing?.twitch_channel || null;
  let kick_channel: string | null = existing?.kick_channel || null;
  let youtube_channel: string | null = existing?.youtube_channel || null;

  // If already has twitch/kick/youtube or at least verified channels, only resolve what is missing
  try {
    const [accountsRes, appRes] = await Promise.all([
      (!twitch_channel || !kick_channel)
        ? supabaseAdmin
            .schema("next_auth")
            .from("accounts")
            .select("provider, providerAccountId")
            .eq("userId", userId)
        : Promise.resolve({ data: null }),
      (!twitch_channel || !kick_channel || !youtube_channel)
        ? supabaseAdmin
            .from("caster_applications")
            .select("twitch_channel, kick_channel, youtube_channel, alias")
            .eq("user_id", userId)
            .order("updated_at", { ascending: false })
            .limit(1)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    const accounts = accountsRes.data || [];
    const app = appRes.data;

    // Check application fallback first (from DB)
    if (app) {
      if (!twitch_channel && app.twitch_channel) twitch_channel = app.twitch_channel;
      if (!kick_channel && (app as any).kick_channel) kick_channel = (app as any).kick_channel;
      if (!youtube_channel && app.youtube_channel) youtube_channel = app.youtube_channel;
    }

    // If still missing, check linked accounts in parallel
    const twitchAccount = accounts.find((a) => a.provider === "twitch" && a.providerAccountId);
    const kickAccount = accounts.find((a) => a.provider === "kick" && a.providerAccountId);

    const promises: Promise<void>[] = [];

    if (!twitch_channel && twitchAccount?.providerAccountId) {
      promises.push(
        getTwitchUserById(twitchAccount.providerAccountId)
          .then((user) => {
            if (user?.login) twitch_channel = user.login;
          })
          .catch((e) => console.warn("Twitch channel enrichment warning:", e))
      );
    }

    if (!kick_channel && kickAccount?.providerAccountId) {
      promises.push(
        getKickUserById(kickAccount.providerAccountId)
          .then((user) => {
            if (user?.name) kick_channel = user.name;
          })
          .catch((e) => console.warn("Kick channel enrichment warning:", e))
      );
    }

    if (promises.length > 0) {
      await Promise.all(promises);
    }
  } catch (e) {
    console.error("Error in getUserStreamingChannels:", e);
  }

  return { twitch_channel, kick_channel, youtube_channel };
}

export async function enrichCasterProfile<
  T extends { user_id: string; twitch_channel?: string | null; kick_channel?: string | null; youtube_channel?: string | null }
>(item: T): Promise<T> {
  if (!item || !item.user_id) return item;

  const channels = await getUserStreamingChannels(item.user_id, item);

  return {
    ...item,
    twitch_channel: item.twitch_channel || channels.twitch_channel || null,
    kick_channel: item.kick_channel || channels.kick_channel || null,
    youtube_channel: item.youtube_channel || channels.youtube_channel || null,
  };
}

export async function enrichCasterList<
  T extends { user_id: string; twitch_channel?: string | null; kick_channel?: string | null; youtube_channel?: string | null }
>(items: T[]): Promise<T[]> {
  if (!items || items.length === 0) return [];

  // Filter items that might need enrichment
  const userIds = Array.from(new Set(items.map((i) => i.user_id).filter(Boolean)));
  if (userIds.length === 0) return items;

  try {
    // 1. Batch query accounts in a single query
    const [accountsRes, appsRes] = await Promise.all([
      supabaseAdmin
        .schema("next_auth")
        .from("accounts")
        .select("userId, provider, providerAccountId")
        .in("userId", userIds),
      supabaseAdmin
        .from("caster_applications")
        .select("user_id, twitch_channel, kick_channel, youtube_channel, alias")
        .in("user_id", userIds),
    ]);

    const accountsByUser = new Map<string, any[]>();
    (accountsRes.data || []).forEach((acc) => {
      const list = accountsByUser.get(acc.userId) || [];
      list.push(acc);
      accountsByUser.set(acc.userId, list);
    });

    const appsByUser = new Map<string, any>();
    (appsRes.data || []).forEach((app) => {
      if (!appsByUser.has(app.user_id)) {
        appsByUser.set(app.user_id, app);
      }
    });

    // 2. Resolve external usernames in parallel for unique accounts
    const uniqueTwitchIds = Array.from(
      new Set(
        (accountsRes.data || [])
          .filter((a) => a.provider === "twitch" && a.providerAccountId)
          .map((a) => a.providerAccountId)
      )
    );

    const uniqueKickIds = Array.from(
      new Set(
        (accountsRes.data || [])
          .filter((a) => a.provider === "kick" && a.providerAccountId)
          .map((a) => a.providerAccountId)
      )
    );

    const [twitchUsers, kickUsers] = await Promise.all([
      Promise.all(
        uniqueTwitchIds.map(async (id) => {
          const u = await getTwitchUserById(id);
          return { id, login: u?.login || null };
        })
      ),
      Promise.all(
        uniqueKickIds.map(async (id) => {
          const u = await getKickUserById(id);
          return { id, name: u?.name || null };
        })
      ),
    ]);

    const twitchMap = new Map(twitchUsers.map((t) => [t.id, t.login]));
    const kickMap = new Map(kickUsers.map((k) => [k.id, k.name]));

    // 3. Map back to items
    return items.map((item) => {
      const app = appsByUser.get(item.user_id);
      const userAccounts = accountsByUser.get(item.user_id) || [];
      const twitchAcc = userAccounts.find((a) => a.provider === "twitch");
      const kickAcc = userAccounts.find((a) => a.provider === "kick");

      const resolvedTwitch =
        item.twitch_channel ||
        app?.twitch_channel ||
        (twitchAcc ? twitchMap.get(twitchAcc.providerAccountId) : null) ||
        null;

      const resolvedKick =
        item.kick_channel ||
        app?.kick_channel ||
        (kickAcc ? kickMap.get(kickAcc.providerAccountId) : null) ||
        null;

      const resolvedYoutube =
        item.youtube_channel ||
        app?.youtube_channel ||
        null;

      return {
        ...item,
        twitch_channel: resolvedTwitch,
        kick_channel: resolvedKick,
        youtube_channel: resolvedYoutube,
      };
    });
  } catch (e) {
    console.error("Error in enrichCasterList:", e);
    return items;
  }
}
