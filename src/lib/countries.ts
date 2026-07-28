export interface Country {
  name: string;
  code: string;
  flag: string;
}

// Lightweight client-side cache (module-level variable + sessionStorage)
// to immediately return previously fetched country data and avoid loading flashes or redundant API calls.
let cachedCountries: Country[] | null = null;
let fetchPromise: Promise<Country[]> | null = null;

const API_KEY = "rc_live_d30c013d941349e085d3ef35a32eee82";
const CACHE_KEY = "l4d2_available_countries_v5";

export async function getAvailableCountries(): Promise<Country[]> {
  // 1. Module-level cache: immediately return if already loaded in memory
  if (cachedCountries && cachedCountries.length > 0) {
    return cachedCountries;
  }

  // 2. Client sessionStorage cache: read if available
  if (typeof window !== "undefined") {
    try {
      const stored = sessionStorage.getItem(CACHE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          cachedCountries = parsed;
          return cachedCountries;
        }
      }
    } catch (e) {
      console.error("Failed to read countries from sessionStorage", e);
    }
  }

  // 3. Deduplicate concurrent fetch calls
  if (fetchPromise) {
    return fetchPromise;
  }

  fetchPromise = (async () => {
    try {
      const headers = {
        "Authorization": `Bearer ${API_KEY}`
      };

      // Since restcountries v5 caps at 100 objects per request on the current plan,
      // and total count is ~254, we fetch offsets 0, 100, and 200 in parallel.
      const offsets = [0, 100, 200];
      const responses = await Promise.all(
        offsets.map(o =>
          fetch(`https://api.restcountries.com/countries/v5?limit=100&offset=${o}`, { headers })
            .then(r => r.json())
            .catch(err => {
              console.error(`Error fetching countries offset ${o}:`, err);
              return { data: { objects: [] } };
            })
        )
      );

      const allObjects = responses.flatMap(r => r?.data?.objects || []);

      const formatted: Country[] = allObjects
        .map((c: any) => ({
          name: c.names?.common || c.name?.common || "",
          code: (c.codes?.alpha_2 || c.cca2 || "").toLowerCase(),
          flag: c.flag?.url_svg || c.flag?.url_png || c.flags?.svg || c.flags?.png || ""
        }))
        .filter((c: any) => Boolean(c.name && c.code && c.flag))
        .sort((a: any, b: any) => a.name.localeCompare(b.name));

      if (formatted.length > 0) {
        cachedCountries = formatted;
        if (typeof window !== "undefined") {
          try {
            sessionStorage.setItem(CACHE_KEY, JSON.stringify(formatted));
          } catch (e) {
            console.error("Failed to save countries to sessionStorage", e);
          }
        }
      }

      return formatted;
    } catch (err) {
      console.error("Error loading countries from v5 API", err);
      return cachedCountries || [];
    } finally {
      fetchPromise = null;
    }
  })();

  return fetchPromise;
}
