// After `vite build`: writes real HTML for /blog and every article so Google sees the content
// without running JavaScript. React replaces this markup when the page loads.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { loadPosts, SITE_NAME, SITE_URL } from "./content.mjs";

const tpl = readFileSync("dist/index.html", "utf8");
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

function page({ title, description, path, body, ld, image }) {
  let h = tpl.replace(/<title>[^<]*<\/title>/, () => `<title>${esc(title)}</title>`);
  const meta = (attr, key, val) => {
    h = h.replace(new RegExp(`(<meta\\s+${attr}="${key}"\\s+content=")[^"]*(")`), (_m, a, b) => a + esc(val) + b);
  };
  meta("name", "description", description);
  meta("property", "og:title", title);
  meta("property", "og:description", description);
  meta("property", "og:url", SITE_URL + path);
  if (image) meta("property", "og:image", image);
  h = h.replace(/(<link\s+rel="canonical"\s+href=")[^"]*(")/, (_m, a, b) => a + esc(SITE_URL + path) + b);
  if (ld)
    h = h.replace("</head>", () => `<script type="application/ld+json" id="ld-json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script></head>`);
  return h.replace('<div id="root"></div>', () => `<div id="root">${body}</div>`);
}

function write(path, html) {
  const dir = `dist${path}`;
  mkdirSync(dir, { recursive: true });
  writeFileSync(`${dir}/index.html`, html);
}

const posts = loadPosts();

write("/blog", page({
  title: `Betting Tips, Guides & Previews | ${SITE_NAME}`,
  description: "Match previews, betting guides and promo code pages for beginners and regulars.",
  path: "/blog",
  body: `<main><h1>Betting Tips & Guides</h1><ul>${posts
    .map((p) => `<li><a href="/blog/${p.slug}">${esc(p.title)}</a> <p>${esc(p.description)}</p></li>`)
    .join("")}</ul></main>`,
}));

for (const p of posts) {
  write(`/blog/${p.slug}`, page({
    title: `${p.title} | ${SITE_NAME}`,
    description: p.description,
    path: `/blog/${p.slug}`,
    image: p.cover || undefined,
    body: `<article><h1>${esc(p.title)}</h1>${p.cover ? `<img src="${esc(p.cover)}" alt="${esc(p.title)}">` : ""}${p.html}</article>`,
    ld: {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: p.title,
      description: p.description,
      datePublished: p.date,
      ...(p.cover ? { image: p.cover } : {}),
      mainEntityOfPage: `${SITE_URL}/blog/${p.slug}`,
      publisher: { "@type": "Organization", name: SITE_NAME },
    },
  }));
}
console.log(`prerender: ${posts.length} articles + /blog`);
