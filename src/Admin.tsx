import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Link, NavLink, Navigate, Route, Routes, useNavigate, useParams } from "react-router-dom";
import { marked } from "marked";
import {
  Bold, Camera, ExternalLink, Eye, EyeOff, Trophy, FileText, Heading2, Image as ImageIcon, Italic, Link2,
  List as ListIcon, LogOut, Pencil, Plus, Quote, Search, Trash2, User as UserIcon, Users as UsersIcon, Video,
} from "lucide-react";
import { api, getToken, setToken } from "./lib/api";
import { uploadImage, type Uploaded } from "./lib/uploads";
import { embedVideos, parseVideo } from "./lib/video";
import { LOGIN_IMAGE, SITE_NAME } from "./config";

/* ---------- shared look ---------- */
const card = "rounded-2xl border border-white/10 bg-white/[0.04]";
const field =
  "w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm outline-none transition focus:border-[#4d8bff] focus:ring-2 focus:ring-[#4d8bff]/30";
const btn = "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition active:scale-95 disabled:opacity-50";
const primary = `${btn} bg-[#0a5cff] hover:bg-[#2a73ff]`;
const ghost = `${btn} bg-white/10 hover:bg-white/15`;
const danger = `${btn} bg-red-600 hover:bg-red-500`;

type Me = { id: string; email: string; name: string; role: "admin" | "user"; mustChangePassword: boolean };
type Profile = { id: string; email: string; name: string; role: string; bio: string; avatar: Uploaded | null };
type Item = {
  id: string; slug: string; title: string; description: string; category: string;
  status: "draft" | "published"; cover: Uploaded | null; body?: string; publishedAt: string | null; createdAt: string;
};
type Ask = { title: string; text: string; ok: string; danger?: boolean; go: () => void } | null;

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 90);
const when = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "";

const Toast = createContext<(msg: string, bad?: boolean) => void>(() => {});
const useToast = () => useContext(Toast);

function Avatar({ name, url, size = 40 }: { name: string; url?: string | null; size?: number }) {
  const s = { width: size, height: size, fontSize: size / 2.4 };
  return url ? (
    <img src={url} alt={name} style={s} className="shrink-0 rounded-full object-cover" />
  ) : (
    <span style={s} className="flex shrink-0 items-center justify-center rounded-full bg-[#0a5cff]/25 font-bold text-[#8db4ff]">
      {name.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}

function Confirm({ ask, close }: { ask: Ask; close: () => void }) {
  if (!ask) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center" onClick={close}>
      <div className={`${card} w-full max-w-sm bg-[#0b111c] p-5`} onClick={(e) => e.stopPropagation()}>
        <h3 className="font-bold">{ask.title}</h3>
        <p className="mt-1 text-sm text-white/60">{ask.text}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button className={ghost} onClick={close}>Cancel</button>
          <button className={ask.danger ? danger : primary} onClick={() => { close(); ask.go(); }}>{ask.ok}</button>
        </div>
      </div>
    </div>
  );
}

const Skeleton = () => <div className="h-20 animate-pulse rounded-2xl bg-white/5" />;

/* ---------- sign in / password ---------- */
function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
        <span className="auth-orb auth-a" />
        <span className="auth-orb auth-b" />
        <svg className="auth-pitch" viewBox="0 0 400 400" fill="none" stroke="white" strokeWidth="2">
          <circle cx="200" cy="200" r="120" />
          <circle cx="200" cy="200" r="6" fill="white" />
          <line x1="0" y1="200" x2="400" y2="200" />
          <rect x="110" y="0" width="180" height="70" />
          <rect x="110" y="330" width="180" height="70" />
        </svg>
      </div>
      <div className="auth-card relative z-10 mx-auto mt-8 max-w-sm sm:mt-16">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <span className="auth-ball flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0a5cff] shadow-lg shadow-[#0a5cff]/40"><Trophy /></span>
          <p className="text-sm text-white/60">{SITE_NAME}</p>
        </div>
        {LOGIN_IMAGE && <img src={LOGIN_IMAGE} alt="" className="mb-4 w-full rounded-2xl" />}
        <div className={`${card} space-y-3 p-6 backdrop-blur`}>{children}</div>
      </div>
    </>
  );
}

