import { logToJob } from "../logBus.js";
import { extractEmailsFromUrls } from "./emailExtractor.js";


export async function extractEmailsFromMapsResults(
  mapsResults,
  keyword,
  location,
  jobId,
  sheet,
  seenEmails,
  browser
) {
  if (!mapsResults?.length) {
    logToJob(jobId, `🗺️  [Maps][${location}] No map results to process`);
    return [];
  }

  logToJob(jobId, `🗺️  [Maps][${location}] Processing ${mapsResults.length} map listings`);

  // Build URL→metadata lookup so we can enrich results after extraction
  const metaByUrl = {};
  const urls = [];

  for (const r of mapsResults) {
    metaByUrl[r.url] = {
      businessName: r.businessName,
      phone: r.phone,
      address: r.address,
      rating: r.rating,
    };
    urls.push(r.url);
    console.log(`🗺️  [Maps] Queued for extraction: ${r.businessName} → ${r.url}`);
  }

  // Reuse the main extractor — same email filtering, playwright fallback etc
  const extracted = await extractEmailsFromUrls(
    urls,
    keyword,
    location,
    jobId,
    sheet,
    seenEmails,
  );

  // Enrich with maps metadata
  const enriched = extracted.map((r) => ({
    ...r,
    businessName: metaByUrl[r.website]?.businessName || "",
    phone: metaByUrl[r.website]?.phone || "",
    address: metaByUrl[r.website]?.address || "",
    rating: metaByUrl[r.website]?.rating || null,
    source: "google_maps",
  }));

  const mapsCount = enriched.length;
  logToJob(jobId, `🗺️  [Maps][${location}] ✅ Got ${mapsCount} emails from maps listings`);

  return enriched;
}