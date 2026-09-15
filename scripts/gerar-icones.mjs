// Gera os ícones do PWA "Painel Carin" (roxo, vibe Nubank) a partir de um SVG.
// Rodar: node scripts/gerar-icones.mjs
import sharp from "sharp";

const svg = `<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#9d5be8"/>
      <stop offset="0.55" stop-color="#8b3dd9"/>
      <stop offset="1" stop-color="#6d28b8"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#g)"/>
  <path d="M 340 168 A 120 120 0 1 0 340 344" fill="none" stroke="#ffffff"
        stroke-width="52" stroke-linecap="round"/>
</svg>`;

const buf = Buffer.from(svg);
const alvos = [
  ["public/icon-512.png", 512],
  ["public/icon-192.png", 192],
  ["public/apple-touch-icon.png", 180],
];

for (const [arquivo, tam] of alvos) {
  await sharp(buf).resize(tam, tam).png().toFile(arquivo);
  console.log("gerado:", arquivo, `(${tam}x${tam})`);
}
