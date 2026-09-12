#!/usr/bin/env node
// Génère les icônes PNG depuis le SVG
// Nécessite : npm install sharp

import { writeFileSync } from 'fs';
import sharp from 'sharp';

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none">
  <rect width="32" height="32" rx="8" fill="#1E3A8A"/>
  <path d="M8 16L14 22L24 10" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

async function generate() {
  const buffer = Buffer.from(svg);
  
  await sharp(buffer)
    .resize(192, 192)
    .png()
    .toFile('public/icon-192.png');
  
  await sharp(buffer)
    .resize(512, 512)
    .png()
    .toFile('public/icon-512.png');
  
  await sharp(buffer)
    .resize(180, 180)
    .png()
    .toFile('public/apple-touch-icon.png');
  
  console.log('✓ Icônes générées');
}

generate().catch(console.error);