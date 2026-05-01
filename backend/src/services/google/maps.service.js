import "dotenv/config";
import axios from "axios";
import pLimit from "p-limit";

const SERPER_MAPS_URL = "https://google.serper.dev/maps";
const GLOBAL_MAPS_LIMIT = pLimit(3);

// Skip maps for tiny territories — no listings exist there
const SKIP_MAPS_LOCATIONS = new Set([
  "American Samoa",
  "Guam",
  "Marianas Island",
  "US Virgin Islands",
  "Northern Mariana Islands",
]);

const MAPS_QUERY_TEMPLATES = [
  (kw, loc) => `${kw} in ${loc}`,
  (kw, loc) => `best ${kw} ${loc}`,
  (kw, loc) => `${kw} company ${loc}`,
];

const BLOCKED_DOMAINS = new Set([
  "linkedin.com",
  "facebook.com",
  "instagram.com",
  "twitter.com",
  "x.com",
  "yelp.com",
  "yellowpages.com",
  "tripadvisor.com",
  "bbb.org",
  "manta.com",
  "angi.com",
  "thumbtack.com",
  "homeadvisor.com",
  "houzz.com",
  "apollo.io",
  "zoominfo.com",
  "crunchbase.com",
  "indeed.com",
  "glassdoor.com",
]);

function isBlockedUrl(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
    if (/\.(gov|edu|mil|org)$/i.test(host)) return true;
    const tld = host.split(".").pop();
    if (tld.length === 2 && !["us", "co", "io"].includes(tld)) return true;
    return [...BLOCKED_DOMAINS].some(
      (d) => host === d || host.endsWith("." + d),
    );
  } catch {
    return true;
  }
}

function cleanUrl(url) {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

export async function searchMapsLocation(keyword, location, apiKey, credits) {
  if (SKIP_MAPS_LOCATIONS.has(location)) {
    console.log(`🗺️  [${location}] Skipping maps — territory too small`);
    return [];
  }
  if (credits?.exhausted) return [];

  const key = apiKey || process.env.SERPER_API_KEY;
  const seen = new Set();
  const results = [];

  await Promise.all(
    MAPS_QUERY_TEMPLATES.map((template) =>
      GLOBAL_MAPS_LIMIT(async () => {
        if (credits?.exhausted) return;
        const query = template(keyword, location);
        try {
          const response = await axios.post(
            SERPER_MAPS_URL,
            { q: query, gl: "us", hl: "en", num: 20 },
            {
              headers: { "X-API-KEY": key, "Content-Type": "application/json" },
              timeout: 15000,
              validateStatus: () => true,
            },
          );

          if (response.status === 400) {
            if (credits && !credits.exhausted) {
              credits.exhausted = true;
              console.error(`\n🚫 [Maps] Credits exhausted at [${location}]`);
              GLOBAL_MAPS_LIMIT.clearQueue();
            }
            return;
          }
          if (response.status === 429) {
            await new Promise((r) => setTimeout(r, 4000));
            return;
          }

          for (const place of response.data.places || []) {
            const website = place.website;
            if (!website || isBlockedUrl(website)) continue;
            const root = cleanUrl(website);
            if (!root || seen.has(root)) continue;
            seen.add(root);
            results.push({
              url: root,
              businessName: place.title || "",
              address: place.address || "",
              phone: place.phoneNumber || "",
              rating: place.rating || null,
              source: "google_maps",
            });
          }
        } catch (e) {
          console.error(`[Maps] Failed "${query}":`, e.message);
        }
      }),
    ),
  );

  console.log(`🗺️  [${location}] ${results.length} map listings`);
  return results;
}
