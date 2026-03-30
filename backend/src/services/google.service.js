import axios from "axios"

const SERPER_KEY = process.env.SERPER_API_KEY ; 
const SERPER_URL = "https://google.serper.dev/search" ; 
const PAGES = 10 ; // 10 pages x 10 results = 100 URLs per location 

export async function searchLocation(keyword, location){

  const urls = [] ; 

  for(let page = 1 ; page <= PAGES ; page++){
    try {
      const {data} = await axios.post(
        SERPER_URL, 
        {
          q: `${keyword} ${location}`, 
          num: 10, 
          page, 
          gl: 'us', 
          hl: 'en'
        }, 
        {
          headers: { 
            'X-API-KEY': SERPER_KEY, 
            'Content-Type': "application/json"
          }, 
          timeout: 10000 
        }
      )

      const organic = data.organic || [] ; 
      
      organic.forEach(r => r.link && urls.push(r.link)) ; 

    } catch (error) {
      console.error(`Serper error [${location} p${page}]: `, error.message) ; 
    }
  }
  return urls;
}

/*
const extractLinks = async (page) => {
    return await page.$$eval("a:has(h3)", (elements) =>
    elements.map((el) => el.href)
  );
}

const goToNextPage = async (page) => {
  try {
    const nextButton = await page.$("#pnnext") ; 

    if(!nextButton) {
      console.log("❌ No next button found") ; 
      return false ; 
    }

    await Promise.all([
      page.waitForNavigation({ waitUntil: "domcontentloaded"}), 
      nextButton.click() 
    ])

    return true ;

  } catch (error) {
    console.log("⚠️Pagination failed: ", error.message) ; 
    return false 
  }
};

export const search = async (keyword, locations) => {
    
    // launching browser 

    const browser = await chromium.launch({ headless: false})
    const context = await browser.newContext() ; 
    const page = await context.newPage() ; 

    let allLinks = []

    for(const location of locations) {
        const query = `${keyword} in ${location} inurl:contact email`

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
*/

