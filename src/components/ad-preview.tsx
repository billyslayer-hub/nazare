"use client";

import { Download } from "lucide-react";

/**
 * Renders an ad as an SVG "creative" (square, portrait or story size) and lets
 * the user download it as a PNG. Fonts are system fonts so the downloaded
 * image matches the preview exactly.
 */

export const AD_THEMES = {
  maroon: { bg: "#912F30", text: "#FFF8F0", accent: "#D99A57", ctaText: "#3A1213", sub: "#F2D9C2" },
  forest: { bg: "#344840", text: "#FFF8F0", accent: "#D99A57", ctaText: "#22302A", sub: "#D4DED8" },
  cream: { bg: "#FAF3E8", text: "#3A1213", accent: "#912F30", ctaText: "#FFF8F0", sub: "#6B4A3A" },
  gold: { bg: "#D99A57", text: "#2B0E0F", accent: "#344840", ctaText: "#FFF8F0", sub: "#4A2A1A" },
} as const;
export type AdTheme = keyof typeof AD_THEMES;

function wrap(text: string, maxChars: number, maxLines: number): string[] {
  const words = text.replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    if ((line + " " + w).trim().length > maxChars) {
      if (line) lines.push(line);
      line = w;
      if (lines.length === maxLines) break;
    } else line = (line + " " + w).trim();
  }
  if (line && lines.length < maxLines) lines.push(line);
  if (lines.length === maxLines && words.join(" ").length > lines.join(" ").length) lines[maxLines - 1] = lines[maxLines - 1].replace(/[\s,.;:!?]*\S*$/, "") + "…";
  return lines;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function adSvg({ headline, body, cta, brand, theme, size }: { headline: string; body: string; cta: string; brand: string; theme: AdTheme; size: "square" | "story" }) {
  const t = AD_THEMES[theme];
  const W = 1080;
  const H = size === "story" ? 1920 : 1080;
  const top = size === "story" ? 520 : 200;
  const h = wrap(headline.replace(/^(Hook|Subject):\s*/i, ""), 16, 4);
  const hSize = h.length > 3 ? 84 : 100;
  const bodyY = top + h.length * (hSize * 1.08) + 50;
  // Fit body lines between the headline and the CTA, leaving room for the brand line at the bottom.
  const room = H - 190 - (cta ? 104 + 60 : 0) - bodyY;
  const maxBody = Math.max(0, Math.min(size === "story" ? 6 : 4, Math.floor(room / 52)));
  const b = maxBody ? wrap(body.split("\n").filter((l) => l.trim() && !/^\d+–\d+s/.test(l))[0] ?? body, 38, maxBody) : [];
  const ctaY = bodyY + b.length * 52 + (b.length ? 50 : 0);
  const ctaW = Math.min(820, 120 + cta.length * 26);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<rect width="${W}" height="${H}" fill="${t.bg}"/>
<circle cx="${W - 80}" cy="120" r="260" fill="${t.accent}" opacity="0.12"/>
<circle cx="90" cy="${H - 60}" r="200" fill="${t.accent}" opacity="0.10"/>
<rect x="96" y="${top - 70}" width="90" height="10" rx="5" fill="${t.accent}"/>
${h.map((l, i) => `<text x="96" y="${top + 30 + i * hSize * 1.08}" font-family="Georgia, 'Times New Roman', serif" font-weight="700" font-size="${hSize}" fill="${t.text}">${esc(l)}</text>`).join("\n")}
${b.map((l, i) => `<text x="96" y="${bodyY + i * 52}" font-family="Helvetica, Arial, sans-serif" font-size="38" fill="${t.sub}">${esc(l)}</text>`).join("\n")}
${cta ? `<rect x="96" y="${ctaY}" width="${ctaW}" height="104" rx="52" fill="${t.accent}"/><text x="${96 + ctaW / 2}" y="${ctaY + 66}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-weight="700" font-size="40" fill="${t.ctaText}">${esc(cta)}</text>` : ""}
<text x="96" y="${H - 90}" font-family="Georgia, 'Times New Roman', serif" font-style="italic" font-size="46" fill="${t.text}">${esc(brand)}</text>
</svg>`;
}

export async function downloadPng(svg: string, filename: string) {
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Could not render the image."));
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth || 1080;
    canvas.height = img.naturalHeight || 1080;
    canvas.getContext("2d")!.drawImage(img, 0, 0);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/png"));
    if (!blob) throw new Error("Could not create the PNG.");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function AdPreview({ headline, body, cta, brand, theme, size, filename }: { headline: string; body: string; cta: string; brand: string; theme: AdTheme; size: "square" | "story"; filename: string }) {
  const svg = adSvg({ headline, body, cta, brand, theme, size });
  return (
    <div className="group relative">
      <div className="overflow-hidden rounded-lg shadow-sm ring-1 ring-black/5" style={{ aspectRatio: size === "story" ? "9 / 16" : "1 / 1" }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- inline SVG data URL */}
        <img alt={`Ad preview: ${headline}`} className="h-full w-full" src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`} />
      </div>
      <button
        type="button"
        onClick={() => downloadPng(svg, filename)}
        className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-md bg-white/95 px-2 py-1 text-xs font-medium text-slate-800 shadow-sm opacity-100 transition hover:bg-white sm:opacity-0 sm:group-hover:opacity-100"
      >
        <Download className="size-3.5" />PNG
      </button>
    </div>
  );
}
