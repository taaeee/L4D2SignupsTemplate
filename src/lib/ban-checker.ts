/**
 * Memory cache for player ban status to prevent redundant API queries.
 */
const bansMemoryCache: Record<string, any> = {};

/**
 * Helper to fetch community bans in background batches and update client state in real-time.
 */
export async function fetchBansInBatches(
  steamIds: string[],
  onBatchResult: (batchResults: Record<string, any>) => void
) {
  const uniqueIds = Array.from(new Set(steamIds.filter(Boolean)));
  if (uniqueIds.length === 0) return;

  // First, check if any requested IDs are already in the memory cache
  const cachedResults: Record<string, any> = {};
  const uncachedIds: string[] = [];

  for (const id of uniqueIds) {
    if (bansMemoryCache[id] !== undefined) {
      cachedResults[id] = bansMemoryCache[id];
    } else {
      uncachedIds.push(id);
    }
  }

  // Deliver cached results immediately if available
  if (Object.keys(cachedResults).length > 0) {
    onBatchResult(cachedResults);
  }

  // If all were cached, we are done
  if (uncachedIds.length === 0) return;

  // Batch uncached requests in larger chunks (25 per batch) to minimize HTTP requests
  const BATCH_SIZE = 25;
  const batches: string[][] = [];
  for (let i = 0; i < uncachedIds.length; i += BATCH_SIZE) {
    batches.push(uncachedIds.slice(i, i + BATCH_SIZE));
  }

  const CONCURRENCY = 2;
  let index = 0;

  const worker = async () => {
    while (index < batches.length) {
      const currentBatch = batches[index++];
      try {
        const res = await fetch("/api/bans/check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ steamIds: currentBatch }),
        });
        if (res.ok) {
          const batchData = await res.json();
          // Store in memory cache
          Object.assign(bansMemoryCache, batchData);
          onBatchResult(batchData);
        }
      } catch (err) {
        console.error("Ban check batch error:", err);
      }
    }
  };

  const workers = Array.from({ length: Math.min(CONCURRENCY, batches.length) }, () => worker());
  await Promise.all(workers);
}
