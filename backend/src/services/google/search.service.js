import "dotenv/config";
import axios from "axios";
import pLimit from "p-limit";

const SERPER_URL = "https://google.serper.dev/search";
const PAGES_PER_QUERY = 10;
const EARLY_EXIT_STREAK = 3;

export const serperCredits = { used: 0, exhausted: false };
const GLOBAL_SERPER_LIMIT = pLimit(5);

const NEGATIVE_FILTERS = `
 -site:linkedin.com -site:facebook.com -site:instagram.com -site:twitter.com
 -site:yelp.com -site:yellowpages.com -site:bbb.org -site:angi.com
 -site:thumbtack.com -site:crunchbase.com -site:zoominfo.com -site:apollo.io
 -inurl:directory -inurl:listing -inurl:profile -inurl:careers -filetype:pdf
`.trim();

const QUERY_TEMPLATES = [
  (kw, loc) => `"${kw}" "${loc}" "contact@" OR "info@" OR "hello@" ${NEGATIVE_FILTERS}`,
  (kw, loc) => `"${kw}" "${loc}" email ${NEGATIVE_FILTERS}`,
  (kw, loc) => `"${kw}" "${loc}" "contact us" ${NEGATIVE_FILTERS}`,
];

const BLOCKED_DOMAINS = new Set([
  "linkedin.com","facebook.com","instagram.com","twitter.com","x.com",
  "yelp.com","yellowpages.com","tripadvisor.com","bbb.org","manta.com",
  "angi.com","thumbtack.com","homeadvisor.com","houzz.com","angieslist.com",
  "apollo.io","zoominfo.com","crunchbase.com","lusha.com","seamless.ai",
  "hunter.io","indeed.com","glassdoor.com","ziprecruiter.com","medium.com",
  "wordpress.com","wixsite.com","blogspot.com","squarespace.com",
  "scribd.com","issuu.com","archive.org","substack.com","reddit.com",
  "quora.com","wikipedia.org","clutch.co","sortlist.com","goodfirms.co",
  "upcity.com","expertise.com","designrush.com","bark.com",
]);

function isBlockedUrl(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
    if (/\.(gov|edu|mil|org)$/i.test(host)) return true;
    const tld = host.split(".").pop();
    if (tld.length === 2 && !["us","co","io"].includes(tld)) return true;
    return [...BLOCKED_DOMAINS].some(d => host === d || host.endsWith("." + d));
  } catch { return true; }
}

function getDomain(url) {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return null; }
}

async function serperRequest(query, page, apiKey) {
  const key = apiKey || process.env.SERPER_API_KEY;
  const { data } = await axios.post(
    SERPER_URL,
    { q: query, num: 10, page, gl: "us", hl: "en" },
    { headers: { "X-API-KEY": key, "Content-Type": "application/json" }, timeout: 10000 }
  );
  serperCredits.used += 1;
  return data;
}

function parseResults(data, seenDomains, results) {
  let newCount = 0;
  for (const result of data.organic || []) {
    const url = result.link;
    if (!url || isBlockedUrl(url)) continue;
    if (!getDomain(url)) continue;
    const root = new URL(url).origin;
    if (seenDomains.has(root)) continue;
    seenDomains.add(root);
    results.push(root);
    newCount++;
  }
  return newCount;
}

export async function searchLocation(keyword, location, apiKey) {
  const seenDomains = new Set();
  const results = [];

  for (const template of QUERY_TEMPLATES) {
    if (serperCredits.exhausted) break;
    const query = template(keyword, location);
    let emptyStreak = 0;

    for (let page = 1; page <= PAGES_PER_QUERY; page++) {
      if (serperCredits.exhausted) break;

      await GLOBAL_SERPER_LIMIT(async () => {
        try {
          const data = await serperRequest(query, page, apiKey);
          const found = parseResults(data, seenDomains, results);
          if (found === 0) emptyStreak++;
          else emptyStreak = 0;
        } catch (err) {
          const status = err.response?.status;
          if (status === 400) {
            if (!serperCredits.exhausted) {
              serperCredits.exhausted = true;
              console.error(`🚫 Credits exhausted at [${location} p${page}]`);
              GLOBAL_SERPER_LIMIT.clearQueue();
            }
          } else if (status === 429) {
            await new Promise(r => setTimeout(r, 4000));
            if (!serperCredits.exhausted) {
              try {
                const data = await serperRequest(query, page, apiKey);
                const found = parseResults(data, seenDomains, results);
                if (found === 0) emptyStreak++;
                else emptyStreak = 0;
              } catch (_) { emptyStreak++; }
            }
          } else {
            console.error(`Serper error [${location} p${page}]:`, err.message);
            emptyStreak++;
          }
        }
      });

      if (emptyStreak >= EARLY_EXIT_STREAK) {
        console.log(`⏭️  [${location}] Early exit at page ${page}`);
        break;
      }
    }
  }

  console.log(`🔍 [${location}] Found ${results.length} unique domains`);
  return results;
}