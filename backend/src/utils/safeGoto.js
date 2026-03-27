// helper function - retry logic. While scraping: page fails to load, timeout, temporary block, slow server. Without retry, 1 failure = data lost. With retry: try -> fail -> retry -> retry -> then fail . Higher success rate, recovers from temporary issues 

export const safeGoto = async (page, url, retries = 2) => {
    for(let i = 0; i <= retries ; i++) {
        try {
            await page.goto(url, {
                timeout: 15000, 
                waitUntil: "domcontentloaded" 
            })

            return true; 
        } catch (error) {
            if (i === retries) {
                console.log(`❌ Failed permanently: ${url}`) ; 
                return false ; 
            }
            console.log(`🔄 Retrying ${url} (${i + 1})`) ; 
        }
    }
}