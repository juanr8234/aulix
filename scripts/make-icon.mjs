// Genera build/icon.ico (multi-resolución) y build/icon.png desde public/aulix-icon.svg.
// Uso: node scripts/make-icon.mjs  (corre solo cuando cambia el logo).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import sharp from 'sharp';
import pngToIco from 'png-to-ico';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const svg = readFileSync(join(root, 'public', 'aulix-icon.svg'));
const buildDir = join(root, 'build');
mkdirSync(buildDir, { recursive: true });

const sizes = [16, 24, 32, 48, 64, 128, 256];
const pngs = await Promise.all(
  sizes.map((s) => sharp(svg).resize(s, s).png().toBuffer()),
);

// PNG grande de referencia (usado por electron-builder en Linux/macOS si hiciera falta).
writeFileSync(join(buildDir, 'icon.png'), pngs[pngs.length - 1]);

// ICO multi-resolución para Windows / NSIS.
const ico = await pngToIco(pngs);
writeFileSync(join(buildDir, 'icon.ico'), ico);

console.log('✓ build/icon.ico y build/icon.png generados');
