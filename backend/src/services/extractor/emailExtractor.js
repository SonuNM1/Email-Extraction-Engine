import pLimit from "p-limit";
import he from "he";
import { appendRow } from "../excel.service.js";
import { logToJob } from "../logBus.js";
import axios from "axios";
import Job from "../../models/job.model.js";

const EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
const DOMAIN_CONCURRENCY = 20;
const AXIOS_TIMEOUT = 8000;

const CONTACT_PATHS = ["/contact", "/contact-us", "/about", "/about-us"];

const BLOCKED_TLDS = /\.(gov|edu|org|mil|ac\.uk|nic\.in|edu\.et|ca|gr|it)$/i;

const FREE_DOMAINS = new Set([
  "gmail.com","yahoo.com","hotmail.com","outlook.com","icloud.com",
  "aol.com","protonmail.com","ymail.com",
]);

const SPAM_ROOT_DOMAINS = new Set([
  "roofingbaltimoremaryland.com","mdroofingmasonry.com","metalsroofing.com",
]);

const IRRELEVANT_DOMAINS = new Set([
  "aeroleads.com","contactout.com","leadz.biz","fliphtml5.com","heyzine.com",
  "scrap.io","prospeo.io","neverbounce.com","bullberry.com","icrunchdata.com",
  "hireclick.com","dirxion.com","parishesonline.com","bidbro.com",
]);

const REJECT_LOCALS = new Set([
  "noreply","no-reply","donotreply","mailer","postmaster","bounce",
  "unsubscribe","newsletter","notifications","robot","daemon","webmaster",
  "devnull","blackhole","your","name","email","test","user","demo","fake",
  "jdoe","johndoe","janedoe","example","youremail","first.last","yourdomain",
  "privacy","legal","compliance","dmca","copyright","payroll","payments",
  "billing","invoice","accounting","purchasing","procurement","jobs","careers",
  "employment","recruiting","recruit","hr","humanresources","helpdesk",
  "feedback","suggestions","abuse","nodal.officer","nodalofficer","support2",
  "admin2","info2",
]);

const ACCEPT_LOCALS = new Set([
  "info","contact","hello","office","team","mail","general","enquiries",
  "enquiry","inquiry","inquiries","sales","booking","bookings","reservations",
  "reserve","catering","events","groups","admin","manager","owner","gm",
  "support","help","service","customerservice","cs","orders","delivery",
  "media","partnerships","connect","reach","pr","business","director","ceo",
  "president","principal","editor","estimate","estimates","quotes","quote",
  "bids","bid",
]);

const NAMED_PERSON_RE = /^[a-z]{1,3}\.?[a-z]{2,20}(\.[a-z]{2,20})?$/;

function domainMatches(email, sourceUrl) {
  const emailRoot = rootDomain(email.split("@")[1] || "");
  const pageRoot  = rootDomain(sourceUrl);
  return emailRoot === pageRoot || pageRoot.includes(emailRoot) || emailRoot.includes(pageRoot);
}

function rootDomain(input) {
  try {
    const host = input.includes("://") ? new URL(input).hostname : input;
    const clean = host.replace(/^www\./, "");
    const parts = clean.split(".");
    if (parts.length >= 3 && parts[parts.length - 2].length <= 3)
      return parts.slice(-3).join(".").toLowerCase();
    return parts.slice(-2).join(".").toLowerCase();
  } catch (e) { return ""; }
}

function isUsableEmail(email, sourceUrl) {
  const lower = email.toLowerCase();
  const [local, domain] = lower.split("@");
  if (!local || !domain || !domain.includes(".")) return false;
  if (BLOCKED_TLDS.test(domain)) return false;
  if (FREE_DOMAINS.has(domain)) return false;
  if (/%[0-9a-f]{2}/i.test(email)) return false;
  if (/\.(png|jpg|svg|gif|css|js|woff|pdf|ico|webp)$/i.test(email)) return false;
  if (local.startsWith("u003") || local.startsWith("u00")) return false;
  if (local.length >= 28 && /^[a-f0-9]+$/.test(local)) return false;
  if (email.includes("calendar.google") || email.includes("group.calendar")) return false;
  if (REJECT_LOCALS.has(local)) return false;
  if (ACCEPT_LOCALS.has(local)) return true;
  if (NAMED_PERSON_RE.test(local)) return true;
  if (
    local.length >= 3 &&
    local.length <= 35 &&
    /^[a-z0-9]([a-z0-9._-]*[a-z0-9])?$/.test(local) &&
    !local.includes("..") &&
    !local.includes("--")
  ) return true;
  return false;
}

function localPriority(local) {
  if (["sales","estimate","estimates","quotes","bid","bids","partnerships","business"].includes(local)) return 1;
  if (["info","contact","hello","enquiries","inquiry","connect"].includes(local)) return 2;
  if (["admin","office","manager","owner","director","ceo","editor"].includes(local)) return 3;
  if (["support","help","service","customerservice","cs"].includes(local)) return 4;
  if (NAMED_PERSON_RE.test(local) && !ACCEPT_LOCALS.has(local)) return 5;
  return 6;
}

