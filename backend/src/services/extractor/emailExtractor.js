import pLimit from "p-limit";
import he from "he";
import { appendRow } from "../excel.service.js";
import { logToJob } from "../logBus.js";
import { getBrowser } from "./fetch.service.js";
import axios from "axios";

const EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
const DOMAIN_CONCURRENCY = 5;
const AXIOS_TIMEOUT = 7000;
const PW_TIMEOUT = 18000;

// Only scrape these paths — homepage is wasteful, contact/about have the email
const CONTACT_PATHS = [
  "/contact",
  "/contact-us",
  "/contact.html",
  "/contact.php",
  "/about",
  "/about-us",
  "/about.html",
  "/reach-us",
  "/get-in-touch",
  "/our-team",
];

const BLOCKED_TLDS = /\.(gov|edu|org|mil|ac\.uk|nic\.in|edu\.et|ca|gr|it|biz\.hk|com\.hk)$/i;

const FREE_DOMAINS = new Set([
  "gmail.com","yahoo.com","hotmail.com","outlook.com",
  "icloud.com","aol.com","protonmail.com","ymail.com",
]);

// Domains that are spam/directory sites — same email repeated across fake subdomains
const SPAM_ROOT_DOMAINS = new Set([
  "roofingbaltimoremaryland.com",
  "mdroofingmasonry.com",
  "metalsroofing.com",
  "lochnerroofing.com",
  "langandsonroofing.com",
  "proroofingconstruction.us",
  "eagleroofingwallsystems.com",
  "retro-roofing.com",
  "advantedgeroofing.com",
  "jfprofessionalroofing.com",
]);

// Domains that are tools/SaaS/lead-gen — not actual businesses to email
const IRRELEVANT_DOMAINS = new Set([
  "aeroleads.com","contactout.com","leadz.biz","fliphtml5.com",
  "heyzine.com","scrap.io","prospeo.io","neverbounce.com",
  "bidbro.com","roserocket.com","takeoffsandestimating.com",
  "highergov.com","projectmapit.com","roofingestimators.us",
  "americanhomequotes.com","creativecirclemedia.com","bullberry.com",
  "icrunchdata.com","hireclick.com","dirxion.com","parishesonline.com",
]);

const REJECT_LOCALS = new Set([
  "noreply","no-reply","donotreply","mailer","postmaster","bounce",
  "unsubscribe","newsletter","notifications","robot","daemon","webmaster",
  "devnull","blackhole","your","name","email","test","user","demo","fake",
  "jdoe","johndoe","janedoe","example","youremail","first.last",
  "yourdomain","privacy","legal","compliance","dmca","copyright",
  "payroll","payments","billing","invoice","accounting","purchasing",
  "procurement","jobs","careers","employment","recruiting","recruit",
  "hr","humanresources","helpdesk","feedback","suggestions","abuse",
  "nodal.officer","nodalofficer","support2","admin2","info2",
]);

const ACCEPT_LOCALS = new Set([
  "info","contact","hello","office","team","mail","general","enquiries",
  "enquiry","inquiry","inquiries","sales","booking","bookings","reservations",
  "reserve","catering","events","groups","admin","manager","owner",
  "gm","support","help","service","customerservice","cs","orders",
  "delivery","media","partnerships","connect","reach","pr","business",
  "director","ceo","president","principal","editor","service","help",
  "estimate","estimates","quotes","quote","bids","bid",
]);

// Matches: gbrown, jsmith, k.burks, bobby.tulip, j.jones etc
const NAMED_PERSON_RE = /^[a-z]{1,3}\.?[a-z]{2,20}(\.[a-z]{2,20})?$/;

function rootDomain(input) {
  try {
    const host = input.includes("://") ? new URL(input).hostname : input;
    const clean = host.replace(/^www\./, "");
    const parts = clean.split(".");
    // handle .co.uk, .com.au etc
    if (parts.length >= 3 && parts[parts.length-2].length <= 3) {
      return parts.slice(-3).join(".").toLowerCase();
    }
    return parts.slice(-2).join(".").toLowerCase();
  } catch { return ""; }
}

