const BLOCKED_DOMAINS = new Set([
  // Social
  "linkedin.com","facebook.com","instagram.com","twitter.com","x.com",
  "threads.com","youtube.com","tiktok.com","pinterest.com",
  // Directories
  "yelp.com","yellowpages.com","tripadvisor.com","bbb.org","manta.com",
  "angi.com","thumbtack.com","homeadvisor.com","houzz.com","angieslist.com",
  "dandb.com","mapquest.com","spoke.com","thebluebook.com","buildzoom.com",
  // Lead gen / email harvesting tools (not real businesses)
  "apollo.io","zoominfo.com","crunchbase.com","lusha.com","seamless.ai",
  "hunter.io","clearbit.com","rocketreach.co","lead411.com","signalhire.com",
  "skymem.info","email-format.com","leadiq.com","scrap.io","prospeo.io",
  "neverbounce.com","icrunchdata.com","aeroleads.com","contactout.com",
  // Job sites
  "indeed.com","glassdoor.com","ziprecruiter.com","monster.com","linkedin.com",
  // Content/media CDNs (not business websites)
  "issuu.com","scribd.com","calameo.com","fliphtml5.com","heyzine.com",
  "yumpu.com","medium.com","substack.com","archive.org",
  "amazonaws.com","blob.core.windows.net","ymaws.com","nccdn.net",
  // Misc irrelevant
  "wordpress.com","wixsite.com","blogspot.com","weebly.com",
  "squarespace.com","ebay.com","amazon.com","indiamart.com","reddit.com",
  "quora.com","wikipedia.org","bing.com","google.com",
]);

const SPAM_NETWORKS = new Set([
  "roofingbaltimoremaryland.com","mdroofingmasonry.com","metalsroofing.com",
  "lochnerroofing.com","langandsonroofing.com","proroofingconstruction.us",
  "eagleroofingwallsystems.com","retro-roofing.com","advantedgeroofing.com",
  "jfprofessionalroofing.com","bullberry.com",
]);

export function getDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch { return null; }
}

function getRootDomain(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
    const parts = host.split(".");
    return parts.slice(-2).join(".");
  } catch { return ""; }
}

export function isBlockedUrl(url) {
  const domain = getDomain(url);
  if (!domain) return true;

  // Block .gov and .edu always
  if (/\.(gov|edu|mil)$/i.test(domain)) return true;

  // Block .org — almost never a business with email leads
  if (/\.org$/i.test(domain)) return true;

  // Block ALL foreign ccTLDs — we want US businesses only
  // .com .net .us .biz .io are fine — everything else is suspect
  const tld = domain.split(".").pop();
  const allowedTlds = new Set(["com","net","us","biz","io","co","info"]);
  if (tld && tld.length === 2 && !allowedTlds.has(tld)) return true; // 2-letter = country code

  const root = getRootDomain(url);

  // Block spam networks (subdomain farms)
  if (SPAM_NETWORKS.has(root)) return true;

  // Block known junk domains
  for (const blocked of BLOCKED_DOMAINS) {
    if (domain === blocked || domain.endsWith("." + blocked)) return true;
  }

  return false;
}

export function cleanUrl(url) {
  try { return new URL(url).origin; }
  catch { return null; }
}