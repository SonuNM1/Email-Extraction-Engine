import "dotenv/config";
import axios from "axios";

const SERPER_KEY = process.env.SERPER_API_KEY;
const SERPER_URL = "https://google.serper.dev/search";

const PAGES_PER_QUERY = 10;

const NEGATIVE_FILTERS = `
 -site:linkedin.com 
 -site:facebook.com 
 -site:instagram.com 
 -site:twitter.com 
 -site:x.com 
 -site:yelp.com 
 -site:yellowpages.com 
 -site:tripadvisor.com 
 -site:justdial.com 
 -site:indiamart.com 
 -site:amazon.com 
 -site:flipkart.com 
 -site:wikipedia.org 
 -site:crunchbase.com 
 -site:zoominfo.com 
 -site:apollo.io 
 -site:hunter.io 
 -site:lusha.com 
 -site:seamless.ai 
 -site:rocketreach.co 
 -site:lead411.com 
 -site:signalhire.com 
 -site:skymem.info 
 -site:email-format.com 

 -inurl:directory 
 -inurl:listing 
 -inurl:profile 
 -inurl:job 
 -inurl:careers 
 -inurl:login 
 -inurl:signup 

 -filetype:pdf 
 -filetype:doc 
 -filetype:docx 
 -filetype:xls 
 -filetype:xlsx 

 -edu 
 -gov 
`;

const QUERY_TEMPLATES = [
  (kw, loc) => `"${kw}" "${loc}" "contact us" ${NEGATIVE_FILTERS}`,
  (kw, loc) => `"${kw}" "${loc}" "about us" ${NEGATIVE_FILTERS}`,
  (kw, loc) => `"${kw}" "${loc}" "email" ${NEGATIVE_FILTERS}`,
  (kw, loc) => `"${kw}" "${loc}" "get in touch" ${NEGATIVE_FILTERS}`,
  (kw, loc) => `"${kw}" "${loc}" "business email" ${NEGATIVE_FILTERS}`,

  // 🔥 HIGH-CONVERSION QUERIES
  (kw, loc) => `"${kw}" "${loc}" "contact@" ${NEGATIVE_FILTERS}`,
  (kw, loc) => `"${kw}" "${loc}" "info@" ${NEGATIVE_FILTERS}`,
  (kw, loc) => `"${kw}" "${loc}" "sales@" ${NEGATIVE_FILTERS}`,
];

const BLOCKED_DOMAINS = new Set([
  "yelp.com",
  "yellowpages.com",
  "tripadvisor.com",
  "bbb.org",
  "manta.com",
  "dandb.com",
  "crunchbase.com",
  "glassdoor.com",
  "indeed.com",
  "linkedin.com",
  "clutch.co",
  "angi.com",
  "thumbtack.com",
  "houzz.com",
  "mapquest.com",
  "spoke.com",
  "thebluebook.com",
  "bluebookservices.com",
  "association-insight.com",
  "causeiq.com",
  "fedlinks.com",
  "leadiq.com",
  "infoglobaldata.com",
  "rentechdigital.com",
  "apollo.io",
  "zoominfo.com",
  "seamless.ai",
  "hunter.io",
  "lusha.com",
  "clearbit.com",
  "prospeo.io",
  "restaurantemaillist.com",
  "mooreinfoinc.com",
  "facebook.com",
  "instagram.com",
  "twitter.com",
  "x.com",
  "youtube.com",
  "tiktok.com",
  "wixsite.com",
  "wordpress.com",
  "blogspot.com",
  "squarespace.com",
  "weebly.com",
  "ziprecruiter.com",
  "monster.com",
  "scribd.com",
  "issuu.com",
  "yumpu.com",
  "pdfcoffee.com",
  "calameo.com",
  "archive.org",
  "blogspot.com",
  "wordpress.com",
  "medium.com",
  "substack.com",
]);

function getDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function isBlockedUrl(url) {
  const domain = getDomain(url);
  if (!domain) return true;
  if (/\.(gov|gov\.[a-z]{2,3}|edu|ac\.|nic\.)$/i.test(domain)) return true;
  for (const blocked of BLOCKED_DOMAINS) {
    if (domain === blocked || domain.endsWith("." + blocked)) return true;
  }
  return false;
}

export async function searchLocation(keyword, location) {
  const seenDomains = new Set();
  const results = [];

  for (const template of QUERY_TEMPLATES) {
    const query = template(keyword, location);

    for (let page = 1; page <= PAGES_PER_QUERY; page++) {
      try {
        const { data } = await axios.post(
          SERPER_URL,
          {
            q: query,
            num: 10,
            page,
            gl: "us", // keep US businesses
            hl: "en",
          },
          {
            headers: {
              "X-API-KEY": SERPER_KEY,
              "Content-Type": "application/json",
            },
            timeout: 10000,
          },
        );

        for (const result of data.organic || []) {
          const url = result.link;

          // ✅ ONLY allow clean root/business pages (NO deep junk pages)

          if (url.split("/").length > 5) continue;

          if (/\+91|\+92|\+234|\+27|\+63|\+66|\+31/i.test(url)) continue;

          if (!url) continue;
          if (isBlockedUrl(url)) continue;
          const domain = getDomain(url);
          if (!domain) continue;

          const root = new URL(url).origin;
          if (seenDomains.has(root)) continue;
          seenDomains.add(root);

          const cleanUrl = new URL(url).origin;

          results.push(cleanUrl);
        }
      } catch (err) {
        console.error(`Serper error [${location} p${page}]:`, err.message);
      }
    }
  }

  console.log(
    `🔍 [${location}] Found ${results.length} unique business domains`,
  );
  return results;
}
