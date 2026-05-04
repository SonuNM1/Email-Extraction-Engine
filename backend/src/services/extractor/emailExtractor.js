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
  // Personal email providers
  "gmail.com","yahoo.com","hotmail.com","outlook.com","icloud.com",
  "aol.com","protonmail.com","ymail.com","mail.com","zoho.com",
  "gmx.com","gmx.net","live.com","msn.com","me.com","mac.com",
  "inbox.com","fastmail.com","hushmail.com","tutanota.com",
  "proton.me","pm.me","mailfence.com","runbox.com",

  // Placeholder / template / fake domains
  "example.com","example.org","example.net",
  "test.com","testing.com","demo.com","fake.com","dummy.com",
  "placeholder.com","yoursite.com","yourdomain.com","youremail.com",
  "mysite.com","mywebsite.com","mydomain.com","myemail.com",
  "company.com","business.com","email.com","mailservice.com",
  "domain.com","website.com","webmail.com","sampleemail.com",
  "noemail.com","noreply.com","nomail.com","nowhere.com",
  "mailinator.com","guerrillamail.com","tempmail.com","throwam.com",
  "sharklasers.com","guerrillamailblock.com","grr.la","spam4.me",
  "trashmail.com","dispostable.com","maildrop.cc","yopmail.com",

  // Hosting platform leaked emails
  "godaddy.com","wpengine.com","kinsta.com","siteground.com",
  "bluehost.com","hostgator.com","namecheap.com","dreamhost.com",
  "a2hosting.com","inmotion.com","hostinger.com","ionos.com",
  "ftpupload.com","000webhostapp.com","weebly.com","wixsite.com",
  "wordpress.com","blogspot.com","squarespace.com","webflow.io",
  "netlify.app","vercel.app","github.io","pages.dev",
  "mystrikingly.com","jimdo.com","strikingly.com",
]);

const SPAM_ROOT_DOMAINS = new Set([
  "roofingbaltimoremaryland.com","mdroofingmasonry.com","metalsroofing.com",
]);

