/**
 * Rasterize assets/icon.svg into the PNG sizes WXT auto-detects
 * (public/icon/{16,32,48,128}.png). Re-run after editing the SVG:
 *   pnpm --filter @speaktype/extension gen:icons
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SIZES = [16, 32, 48, 128];

const svg = await readFile(resolve(root, 'assets/icon.svg'));
const outDir = resolve(root, 'public/icon');
await mkdir(outDir, { recursive: true });

for (const size of SIZES) {
  const png = await sharp(svg, { density: 384 })
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  await writeFile(resolve(outDir, `${size}.png`), png);
  console.log(`✓ public/icon/${size}.png`);
}
