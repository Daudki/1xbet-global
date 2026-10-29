import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { posts } from "./posts";
import { PROMO_CODE, REGISTER_URL, SITE_NAME, SITE_URL } from "./config";

function useSeo(title: string, description: string, path: string, ld?: object) {
  useEffect(() => {
    document.title = title;
    const set = (sel: string, attr: string, val: string) =>
      document.head.querySelector(sel)?.setAttribute(attr, val);
    set('meta[name="description"]', "content", description);
    set('link[rel="canonical"]', "href", SITE_URL + path);
    set('meta[property="og:title"]', "content", title);
    set('meta[property="og:description"]', "content", description);
    set('meta[property="og:url"]', "content", SITE_URL + path);
    let el = document.getElementById("ld-json");
    if (ld) {
      if (!el) {
        el = document.createElement("script");
        el.id = "ld-json";
        el.setAttribute("type", "application/ld+json");
        document.head.appendChild(el);
      }
      el.textContent = JSON.stringify(ld);
    }
    return () => el?.remove();
  }, [title, description, path, ld]);
}

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#05080f] text-white">
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <Link to="/" className="font-bold">
            {SITE_NAME}
          </Link>
          <nav className="flex items-center gap-4 text-sm text-white/80">
            <Link to="/blog">Blog</Link>
            <a
              href={REGISTER_URL}
              target="_blank"
              rel="sponsored nofollow noopener"
              className="rounded-lg bg-[#0a5cff] px-3 py-1.5 font-semibold text-white"
            >
              Register
            </a>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-8">{children}</main>
      <footer className="border-t border-white/10 px-4 py-6 text-center text-xs text-white/50">
        18+ only. Gamble responsibly. This site contains affiliate links; we may
        earn a commission at no cost to you. Betting laws vary by country, so
        check yours before you play.
      </footer>
    </div>
  );
}

function Cta() {
  return (
    <div className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-6">
      <p className="font-semibold">
        Ready to start? Register with promo code{" "}
        <span className="text-[#4d8bff]">{PROMO_CODE}</span>.
      </p>
      <a
        href={REGISTER_URL}
        target="_blank"
        rel="sponsored nofollow noopener"
        className="mt-4 inline-block rounded-lg bg-[#0a5cff] px-5 py-2.5 font-semibold"
      >
        Register now
      </a>
    </div>
  );
}

export function BlogIndex() {
  useSeo(
    `Betting Tips, Guides & Previews | ${SITE_NAME}`,
    "Match previews, betting guides and promo code pages for beginners and regulars.",
    "/blog"
  );
  return (
    <Layout>
      <h1 className="text-3xl font-bold">Betting Tips & Guides</h1>
      <ul className="mt-8 space-y-4">
        {posts.map((p) => (
          <li key={p.slug}>
            <Link
              to={`/blog/${p.slug}`}
              className="block rounded-xl border border-white/10 p-5 hover:bg-white/5"
            >
              <span className="text-xs uppercase text-[#4d8bff]">
                {p.category} · {p.date}
              </span>
              <h2 className="mt-1 text-xl font-semibold">{p.title}</h2>
              <p className="mt-1 text-sm text-white/70">{p.description}</p>
            </Link>
          </li>
        ))}
      </ul>
    </Layout>
  );
}

export function BlogPost() {
  const { slug } = useParams();
  const post = posts.find((p) => p.slug === slug);
  useSeo(
    post ? `${post.title} | ${SITE_NAME}` : `Not found | ${SITE_NAME}`,
    post?.description ?? "",
    `/blog/${slug}`,
    post && {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: post.title,
      description: post.description,
      datePublished: post.date,
      mainEntityOfPage: `${SITE_URL}/blog/${post.slug}`,
      publisher: { "@type": "Organization", name: SITE_NAME },
    }
  );
  if (!post)
    return (
      <Layout>
        <p>Article not found. <Link to="/blog" className="underline">Back to blog</Link></p>
      </Layout>
    );
  return (
    <Layout>
      <article>
        <p className="text-xs uppercase text-[#4d8bff]">
          {post.category} · {post.date}
        </p>
        <h1 className="mt-2 text-3xl font-bold">{post.title}</h1>
        <div
          className="post-body mt-6"
          dangerouslySetInnerHTML={{ __html: post.html }}
        />
      </article>
      <Cta />
    </Layout>
  );
}
