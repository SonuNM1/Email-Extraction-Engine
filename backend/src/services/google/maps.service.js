import "dotenv/config";
import axios from "axios";
import { isBlockedUrl, cleanUrl } from "./urlFilter.js";

const SERPER_KEY = process.env.SERPER_API_KEY;
const SERPER_MAPS_URL = "https://google.serper.dev/maps";

// Serper maps API — returns Google Maps business listings
// Each result has: title, address, website, phone, rating etc
// We extract the website and pass it to email extractor

const RESULTS_PER_QUERY = 20; // Serper maps returns up to 20 per call

function delay(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

/**
 * Search Google Maps for businesses matching keyword + location
 * Returns array of clean root URLs (deduplicated, filtered)
 *
 * Flow: Serper Maps API → extract website field → filter blocked → dedup → return
 */
export async function searchMapsLocation(keyword, location) {
  const seen = new Set();
  const results = [];
  const query = `${keyword} in ${location}`;

  console.log(`🗺️  [Maps] Searching: "${query}"`);

  try {
    await delay(200);

    const { data } = await axios.post(
      SERPER_MAPS_URL,
      {
        q: query,
        gl: "us",
        hl: "en",
        num: RESULTS_PER_QUERY,
      },
      {
        headers: {
          "X-API-KEY": SERPER_KEY,
          "Content-Type": "application/json",
        },
        timeout: 12000,
        validateStatus: () => true,
      }
    );

    if (data.error) {
      console.error(`🗺️  [Maps] Serper error:`, data.error);
      return results;
    }

    const places = data.places || [];
    console.log(`🗺️  [Maps] Got ${places.length} map listings for "${query}"`);

    for (const place of places) {
      // Maps results have website field directly
      const website = place.website;
      if (!website) {
        console.log(`🗺️  [Maps] ⚠️  No website for: ${place.title}`);
        continue;
      }

      if (isBlockedUrl(website)) {
        console.log(`🗺️  [Maps] 🚫 Blocked: ${website} (${place.title})`);
        continue;
      }

      const root = cleanUrl(website);
      if (!root) continue;

      if (seen.has(root)) {
        console.log(`🗺️  [Maps] 🔁 Duplicate: ${root}`);
        continue;
      }

      seen.add(root);
      results.push({
        url: root,
        businessName: place.title || "",
        address: place.address || "",
        phone: place.phoneNumber || "",
        rating: place.rating || null,
        source: "google_maps",
      });

      console.log(`🗺️  [Maps] ✅ ${place.title} → ${root}`);
    }
  } catch (e) {
    console.error(`🗺️  [Maps] Request failed:`, e.message);
  }

  console.log(`🗺️  [Maps] [${location}] Found ${results.length} unique business websites`);
  return results;
}