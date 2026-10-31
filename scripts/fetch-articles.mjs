// Pulls published articles from the API into src/content/articles.json before dev/build.
import { existsSync, writeFileSync } from "node:fs";

const OUT = "src/content/articles.json";
const API = (process.env.VITE_API_URL || "").replace(/\/$/, "");
if (!existsSync(OUT)) writeFileSync(OUT, "[]\n");
if (!API) {
  console.log("articles: VITE_API_URL not set, keeping the existing file");
  process.exit(0);
}

let lastErr;
for (let i = 1; i <= 4; i++) {
  try {
    const res = await fetch(`${API}/api/articles?full=1`, { signal: AbortSignal.timeout(60000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const { articles } = await res.json();
    const out = articles.map((a) => ({
      slug: a.slug,
      title: a.title,
      description: a.description,
      category: a.category,
      date: (a.publishedAt || a.createdAt).slice(0, 10),
      cover: a.cover?.url ?? null,
      body: a.body,
    }));
    writeFileSync(OUT, JSON.stringify(out, null, 1) + "\n");
    console.log(`articles: ${out.length} fetched from the API`);
    process.exit(0);
  } catch (e) {
    lastErr = e;
    console.warn(`articles: attempt ${i} failed (${e.message})`);
    await new Promise((r) => setTimeout(r, 5000));
  }
}
// Failing the build is safer than publishing a site that silently lost its articles.
console.error(`articles: API unreachable (${lastErr?.message}). Build stopped.`);
process.exit(1);
