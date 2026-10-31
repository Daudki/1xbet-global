export interface VideoInfo {
  kind: "iframe" | "file";
  src: string;
  source: string;
  label: string;
}
export function parseVideo(raw: string): VideoInfo | null;
export function embedVideos(html: string): string;