function Login({ onDone }: { onDone: (u: Me) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true);
    setErr("");
    try {
      const r = await api<{ token: string; user: Me }>("/api/auth/login", { method: "POST", body: { email, password } });
      setToken(r.token);
      onDone(r.user);
    } catch (e) { setErr((e as Error).message); }
    setBusy(false);
  };
  return (
    <AuthShell>
      <h1 className="text-2xl font-bold">Welcome back</h1>
      <p className="text-sm text-white/60">Sign in to manage your articles.</p>
      <input className={field} placeholder="Email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <div className="relative">
        <input className={`${field} pr-11`} type={show ? "text" : "password"} placeholder="Password" autoComplete="current-password"
          value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && go()} />
        <button type="button" aria-label={show ? "Hide password" : "Show password"} className="absolute right-3 top-2.5 text-white/50 hover:text-white"
          onClick={() => setShow(!show)}>{show ? <EyeOff size={18} /> : <Eye size={18} />}</button>
      </div>
      {err && <p key={err} className="auth-shake text-sm text-red-400">{err}</p>}
      <button className={`${primary} shine w-full`} disabled={busy} onClick={go}>{busy ? "Signing in…" : "Sign in"}</button>
    </AuthShell>
  );
}

function ChangePassword({ forced, onDone }: { forced: boolean; onDone: (u: Me) => void }) {
  const toast = useToast();
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true);
    setErr("");
    try {
      const r = await api<{ token: string; user: Me }>("/api/auth/change-password", {
        method: "POST", auth: true, body: { currentPassword: cur, newPassword: next },
      });
      setToken(r.token);
      setCur("");
      setNext("");
      toast("Password changed");
      onDone(r.user);
    } catch (e) { setErr((e as Error).message); }
    setBusy(false);
  };
  const body = (
    <div className="space-y-3">
      {forced && (
        <>
          <h1 className="text-2xl font-bold">Choose your own password</h1>
          <p className="text-sm text-white/60">You signed in with a temporary password. Choose a new one to continue.</p>
        </>
      )}
      <input className={field} type="password" placeholder={forced ? "Temporary password" : "Current password"} value={cur} onChange={(e) => setCur(e.target.value)} />
      <input className={field} type="password" placeholder="New password (10+ characters)" value={next} onChange={(e) => setNext(e.target.value)} />
      {err && <p className="text-sm text-red-400">{err}</p>}
      <button className={`${primary} ${forced ? "w-full" : ""}`} disabled={busy || !cur || next.length < 10} onClick={go}>Save password</button>
    </div>
  );
  return forced ? <AuthShell>{body}</AuthShell> : body;
}