function decodeObfuscated(html) {
  if (!html) return "";
  let text = he.decode(html);
  text = text.replace(/\\u[\da-fA-F]{4}/g, m => String.fromCharCode(parseInt(m.slice(2), 16)));
  return text
    .replace(/\[at\]/gi, "@").replace(/\(at\)/gi, "@")
    .replace(/\s+at\s+/gi, "@").replace(/ @ /g, "@")
    .replace(/\[dot\]/gi, ".").replace(/\(dot\)/gi, ".")
    .replace(/\s+dot\s+/gi, ".").replace(/&#64;/g, "@")
    .replace(/&amp;#64;/g, "@").replace(/&#46;/g, ".")
    .replace(/\u0040/g, "@");
}

function extractEmailsFromHtml(html, sourceUrl) {
  if (!html) return [];
  const found = new Set();

  // CloudFlare email decode
  for (const m of html.matchAll(/data-cfemail="([0-9a-f]+)"/gi)) {
    try {
      const enc = m[1];
      const key = parseInt(enc.substring(0, 2), 16);
      let decoded = "";
      for (let i = 2; i < enc.length; i += 2)
        decoded += String.fromCharCode(parseInt(enc.substring(i, i + 2), 16) ^ key);
      if (decoded.includes("@")) found.add(decoded.toLowerCase().trim());
    } catch (_) {}
  }

  // mailto links
  for (const m of html.matchAll(/href=["']mailto:([^"'?\s&]+)/gi)) {
    const e = decodeURIComponent(m[1]).toLowerCase().trim();
    if (e.includes("@") && !e.includes(" ")) found.add(e);
  }

  // Plain text / obfuscated
  const decoded = decodeObfuscated(html);
  for (const e of decoded.match(EMAIL_RE) || [])
    found.add(e.toLowerCase().trim());

  return [...found].filter(e => isUsableEmail(e, sourceUrl));
}

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0",
];
let uaIdx = 0;
const nextUA = () => USER_AGENTS[uaIdx++ % USER_AGENTS.length];

async function fetchAxios(url) {
  try {
    const { data } = await axios.get(url, {
      timeout: AXIOS_TIMEOUT,
      headers: {
        "User-Agent": nextUA(),
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      maxRedirects: 4,
      validateStatus: s => s < 500,
    });
    return typeof data === "string" ? data : "";
  } catch (e) { return ""; }
}

async function getBestEmailsFromDomain(rootUrl, maxEmails = 3) {
  if (/\.(pdf|doc|docx|xls|xlsx|zip|mp4|jpg|png)$/i.test(rootUrl)) return [];
  const base   = rootUrl.replace(/\/$/, "");
  const domain = rootDomain(base);
  if (SPAM_ROOT_DOMAINS.has(domain) || IRRELEVANT_DOMAINS.has(domain)) return [];
  const urlsToTry = CONTACT_PATHS.map(p => base + p);
  const limit     = pLimit(4);
  const htmlResults = await Promise.all(urlsToTry.map(url => limit(() => fetchAxios(url))));
  const candidates = [];
  htmlResults.forEach((html, i) => {
    extractEmailsFromHtml(html, urlsToTry[i]).forEach(e => candidates.push(e));
  });
  // Homepage fallback only if contact pages found nothing
  if (candidates.length === 0) {
    const homeHtml = await fetchAxios(base);
    extractEmailsFromHtml(homeHtml, base).forEach(e => candidates.push(e));
  }
  if (!candidates.length) return [];
  const unique = [...new Set(candidates)];
  unique.sort((a, b) => localPriority(a.split("@")[0]) - localPriority(b.split("@")[0]));
  return unique.slice(0, maxEmails);
}

export async function extractEmailsFromUrls(urls, keyword, location, jobId, sheet, seenEmails) {
  if (!Array.isArray(urls)) throw new Error("urls must be an array");
  logToJob(jobId, `\n📍 [${location}] Extracting from ${urls.length} URLs`);
  if (!urls.length) return [];

  const domainLimit = pLimit(DOMAIN_CONCURRENCY);
  const results     = [];

  await Promise.all(
    urls.map(url =>
      domainLimit(async () => {
        try {
          const emails = await getBestEmailsFromDomain(url);
          if (!emails.length) return;
          for (const email of emails) {
            if (seenEmails.has(email)) continue;
            seenEmails.add(email);
            const emailDoc = {
              email,
              website:      url,
              location,
              keyword,
              source:       "google_search",
              businessName: "",
              phone:        "",
              address:      "",
            };
            results.push({ email, website: url, source: "google_search" });
            appendRow(sheet, emailDoc);
            logToJob(jobId, `✅ ${email} — ${url}`);
            await Job.updateOne(
              { _id: jobId },
              {
                $push: { emails: emailDoc },
                $inc:  { emailsFound: 1 },
              }
            ).catch(() => {});
          }
        } catch (err) {
          console.error(`Error on ${url}:`, err.message);
        }
      })
    )
  );

  logToJob(jobId, `📊 [${location}] ${results.length} emails from ${urls.length} domains`);
  return results;
}