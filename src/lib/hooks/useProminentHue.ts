import { useEffect, useState } from "react";

// Hue-bucketed prominent-color extractor weighted by AREA (count) not by lightness,
// so dark dominant backgrounds (e.g. navy poster) win over bright small accents.
// Preserves the winning bucket's natural lightness — no neon lift.
const _prominentHueCache = new Map<string, string>();
export function useProminentHue(
  imageUrl: string,
  fallbackRgb: string,
  _isDark: boolean,
): string {
  const [val, setVal] = useState<string>(
    () => _prominentHueCache.get(imageUrl) ?? fallbackRgb,
  );
  useEffect(() => {
    if (!imageUrl) return;
    const cached = _prominentHueCache.get(imageUrl);
    if (cached) {
      setVal(cached);
      return;
    }
    let cancelled = false;
    let triedProxy = false;
    const img = new Image();
    img.crossOrigin = "anonymous";
    // Non-CORS hosts (i.ibb.co, i.postimg.cc, …) taint the canvas; retry once
    // through a CORS-enabled proxy so the read succeeds.
    const proxied = (u: string) =>
      `https://images.weserv.nl/?url=${encodeURIComponent(
        u
          .replace(/^https:\/\//, "ssl:")
          .replace(/^http:\/\//, ""),
      )}&w=160`;
    const onFail = () => {
      if (triedProxy || cancelled) return;
      triedProxy = true;
      img.src = proxied(imageUrl);
    };
    img.onerror = onFail;
    img.src = imageUrl;
    img.onload = () => {
      try {
        const W = 80;
        const H = Math.max(
          1,
          Math.round(
            (img.naturalHeight / img.naturalWidth) * W,
          ),
        );
        const c = document.createElement("canvas");
        c.width = W;
        c.height = H;
        const ctx = c.getContext("2d", {
          willReadFrequently: true,
        });
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, W, H);
        const data = ctx.getImageData(0, 0, W, H).data;
        const BUCKETS = 18;
        const buckets = Array.from({ length: BUCKETS }, () => ({
          w: 0,
          r: 0,
          g: 0,
          b: 0,
          count: 0,
        }));
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i],
            g = data[i + 1],
            b = data[i + 2],
            a = data[i + 3];
          if (a < 200) continue;
          const rn = r / 255,
            gn = g / 255,
            bn = b / 255;
          const max = Math.max(rn, gn, bn),
            min = Math.min(rn, gn, bn);
          const l = (max + min) / 2;
          const d = max - min;
          // skip pure black/white only — keep dark colors
          if (l < 0.04 || l > 0.96) continue;
          const s =
            d === 0
              ? 0
              : l > 0.5
                ? d / (2 - max - min)
                : d / (max + min);
          if (s < 0.12) continue;
          let h = 0;
          if (d !== 0) {
            switch (max) {
              case rn:
                h = (gn - bn) / d + (gn < bn ? 6 : 0);
                break;
              case gn:
                h = (bn - rn) / d + 2;
                break;
              case bn:
                h = (rn - gn) / d + 4;
                break;
            }
            h = (h / 6) % 1;
            if (h < 0) h += 1;
          }
          // Weight by area (count) × mild saturation factor — no lightness bias.
          // Bright accents are usually small in area, so dark backgrounds win.
          const w = 1 + s * 0.5;
          const idx = Math.min(
            BUCKETS - 1,
            Math.floor(h * BUCKETS),
          );
          const bk = buckets[idx];
          bk.w += w;
          bk.r += r * w;
          bk.g += g * w;
          bk.b += b * w;
          bk.count += 1;
        }
        let best = -1,
          bestW = 0;
        for (let i = 0; i < BUCKETS; i++)
          if (buckets[i].w > bestW) {
            bestW = buckets[i].w;
            best = i;
          }
        if (best === -1) return;
        const bk = buckets[best];
        const r = Math.round(bk.r / bk.w);
        const g = Math.round(bk.g / bk.w);
        const b = Math.round(bk.b / bk.w);
        const out = `${r},${g},${b}`;
        _prominentHueCache.set(imageUrl, out);
        if (!cancelled) setVal(out);
      } catch {
        // Canvas tainted (no CORS) — retry once via the proxy.
        onFail();
      }
    };
    return () => {
      cancelled = true;
    };
  }, [imageUrl]);
  return val;
}

/* ─── Mobile coverflow carousel ────────────────────────────
   Centered active card (scaled up, bright, in focus); neighbors
   shrink, dim and peek at the edges. Swipeable / draggable with a
   spring snap. Spacing is tuned so cards never overlap mid-transition. */
const CARD_W_FRAC = 0.84; // active card width as fraction of container
const AUTO_SCROLL_MS = 4500; // auto-advance interval
const INTERACT_PAUSE_MS = 8000; // pause auto-scroll after a user interaction