/* ---------- dashboard ---------- */
function List({ me, profile }: { me: Me; profile: Profile | null }) {
  const toast = useToast();
  const [items, setItems] = useState<Item[] | null>(null);
  const [tab, setTab] = useState<"all" | "published" | "draft">("all");
  const [q, setQ] = useState("");
  const [ask, setAsk] = useState<Ask>(null);
  const load = useCallback(
    () => api<{ articles: Item[] }>("/api/manage/articles", { auth: true }).then((r) => setItems(r.articles)).catch((e) => toast(e.message, true)),
    [toast]
  );
  useEffect(() => { load(); }, [load]);
  const n = (s: string) => items?.filter((a) => a.status === s).length ?? 0;
  const shown = (items ?? []).filter((a) => (tab === "all" || a.status === tab) && a.title.toLowerCase().includes(q.toLowerCase()));
  const h = new Date().getHours();
  const hello = h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  const del = (a: Item) =>
    setAsk({
      title: "Delete this article?", ok: "Delete", danger: true,
      text: `“${a.title}” will be removed${a.status === "published" ? " from the live site within a minute" : ""}. This can't be undone.`,
      go: async () => {
        try { await api(`/api/manage/articles/${a.id}`, { method: "DELETE", auth: true }); toast("Article deleted"); load(); }
        catch (e) { toast((e as Error).message, true); }
      },
    });
  const tabs = [["all", "All", items?.length ?? 0], ["published", "Published", n("published")], ["draft", "Drafts", n("draft")]] as const;
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">{hello}, {(profile?.name ?? me.name).split(" ")[0]}</h1>
        <p className="text-sm text-white/60">Here’s what’s on your site.</p>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {tabs.map(([k, label, c]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`${card} p-4 text-left transition hover:bg-white/[0.08] ${tab === k ? "border-[#4d8bff] bg-[#0a5cff]/15" : ""}`}>
            <p className="text-2xl font-bold">{items ? c : "–"}</p>
            <p className="text-xs text-white/60">{label}</p>
          </button>
        ))}
      </div>
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-3 text-white/40" />
        <input className={`${field} pl-10`} placeholder="Search articles" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="space-y-3">
        {!items && [0, 1, 2].map((i) => <Skeleton key={i} />)}
        {shown.map((a) => (
          <div key={a.id} className={`${card} flex items-center gap-3 p-3 transition hover:bg-white/[0.07]`}>
            {a.cover ? <img src={a.cover.url} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover" />
              : <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-white/5 text-white/30"><FileText /></span>}
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{a.title}</p>
              <p className="mt-0.5 text-xs text-white/50">
                <span className={`rounded-full px-2 py-0.5 ${a.status === "published" ? "bg-green-500/15 text-green-400" : "bg-yellow-500/15 text-yellow-400"}`}>{a.status}</span>
                {" "}{a.category} · {when(a.publishedAt ?? a.createdAt)}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {a.status === "published" && (
                <a href={`/blog/${a.slug}`} target="_blank" rel="noreferrer" aria-label="View live" className="rounded-lg p-2 text-white/60 hover:bg-white/10 hover:text-white"><ExternalLink size={18} /></a>
              )}
              <Link to={`/admin/edit/${a.id}`} aria-label="Edit" className="rounded-lg p-2 text-white/60 hover:bg-white/10 hover:text-white"><Pencil size={18} /></Link>
              <button aria-label="Delete" onClick={() => del(a)} className="rounded-lg p-2 text-white/60 hover:bg-red-500/20 hover:text-red-400"><Trash2 size={18} /></button>
            </div>
          </div>
        ))}
        {items && shown.length === 0 && (
          <div className={`${card} p-8 text-center`}>
            <p className="text-white/60">{items.length === 0 ? "No articles yet." : "Nothing matches that."}</p>
            {items.length === 0 && <Link to="/admin/new" className={`${primary} mt-4`}><Plus size={16} /> Write your first article</Link>}
          </div>
        )}
      </div>
      <Confirm ask={ask} close={() => setAsk(null)} />
    </div>
  );
}

/* ---------- editor ---------- */
const Count = ({ n, max }: { n: number; max: number }) => (
  <span className={`text-xs ${n > max ? "text-red-400" : "text-white/40"}`}>{n}/{max}</span>
);

