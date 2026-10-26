// Renders the PWA icons in public/icons from the logo mark.
// Usage: node scripts/generate-icons.mjs
import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";

// sharp ships with Next.js, so resolve it through next instead of adding a dependency.
const require = createRequire(import.meta.url);
const sharp = createRequire(require.resolve("next/package.json"))("sharp");

const mark = (size, padding) => {
  const inner = size - padding * 2;
  const s = inner / 32;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="#11110F" rx="${padding ? 0 : size * 0.28}"/>
  <g transform="translate(${padding} ${padding}) scale(${s})">
    <path d="M9.5 22.5C9.5 15 22.5 17 22.5 9.5" stroke="#35B0A5" stroke-width="3" stroke-linecap="round" fill="none"/>
    <circle cx="9.5" cy="22.5" r="2.6" fill="#F4F1E8"/>
    <circle cx="22.5" cy="9.5" r="3" fill="#FF4F2F"/>
  </g>
</svg>`;
};

mkdirSync("public/icons", { recursive: true });

const outputs = [
  { file: "public/icons/icon-192.png", size: 192, padding: 0 },
  { file: "public/icons/icon-512.png", size: 512, padding: 0 },
  // Maskable icons keep the artwork inside the 80% safe zone.
  { file: "public/icons/maskable-512.png", size: 512, padding: 96 },
  { file: "src/app/apple-icon.png", size: 180, padding: 22 },
];

for (const { file, size, padding } of outputs) {
  await sharp(Buffer.from(mark(size, padding))).png().toFile(file);
  console.log(`wrote ${file}`);
}
