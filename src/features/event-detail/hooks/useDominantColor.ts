import { useEffect, useState } from 'react';

function proxiedColorUrl(url: string): string {
  const stripped = url.replace(/^https:\/\//, 'ssl:').replace(/^http:\/\//, '');
  return `https://images.weserv.nl/?url=${encodeURIComponent(stripped)}&w=160`;
}

export function useDominantColor(src?: string): [number, number, number] | null {
  const [rgb, setRgb] = useState<[number, number, number] | null>(null);
  useEffect(() => {
    if (!src) { setRgb(null); return; }
    let cancelled = false;
    let triedProxy = false;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const onFail = () => {
      if (triedProxy || cancelled) return;
      triedProxy = true;
      img.src = proxiedColorUrl(src);
    };
    img.onerror = onFail;
    img.onload = () => {
      try {
        const w = 32;
        const h = Math.max(1, Math.round((img.naturalHeight / img.naturalWidth) * w));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, w, h);
        const data = ctx.getImageData(0, 0, w, h).data;
        let r = 0, g = 0, b = 0, count = 0;
        for (let i = 0; i < data.length; i += 4) {
          const a = data[i + 3];
          if (a < 128) continue;
          r += data[i]; g += data[i + 1]; b += data[i + 2]; count++;
        }
        if (!cancelled && count) setRgb([Math.round(r / count), Math.round(g / count), Math.round(b / count)]);
      } catch {
        onFail();
      }
    };
    img.src = src;
    return () => { cancelled = true; };
  }, [src]);
  return rgb;
}
