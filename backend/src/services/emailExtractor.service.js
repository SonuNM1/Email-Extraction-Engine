import axios from "axios";
import pLimit from "p-limit";
import he from "he";
import { appendRow } from "../excel.service.js";
import { logToJob } from "../logBus.js";
import { getBrowser } from "./fetch.service.js";

const EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
const CONCURRENCY = 5;
const AXIOS_TIMEOUT = 8000;
const PW_TIMEOUT = 15000;

const CONTACT_PATHS = [
  "/contact",
  "/contact-us",
  "/about",
  "/about-us",
  "/team",
  "/our-team",
];

// ─── Blocked TLDs (never crawl or accept emails from these) ──────────────────
const BLOCKED_TLDS = /\.(gov|edu|org|mil|ac\.uk|nic\.in)$/i;

// ─── Blocked email locals (automated / junk / not useful) ────────────────────
const REJECT_LOCALS = new Set([
  "noreply","no-reply","donotreply","mailer","postmaster","bounce",
  "unsubscribe","newsletter","notifications","robot","daemon","webmaster",
  "devnull","blackhole","your","name","email","test","user","demo","fake",
  "jdoe","johndoe","janedoe","example","youremail","first.last","mysite",
  "yourdomain","privacy","legal","compliance","dmca","copyright","w2",
  "payroll","payments","billing","invoice","accounting","purchasing",
  "purchasingsuppliers","procurement","license","businesslicense","permits",
  "revenueforms","jobs","careers","employment","recruiting","recruit","hr",
  "humanresources","entryhires","marketing","pr","press","advertise",
  "advertising","promotions","helpdesk","feedback","suggestions","abuse",
  "autographs","kidsclub","snsprivacy",
]);

// ─── Accept these locals unconditionally (good contact emails) ───────────────
const ACCEPT_LOCALS = new Set([
  "info","contact","hello","office","team","mail","general","enquiries",
  "enquiry","inquiry","inquiries","sales","booking","bookings","reservations",
  "reserve","catering","events","banquet","groups","admin","manager","owner",
  "chef","gm","support","help","service","customerservice","cs","kitchen",
  "bar","front","host","hostess","orders","delivery","takeout","pickup",
  "beer","food","wine","drinks","media","partnerships",
]);

const FREE_DOMAINS = new Set([
  "gmail.com","yahoo.com","hotmail.com","outlook.com",
  "icloud.com","aol.com","protonmail.com",
]);

// Named-person pattern: john.doe, j.smith etc
const NAMED_PERSON_RE = /^[a-z]{1,20}\.[a-z]{2,20}$/;

function baseDomain(input) {
  try {
    const host = input.includes("://") ? new URL(input).hostname : input;
    return host.replace(/^(www\.|mail\.)/, "").toLowerCase();
  } catch {
    return "";
  }
}

function domainMatches(email, sourceUrl) {
  const emailDomain = baseDomain(email.split("@")[1] || "");
  const pageDomain = baseDomain(sourceUrl);
  return emailDomain === pageDomain;
}

function isUsableEmail(email, sourceUrl) {
  const lower = email.toLowerCase();
  const [local, domain] = lower.split("@");
  if (!local || !domain) return false;
  if (!domain.includes(".")) return false;

  // Block .org, .edu, .gov etc at email-domain level too
  if (BLOCKED_TLDS.test(domain)) return false;
  if (FREE_DOMAINS.has(domain)) return false;

  // Junk patterns
  if (/%[0-9a-f]{2}/i.test(email)) return false;
  if (/\.(png|jpg|svg|gif|css|js|woff|pdf)$/i.test(email)) return false;
  if (local.startsWith("u003") || local.startsWith("u00")) return false;
  if (local.length >= 24 && /^[a-f0-9]+$/.test(local)) return false;
  if (email.includes("calendar.google.com") || email.includes("group.calendar")) return false;

  // Must come from the same domain as the page we scraped it from
  if (!domainMatches(email, sourceUrl)) return false;

  // Hard reject
  if (REJECT_LOCALS.has(local)) return false;

  // Accept list
  if (ACCEPT_LOCALS.has(local)) return true;

  // Named person
  if (NAMED_PERSON_RE.test(local)) return true;

  return false;
}

function localPriority(local) {
  if (NAMED_PERSON_RE.test(local)) return 0;
  if (["catering","bookings","booking","reservations","sales","events","partnerships"].includes(local)) return 1;
  if (["info","contact","hello","enquiries","inquiry","inquiries"].includes(local)) return 2;
  if (["admin","office","manager","owner","media"].includes(local)) return 3;
  return 4;
}

function extractRawEmails(html) {
  const decoded = he.decode(html);
  const unescaped = decoded.replace(/\\u[\da-fA-F]{4}/g, (m) =>
    String.fromCharCode(parseInt(m.slice(2), 16))
  );
  return [
    ...new Set(
      (unescaped.match(EMAIL_RE) || []).map((e) => e.toLowerCase().trim())
    ),
  ];
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
  if (!browser) return "";
  const page = await browser.newPage();
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: PW_TIMEOUT });
    return await page.content();
  } catch {
    return "";
  } finally {
    await page.close();
  }
}

async function fetchHtml(url, browser) {
  try {
    const html = await fetchWithAxios(url);
    if (html && html.length >= 500) return html;
    return await fetchWithPlaywright(url, browser);
  } catch {
    return await fetchWithPlaywright(url, browser);
  }
}

async function getBestEmailFromDomain(url, browser) {
  if (/\.(pdf|doc|docx|xls|xlsx)$/i.test(url)) return null;

  const base = new URL(url).origin;
  const urlsToTry = [url, ...CONTACT_PATHS.map((p) => base + p)];

  const htmlResults = await Promise.all(
    urlsToTry.map((u) => fetchHtml(u, browser))
  );

  const candidates = [];
  htmlResults.forEach((html, i) => {
    if (!html) return;
    extractRawEmails(html).forEach((email) => {
      if (isUsableEmail(email, urlsToTry[i])) candidates.push(email);
    });
  });

  if (candidates.length === 0) {
    console.log(`❌ No emails found for ${base}`);
    return null;
  }

  const unique = [...new Set(candidates)];
  unique.sort(
    (a, b) => localPriority(a.split("@")[0]) - localPriority(b.split("@")[0])
  );

  const best = unique[0];
  console.log(`  📧 ${base} → ${best}`);
  return best;
}

export async function extractEmailsFromUrls(
  urls,
  keyword,
  location,
  jobId,
  sheet,
  seenEmails,
  browser
) {
  if (!Array.isArray(urls)) throw new Error("urls must be an array");

  logToJob(jobId, `\n📍 [${location}] Extracting from ${urls.length} URLs`);
  if (!urls.length) return [];

  // Use passed browser or lazy-init fallback
  const activeBrowser = browser || (await getBrowser());

  const limit = pLimit(CONCURRENCY);
  const results = [];

  await Promise.all(
    urls.map((url) =>
      limit(async () => {
        try {
          const email = await getBestEmailFromDomain(url, activeBrowser);
          if (!email) return;
          if (seenEmails.has(email)) return;
          seenEmails.add(email);
          results.push({ email, website: url });
          appendRow(sheet, { email, website: url, location, keyword });
          logToJob(jobId, `✅ ${email} — ${url}`);
        } catch (err) {
          console.error(`Error on ${url}:`, err.message);
        }
      })
    )
  );

  logToJob(jobId, `📊 [${location}] ${results.length} emails from ${urls.length} domains`);
  return results;
}