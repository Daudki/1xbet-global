const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Recognises YouTube, Vimeo, Facebook and direct video-file links. Returns null for anything else. */
export function parseVideo(raw) {
  let u;
  try {
    u = new URL(String(raw).replace(/&amp;/g, "&").trim());
  } catch {
    return null;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  const host = u.hostname.replace(/^(www|m)\./, "");
  const path = u.pathname;

  let id;
  if (host === "youtu.be") id = path.split("/")[1];
  else if (host === "youtube.com" || host === "youtube-nocookie.com")
    id = path === "/watch" ? u.searchParams.get("v") : path.match(/^\/(?:shorts|embed|live)\/([\w-]+)/)?.[1];
  if (id && /^[\w-]{6,20}$/.test(id))
    return {
      kind: "iframe",
      src: `https://www.youtube-nocookie.com/embed/${id}`,
      source: `https://www.youtube.com/watch?v=${id}`,
      label: "Watch on YouTube",
    };

  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const m = path.match(/^\/(?:video\/)?(\d+)(?:\/([a-z0-9]+))?/i);
    if (m) {
      const h = m[2] || u.searchParams.get("h");
      return {
        kind: "iframe",
        src: `https://player.vimeo.com/video/${m[1]}${h && /^[a-z0-9]+$/i.test(h) ? `?h=${h}` : ""}`,
        source: `https://vimeo.com/${m[1]}`,
        label: "Watch on Vimeo",
      };
    }
  }

  if (host === "fb.watch" || (host === "facebook.com" && /\/(watch|videos|reel)\b/.test(path)))
    return {
      kind: "iframe",
      src: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(u.href)}&show_text=false`,
      source: u.href,
      label: "Watch on Facebook",
    };

  if (/\.(mp4|webm|ogg|mov|m4v)$/i.test(path))
    return { kind: "file", src: u.href, source: u.href, label: "Open the video file" };
  return null;
}

/** Turns a paragraph that holds only a video link into a player plus a link to the source. */
export function embedVideos(html) {
  return html.replace(/<p><a [^>]*?href="([^"]+)"[^>]*>[^<]*<\/a><\/p>/g, (whole, href) => {
    const v = parseVideo(href);
    if (!v) return whole;
    const player =
      v.kind === "file"
        ? `<video controls preload="metadata" playsinline src="${esc(v.src)}"></video>`
        : `<div class="video"><iframe src="${esc(v.src)}" title="Video player" loading="lazy" allowfullscreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture; fullscreen" referrerpolicy="strict-origin-when-cross-origin"></iframe></div>`;
    return `${player}<p class="video-source"><a href="${esc(v.source)}" target="_blank" rel="noopener nofollow">${v.label}</a></p>`;
  });
}
