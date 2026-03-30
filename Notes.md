## What is cheerio? (and what is jQuery?)

- HTML is a tree of tags — divs, anchors, spans. To find specific things inside it (like all email links), you need a way to search that tree.

- jQuery is a browser tool from the 2000s that made searching HTML easy with syntax like $('a') to find all anchor tags.

- cheerio is the exact same idea but runs on the server, not in a browser. You feed it raw HTML text, it parses the tree, then you search it: $('a[href^="mailto:"]') finds every link that starts with mailto: — which is how websites embed email addresses.

- Analogy: axios fetches the newspaper. cheerio is the highlighter you use to mark every email address you find in it.

## What is p-limit and when do you need it?

- You have ~1500 URLs to visit. If you fire all 1500 at once with Promise.all(), three things happen: your server runs out of memory, you get IP-banned by websites, and Node crashes.

- p-limit says: "no matter how many URLs are in the queue, only run 12 at the same time." When one finishes, the next one starts. It is a concurrency gate.

- You use p-limit any time you have a large list of async tasks and need to control how many run simultaneously.

## What is a "Job" in MongoDB and why do we need it?

- A Job is a document you save in MongoDB that tracks the entire lifecycle of one scrape run.

- Without it: if your server crashes at location 30 of 55, you lose everything and start over. The frontend has no way to show progress. You can't export results until everything is done.

- With it: every location's result is saved to MongoDB as it completes. Crash at 30? Resume from 30. The frontend polls the job document every 5 seconds to show a live progress bar. When done, the CSV is generated from what's stored in the job.

- A Job is just a MongoDB document — like a row in a database — that holds: the keyword, the status of all 55 locations, all found emails, and timestamps.