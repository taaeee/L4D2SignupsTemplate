/**
 * Normalizes, standardizes, and deduplicates caster language arrays.
 * Handles string arrays, comma-separated strings, JSON strings, and alternate language names.
 */
export function normalizeLanguages(langs: any): string[] {
  if (!langs) return ["Español"];
  let list: string[] = [];

  if (Array.isArray(langs)) {
    list = langs;
  } else if (typeof langs === "string") {
    try {
      const parsed = JSON.parse(langs);
      if (Array.isArray(parsed)) list = parsed;
      else list = langs.split(",");
    } catch {
      list = langs.split(",");
    }
  }

  const mapped = list
    .map((l) => {
      const clean = String(l).trim();
      const lower = clean.toLowerCase();
      if (lower === "spanish" || lower === "español" || lower === "es") return "Español";
      if (lower === "english" || lower === "inglés" || lower === "ingles" || lower === "en") return "Inglés";
      if (lower === "chinese" || lower === "chino" || lower === "zh") return "Chino";
      if (lower === "russian" || lower === "ruso" || lower === "ru") return "Ruso";
      return clean;
    })
    .filter(Boolean);

  const unique = Array.from(new Set(mapped));
  return unique.length > 0 ? unique : ["Español"];
}

export const MAIN_CASTER_LANGUAGES = ["Español", "Inglés", "Chino", "Ruso"] as const;
