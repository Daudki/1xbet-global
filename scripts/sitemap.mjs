import { writeFileSync } from "node:fs";
import { loadPosts, SITE_URL } from "./content.mjs";

const urls = [
  { loc: `${SITE_URL}/`, pri: "1.0" },
  { loc: `${SITE_URL}/blog`, pri: "0.9" },
  ...loadPosts().map((p) => ({ loc: `${SITE_URL}/blog/${p.slug}`, pri: "0.8", date: p.date })),
];
const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
  .map((u) => `  <url><loc>${u.loc}</loc>${u.date ? `<lastmod>${u.date}</lastmod>` : ""}<priority>${u.pri}</priority></url>`)
  .join("\n")}\n</urlset>\n`;
writeFileSync("public/sitemap.xml", xml);
console.log(`sitemap: ${urls.length} urls`);
