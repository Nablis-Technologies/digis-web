import type { Locator } from '@playwright/test';
import jsQR from 'jsqr';
import { PNG } from 'pngjs';

/** Decode what a gate scanner sees; do not reconstruct the UI's QR matrix. */
export async function decodeQr(image: Locator): Promise<string | undefined> {
  const png = PNG.sync.read(await image.screenshot({ animations: 'disabled' }));
  return jsQR(new Uint8ClampedArray(png.data), png.width, png.height)?.data;
}
