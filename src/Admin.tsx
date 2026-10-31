import { useEffect, useRef, useState } from "react";
import { Link, Route, Routes, useNavigate, useParams } from "react-router-dom";
import { marked } from "marked";
import { api, getToken, setToken } from "./lib/api";
import { uploadImage, type Uploaded } from "./lib/uploads";

const input =
  "w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm outline-none focus:border-[#4d8bff]";
const btn = "rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50";

type Item = {
  id: string; slug: string; title: string; description: string; category: string;
  status: "draft" | "published"; cover: Uploaded | null; body?: string; publishedAt: string | null;
};

function Login({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true);
    setErr("");
    try {
      const r = await api<{ token: string }>("/api/auth/login", { method: "POST", body: { email, password } });
      setToken(r.token);
      onDone();
    } catch (e) {
      setErr((e as Error).message);
    }
    setBusy(false);
  };
  return (
    <div className="mx-auto mt-24 max-w-sm space-y-3">
      <h1 className="text-xl font-bold">Sign in</h1>
      <input className={input} placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input className={input} type="password" placeholder="Password" value={password}
        onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && go()} />
      {err && <p className="text-sm text-red-400">{err}</p>}
      <button className={`${btn} w-full bg-[#0a5cff]`} disabled={busy} onClick={go}>Sign in</button>
    </div>
  );
}

function List() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [err, setErr] = useState("");
  const load = () =>
    api<{ articles: Item[] }>("/api/manage/articles", { auth: true })
      .then((r) => setItems(r.articles))
      .catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);
  const del = async (a: Item) => {
    if (!confirm(`Delete "${a.title}"?`)) return;
    try {
      await api(`/api/manage/articles/${a.id}`, { method: "DELETE", auth: true });
      load();
    } catch (e) { setErr((e as Error).message); }
  };
  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Articles</h1>
        <Link to="/admin/new" className={`${btn} bg-[#0a5cff]`}>New article</Link>
      </div>
      {err && <p className="mt-3 text-sm text-red-400">{err}</p>}
      <ul className="mt-6 space-y-2">
        {items?.map((a) => (
          <li key={a.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 p-4">
            <div className="min-w-0">
              <p className="truncate font-semibold">{a.title}</p>
              <p className="text-xs text-white/50">
                <span className={a.status === "published" ? "text-green-400" : "text-yellow-400"}>{a.status}</span>
                {" · "}/blog/{a.slug}
              </p>
            </div>
            <div className="flex shrink-0 gap-2 text-sm">
              <Link to={`/admin/edit/${a.id}`} className="underline">Edit</Link>
              <button className="text-red-400" onClick={() => del(a)}>Delete</button>
            </div>
          </li>
        ))}
        {items?.length === 0 && <p className="text-white/60">No articles yet.</p>}
      </ul>
    </div>
  );
}