function domainMatches(email, sourceUrl) {
  const emailRoot = rootDomain(email.split("@")[1] || "");
  const pageRoot  = rootDomain(sourceUrl);
  return emailRoot === pageRoot;
}

function isUsableEmail(email, sourceUrl) {
  const lower = email.toLowerCase();
  const [local, domain] = lower.split("@");
  if (!local || !domain || !domain.includes(".")) return false;

  // Block non-US TLDs
  if (BLOCKED_TLDS.test(domain)) return false;
  if (FREE_DOMAINS.has(domain)) return false;

  // Junk patterns
  if (/%[0-9a-f]{2}/i.test(email)) return false;
  if (/\.(png|jpg|svg|gif|css|js|woff|pdf|ico|webp)$/i.test(email)) return false;
  if (local.startsWith("u003") || local.startsWith("u00")) return false;
  if (local.length >= 28 && /^[a-f0-9]+$/.test(local)) return false;
  if (email.includes("calendar.google") || email.includes("group.calendar")) return false;

  // Must match domain of page it was found on
  if (!domainMatches(email, sourceUrl)) return false;

  // Hard reject list
  if (REJECT_LOCALS.has(local)) return false;

  // Accept list
  if (ACCEPT_LOCALS.has(local)) return true;

  // Named person: gbrown, jsmith, k.burks, bobby.tulip, cs.nash, a.beishline
  if (NAMED_PERSON_RE.test(local)) return true;

  return false;
}

function localPriority(local) {
  // Named person = highest value lead
  if (/^[a-z]{1,3}\.?[a-z]{2,20}(\.[a-z]{2,20})?$/.test(local) &&
      !ACCEPT_LOCALS.has(local)) return 0;
  if (["sales","estimate","estimates","quotes","bid","bids","partnerships","business"].includes(local)) return 1;
  if (["info","contact","hello","enquiries","inquiry","connect"].includes(local)) return 2;
  if (["admin","office","manager","owner","director","ceo","editor"].includes(local)) return 3;
  if (["support","help","service","customerservice","cs"].includes(local)) return 4;
  return 5;
}

function decodeObfuscated(html) {
  if (!html) return "";

  let text = he.decode(html);

  // Unicode escapes
  text = text.replace(/\\u[\da-fA-F]{4}/g, (m) =>
    String.fromCharCode(parseInt(m.slice(2), 16))
  );

  // Common text obfuscations
  text = text
    .replace(/\[at\]/gi, "@").replace(/\(at\)/gi, "@")
    .replace(/\s+at\s+/gi, "@").replace(/ @ /g, "@")
    .replace(/\[dot\]/gi, ".").replace(/\(dot\)/gi, ".")
    .replace(/\s+dot\s+/gi, ".")
    .replace(/&#64;/g, "@").replace(/&amp;#64;/g, "@")
    .replace(/&#46;/g, ".").replace(/\u0040/g, "@");

  return text;
}

function extractEmailsFromHtml(html, sourceUrl) {
  if (!html) return [];

  const found = new Set();

  // 1. Cloudflare email decode (data-cfemail attribute)
  for (const m of html.matchAll(/data-cfemail="([0-9a-f]+)"/gi)) {
    try {
      const enc = m[1];
      const key = parseInt(enc.substring(0, 2), 16);
      let decoded = "";
      for (let i = 2; i < enc.length; i += 2) {
        decoded += String.fromCharCode(parseInt(enc.substring(i, i + 2), 16) ^ key);
      }
      if (decoded.includes("@")) found.add(decoded.toLowerCase().trim());
    } catch (_) {}
  }

  // 2. mailto: links — most reliable source
  for (const m of html.matchAll(/href=["']mailto:([^"'?\s&]+)/gi)) {
    const e = decodeURIComponent(m[1]).toLowerCase().trim();
    if (e.includes("@") && !e.includes(" ")) found.add(e);
  }

  // 3. Decode obfuscations then regex scan
  const decoded = decodeObfuscated(html);
  for (const e of (decoded.match(EMAIL_RE) || [])) {
    found.add(e.toLowerCase().trim());
  }

  // 4. Filter valid
  return [...found].filter((e) => isUsableEmail(e, sourceUrl));
}

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0",
];
let uaIdx = 0;
const nextUA = () => USER_AGENTS[uaIdx++ % USER_AGENTS.length];

async function fetchAxios(url) {
  const { data } = await axios.get(url, {
    timeout: AXIOS_TIMEOUT,
    headers: {
      "User-Agent": nextUA(),
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "Cache-Control": "no-cache",
    },
    maxRedirects: 5,
    validateStatus: (s) => s < 500,
  });
  return typeof data === "string" ? data : "";
}

async function fetchPlaywright(url, browser) {
  if (!browser) return "";
  const page = await browser.newPage();
  try {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => undefined });
      window.chrome = { runtime: {} };
      Object.defineProperty(navigator, "languages", { get: () => ["en-US", "en"] });
      Object.defineProperty(navigator, "plugins", { get: () => [1, 2, 3] });
    });
    await page.setExtraHTTPHeaders({ "Accept-Language": "en-US,en;q=0.9" });
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: PW_TIMEOUT });
    await page.waitForTimeout(1500);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    // Extract mailto links that JS rendered
    const jsMailtos = await page.evaluate(() =>
      [...document.querySelectorAll("a[href^='mailto:']")]
        .map(a => a.href.replace("mailto:", "").split("?")[0].toLowerCase().trim())
        .filter(Boolean)
    );

    const content = await page.content();
    return content + "\n" + jsMailtos.join("\n");
  } catch { return ""; }
  finally { await page.close(); }
}

