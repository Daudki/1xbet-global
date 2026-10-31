import { useEffect, useRef, useState } from "react";
import { Link, Navigate, Route, Routes, useNavigate, useParams } from "react-router-dom";
import { marked } from "marked";
import { api, getToken, setToken } from "./lib/api";
import { uploadImage, type Uploaded } from "./lib/uploads";
import { embedVideos, parseVideo } from "./lib/video";

const input =
  "w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm outline-none focus:border-[#4d8bff]";
const btn = "rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50";

type Me = { id: string; email: string; name: string; role: "admin" | "user"; mustChangePassword: boolean };

type Item = {
  id: string; slug: string; title: string; description: string; category: string;
  status: "draft" | "published"; cover: Uploaded | null; body?: string; publishedAt: string | null;
};

function Login({ onDone }: { onDone: (u: Me) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true);
    setErr("");
    try {
      const r = await api<{ token: string; user: Me }>("/api/auth/login", { method: "POST", body: { email, password } });
      setToken(r.token);
      onDone(r.user);
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
  const addVideo = () => {
    const url = prompt("Paste a YouTube, Vimeo, Facebook or .mp4 video link:")?.trim();
    if (!url) return;
    if (!parseVideo(url) && !confirm("This link can't be shown as a player and will appear as a normal link. Insert anyway?")) return;
    set("body", `${f.body}\n\n${url}\n`);
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
      <div className="flex flex-wrap items-center gap-3 text-sm">
        {cover && <img src={cover.url} alt="" className="h-12 w-20 rounded object-cover" />}
        <button className={`${btn} bg-white/10`} disabled={busy} onClick={() => pick(setCover)}>
          {cover ? "Change cover" : "Add cover image"}
        </button>
        {cover && <button className="text-red-400" onClick={() => setCover(null)}>Remove</button>}
        <button className={`${btn} ml-auto bg-white/10`} disabled={busy} onClick={addInline}>Insert image</button>
        <button className={`${btn} bg-white/10`} onClick={addVideo}>Insert video</button>
        <button className={`${btn} bg-white/10`} onClick={() => setPreview(!preview)}>{preview ? "Edit" : "Preview"}</button>
      </div>
      {preview ? (
        <div className="post-body min-h-80 rounded-lg border border-white/15 p-4"
          dangerouslySetInnerHTML={{ __html: embedVideos(marked.parse(f.body, { async: false }) as string) }} />
      ) : (
        <textarea ref={ta} className={`${input} min-h-80 font-mono`} value={f.body}
          placeholder={"Write in Markdown.\n\n## Heading\n- bullet\n[link text](https://...)\n\nPaste a YouTube, Vimeo, Facebook or .mp4 link on its own line to show the video."}
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

function ChangePassword({ forced, onDone }: { forced: boolean; onDone: (u: Me) => void }) {
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true);
    setErr("");
    setOk(false);
    try {
      const r = await api<{ token: string; user: Me }>("/api/auth/change-password", {
        method: "POST", auth: true, body: { currentPassword: cur, newPassword: next },
      });
      setToken(r.token);
      setCur("");
      setNext("");
      setOk(true);
      onDone(r.user);
    } catch (e) { setErr((e as Error).message); }
    setBusy(false);
  };
  return (
    <div className="mx-auto mt-6 max-w-sm space-y-3">
      <h1 className="text-xl font-bold">{forced ? "Choose your own password" : "Change password"}</h1>
      {forced && <p className="text-sm text-white/60">You signed in with a temporary password. Choose a new one to continue.</p>}
      <input className={input} type="password" placeholder={forced ? "Temporary password" : "Current password"}
        value={cur} onChange={(e) => setCur(e.target.value)} />
      <input className={input} type="password" placeholder="New password (10+ characters)"
        value={next} onChange={(e) => setNext(e.target.value)} />
      {err && <p className="text-sm text-red-400">{err}</p>}
      {ok && <p className="text-sm text-green-400">Password changed.</p>}
      <button className={`${btn} w-full bg-[#0a5cff]`} disabled={busy} onClick={go}>Save password</button>
    </div>
  );
}

type U = {
  id: string; email: string; name: string; role: "admin" | "user"; active: boolean;
  lastLoginAt: string | null; postCount: number;
};

function Users({ meId }: { meId: string }) {
  const [users, setUsers] = useState<U[] | null>(null);
  const [form, setForm] = useState({ name: "", email: "", role: "user" });
  const [note, setNote] = useState<{ who: string; pw: string } | null>(null);
  const [err, setErr] = useState("");
  const load = () =>
    api<{ users: U[] }>("/api/admin/users", { auth: true }).then((r) => setUsers(r.users)).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);
  const run = async (fn: () => Promise<void>) => {
    setErr("");
    try { await fn(); await load(); } catch (e) { setErr((e as Error).message); }
  };
  const add = () =>
    run(async () => {
      const r = await api<{ temporaryPassword: string }>("/api/admin/users", { method: "POST", auth: true, body: form });
      setNote({ who: form.name, pw: r.temporaryPassword });
      setForm({ name: "", email: "", role: "user" });
    });
  const patch = (u: U, body: object) =>
    run(async () => { await api(`/api/admin/users/${u.id}`, { method: "PATCH", auth: true, body }); });
  const reset = (u: U) => {
    if (!confirm(`Reset the password for ${u.name}?`)) return;
    run(async () => {
      const r = await api<{ temporaryPassword: string }>(`/api/admin/users/${u.id}/reset-password`, { method: "POST", auth: true });
      setNote({ who: u.name, pw: r.temporaryPassword });
    });
  };
  return (
    <div>
      <h1 className="text-2xl font-bold">Users</h1>
      <div className="mt-4 space-y-2 rounded-xl border border-white/10 p-4">
        <p className="text-sm font-semibold">Add a person</p>
        <div className="grid gap-2 sm:grid-cols-3">
          <input className={input} placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className={input} placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <select className={input} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="user">Writer (own articles)</option>
            <option value="admin">Admin (everything)</option>
          </select>
        </div>
        <button className={`${btn} bg-[#0a5cff]`} onClick={add}>Add</button>
      </div>
      {note && (
        <div className="mt-4 rounded-xl border border-yellow-500/40 bg-yellow-500/10 p-4 text-sm">
          <p>Temporary password for <b>{note.who}</b> (shown once). They choose their own at first sign-in:</p>
          <p className="mt-2 flex items-center gap-3">
            <code className="rounded bg-black/40 px-2 py-1">{note.pw}</code>
            <button className="underline" onClick={() => navigator.clipboard?.writeText(note.pw)}>Copy</button>
            <button className="ml-auto text-white/60 underline" onClick={() => setNote(null)}>Hide</button>
          </p>
        </div>
      )}
      {err && <p className="mt-3 text-sm text-red-400">{err}</p>}
      <ul className="mt-6 space-y-2">
        {users?.map((u) => (
          <li key={u.id} className="rounded-xl border border-white/10 p-4">
            <p className="font-semibold">
              {u.name} {u.id === meId && <span className="text-xs text-white/50">(you)</span>}
              {!u.active && <span className="ml-2 text-xs text-red-400">disabled</span>}
            </p>
            <p className="text-xs text-white/50">{u.email} · {u.role} · {u.postCount} articles</p>
            {u.id !== meId && (
              <div className="mt-2 flex flex-wrap gap-4 text-sm">
                <button className="underline" onClick={() => patch(u, { active: !u.active })}>{u.active ? "Disable" : "Enable"}</button>
                <button className="underline" onClick={() => patch(u, { role: u.role === "admin" ? "user" : "admin" })}>
                  Make {u.role === "admin" ? "writer" : "admin"}
                </button>
                <button className="underline" onClick={() => reset(u)}>Reset password</button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Admin() {
  const nav = useNavigate();
  const [me, setMe] = useState<Me | null>(null);
  const [ready, setReady] = useState(!getToken());
  useEffect(() => {
    document.title = "Admin";
    const m = document.createElement("meta");
    m.name = "robots";
    m.content = "noindex,nofollow";
    document.head.appendChild(m);
    return () => m.remove();
  }, []);
  useEffect(() => {
    if (!getToken()) return;
    api<{ user: Me }>("/api/auth/me", { auth: true })
      .then((r) => setMe(r.user))
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);
  const signOut = () => { setToken(null); setMe(null); };
  return (
    <div className="min-h-screen bg-[#05080f] text-white">
      <div className="mx-auto max-w-3xl px-4 py-8">
        {!ready ? (
          <p className="text-white/60">Loading… (the server may take a minute to wake up)</p>
        ) : !me ? (
          <Login onDone={(u) => { setMe(u); nav("/admin", { replace: true }); }} />
        ) : me.mustChangePassword ? (
          <ChangePassword forced onDone={setMe} />
        ) : (
          <>
            <div className="mb-6 flex flex-wrap items-center gap-4 text-sm">
              <Link to="/admin" className="underline">Articles</Link>
              {me.role === "admin" && <Link to="/admin/users" className="underline">Users</Link>}
              <Link to="/admin/account" className="underline">Account</Link>
              <span className="ml-auto text-white/50">{me.name}</span>
              <button className="text-white/50 underline" onClick={signOut}>Sign out</button>
            </div>
            <Routes>
              <Route index element={<List />} />
              <Route path="new" element={<Editor />} />
              <Route path="edit/:id" element={<Editor />} />
              <Route path="users" element={me.role === "admin" ? <Users meId={me.id} /> : <Navigate to="/admin" replace />} />
              <Route path="account" element={<ChangePassword forced={false} onDone={setMe} />} />
              <Route path="*" element={<Navigate to="/admin" replace />} />
            </Routes>
          </>
        )}
      </div>
    </div>
  );
}