function Editor() {
  const { id } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const ta = useRef<HTMLTextAreaElement>(null);
  const [f, setF] = useState({ title: "", slug: "", description: "", category: "Guides", body: "" });
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [cover, setCover] = useState<Uploaded | null>(null);
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(Boolean(id));
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));
  const slug = f.slug || slugify(f.title);
  const words = f.body.trim() ? f.body.trim().split(/\s+/).length : 0;

  useEffect(() => {
    if (!id) return;
    api<{ article: Item }>(`/api/manage/articles/${id}`, { auth: true })
      .then(({ article: a }) => {
        setF({ title: a.title, slug: a.slug, description: a.description, category: a.category, body: a.body ?? "" });
        setCover(a.cover);
        setStatus(a.status);
      })
      .catch((e) => toast(e.message, true))
      .finally(() => setLoading(false));
  }, [id, toast]);

  const edit = (before: string, after: string, ph: string) => {
    const t = ta.current;
    if (!t) return;
    const { selectionStart: s, selectionEnd: e } = t;
    const sel = f.body.slice(s, e) || ph;
    set("body", f.body.slice(0, s) + before + sel + after + f.body.slice(e));
    requestAnimationFrame(() => { t.focus(); t.setSelectionRange(s + before.length, s + before.length + sel.length); });
  };
  const line = (prefix: string, ph: string) => {
    const t = ta.current;
    const s = t?.selectionStart ?? f.body.length;
    const start = f.body.lastIndexOf("\n", s - 1) + 1;
    set("body", f.body.slice(0, start) + prefix + (f.body.slice(start, s) ? "" : ph) + f.body.slice(start));
    requestAnimationFrame(() => t?.focus());
  };
  const pick = (cb: (u: Uploaded) => void) => {
    const i = document.createElement("input");
    i.type = "file";
    i.accept = "image/jpeg,image/png,image/webp,image/gif";
    i.onchange = async () => {
      if (!i.files?.[0]) return;
      setBusy(true);
      try { cb(await uploadImage(i.files[0])); } catch (e) { toast((e as Error).message, true); }
      setBusy(false);
    };
    i.click();
  };
  const addImage = () => pick((u) => {
    const alt = prompt("Describe the image (helps Google):") || "image";
    set("body", `${f.body}\n\n![${alt}](${u.url})\n`);
  });
  const addVideo = () => {
    const url = prompt("Paste a YouTube, Vimeo, Facebook or .mp4 link:")?.trim();
    if (!url) return;
    if (!parseVideo(url) && !confirm("This link can't be shown as a player and will appear as a normal link. Insert anyway?")) return;
    set("body", `${f.body}\n\n${url}\n`);
  };
  const addLink = () => {
    const url = prompt("Link address (https://…):")?.trim();
    if (url) edit("[", `](${url})`, "link text");
  };

  const save = async (st: "draft" | "published") => {
    setBusy(true);
    try {
      await api(id ? `/api/manage/articles/${id}` : "/api/manage/articles", {
        method: id ? "PATCH" : "POST", auth: true, body: { ...f, status: st, cover },
      });
      toast(st === "published" ? "Published. The site updates in about a minute." : "Draft saved");
      nav("/admin");
    } catch (e) { toast((e as Error).message, true); }
    setBusy(false);
  };
  const saveRef = useRef(save);
  saveRef.current = save;
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") { e.preventDefault(); saveRef.current(status); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [status]);

  if (loading) return <div className="space-y-3"><Skeleton /><Skeleton /></div>;
  const tool = "rounded-lg p-2 text-white/70 hover:bg-white/10 hover:text-white";
  return (
    <div className="space-y-4">
      <div className="sticky top-0 z-10 -mx-4 flex items-center gap-2 bg-[#05080f]/90 px-4 py-3 backdrop-blur">
        <Link to="/admin" className="text-sm text-white/60 hover:text-white">← Back</Link>
        <span className={`rounded-full px-2 py-0.5 text-xs ${status === "published" ? "bg-green-500/15 text-green-400" : "bg-yellow-500/15 text-yellow-400"}`}>{status}</span>
        <div className="ml-auto flex gap-2">
          <button className={ghost} disabled={busy} onClick={() => save("draft")}>Save draft</button>
          <button className={primary} disabled={busy} onClick={() => save("published")}>{busy ? "Saving…" : "Publish"}</button>
        </div>
      </div>
      <div>
        <input className={`${field} text-lg font-semibold`} placeholder="Article title" value={f.title} onChange={(e) => set("title", e.target.value)} />
        <div className="mt-1 text-right"><Count n={f.title.length} max={60} /></div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <input className={field} placeholder="URL (auto from title)" value={f.slug} onChange={(e) => set("slug", slugify(e.target.value))} />
        <input className={field} placeholder="Category" value={f.category} onChange={(e) => set("category", e.target.value)} />
      </div>
      <div>
        <textarea className={`${field} h-20 resize-none`} placeholder="Short description shown on Google" value={f.description} onChange={(e) => set("description", e.target.value)} />
        <div className="mt-1 text-right"><Count n={f.description.length} max={155} /></div>
      </div>
      <div className="rounded-xl bg-white p-4">
        <p className="truncate text-xs text-[#202124]">sportsbet-tips.com › blog › {slug || "your-article"}</p>
        <p className="truncate text-lg text-[#1a0dab]">{f.title || "Article title"}</p>
        <p className="line-clamp-2 text-sm text-[#4d5156]">{f.description || "Your description appears here."}</p>
      </div>
      <div className="flex items-center gap-3">
        {cover ? <img src={cover.url} alt="" className="h-14 w-24 rounded-lg object-cover" /> : <span className="flex h-14 w-24 items-center justify-center rounded-lg border border-dashed border-white/20 text-xs text-white/40">No cover</span>}
        <button className={ghost} disabled={busy} onClick={() => pick(setCover)}><Camera size={16} />{cover ? "Change" : "Add cover"}</button>
        {cover && <button className="text-sm text-red-400" onClick={() => setCover(null)}>Remove</button>}
      </div>
      <div className={`${card} overflow-hidden`}>
        <div className="flex flex-wrap items-center gap-1 border-b border-white/10 p-2">
          <button className={tool} aria-label="Bold" onClick={() => edit("**", "**", "bold text")}><Bold size={18} /></button>
          <button className={tool} aria-label="Italic" onClick={() => edit("*", "*", "italic text")}><Italic size={18} /></button>
          <button className={tool} aria-label="Heading" onClick={() => line("## ", "Heading")}><Heading2 size={18} /></button>
          <button className={tool} aria-label="List" onClick={() => line("- ", "List item")}><ListIcon size={18} /></button>
          <button className={tool} aria-label="Quote" onClick={() => line("> ", "Quote")}><Quote size={18} /></button>
          <button className={tool} aria-label="Link" onClick={addLink}><Link2 size={18} /></button>
          <button className={tool} aria-label="Image" disabled={busy} onClick={addImage}><ImageIcon size={18} /></button>
          <button className={tool} aria-label="Video" onClick={addVideo}><Video size={18} /></button>
          <button className={`${tool} ml-auto text-sm`} onClick={() => setPreview(!preview)}>{preview ? "Edit" : "Preview"}</button>
        </div>
        {preview ? (
          <div className="post-body min-h-80 p-4" dangerouslySetInnerHTML={{ __html: embedVideos(marked.parse(f.body, { async: false }) as string) }} />
        ) : (
          <textarea ref={ta} className="min-h-80 w-full resize-y bg-transparent p-4 font-mono text-sm outline-none" value={f.body}
            placeholder={"Write in Markdown.\n\nTip: paste a YouTube, Vimeo, Facebook or .mp4 link on its own line to show the video."}
            onChange={(e) => set("body", e.target.value)} />
        )}
      </div>
      <p className="text-xs text-white/40">{words} words · about {Math.max(1, Math.ceil(words / 200))} min read · Ctrl+S saves</p>
    </div>
  );
}

