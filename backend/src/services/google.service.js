import "dotenv/config";
import axios from "axios";

const SERPER_KEY = process.env.SERPER_API_KEY;
const SERPER_URL = "https://google.serper.dev/search";
const PAGES = 5;

// Generic templates that work for any service keyword

const QUERY_TEMPLATES = [
  (kw, loc) =>
    `"${kw}" "${loc}" "contact" "email" -site:.edu -site:.gov -site:.org -india -nigeria -pakistan -uganda -africa`,

  (kw, loc) =>
    `"${kw}" "${loc}" inurl:contact -directory -listing -jobs -careers -blog -news`,

  (kw, loc) =>
    `"${kw}" "${loc}" "@${kw.split(" ")[0]}" -pdf -doc -directory -listing`,

  (kw, loc) =>
    `${kw} ${loc} company contact email -site:.edu -site:.gov -site:.org -india -91 -92 -234 -27`,
];

export async function searchLocation(keyword, location) {
  const urlSet = new Set();

  for (const template of QUERY_TEMPLATES) {
    const query = template(keyword, location);
    for (let page = 1; page <= PAGES; page++) {
      try {
        const { data } = await axios.post(
          SERPER_URL,
          { q: query, num: 10, page, gl: "us", hl: "en" },
          {
            headers: {
              "X-API-KEY": SERPER_KEY,
              "Content-Type": "application/json",
            },
            timeout: 10000,
          },
        );
        (data.organic || []).forEach((r) => r.link && urlSet.add(r.link));
      } catch (err) {
        console.error(`Serper error [${location} p${page}]:`, err.message);
      }
    }
  }

  return [...urlSet];
}
