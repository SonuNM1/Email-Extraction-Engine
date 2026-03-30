const BLOCKED = [
  'yelp.com', 'yellowpages.com', 'angi.com', 'homeadvisor.com',
  'bbb.org', 'facebook.com', 'instagram.com', 'linkedin.com',
  'twitter.com', 'x.com', 'google.com', 'mapquest.com',
  'thumbtack.com', 'houzz.com', 'angieslist.com', 'bark.com',
  'porch.com', 'nextdoor.com', 'reddit.com', 'bing.com',
];

export function filterLinks(urls) {
  const seen = new Set();
  return urls.filter(url => {
    try {
      const { hostname } = new URL(url);
      const clean = hostname.replace(/^www\./, '');
      if (seen.has(clean)) return false;
      if (BLOCKED.some(b => clean === b || clean.endsWith('.' + b))) return false;
      seen.add(clean);
      return true;
    } catch {
      return false;
    }
  });
}