// Shared by the sitemap and pre-render scripts: loads every post (API articles + .md files).
import { readdirSync, readFileSync } from "node:fs";
import { marked } from "marked";

export const cfg = readFileSync("src/config.ts", "utf8");
export const SITE_URL = cfg.match(/SITE_URL = "([^"]+)"/)[1];
export const SITE_NAME = cfg.match(/SITE_NAME = "([^"]+)"/)[1];

export const render = (md) =>
  marked
    .parse(md, { async: false })
    .replace(/<a href="(https?:)/g, '<a target="_blank" rel="sponsored nofollow noopener" href="$1');

export function loadPosts() {
  const dir = "src/content/posts";
  const fromMd = readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => {
      const src = readFileSync(`${dir}/${f}`, "utf8");
      const m = src.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
      const meta = {};
      (m?.[1] ?? "").split(/\r?\n/).forEach((l) => {
        const i = l.indexOf(":");
        if (i > 0) meta[l.slice(0, i).trim()] = l.slice(i + 1).trim().replace(/^["']|["']$/g, "");
      });
      return {
        slug: f.replace(/\.md$/, ""),
        title: meta.title ?? "Untitled",
        description: meta.description ?? "",
        category: meta.category ?? "Guides",
        date: meta.date ?? "2026-01-01",
        cover: null,
        html: render(m ? m[2] : src),
      };
    });
  const fromApi = JSON.parse(readFileSync("src/content/articles.json", "utf8")).map((a) => ({
    ...a,
    html: render(a.body),
  }));
  const seen = new Set(fromApi.map((a) => a.slug));
  return [...fromApi, ...fromMd.filter((p) => !seen.has(p.slug))].sort((a, b) =>
    b.date.localeCompare(a.date)
  );
}
