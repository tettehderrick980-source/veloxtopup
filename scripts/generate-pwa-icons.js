/**
 * PWA Icon Generator Script
 * Generates multiple icon sizes from the main logo
 * 
 * Usage: node scripts/generate-pwa-icons.js
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SOURCE_LOGO = path.join(__dirname, '../public/Velox-Logo.png');
const ICONS_DIR = path.join(__dirname, '../public/icons');

// PWA required icon sizes
const ICON_SIZES = [
  72, 96, 128, 144, 152, 192, 384, 512
];

// Shortcut icon sizes
const SHORTCUT_SIZES = [192];

async function generateIcons() {
  console.log('🔧 Generating PWA Icons...\n');

  // Ensure icons directory exists
  if (!fs.existsSync(ICONS_DIR)) {
    fs.mkdirSync(ICONS_DIR, { recursive: true });
    console.log('📁 Created icons directory');
  }

  // Check if source logo exists
  if (!fs.existsSync(SOURCE_LOGO)) {
    console.error('❌ Source logo not found:', SOURCE_LOGO);
    console.log('📝 Please place your logo at public/Velox-Logo.png');
    process.exit(1);
  }

  // Generate main PWA icons
  console.log('🎨 Generating main PWA icons...');
  for (const size of ICON_SIZES) {
    try {
      await sharp(SOURCE_LOGO)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 15, g: 23, b: 42, alpha: 1 } // #0f172a
        })
        .png()
        .toFile(path.join(ICONS_DIR, `icon-${size}x${size}.png`));
      
      console.log(`  ✓ icon-${size}x${size}.png`);
    } catch (error) {
      console.error(`  ✗ Failed to generate icon-${size}x${size}.png:`, error.message);
    }
  }

  // Generate shortcut icons
  console.log('\n🎯 Generating shortcut icons...');
  const shortcuts = [
    { name: 'buy-data', label: 'Buy Data' },
    { name: 'wallet', label: 'My Wallet' },
    { name: 'orders', label: 'Orders' }
  ];

  for (const shortcut of shortcuts) {
    try {
      // For now, copy main icon - you can customize these later
      await sharp(SOURCE_LOGO)
        .resize(192, 192, {
          fit: 'contain',
          background: { r: 15, g: 23, b: 42, alpha: 1 }
        })
        .png()
        .toFile(path.join(ICONS_DIR, `${shortcut.name}.png`));
      
      console.log(`  ✓ ${shortcut.name}.png (${shortcut.label})`);
    } catch (error) {
      console.error(`  ✗ Failed to generate ${shortcut.name}.png:`, error.message);
    }
  }

  // Generate maskable icons (with padding for safe zone)
  console.log('\n🎭 Generating maskable icons...');
  const maskableSizes = [192, 512];
  for (const size of maskableSizes) {
    try {
      const padding = Math.floor(size * 0.1); // 10% padding for safe zone
      const iconSize = size - (padding * 2);
      
      await sharp(SOURCE_LOGO)
        .resize(iconSize, iconSize, {
          fit: 'contain',
          background: { r: 15, g: 23, b: 42, alpha: 1 }
        })
        .extend({
          top: padding,
          bottom: padding,
          left: padding,
          right: padding,
          background: { r: 15, g: 23, b: 42, alpha: 1 }
        })
        .png()
        .toFile(path.join(ICONS_DIR, `maskable-icon-${size}x${size}.png`));
      
      console.log(`  ✓ maskable-icon-${size}x${size}.png`);
    } catch (error) {
      console.error(`  ✗ Failed to generate maskable icon:`, error.message);
    }
  }

  console.log('\n✅ PWA icons generated successfully!');
  console.log(`📂 Icons location: ${ICONS_DIR}`);
  console.log('\n🚀 Next steps:');
  console.log('   1. Verify icons are generated correctly');
  console.log('   2. Build your app: npm run build');
  console.log('   3. Test PWA with Lighthouse in Chrome DevTools');
}

generateIcons().catch(console.error);
