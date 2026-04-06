export const NEGATIVE_FILTERS = `
 -site:linkedin.com
 -site:facebook.com
 -site:instagram.com
 -site:twitter.com
 -site:x.com
 -site:yelp.com
 -site:yellowpages.com
 -site:tripadvisor.com
 -site:crunchbase.com
 -site:zoominfo.com
 -site:apollo.io
 -site:bbb.org
 -site:manta.com
 -site:glassdoor.com
 -site:indeed.com
 -site:wikipedia.org
 -inurl:directory
 -inurl:listing
 -inurl:profile
 -inurl:job
 -inurl:careers
 -inurl:login
 -inurl:signup
 -filetype:pdf
 -filetype:doc
 -filetype:xls
`.trim();

// 5 highest-signal templates (down from 8 — saves 37% Serper credits)
export const QUERY_TEMPLATES = [
  (kw, loc) => `"${kw}" "${loc}" "contact us" ${NEGATIVE_FILTERS}`,
  (kw, loc) => `"${kw}" "${loc}" "contact@" OR "info@" OR "sales@" ${NEGATIVE_FILTERS}`,
  (kw, loc) => `"${kw}" "${loc}" "about us" ${NEGATIVE_FILTERS}`,
  (kw, loc) => `"${kw}" "${loc}" "get in touch" ${NEGATIVE_FILTERS}`,
  (kw, loc) => `"${kw}" "${loc}" email ${NEGATIVE_FILTERS}`,
];