/* ---------- users ---------- */
type U = {
  id: string; email: string; name: string; role: "admin" | "user"; active: boolean;
  lastLoginAt: string | null; postCount: number; avatarUrl: string | null;
};

function Users({ meId }: { meId: string }) {
  const toast = useToast();
  const [users, setUsers] = useState<U[] | null>(null);
  const [form, setForm] = useState({ name: "", email: "", role: "user" });
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState<{ who: string; pw: string } | null>(null);
  const [ask, setAsk] = useState<Ask>(null);
  const load = useCallback(
    () => api<{ users: U[] }>("/api/admin/users", { auth: true }).then((r) => setUsers(r.users)).catch((e) => toast(e.message, true)),
    [toast]
  );
  useEffect(() => { load(); }, [load]);
  const run = async (fn: () => Promise<void>, ok: string) => {
    try { await fn(); toast(ok); await load(); } catch (e) { toast((e as Error).message, true); }
  };
  const add = () =>
    run(async () => {
      const r = await api<{ temporaryPassword: string }>("/api/admin/users", { method: "POST", auth: true, body: form });
      setNote({ who: form.name, pw: r.temporaryPassword });
      setForm({ name: "", email: "", role: "user" });
      setOpen(false);
    }, "Person added");
  const patch = (u: U, body: object, ok: string) =>
    run(async () => { await api(`/api/admin/users/${u.id}`, { method: "PATCH", auth: true, body }); }, ok);
  const reset = (u: U) =>
    setAsk({
      title: `Reset ${u.name}’s password?`, ok: "Reset", text: "They'll be signed out and given a temporary password.",
      go: () => run(async () => {
        const r = await api<{ temporaryPassword: string }>(`/api/admin/users/${u.id}/reset-password`, { method: "POST", auth: true });
        setNote({ who: u.name, pw: r.temporaryPassword });
      }, "Password reset"),
    });
  const toggle = (u: U) =>
    u.active
      ? setAsk({ title: `Disable ${u.name}?`, ok: "Disable", danger: true, text: "They won't be able to sign in until you enable them again.", go: () => patch(u, { active: false }, "Account disabled") })
      : patch(u, { active: true }, "Account enabled");
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">People</h1>
        <button className={primary} onClick={() => setOpen(!open)}><Plus size={16} /> Add person</button>
      </div>
      {open && (
        <div className={`${card} space-y-3 p-4`}>
          <input className={field} placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className={field} placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <select className={field} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="user">Writer (their own articles)</option>
            <option value="admin">Admin (everything)</option>
          </select>
          <button className={primary} disabled={!form.name || !form.email} onClick={add}>Create account</button>
        </div>
      )}
      {note && (
        <div className="rounded-2xl border border-yellow-500/40 bg-yellow-500/10 p-4 text-sm">
          <p>Temporary password for <b>{note.who}</b>. It’s shown once; they choose their own at first sign-in.</p>
          <div className="mt-3 flex items-center gap-3">
            <code className="rounded-lg bg-black/40 px-3 py-1.5">{note.pw}</code>
            <button className="underline" onClick={() => { navigator.clipboard?.writeText(note.pw); toast("Copied"); }}>Copy</button>
            <button className="ml-auto text-white/60 underline" onClick={() => setNote(null)}>Hide</button>
          </div>
        </div>
      )}
      <div className="space-y-3">
        {!users && [0, 1].map((i) => <Skeleton key={i} />)}
        {users?.map((u) => (
          <div key={u.id} className={`${card} p-4 ${u.active ? "" : "opacity-60"}`}>
            <div className="flex items-center gap-3">
              <Avatar name={u.name} url={u.avatarUrl} size={44} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{u.name} {u.id === meId && <span className="text-xs font-normal text-white/50">(you)</span>}</p>
                <p className="truncate text-xs text-white/50">{u.email}</p>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-xs ${u.role === "admin" ? "bg-[#0a5cff]/20 text-[#8db4ff]" : "bg-white/10 text-white/70"}`}>{u.role === "admin" ? "Admin" : "Writer"}</span>
            </div>
            <p className="mt-2 text-xs text-white/40">{u.postCount} articles{u.active ? "" : " · disabled"}{u.lastLoginAt ? ` · last seen ${when(u.lastLoginAt)}` : ""}</p>
            {u.id !== meId && (
              <div className="mt-3 flex flex-wrap gap-2">
                <button className={ghost} onClick={() => toggle(u)}>{u.active ? "Disable" : "Enable"}</button>
                <button className={ghost} onClick={() => patch(u, { role: u.role === "admin" ? "user" : "admin" }, "Role updated")}>Make {u.role === "admin" ? "writer" : "admin"}</button>
                <button className={ghost} onClick={() => reset(u)}>Reset password</button>
              </div>
            )}
          </div>
        ))}
      </div>
      <Confirm ask={ask} close={() => setAsk(null)} />
    </div>
  );
}

/* ---------- profile ---------- */
function ProfilePage({ profile, onSaved, onMe, signOut }: {
  profile: Profile; onSaved: (p: Profile) => void; onMe: (u: Me) => void; signOut: () => void;
}) {
  const toast = useToast();
  const [name, setName] = useState(profile.name);
  const [bio, setBio] = useState(profile.bio);
  const [avatar, setAvatar] = useState<Uploaded | null>(profile.avatar);
  const [busy, setBusy] = useState(false);
  const dirty = name !== profile.name || bio !== profile.bio || avatar?.publicId !== profile.avatar?.publicId;
  const pickAvatar = () => {
    const i = document.createElement("input");
    i.type = "file";
    i.accept = "image/jpeg,image/png,image/webp,image/gif";
    i.onchange = async () => {
      if (!i.files?.[0]) return;
      setBusy(true);
      try { setAvatar(await uploadImage(i.files[0])); } catch (e) { toast((e as Error).message, true); }
      setBusy(false);
    };
    i.click();
  };
  const save = async () => {
    setBusy(true);
    try {
      const r = await api<{ profile: Profile }>("/api/profile", { method: "PATCH", auth: true, body: { name, bio, avatar } });
      onSaved(r.profile);
      toast("Profile saved");
    } catch (e) { toast((e as Error).message, true); }
    setBusy(false);
  };
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Your profile</h1>
      <div className={`${card} space-y-4 p-5`}>
        <div className="flex items-center gap-4">
          <button className="group relative" onClick={pickAvatar} disabled={busy} aria-label="Change picture">
            <Avatar name={name} url={avatar?.url} size={88} />
            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition group-hover:opacity-100"><Camera /></span>
          </button>
          <div className="space-y-1 text-sm">
            <button className="font-semibold text-[#8db4ff] hover:underline" onClick={pickAvatar} disabled={busy}>{busy ? "Uploading…" : avatar ? "Change picture" : "Add a picture"}</button>
            {avatar && <button className="block text-red-400 hover:underline" onClick={() => setAvatar(null)}>Remove</button>}
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs text-white/50">Name</label>
          <input className={field} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-white/50">Email</label>
          <input className={`${field} opacity-60`} value={profile.email} disabled />
        </div>
        <div>
          <label className="mb-1 block text-xs text-white/50">About you</label>
          <textarea className={`${field} h-24 resize-none`} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="A line or two about you" />
          <div className="mt-1 text-right"><Count n={bio.length} max={300} /></div>
        </div>
        <button className={primary} disabled={!dirty || busy || !name.trim()} onClick={save}>Save changes</button>
      </div>
      <div className={`${card} space-y-3 p-5`}>
        <h2 className="font-semibold">Change password</h2>
        <ChangePassword forced={false} onDone={onMe} />
      </div>
      <button className={`${ghost} w-full`} onClick={signOut}><LogOut size={16} /> Sign out</button>
    </div>
  );
}

/* ---------- shell ---------- */
export default function Admin() {
  const nav = useNavigate();
  const [me, setMe] = useState<Me | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [ready, setReady] = useState(!getToken());
  const [toasts, setToasts] = useState<{ id: number; msg: string; bad: boolean }[]>([]);
  const push = useCallback((msg: string, bad = false) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, msg, bad }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  useEffect(() => {
    document.title = "Dashboard";
    const m = document.createElement("meta");
    m.name = "robots";
    m.content = "noindex,nofollow";
    document.head.appendChild(m);
    return () => m.remove();
  }, []);
  useEffect(() => {
    if (!getToken()) return;
    api<{ user: Me }>("/api/auth/me", { auth: true }).then((r) => setMe(r.user)).catch(() => {}).finally(() => setReady(true));
  }, []);
  const ok = me && !me.mustChangePassword ? me.id : null;
  useEffect(() => {
    if (!ok) return;
    api<{ profile: Profile }>("/api/profile", { auth: true }).then((r) => setProfile(r.profile)).catch(() => {});
  }, [ok]);

  const clear = useCallback(() => { setMe(null); setProfile(null); }, []);
  const signOut = () => {
    api("/api/auth/logout", { method: "POST", auth: true }).catch(() => {});
    setToken(null);
    clear();
  };
  // The server says the session is over (expired, disabled or password changed elsewhere).
  useEffect(() => {
    const h = () => { clear(); push("Your session ended. Please sign in again.", true); };
    window.addEventListener("sb:signed-out", h);
    return () => window.removeEventListener("sb:signed-out", h);
  }, [clear, push]);
  // Sign out after 30 minutes without any activity.
  useEffect(() => {
    if (!me) return;
    let t = 0;
    const arm = () => {
      window.clearTimeout(t);
      t = window.setTimeout(() => {
        api("/api/auth/logout", { method: "POST", auth: true }).catch(() => {});
        setToken(null);
        clear();
        push("Signed out after 30 minutes of inactivity.");
      }, 30 * 60 * 1000);
    };
    const events = ["pointerdown", "keydown", "scroll"];
    events.forEach((e) => window.addEventListener(e, arm, { passive: true }));
    arm();
    return () => { window.clearTimeout(t); events.forEach((e) => window.removeEventListener(e, arm)); };
  }, [me?.id, clear, push]);
  const tab = ({ isActive }: { isActive: boolean }) =>
    `flex flex-col items-center gap-0.5 px-3 py-1 text-xs md:flex-row md:gap-2 md:text-sm ${isActive ? "text-[#8db4ff]" : "text-white/50 hover:text-white"}`;
  const links = me && (
    <>
      <NavLink to="/admin" end className={tab}><FileText size={20} />Articles</NavLink>
      <NavLink to="/admin/new" className={tab}><Plus size={20} />Write</NavLink>
      {me.role === "admin" && <NavLink to="/admin/users" className={tab}><UsersIcon size={20} />People</NavLink>}
      <NavLink to="/admin/profile" className={tab}><UserIcon size={20} />Profile</NavLink>
    </>
  );
  return (
    <Toast.Provider value={push}>
      <div className="min-h-screen bg-[#05080f] text-white">
        {me && !me.mustChangePassword && (
          <header className="border-b border-white/10">
            <div className="mx-auto flex max-w-3xl items-center gap-4 px-4 py-3">
              <Link to="/admin" className="font-bold">Dashboard</Link>
              <nav className="ml-6 hidden items-center gap-2 md:flex">{links}</nav>
              <Link to="/admin/profile" className="ml-auto flex items-center gap-2 text-sm text-white/70">
                <span className="hidden sm:inline">{profile?.name ?? me.name}</span>
                <Avatar name={profile?.name ?? me.name} url={profile?.avatar?.url} size={32} />
              </Link>
            </div>
          </header>
        )}
        <div className="mx-auto max-w-3xl px-4 pb-28 pt-6 md:pb-10">
          {!ready ? (
            <p className="text-white/60">Loading… (the server may take a minute to wake up)</p>
          ) : !me ? (
            <Login onDone={(u) => { setMe(u); nav("/admin", { replace: true }); }} />
          ) : me.mustChangePassword ? (
            <ChangePassword forced onDone={setMe} />
          ) : (
            <Routes>
              <Route index element={<List me={me} profile={profile} />} />
              <Route path="new" element={<Editor />} />
              <Route path="edit/:id" element={<Editor />} />
              <Route path="users" element={me.role === "admin" ? <Users meId={me.id} /> : <Navigate to="/admin" replace />} />
              <Route path="profile" element={profile ? (
                <ProfilePage profile={profile} signOut={signOut}
                  onSaved={(p) => { setProfile(p); setMe({ ...me, name: p.name }); }} onMe={setMe} />
              ) : <Skeleton />} />
              <Route path="account" element={<Navigate to="/admin/profile" replace />} />
              <Route path="*" element={<Navigate to="/admin" replace />} />
            </Routes>
          )}
        </div>
        {me && !me.mustChangePassword && (
          <nav className="fixed inset-x-0 bottom-0 z-20 flex justify-around border-t border-white/10 bg-[#05080f]/95 py-2 backdrop-blur md:hidden">{links}</nav>
        )}
        <div className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4 md:bottom-6">
          {toasts.map((t) => (
            <div key={t.id} className={`rounded-xl px-4 py-2.5 text-sm font-medium shadow-lg ${t.bad ? "bg-red-600" : "bg-[#16233b] border border-white/10"}`}>{t.msg}</div>
          ))}
        </div>
      </div>
    </Toast.Provider>
  );
}
