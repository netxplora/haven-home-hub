import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const iconDir = path.join(process.cwd(), 'public', 'icons');
if (!fs.existsSync(iconDir)) {
  fs.mkdirSync(iconDir, { recursive: true });
}

const logoPath = path.join(process.cwd(), 'public', 'logo.png');

async function generateIcons() {
  try {
    await sharp(logoPath)
      .resize(192, 192, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .toFile(path.join(iconDir, 'icon-192.png'));
      
    await sharp(logoPath)
      .resize(512, 512, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .toFile(path.join(iconDir, 'icon-512.png'));
      
    console.log("Icons generated successfully.");
  } catch (error) {
    console.error("Error generating icons:", error);
  }
}

generateIcons();
