import { useState, useEffect } from 'react';
import { FastAverageColor } from 'fast-average-color';

interface ImageColor {
  hex: string;
  rgb: string;
  isDark: boolean;
  isLoading: boolean;
}

const colorCache = new Map<string, { hex: string; rgb: string; isDark: boolean }>();

// Route an image through a CORS-enabled proxy so its pixels can be read.
// Many hosts (i.ibb.co, i.postimg.cc, …) don't send Access-Control-Allow-Origin,
// which taints the canvas and blocks color extraction. weserv adds the headers
// and lets us downscale for a faster read.
function proxiedUrl(url: string): string {
  const stripped = url.replace(/^https:\/\//, 'ssl:').replace(/^http:\/\//, '');
  return `https://images.weserv.nl/?url=${encodeURIComponent(stripped)}&w=160`;
}

export function useImageColor(imageUrl: string): ImageColor {
  const [color, setColor] = useState<ImageColor>({
    hex: '#d9ff00',
    rgb: '217,255,0',
    isDark: true,
    isLoading: true,
  });

  useEffect(() => {
    if (!imageUrl) return;

    const cached = colorCache.get(imageUrl);
    if (cached) {
      setColor({ ...cached, isLoading: false });
      return;
    }

    let cancelled = false;
    const fac = new FastAverageColor();

    const extract = (img: HTMLImageElement): boolean => {
      try {
        const result = fac.getColor(img, { algorithm: 'dominant', mode: 'precision' });
        // Boost saturation for more vibrant colors
        const [r, g, b] = result.value;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const saturation = max === 0 ? 0 : (max - min) / max;

        let finalR = r, finalG = g, finalB = b;
        if (saturation < 0.3) {
          // If too desaturated, boost the dominant channel
          const avg = (r + g + b) / 3;
          finalR = Math.min(255, Math.round(r + (r - avg) * 1.5));
          finalG = Math.min(255, Math.round(g + (g - avg) * 1.5));
          finalB = Math.min(255, Math.round(b + (b - avg) * 1.5));
        }

        const hex = `#${[finalR, finalG, finalB].map(c => Math.max(0, c).toString(16).padStart(2, '0')).join('')}`;
        const rgb = `${Math.max(0, finalR)},${Math.max(0, finalG)},${Math.max(0, finalB)}`;
        const val = { hex, rgb, isDark: result.isDark };
        colorCache.set(imageUrl, val);
        if (!cancelled) setColor({ ...val, isLoading: false });
        return true;
      } catch {
        return false;
      }
    };

    // Attempt the direct URL first (fast for CORS-enabled hosts like Unsplash);
    // on any failure, retry once through the proxy.
    const tryLoad = (src: string, onFail: () => void) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => { if (!cancelled && !extract(img)) onFail(); };
      img.onerror = onFail;
      img.src = src;
    };

    const finish = () => { if (!cancelled) setColor(prev => ({ ...prev, isLoading: false })); fac.destroy(); };

    tryLoad(imageUrl, () => {
      tryLoad(proxiedUrl(imageUrl), finish);
    });

    return () => { cancelled = true; };
  }, [imageUrl]);

  return color;
}
