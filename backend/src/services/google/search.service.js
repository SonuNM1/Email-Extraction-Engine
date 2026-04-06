import "dotenv/config";
import axios from "axios";
import { isBlockedUrl, cleanUrl } from "./urlFilter.js";

const SERPER_KEY = process.env.SERPER_API_KEY;
const SERPER_URL = "https://google.serper.dev/search";

const NEGATIVE_FILTERS = `
 -site:linkedin.com -site:facebook.com -site:instagram.com -site:twitter.com
 -site:x.com -site:yelp.com -site:yellowpages.com -site:tripadvisor.com
 -site:crunchbase.com -site:zoominfo.com -site:apollo.io -site:bbb.org
 -site:glassdoor.com -site:indeed.com -site:wikipedia.org -site:manta.com
 -site:clutch.co -site:angi.com -site:thumbtack.com -site:mapquest.com
 -site:hunter.io -site:lusha.com -site:seamless.ai -site:rocketreach.co
 -inurl:directory -inurl:listing -inurl:profile -inurl:job -inurl:careers
 -inurl:login -inurl:signup -filetype:pdf -filetype:doc -filetype:xls
`.trim();

const QUERY_TEMPLATES = [
  (kw, loc) => `"${kw}" "${loc}" "contact us" site:.com ${NEGATIVE_FILTERS}`,
  (kw, loc) => `"${kw}" "${loc}" "about us" site:.com ${NEGATIVE_FILTERS}`,
  (kw, loc) => `"${kw}" "${loc}" "contact@" OR "info@" site:.com ${NEGATIVE_FILTERS}`,
  (kw, loc) => `"${kw}" "${loc}" "get in touch" site:.com ${NEGATIVE_FILTERS}`,
  (kw, loc) => `"${kw}" "${loc}" email site:.com ${NEGATIVE_FILTERS}`,
];

const PAGES_PER_QUERY = 10;

function delay(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

export async function searchLocation(keyword, location) {
  const seen = new Set();
  const results = [];

  for (const template of QUERY_TEMPLATES) {
    const query = template(keyword, location);

    for (let page = 1; page <= PAGES_PER_QUERY; page++) {
      try {
        await delay(250);

        const { data } = await axios.post(
          SERPER_URL,
          { q: query, num: 10, page, gl: "us", hl: "en", location: "United States"},
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
          console.error(`Serper error [${location}]:`, data.error);
          break;
        }

        const organic = data.organic || [];
        if (organic.length === 0) break; // no more results, skip remaining pages

        for (const r of organic) {
          const url = r.link;
          if (!url) continue;
          if (/\+91|\+92|\+234|\+27|\+63|\+66/i.test(url)) continue;
          if (isBlockedUrl(url)) continue;
          const root = cleanUrl(url);
          if (!root || seen.has(root)) continue;
          seen.add(root);
          results.push(root);
        }
      } catch (e) {
        console.error(`Serper error [${location} p${page}]:`, e.message);
      }
    }
  }

  console.log(`🔍 [${location}] Found ${results.length} unique domains`);
  return results;
}