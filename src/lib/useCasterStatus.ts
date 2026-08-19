"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";

export interface CasterStatusData {
  isCaster: boolean;
  caster: any | null;
  application: any | null;
  hasStreamingLinked: boolean;
  hasTwitchLinked: boolean;
  hasKickLinked: boolean;
  hasGoogleLinked: boolean;
  primaryPlatform: "twitch" | "kick" | "youtube";
  languages?: string[] | null;
  verifiedTwitchChannel?: string | null;
  verifiedTwitchAlias?: string | null;
  verifiedKickChannel?: string | null;
  verifiedKickAlias?: string | null;
  verifiedGoogleAlias?: string | null;
}

const CACHE_KEY_PREFIX = "l4d2_caster_status_";
const LAST_CASTER_USER_KEY = "l4d2_last_caster_user";
let inMemoryCache: Record<string, { data: CasterStatusData; timestamp: number }> = {};
let latestCasterStatus: CasterStatusData | null = null;

export function getCachedCasterStatus(userId: string): CasterStatusData | null {
  if (!userId) return null;

  // 1. In-memory check (5 minutes TTL with background revalidation)
  const mem = inMemoryCache[userId];
  if (mem && Date.now() - mem.timestamp < 1000 * 60 * 5) {
    return mem.data;
  }

  // 2. SessionStorage check
  if (typeof window !== "undefined") {
    try {
      const stored = sessionStorage.getItem(`${CACHE_KEY_PREFIX}${userId}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed.isCaster === "boolean") {
          inMemoryCache[userId] = { data: parsed, timestamp: Date.now() };
          latestCasterStatus = parsed;
          return parsed;
        }
      }
    } catch {
      // Ignore storage errors
    }
  }

  return null;
}

export function setCachedCasterStatus(userId: string, data: CasterStatusData) {
  if (!userId) return;
  inMemoryCache[userId] = { data, timestamp: Date.now() };
  latestCasterStatus = data;

  if (typeof window !== "undefined") {
    try {
      sessionStorage.setItem(`${CACHE_KEY_PREFIX}${userId}`, JSON.stringify(data));
      sessionStorage.setItem(LAST_CASTER_USER_KEY, userId);
      window.dispatchEvent(new CustomEvent("l4d2_caster_status_updated", { detail: { userId, data } }));
    } catch {
      // Ignore storage errors
    }
  }
}

export function clearCasterStatusCache(userId?: string) {
  if (userId) {
    delete inMemoryCache[userId];
    if (typeof window !== "undefined") {
      try {
        sessionStorage.removeItem(`${CACHE_KEY_PREFIX}${userId}`);
        window.dispatchEvent(new CustomEvent("l4d2_caster_status_cleared", { detail: { userId } }));
      } catch {}
    }
  } else {
    inMemoryCache = {};
    latestCasterStatus = null;
    if (typeof window !== "undefined") {
      try {
        Object.keys(sessionStorage).forEach((k) => {
          if (k.startsWith(CACHE_KEY_PREFIX)) {
            sessionStorage.removeItem(k);
          }
        });
        sessionStorage.removeItem(LAST_CASTER_USER_KEY);
        window.dispatchEvent(new CustomEvent("l4d2_caster_status_cleared", { detail: {} }));
      } catch {}
    }
  }
}

export function useCasterStatus() {
  const { data: session, status } = useSession();
  const userId = session?.user?.id;

  // Attempt to synchronously get initial cached data
  const getInitial = (): CasterStatusData | null => {
    if (userId) return getCachedCasterStatus(userId);
    if (latestCasterStatus) return latestCasterStatus;
    if (typeof window !== "undefined") {
      try {
        const lastUser = sessionStorage.getItem(LAST_CASTER_USER_KEY);
        if (lastUser) return getCachedCasterStatus(lastUser);
      } catch {}
    }
    return null;
  };

  const initialCached = getInitial();

  const [casterData, setCasterData] = useState<CasterStatusData | null>(initialCached);
  const [isLoading, setIsLoading] = useState<boolean>(!initialCached);
  const isFetchingRef = useRef(false);

  const fetchStatus = useCallback(async (forced = false) => {
    if (!userId) {
      if (status === "unauthenticated") {
        setCasterData(null);
        setIsLoading(false);
      }
      return;
    }

    if (isFetchingRef.current && !forced) return;
    isFetchingRef.current = true;

    try {
      const res = await fetch("/api/casters/apply");
      if (res.ok) {
        const json: CasterStatusData = await res.json();
        setCasterData(json);
        setCachedCasterStatus(userId, json);
      }
    } catch (e) {
      console.warn("Error fetching caster status in hook:", e);
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, [userId, status]);

  // Synchronously restore cached data as soon as userId is resolved
  useEffect(() => {
    if (status === "authenticated" && userId) {
      const cached = getCachedCasterStatus(userId);
      if (cached) {
        setCasterData(cached);
        setIsLoading(false);
      }
      fetchStatus();
    } else if (status === "unauthenticated") {
      setCasterData(null);
      setIsLoading(false);
    }
  }, [status, userId, fetchStatus]);

  // Listen to cross-component sync events
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleUpdate = (e: any) => {
      if (e.detail?.data) {
        if (!userId || e.detail.userId === userId) {
          setCasterData(e.detail.data);
          setIsLoading(false);
        }
      }
    };

    const handleClear = (e: any) => {
      if (!userId || !e.detail?.userId || e.detail.userId === userId) {
        setCasterData(null);
      }
    };

    window.addEventListener("l4d2_caster_status_updated", handleUpdate);
    window.addEventListener("l4d2_caster_status_cleared", handleClear);

    return () => {
      window.removeEventListener("l4d2_caster_status_updated", handleUpdate);
      window.removeEventListener("l4d2_caster_status_cleared", handleClear);
    };
  }, [userId]);

  return {
    isCaster: Boolean(casterData?.isCaster || casterData?.caster || casterData?.application?.status === "approved"),
    caster: casterData?.caster || null,
    application: casterData?.application || null,
    casterData,
    isLoading,
    refreshCasterStatus: () => fetchStatus(true),
  };
}

