import { marked } from "marked";
import { embedVideos } from "./lib/video";
import api from "./content/articles.json";

export type Post = {
  slug: string;
  title: string;
  description: string;
  date: string;
  category: string;
  cover?: string | null;
  html: string;
};

const raw = import.meta.glob("./content/posts/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

function parse(file: string, src: string): Post {
  const m = src.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  const meta: Record<string, string> = {};
  (m?.[1] ?? "").split(/\r?\n/).forEach((line) => {
    const i = line.indexOf(":");
    if (i > 0)
      meta[line.slice(0, i).trim()] = line
        .slice(i + 1)
        .trim()
        .replace(/^["']|["']$/g, "");
  });
  const body = m ? m[2] : src;
  const html = embedVideos(link(marked.parse(body, { async: false }) as string));
  return {
    slug: file.split("/").pop()!.replace(/\.md$/, ""),
    title: meta.title ?? "Untitled",
    description: meta.description ?? "",
    date: meta.date ?? "2026-01-01",
    category: meta.category ?? "Guides",
    html,
  };
}

const link = (h: string) =>
  h.replace(/<a href="(https?:)/g, '<a target="_blank" rel="sponsored nofollow noopener" href="$1');

const fromApi: Post[] = (
  api as { slug: string; title: string; description: string; category: string; date: string; cover: string | null; body: string }[]
).map((a) => ({
  slug: a.slug,
  title: a.title,
  description: a.description,
  category: a.category,
  date: a.date,
  cover: a.cover,
  html: embedVideos(link(marked.parse(a.body, { async: false }) as string)),
}));
const seen = new Set(fromApi.map((a) => a.slug));

export const posts: Post[] = [
  ...fromApi,
  ...Object.entries(raw)
    .map(([f, s]) => parse(f, s))
    .filter((p) => !seen.has(p.slug)),
].sort((a, b) => b.date.localeCompare(a.date));
