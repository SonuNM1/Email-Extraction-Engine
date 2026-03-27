import { chromium } from "playwright";
import { cleanEmails } from "../utils/cleanEmails.js";
import { safeGoto } from "../utils/safeGoto.js";

// extracting emails from a list of URLs

export const extractEmailsFromUrls = async (urls) => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();

  let allEmails = [];

  for (const url of urls) {
    const page = await context.newPage();

    try {
      console.log(`Visiting: ${url}`);

      const loaded = await safeGoto(page, url) ;

      if(!loaded) {
        await page.close() ; 
        continue ; 
      }

      // STEP 1: extract mailto emails

      const mailtoEmails = await page.$$eval("a[href^='mailto:']", (elements) =>
        elements.map((el) => el.href.replace("mailto:", "").trim()),
      );

      // STEP 2: extract emails from page content (regex)

      const content = await page.content();

      const regexEmails =
        content.match(
          /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.(com|org|net|edu|co|in)\b/gi,
        ) || [];

      // combine both

      const emails = [...mailtoEmails, ...regexEmails];

      const cleaned = cleanEmails(emails);

      allEmails.push(...cleaned);

      if (cleaned.length === 0) {
        console.log(`🚧 No email found on: ${url}`);
      } else {
        console.log(`💕 Found ${emails.length} emails on: ${url}`);
      }

    } catch (error) {
      console.log(`Failed on ${url}`);
      console.log(`Reason: ${error.message}`);
    }

    await page.close();
  }

  await browser.close();

  // remove duplicates

  return allEmails ; 
};
