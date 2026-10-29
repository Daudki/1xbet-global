import { marked } from "marked";

export type Post = {
  slug: string;
  title: string;
  description: string;
  date: string;
  category: string;
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
  const html = (marked.parse(body, { async: false }) as string).replace(
    /<a href="(https?:)/g,
    '<a target="_blank" rel="sponsored nofollow noopener" href="$1'
  );
  return {
    slug: file.split("/").pop()!.replace(/\.md$/, ""),
    title: meta.title ?? "Untitled",
    description: meta.description ?? "",
    date: meta.date ?? "2026-01-01",
    category: meta.category ?? "Guides",
    html,
  };
}

export const posts: Post[] = Object.entries(raw)
  .map(([f, s]) => parse(f, s))
  .sort((a, b) => b.date.localeCompare(a.date));
