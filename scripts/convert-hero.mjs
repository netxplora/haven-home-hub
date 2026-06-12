import sharp from 'sharp';
import fs from 'fs';

async function convert(input, output) {
  try {
    if (fs.existsSync(input)) {
      await sharp(input).webp({ quality: 80 }).toFile(output);
      console.log(`Converted ${input} to ${output}`);
    } else {
      console.log(`Skipped ${input} (not found)`);
    }
  } catch(e) {
    console.error(e);
  }
}

async function main() {
  await convert('./src/assets/hero.jpg', './src/assets/hero.webp');
  await convert('./public/hero_modern_villa.png', './public/hero_modern_villa.webp');
  await convert('./public/hero_luxury_penthouse.png', './public/hero_luxury_penthouse.webp');
}

main();
