import axios from "axios";
import pLimit from "p-limit";
import he from "he";
import { appendRow } from "./excel.service.js";
import { logToJob } from "./logBus.js";

const EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
const CONCURRENCY = 6;
const AXIOS_TIMEOUT = 8000;
const PW_TIMEOUT = 15000;
const MAX_EMAILS_PER_DOMAIN = 3;
const CONTACT_PATHS = ["/contact", "/contact-us"];

const JUNK_DOMAINS = new Set([
  // existing
  "sentry.io",
  "sentry.wixpress.com",
  "wixpress.com",
  "sentry-next.wixpress.com",
  "domain.com",
  "example.com",
  "example.org",
  "mystore.com",
  "yourdomain.com",
  "birdeye.com",
  "vagaro.com",
  "booksy.com",
  "glossgenius.com",
  "squareup.com",
  "googletagmanager.com",
  "hotjar.com",
  "intercom.io",
  // new additions
  "mysite.com",
  "company.com",
  "yoursite.com", // placeholders
  "mapquest.com", // directory
  "bbbemail.org",
  "thebbb.org", // BBB internal
  "scribd.com",
  "slideshare.net",
  "everand.com", // content platforms
  "fable.co",
  "causeiq.com", // aggregators
  "alaskaair.com",
  "hawaiianair.com", // airlines
  "foxnews.com",
  "apr.org", // media
  "bmipublishing.co.uk",
  "onboardhospitality.com", // trade press
  "wheree.com",
  "parentprojects.com",
  "dandb.com", // directories
  "joinhomebase.com",
  "statefoodsafety.com", // SaaS platforms
  "peopleready.com", // staffing platform
  "interactiveblue.com", // agency
]);

function looksLikeHash(local) {
  return local.length >= 24 && /^[a-f0-9]+$/.test(local);
}

function isRealEmail(email) {
  const [local, domain] = email.split("@");
  if (!domain) return false;
  if ([...JUNK_DOMAINS].some((j) => domain === j || domain.endsWith("." + j)))
    return false;
  if (looksLikeHash(local)) return false;
  if (/\.(png|jpg|svg|gif|css|js)$/i.test(email)) return false;
  if (!domain.includes(".")) return false;
  return true;
}

function isRelevant(html, keyword) {
  const text = html.toLowerCase();
  return keyword
    .toLowerCase()
    .split(" ")
    .some((k) => text.includes(k));
}

function extractEmails(html) {
  const decoded = he.decode(html);
  return (decoded.match(EMAIL_RE) || [])
    .map((e) => e.toLowerCase().trim())
    .filter(isRealEmail);
}

async function fetchWithAxios(url) {
  const { data } = await axios.get(url, {
    timeout: AXIOS_TIMEOUT,
    headers: { "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1)" },
    maxRedirects: 5,
  });
  return typeof data === "string" ? data : "";
}

async function fetchWithPlaywright(url, browser) {
  const page = await browser.newPage();
  try {
    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: PW_TIMEOUT,
    });
    return await page.content();
  } finally {
    await page.close();
  }
}

async function fetchHtml(url, browser) {
  try {
    return await fetchWithAxios(url);
  } catch {
    try {
      return await fetchWithPlaywright(url, browser);
    } catch {
      return "";
    }
  }
}

const JUNK_URL_PATTERNS = [
  /jobs?/,
  /career/,
  /indeed/,
  /glassdoor/,
  /linkedin/,
  /directory/,
  /listing/,
  /search/,
  /category/,
  /blog/,
  /news/,
  /article/,
  /gov/,
  /\.org/,
  /\.edu/,
];

async function getEmailsFromUrl(url, browser, keyword) {
  if (url.match(/\.(pdf|doc|docx|xls|xlsx)$/i)) return [];

  if (JUNK_URL_PATTERNS.some((pat) => pat.test(url))) return [];

  const base = new URL(url).origin;
  const urlsToTry = [url, ...CONTACT_PATHS.map((p) => base + p)];
  const htmlResults = await Promise.all(
    urlsToTry.map((u) => fetchHtml(u, browser)),
  );

  const validHtml = htmlResults.filter(Boolean);

  const emails = new Set();
  validHtml.forEach((html) =>
    extractEmails(html).forEach((e) => emails.add(e)),
  );

  if (emails.size > 0) {
    console.log(`  📧 ${url} → ${[...emails].join(", ")}`);
  }

  return [...emails].slice(0, MAX_EMAILS_PER_DOMAIN);
}

// ✅ sheet is now passed in from outside — created once per job

export async function extractEmailsFromUrls(
  urls,
  keyword,
  location,
  jobId,
  sheet,
  seenEmails,
  browser,
) {
  logToJob(jobId, `\n📍 [${location}] Extracting from ${urls.length} URLs`);
  if (!urls.length) return [];

  try {
    const limit = pLimit(CONCURRENCY);
    const results = [];

    await Promise.all(
      urls.map((url) =>
        limit(async () => {
          const emails = await getEmailsFromUrl(url, browser, keyword);
          for (const email of emails) {
            if (seenEmails.has(email)) continue;
            const domain = email.split("@")[1];

            seenEmails.add(email);
            results.push({ email, website: url });

            // ✅ write to the shared sheet immediately — survives crashes
            appendRow(sheet, { email, website: url, location, keyword });

            logToJob(jobId, `✅ ${email} — ${url}`);
          }
        }),
      ),
    );

    return results;
  } finally {
  }
}