async function fetchSmart(url, browser) {
  try {
    const html = await fetchAxios(url);
    if (html && html.length > 500) return html;
  } catch (_) {}
  return fetchPlaywright(url, browser);
}

async function getBestEmailFromDomain(rootUrl, browser) {
  if (/\.(pdf|doc|docx|xls|xlsx|zip|mp4|jpg|png)$/i.test(rootUrl)) return null;

  const base = rootUrl.replace(/\/$/, "");
  const domain = rootDomain(base);

  // Skip known spam directory domains
  if (SPAM_ROOT_DOMAINS.has(domain)) return null;
  if (IRRELEVANT_DOMAINS.has(domain)) return null;

  // Fetch ONLY contact/about pages (not homepage — waste of time)
  // But also try homepage as last resort if nothing found
  const primaryPaths = CONTACT_PATHS.map((p) => base + p);
  const fallbackUrl = base; // homepage only as fallback

  // Fetch all contact paths in parallel
  const limit = pLimit(3);
  const htmlResults = await Promise.all(
    primaryPaths.map((url) => limit(() => fetchSmart(url, browser).catch(() => "")))
  );

  const candidates = [];
  htmlResults.forEach((html, i) => {
    extractEmailsFromHtml(html, primaryPaths[i]).forEach((e) => candidates.push(e));
  });

  // If nothing found on contact pages, try homepage as last resort
  if (candidates.length === 0) {
    try {
      const homeHtml = await fetchSmart(fallbackUrl, browser);
      extractEmailsFromHtml(homeHtml, fallbackUrl).forEach((e) => candidates.push(e));
    } catch (_) {}
  }

  if (candidates.length === 0) {
    console.log(`❌ No emails found for ${base}`);
    return null;
  }

  const unique = [...new Set(candidates)];
  unique.sort((a, b) => localPriority(a.split("@")[0]) - localPriority(b.split("@")[0]));
  const best = unique[0];
  console.log(`  📧 ${base} → ${best}`);
  return best;
}

export async function extractEmailsFromUrls(urls, keyword, location, jobId, sheet, seenEmails, browser) {
  if (!Array.isArray(urls)) throw new Error("urls must be an array");
  logToJob(jobId, `\n📍 [${location}] Extracting from ${urls.length} URLs`);
  if (!urls.length) return [];

  const activeBrowser = browser || (await getBrowser());
  const domainLimit = pLimit(DOMAIN_CONCURRENCY);
  const results = [];

  await Promise.all(
    urls.map((url) =>
      domainLimit(async () => {
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