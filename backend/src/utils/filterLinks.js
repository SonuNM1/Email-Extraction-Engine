// filterLinks.js

const BLOCKED_EXTENSIONS = /\.(pdf|doc|docx|xls|xlsx|ppt|zip)$/i;

const BLOCKED_DOMAINS = new Set([
  // ❌ directories / aggregators
  'yelp.com',
  'clutch.co',
  'justdial.com',
  'yellowpages.com',
  'angi.com',
  'thumbtack.com',
  'houzz.com',
  'indeed.com',
  'glassdoor.com',

  // ❌ social media
  'facebook.com',
  'instagram.com',
  'linkedin.com',
  'twitter.com',
  'x.com',
  'youtube.com',

  // ❌ builders / junk
  'wixsite.com',
  'wordpress.com',
  'blogspot.com',
]);

// ✅ Extract clean domain
function getDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

// ✅ Check if blocked
function isBlocked(url) {
  const domain = getDomain(url);
  if (!domain) return true;

  // ❌ block extensions
  if (BLOCKED_EXTENSIONS.test(url)) return true;

  // ❌ block edu/gov
  if (domain.endsWith('.edu') || domain.endsWith('.gov')) return true;

  // ❌ block known junk domains
  if ([...BLOCKED_DOMAINS].some(d => domain === d || domain.endsWith('.' + d))) {
    return true;
  }

  return false;
}

// 🔥 MAIN FUNCTION
export function filterLinks(urls) {
  const seenDomains = new Set();
  const cleaned = [];

  for (const url of urls) {
    if (!url) continue;

    const domain = getDomain(url);
    if (!domain) continue;

    // ❌ remove blocked
    if (isBlocked(url)) continue;

    // ❌ remove duplicates (VERY IMPORTANT)
    if (seenDomains.has(domain)) continue;

    seenDomains.add(domain);

    cleaned.push(url);
  }

  console.log(`🔍 Filtered: ${cleaned.length} / ${urls.length} valid business sites`);

  return cleaned;
}