const IRRELEVANT_DOMAINS = new Set([
  // ── Lead gen / email finder tools ──────────────────────────────────────
  "aeroleads.com","contactout.com","leadz.biz","scrap.io","prospeo.io",
  "neverbounce.com","icrunchdata.com","hireclick.com","bidbro.com",
  "rocketreach.co","zoominfo.com","apollo.io","hunter.io","lusha.com",
  "seamless.ai","clearbit.com","leadiq.com","signalhire.com","skymem.info",
  "email-format.com","findthatlead.com","voilanorbert.com","getprospect.io",
  "snov.io","uplead.com","adapt.io","slintel.com","cognism.com",
  "demandbase.com","6sense.com","bombora.com","oceanos.com",
  "infoglobaldata.com","rentechdigital.com","mooreinfoinc.com",
  "restaurantemaillist.com","emaildatabase.com","listgiant.com",
  "usadata.com","infousa.com","databaseusa.com","salesintel.io",
  "hgdata.com","datanyze.com","builtwith.com","similarweb.com",

  // ── Document / PDF hosting ──────────────────────────────────────────────
  "calameo.com","pdfcoffee.com","anyflip.com","fliphtml5.com",
  "heyzine.com","issuu.com","scribd.com","yumpu.com","slideshare.net",
  "slideserve.com","authorstream.com","slidebean.com","canva.com",
  "prezi.com","emaze.com","zoho.com","docdroid.net","docplayer.net",
  "academia.edu","researchgate.net","pubpub.org","zenodo.org",

  // ── Job boards / recruiting ─────────────────────────────────────────────
  "indeed.com","glassdoor.com","ziprecruiter.com","monster.com",
  "careerbuilder.com","simplyhired.com","dice.com","theladders.com",
  "jobvite.com","greenhouse.io","lever.co","workday.com","taleo.net",
  "icims.com","brassring.com","smartrecruiters.com","recruitee.com",
  "workable.com","bamboohr.com","gusto.com","rippling.com",
  "linkedin.com","hired.com","vetlypetcare.com",

  // ── Social media ────────────────────────────────────────────────────────
  "facebook.com","instagram.com","twitter.com","x.com","tiktok.com",
  "youtube.com","pinterest.com","snapchat.com","reddit.com","tumblr.com",
  "threads.net","whatsapp.com","telegram.org","discord.com",
  "lemon8-app.com","clubhouse.com","mastodon.social",

  // ── Directories / review sites ──────────────────────────────────────────
  "yelp.com","yellowpages.com","tripadvisor.com","bbb.org","manta.com",
  "angi.com","thumbtack.com","homeadvisor.com","houzz.com","angieslist.com",
  "dandb.com","mapquest.com","spoke.com","thebluebook.com","buildzoom.com",
  "bark.com","clutch.co","sortlist.com","goodfirms.co","upcity.com",
  "expertise.com","designrush.com","topratedlocal.com","birdeye.com",
  "superpages.com","whitepages.com","411.com","yellowbook.com",
  "chamberofcommerce.com","morelocal.com","merchantcircle.com",
  "cylex.us","n49.com","hotfrog.com","fyple.com","brownbook.net",
  "elocal.com","showmelocal.com","citysquares.com","judysbook.com",
  "insiderpages.com","demandforce.com","servicemagic.com",

  // ── Content / media / blog platforms ───────────────────────────────────
  "medium.com","substack.com","ghost.io","wordpress.com","blogspot.com",
  "blogger.com","typepad.com","weebly.com","wix.com","hubpages.com",
  "quora.com","wikipedia.org","wikimedia.org","archive.org",
  "web.archive.org","internetarchive.org","waybackmachine.org",
  "thoughtcatalog.com","buzzfeed.com","huffpost.com","vox.com",

  // ── News / media companies ──────────────────────────────────────────────
  "forbes.com","businessinsider.com","inc.com","entrepreneur.com",
  "wsj.com","nytimes.com","washingtonpost.com","usatoday.com",
  "reuters.com","apnews.com","bloomberg.com","cnbc.com","cnn.com",
  "foxnews.com","nbcnews.com","abcnews.go.com","cbsnews.com",

  // ── Marketing / CRM / automation tools ─────────────────────────────────
  "mailchimp.com","constantcontact.com","klaviyo.com","sendgrid.com",
  "hubspot.com","salesforce.com","marketo.com","pardot.com",
  "activecampaign.com","drip.com","convertkit.com","aweber.com",
  "getresponse.com","campaign-archive.com","list-manage.com",
  "mailerlite.com","moosend.com","omnisend.com","sendinblue.com",
  "brevo.com","elasticemail.com","pepipost.com","mailgun.com",
  "postmarkapp.com","sparkpost.com","mandrill.com",

  // ── Chatbot / widget / live chat tools ─────────────────────────────────
  "origami.chat","origamiagents.com","drift.com","intercom.com",
  "crisp.chat","tidio.com","tawk.to","livechat.com","olark.com",
  "zendesk.com","freshdesk.com","helpscout.com","gorgias.com",
  "re.amaze.com","kayako.com","happyfox.com","zopim.com",

  // ── Cloud / CDN / infrastructure ───────────────────────────────────────
  "amazonaws.com","cloudfront.net","s3.amazonaws.com",
  "blob.core.windows.net","azurewebsites.net","azure.com",
  "googleusercontent.com","googleapis.com","appspot.com",
  "nccdn.net","ymaws.com","sites.google.com","sharepoint.com",
  "onmicrosoft.com","office365.com","livemail.com",
  "rymaps.xyz","godaddysites.com","myftpupload.com",
  "websitepro.hosting","squarespace.com","webnode.com",

  // ── eCommerce / marketplaces ────────────────────────────────────────────
  "amazon.com","ebay.com","etsy.com","shopify.com","bigcommerce.com",
  "woocommerce.com","walmart.com","target.com","bestbuy.com",
  "wayfair.com","overstock.com","alibaba.com","aliexpress.com",
  "indiamart.com","flipkart.com","rakuten.com",

  // ── Insurance aggregators ───────────────────────────────────────────────
  "americanquotes.com","americanhomequotes.com","insurancequotes.com",
  "ehealthinsurance.com","policygenius.com","gabi.com",
  "thegeneral.com","progressive.com","allstate.com","statefarm.com",
  "nationwide.com","libertymutual.com","travelers.com",

  // ── HR / payroll ────────────────────────────────────────────────────────
  "adp.com","paychex.com","paylocity.com","kronos.com","ceridian.com",
  "sap.com","workday.com","ultipro.com","namely.com","trinethr.com",

  // ── Review management / reputation ─────────────────────────────────────
  "trustpilot.com","g2.com","capterra.com","softwareadvice.com",
  "getapp.com","producthunt.com","crozdesk.com","sourceforge.net",

  // ── Misc irrelevant ─────────────────────────────────────────────────────
  "dirxion.com","parishesonline.com","bullberry.com","aeroleads.com",
  "fliphtml5.com","wolterskluwer.com","lemon8-app.com","sittercity.com",
  "care.com","rover.com","dogvacay.com","wag.com","petbacker.com",
  "banfield.com","chewy.com","petco.com","petsmart.com","petparadise.com",
  "thrivepetcare.com","vcahospitals.com","bluepearlvet.com",
  "carecredit.com","aspcapetinsurance.com","vippetcare.com",
  "homeadvisor.com","servicemagic.com","porch.com","fixr.com",
  "networx.com","improvenet.com","remodelingexpense.com",
  "controller.com","helphouse.com","targetnxt.com","useworkhero.com",
  "zeffy.com","latofonts.com","indiantypefoundry.com",
  "veooz.com","thevetrecruiter.com","petdesk.com","evetsites.com",
  "seniorsbluebook.com","alumni.com","alumniinsuranceprogram.com",
  "theaip.com","talkbusiness.net","arkansasedc.com","wbrc.com",
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