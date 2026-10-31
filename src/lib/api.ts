const API = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");
const KEY = "sb_token";

export const getToken = () => localStorage.getItem(KEY);
export const setToken = (t: string | null) =>
  t ? localStorage.setItem(KEY, t) : localStorage.removeItem(KEY);

export async function api<T = Record<string, unknown>>(
  path: string,
  opts: { method?: string; body?: unknown; auth?: boolean } = {}
): Promise<T> {
  const headers: Record<string, string> = {};
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  if (opts.auth && getToken()) headers.Authorization = `Bearer ${getToken()}`;
  let res: Response;
  try {
    res = await fetch(API + path, {
      method: opts.method ?? "GET",
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
  } catch {
    throw new Error("Can't reach the server. Check your connection.");
  }
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && opts.auth) setToken(null);
  if (!res.ok) throw new Error(data?.message || "Something went wrong.");
  return data as T;
}
