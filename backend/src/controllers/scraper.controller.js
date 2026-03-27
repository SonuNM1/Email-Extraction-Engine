import { search } from "../services/google.service.js"
import { extractEmailsFromUrls } from "../services/emailExtractor.service.js";
import { filterValidLinks } from "../utils/filterLinks.js";

export const runScraper = async (req, res) => {
    try {
        const {keyword, locations} = req.body 

        console.log("BODY:", req.body);

        if(!keyword || !locations){
            return res.status(400).json({
                success: false, 
                message: "Keyword and locations are required"
            })
        }

        // call service - get links from google 

        const links = await search(keyword, locations) 

        // filter bad links 

        const validLinks = filterValidLinks(links) ; 

        // extract emails 

        const emails = await extractEmailsFromUrls(validLinks) ; 

        res.json({
            success: true,  
            totalLinks: links.length, 
            validLinks: validLinks.length, 
            emailCount: emails.length, 
            emails 
        })

    } catch (error) {
        console.error("Run scraper error: ", error) ; 

        res.status(500).json({
            success: false, 
            message: error.message || "Scraper failed"
        })
    }
}