function Editor() {
  const { id } = useParams();
  const nav = useNavigate();
  const ta = useRef<HTMLTextAreaElement>(null);
  const [f, setF] = useState({ title: "", slug: "", description: "", category: "Guides", body: "" });
  const [cover, setCover] = useState<Uploaded | null>(null);
  const [preview, setPreview] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    if (!id) return;
    api<{ article: Item }>(`/api/manage/articles/${id}`, { auth: true })
      .then(({ article: a }) => {
        setF({ title: a.title, slug: a.slug, description: a.description, category: a.category, body: a.body ?? "" });
        setCover(a.cover);
      })
      .catch((e) => setErr(e.message));
  }, [id]);

  const pick = (cb: (u: Uploaded) => void) => {
    const i = document.createElement("input");
    i.type = "file";
    i.accept = "image/jpeg,image/png,image/webp,image/gif";
    i.onchange = async () => {
      if (!i.files?.[0]) return;
      setBusy(true);
      setErr("");
      try { cb(await uploadImage(i.files[0])); } catch (e) { setErr((e as Error).message); }
      setBusy(false);
    };
    i.click();
  };
  const addInline = () =>
    pick((u) => {
      const alt = prompt("Describe the image (helps SEO):") || "image";
      set("body", `${f.body}\n\n![${alt}](${u.url})\n`);
      ta.current?.focus();
    });

  const save = async (status: "draft" | "published") => {
    setBusy(true);
    setErr("");
    try {
      await api(id ? `/api/manage/articles/${id}` : "/api/manage/articles", {
        method: id ? "PATCH" : "POST", auth: true, body: { ...f, status, cover },
      });
      nav("/admin");
    } catch (e) { setErr((e as Error).message); }
    setBusy(false);
  };

  return (
    <div className="space-y-3">
      <Link to="/admin" className="text-sm underline">← Articles</Link>
      <input className={input} placeholder="Title" value={f.title} onChange={(e) => set("title", e.target.value)} />
      <div className="grid gap-3 sm:grid-cols-2">
        <input className={input} placeholder="URL slug (auto from title if empty)" value={f.slug}
          onChange={(e) => set("slug", e.target.value)} />
        <input className={input} placeholder="Category" value={f.category} onChange={(e) => set("category", e.target.value)} />
      </div>
      <input className={input} placeholder="Description for Google (max 200 characters)" value={f.description}
        onChange={(e) => set("description", e.target.value)} />
      <div className="flex items-center gap-3 text-sm">
        {cover && <img src={cover.url} alt="" className="h-12 w-20 rounded object-cover" />}
        <button className={`${btn} bg-white/10`} disabled={busy} onClick={() => pick(setCover)}>
          {cover ? "Change cover" : "Add cover image"}
        </button>
        {cover && <button className="text-red-400" onClick={() => setCover(null)}>Remove</button>}
        <button className={`${btn} ml-auto bg-white/10`} disabled={busy} onClick={addInline}>Insert image</button>
        <button className={`${btn} bg-white/10`} onClick={() => setPreview(!preview)}>{preview ? "Edit" : "Preview"}</button>
      </div>
      {preview ? (
        <div className="post-body min-h-80 rounded-lg border border-white/15 p-4"
          dangerouslySetInnerHTML={{ __html: marked.parse(f.body, { async: false }) as string }} />
      ) : (
        <textarea ref={ta} className={`${input} min-h-80 font-mono`} value={f.body}
          placeholder={"Write in Markdown.\n\n## Heading\n- bullet\n[link text](https://...)"}
          onChange={(e) => set("body", e.target.value)} />
      )}
      {err && <p className="text-sm text-red-400">{err}</p>}
      <div className="flex gap-3">
        <button className={`${btn} bg-white/10`} disabled={busy} onClick={() => save("draft")}>Save draft</button>
        <button className={`${btn} bg-[#0a5cff]`} disabled={busy} onClick={() => save("published")}>Publish</button>
      </div>
      <p className="text-xs text-white/50">Published articles appear on the site after the automatic rebuild (about a minute).</p>
    </div>
  );
}

export default function Admin() {
  const [authed, setAuthed] = useState(Boolean(getToken()));
  useEffect(() => {
    document.title = "Admin";
    const m = document.createElement("meta");
    m.name = "robots";
    m.content = "noindex,nofollow";
    document.head.appendChild(m);
    return () => m.remove();
  }, []);
  return (
    <div className="min-h-screen bg-[#05080f] text-white">
      <div className="mx-auto max-w-3xl px-4 py-8">
        {!authed ? (
          <Login onDone={() => setAuthed(true)} />
        ) : (
          <>
            <button className="mb-4 text-xs text-white/50 underline"
              onClick={() => { setToken(null); setAuthed(false); }}>Sign out</button>
            <Routes>
              <Route index element={<List />} />
              <Route path="new" element={<Editor />} />
              <Route path="edit/:id" element={<Editor />} />
            </Routes>
          </>
        )}
      </div>
    </div>
  );
}
