/**
 * Helper to fetch community bans in background batches and update client state in real-time.
 */
export async function fetchBansInBatches(
  steamIds: string[],
  onBatchResult: (batchResults: Record<string, any>) => void
) {
  const uniqueIds = Array.from(new Set(steamIds.filter(Boolean)));
  if (uniqueIds.length === 0) return;

  const BATCH_SIZE = 5;
  const batches: string[][] = [];
  for (let i = 0; i < uniqueIds.length; i += BATCH_SIZE) {
    batches.push(uniqueIds.slice(i, i + BATCH_SIZE));
  }

  // Limit concurrency to maximum 3 parallel batch requests
  const CONCURRENCY = 3;
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
