import axios from "axios";
import { chromium } from "playwright";

const AXIOS_TIMEOUT = 8000;
const PW_TIMEOUT = 20000;

let browser = null;

export async function getBrowser() {
  if (!browser) {
    browser = await chromium.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-blink-features=AutomationControlled",
      ],
    });
  }
  return browser;
}

export async function closeBrowser() {
  if (browser) {
    await browser.close();
    browser = null;
  }
}

async function fetchWithAxios(url) {
  const { data } = await axios.get(url, {
    timeout: AXIOS_TIMEOUT,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.5",
    },
    maxRedirects: 5,
  });
  return typeof data === "string" ? data : "";
}

async function fetchWithPlaywright(url, b) {
  const page = await b.newPage();
  try {
    await page.setExtraHTTPHeaders({
      "Accept-Language": "en-US,en;q=0.9",
    });
    // Mask automation signals
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => undefined });
    });

    await page.goto(url, { waitUntil: "domcontentloaded", timeout: PW_TIMEOUT });

    // Wait for any lazy-loaded content
    await page.waitForTimeout(1500);

    // Scroll to trigger lazy load
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(800);

    // Try clicking any "Contact" link on the page to load contact info
    try {
      const contactLink = await page.$('a[href*="contact"]');
      if (contactLink) {
        await contactLink.click();
        await page.waitForTimeout(1200);
      }
    } catch (_) {}

    return await page.content();
  } catch {
    return "";
  } finally {
    await page.close();
  }
}

// Main export used by emailExtractor
export async function fetchHtmlSmart(url, browserInstance) {
  // 1. Try axios first (fast)
  try {
    const html = await fetchWithAxios(url);
    if (html && html.length > 800) return { html, method: "axios" };
  } catch (_) {}

  // 2. Fallback to playwright
  try {
    const b = browserInstance || (await getBrowser());
    const html = await fetchWithPlaywright(url, b);
    return { html, method: "playwright" };
  } catch (_) {
    return { html: "", method: "failed" };
  }
}