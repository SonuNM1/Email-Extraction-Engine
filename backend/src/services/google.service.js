import {chromium} from "playwright"

// extract only valid result links from current page 

const extractLinks = async (page) => {
    return await page.$$eval("a:has(h3)", (elements) =>
    elements.map((el) => el.href)
  );
}

// go to next page 

const goToNextPage = async (page) => {
  try {
    await page.click("#pnnext"); // Google next button
    await page.waitForSelector("h3"); 
    return true;
  } catch (err) {
    return false; 
  }
};

export const search = async (keyword, locations) => {
    
    // launching browser 

    const browser = await chromium.launch({ headless: false})
    const context = await browser.newContext() ; 
    const page = await context.newPage() ; 

    let allLinks = []

    for(const location of locations) {
        const query = `${keyword} in ${location}`

        // go to google 

        await page.goto("https://www.google.com")

        // type search query 

        await page.fill("textarea[name='q']", query) ; 
        await page.keyboard.press("Enter")

        // wait for results to load 

        await page.waitForSelector("h3") ; 

        // no of pages to scrape (MVP 2-3)

        const MAX_PAGES = 15

        for(let i = 0 ; i < MAX_PAGES ; i++){
          
            console.log(`Scraping page ${i + 1} for ${query}`);

            // extract links 

            const links = await extractLinks(page) ; 

            // remove duplicates 

            const uniqueLinks = [... new Set(links)] ; 
            allLinks.push(...uniqueLinks);

            await page.waitForTimeout(2000) ;   // small delay (avoid bot detection) 

            // go to next page 

            const hasNext = await goToNextPage(page) ; 

            if(!hasNext) break ; // stop if no next page 
        }
    }
    await browser.close() ; 

    return [...new Set(allLinks)] ; // final dedupe  
}