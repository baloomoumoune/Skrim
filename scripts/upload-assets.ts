/**
 * Upload game assets to Supabase Storage
 *
 * Usage:
 *   npx ts-node scripts/upload-assets.ts
 *
 * Prerequisites:
 *   1. Create a PUBLIC bucket called "game-assets" in Supabase Dashboard
 *      → Storage → New Bucket → Name: game-assets → Public: ON
 *   2. Set your service role key below (NOT the anon key)
 *
 * Structure uploaded:
 *   game-assets/valorant/agents/jett.png
 *   game-assets/valorant/maps/ascent.png
 *   game-assets/valorant/ranks/radiant.png
 *   game-assets/cs2/maps/dust2.png
 *   ...
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ── Config ──────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUPABASE_URL = 'https://nlmtbflnzykjuwqigctt.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY ?? '';
const BUCKET = 'game-assets';
const ASSETS_DIR = path.resolve(__dirname, '..', 'assets');

if (!SUPABASE_SERVICE_KEY) {
  console.error('Error: Set SUPABASE_SERVICE_KEY env variable (service_role key, not anon key)');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ── Games to upload ─────────────────────────────────
const GAME_FOLDERS: Record<string, string> = {
  Valorant: 'valorant',
  // CS2: 'cs2',  // uncomment when you add CS2 assets
};

const ASSET_TYPES = ['agents', 'maps', 'ranks'];

async function uploadFile(localPath: string, storagePath: string): Promise<boolean> {
  const fileBuffer = fs.readFileSync(localPath);
  const contentType = 'image/png';

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, fileBuffer, {
      contentType,
      upsert: true,
    });

  if (error) {
    console.error(`  ✗ ${storagePath}: ${error.message}`);
    return false;
  }
  console.log(`  ✓ ${storagePath}`);
  return true;
}

async function main() {
  console.log(`Uploading game assets to ${BUCKET}...\n`);

  let uploaded = 0;
  let failed = 0;

  for (const [folderName, gameId] of Object.entries(GAME_FOLDERS)) {
    const gameDir = path.join(ASSETS_DIR, folderName);

    if (!fs.existsSync(gameDir)) {
      console.warn(`Skipping ${folderName}: folder not found at ${gameDir}`);
      continue;
    }

    console.log(`── ${gameId} ──`);

    for (const assetType of ASSET_TYPES) {
      const typeDir = path.join(gameDir, assetType);

      if (!fs.existsSync(typeDir)) {
        console.log(`  Skipping ${assetType}/: not found`);
        continue;
      }

      const files = fs.readdirSync(typeDir).filter((f) => /\.(png|jpg|jpeg|webp)$/i.test(f));
      console.log(`  ${assetType}/ (${files.length} files)`);

      for (const file of files) {
        const localPath = path.join(typeDir, file);
        const storagePath = `${gameId}/${assetType}/${file.toLowerCase()}`;
        const ok = await uploadFile(localPath, storagePath);
        if (ok) uploaded++;
        else failed++;
      }
    }

    console.log('');
  }

  console.log(`Done. ${uploaded} uploaded, ${failed} failed.`);
}

main().catch(console.error);
