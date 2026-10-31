import { api } from "./api";

export interface Uploaded {
  publicId: string;
  url: string;
}

const OK = ["image/jpeg", "image/png", "image/webp", "image/gif"];

async function shrink(file: File): Promise<Blob> {
  if (!OK.includes(file.type)) throw new Error("Use a JPG, PNG, WebP or GIF image.");
  if (file.size > 25 * 1024 * 1024) throw new Error("Choose an image under 25 MB.");
  if (file.type === "image/gif") {
    if (file.size > 8 * 1024 * 1024) throw new Error("Choose a GIF under 8 MB.");
    return file;
  }
  const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * scale);
  c.height = Math.round(bmp.height * scale);
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close();
  const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/jpeg", 0.85));
  if (!blob) throw new Error("Couldn't process that image.");
  return blob;
}

export async function uploadImage(file: File): Promise<Uploaded> {
  const blob = await shrink(file);
  const t = await api<{
    uploadUrl: string; apiKey: string; signature: string;
    folder: string; timestamp: number; allowed_formats: string;
  }>("/api/uploads/sign", { method: "POST", auth: true });
  const f = new FormData();
  f.append("file", blob);
  f.append("api_key", t.apiKey);
  f.append("timestamp", String(t.timestamp));
  f.append("signature", t.signature);
  f.append("folder", t.folder);
  f.append("allowed_formats", t.allowed_formats);
  const res = await fetch(t.uploadUrl, { method: "POST", body: f });
  const d = await res.json().catch(() => ({}));
  if (!res.ok || !d.public_id) throw new Error(d?.error?.message || "Upload failed.");
  return { publicId: d.public_id, url: d.secure_url };
}
