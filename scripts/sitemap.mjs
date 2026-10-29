import { readdirSync, readFileSync, writeFileSync } from "node:fs";
const SITE = "https://sportsbet-tips.com";
const dir = "src/content/posts";
const urls = [{ loc: `${SITE}/`, pri: "1.0" }, { loc: `${SITE}/blog`, pri: "0.9" }];
for (const f of readdirSync(dir).filter((f) => f.endsWith(".md"))) {
  const date = readFileSync(`${dir}/${f}`, "utf8").match(/^date:\s*(.+)$/m)?.[1]?.trim();
  urls.push({ loc: `${SITE}/blog/${f.replace(/\.md$/, "")}`, pri: "0.8", date });
}
const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
  .map((u) => `  <url><loc>${u.loc}</loc>${u.date ? `<lastmod>${u.date}</lastmod>` : ""}<priority>${u.pri}</priority></url>`)
  .join("\n")}\n</urlset>\n`;
writeFileSync("public/sitemap.xml", xml);
console.log(`sitemap: ${urls.length} urls`);
