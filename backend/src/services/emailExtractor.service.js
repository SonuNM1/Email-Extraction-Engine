import axios from 'axios';
import * as cheerio from 'cheerio';
import pLimit from 'p-limit';
import { chromium } from 'playwright';

const EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
const CONTACT_PATHS = ['/contact', '/contact-us', '/about', '/about-us'];
const CONCURRENCY = 12;
const AXIOS_TIMEOUT = 8000;
const PW_TIMEOUT = 15000;

function extractEmails(html) {
  const found = html.match(EMAIL_RE) || [];
  return found
    .map(e => e.toLowerCase().trim())
    .filter(e => !e.endsWith('.png') && !e.endsWith('.jpg') && !e.includes('example.com'));
}

async function fetchWithAxios(url) {
  const { data } = await axios.get(url, {
    timeout: AXIOS_TIMEOUT,
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)' },
    maxRedirects: 5,
  });
  return typeof data === 'string' ? data : '';
}

async function fetchWithPlaywright(url) {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: PW_TIMEOUT });
    return await page.content();
  } finally {
    await browser.close();
  }
}

async function getEmailsFromUrl(url) {
  const emails = new Set();

  const tryFetch = async (targetUrl) => {
    let html = '';
    try {
      html = await fetchWithAxios(targetUrl);
    } catch {
      try {
        html = await fetchWithPlaywright(targetUrl);
      } catch {
        return; // both failed — skip
      }
    }
    extractEmails(html).forEach(e => emails.add(e));
  };

  // Main page
  await tryFetch(url);

  // Contact/about pages (only if main page had no emails)
  if (emails.size === 0) {
    const base = new URL(url).origin;
    for (const path of CONTACT_PATHS) {
      await tryFetch(base + path);
      if (emails.size > 0) break;
    }
  }

  return [...emails];
}

export async function extractEmailsFromUrls(urls, keyword, location) {
  const limit = pLimit(CONCURRENCY);
  const results = [];

  await Promise.all(
    urls.map(url =>
      limit(async () => {
        const emails = await getEmailsFromUrl(url);
        emails.forEach(email => {
          results.push({ email, website: url, location, keyword });
        });
      })
    )
  );

  // Deduplicate by email address
  const seen = new Set();
  return results.filter(r => {
    if (seen.has(r.email)) return false;
    seen.add(r.email);
    return true;
  });
}