// remove unwanted domains 

export const filterValidLinks = (links) => {
    const blockedDomains = [
        "instagram.com", 
        "youtube.com", 
        "justdial.com", 
        "facebook.com", 
        "twitter.com"
    ]

    return links.filter((link) => {
        return !blockedDomains.some((domain) => 
            link.includes(domain)
        )
    })

}