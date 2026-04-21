EMAIL SCRAPE TOOL - V2 FEATURES
================================

1. DIRECTORY SCRAPING (free, no Serper API)
   - Sources: Manta.com, BBB.org, Expertise.com
   - Scrape with plain Axios, no API key needed
   - Feed extracted business websites into 
     existing emailExtractor.js pipeline

2. TWO-COLUMN UI LAYOUT
   - Left column:  Google Search (current system)
   - Right column: Directories (new system)
   - Both run simultaneously when user hits EXECUTE
   - Whichever finishes first → download available immediately

3. SEPARATE EXCEL PER SOURCE
   - plumber_chicago_google.xlsx
   - plumber_chicago_directories.xlsx
   - Two separate job documents in MongoDB
   - Two separate download buttons

4. PER-DIRECTORY EMAIL COUNTS shown in UI
   - Manta: 18 emails
   - BBB: 14 emails  
   - Expertise: 10 emails

5. FILES THAT NEED CHANGES
   New:      directoryExtractor.js
   Modified: scraper.controller.js (parallel jobs)
             job.model.js (sourceType field)
             HomePage.tsx (two-column layout)
             useScrapeJob.ts (two jobs simultaneously)
   Same:     emailExtractor.js
             excel.service.js
             search.service.js
             maps.service.js

6. EXPECTED IMPROVEMENT
   Current:  65 emails, 5 min, ~$0.01/run
   V2:       130+ emails, same 5-6 min, same cost