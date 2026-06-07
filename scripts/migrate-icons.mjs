/**
 * One-time migration: rewrite existing emoji `chores.icon` values to the
 * Iconify (MDI) IDs the app now renders. Maps by emoji meaning.
 *
 * Safe to run multiple times — only rows whose icon exactly matches a known
 * legacy emoji are touched; anything already an `mdi:` ID (or unmapped) is left
 * alone (and still renders via ChoreIcon's emoji fallback).
 *
 *   node scripts/migrate-icons.mjs
 */
import pg from 'pg';
import { existsSync, readFileSync } from 'node:fs';

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  const contents = readFileSync(path, 'utf8');
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const i = trimmed.indexOf('=');
    if (i === -1) continue;
    const key = trimmed.slice(0, i).trim();
    if (!key || process.env[key] !== undefined) continue;
    let value = trimmed.slice(i + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

loadEnvFile('.env.local');
loadEnvFile('.env');

// Legacy emoji → MDI icon ID. Keep in sync with src/lib/icon-catalog.ts.
const EMOJI_TO_ICON = {
  '📋': 'mdi:clipboard-text',
  '🛏️': 'mdi:bed',
  '🪥': 'mdi:toothbrush',
  '📚': 'mdi:bookshelf',
  '🧹': 'mdi:broom',
  '🍽️': 'mdi:silverware-fork-knife',
  '🍴': 'mdi:silverware-fork-knife',
  '🐕': 'mdi:dog',
  '🐶': 'mdi:dog',
  '🐱': 'mdi:cat',
  '🐟': 'mdi:fish',
  '🗑️': 'mdi:trash-can-outline',
  '🧽': 'mdi:spray-bottle',
  '🧼': 'mdi:hand-wash-outline',
  '🪣': 'mdi:bucket-outline',
  '🧻': 'mdi:toilet-paper',
  '✨': 'mdi:shimmer',
  '🌿': 'mdi:sprout',
  '🌱': 'mdi:sprout',
  '🪴': 'mdi:sprout',
  '💧': 'mdi:water',
  '🚀': 'mdi:rocket-launch',
  '🚿': 'mdi:shower-head',
  '🚽': 'mdi:toilet',
  '🛁': 'mdi:bathtub',
  '🏠': 'mdi:home',
  '🔨': 'mdi:hammer',
  '🧺': 'mdi:basket',
  '👕': 'mdi:tshirt-crew',
  '🎁': 'mdi:gift',
  '⭐': 'mdi:star',
  '💰': 'mdi:piggy-bank',
  '🏆': 'mdi:trophy',
  '📝': 'mdi:note-edit-outline',
  '🎹': 'mdi:piano',
};

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

try {
  let total = 0;
  for (const [emoji, iconId] of Object.entries(EMOJI_TO_ICON)) {
    const res = await pool.query('UPDATE chores SET icon = $1 WHERE icon = $2', [iconId, emoji]);
    if (res.rowCount > 0) {
      console.log(`  ${emoji} → ${iconId}  (${res.rowCount} row${res.rowCount === 1 ? '' : 's'})`);
      total += res.rowCount;
    }
  }
  console.log(total > 0 ? `✓ Migrated ${total} chore icon(s).` : '→ No legacy emoji icons found; nothing to migrate.');

  const { rows } = await pool.query(
    "SELECT DISTINCT icon FROM chores WHERE icon NOT LIKE 'mdi:%'",
  );
  if (rows.length > 0) {
    console.log(`⚠ ${rows.length} icon value(s) still not MDI (will use emoji fallback): ${rows.map((r) => r.icon).join(' ')}`);
  }
} finally {
  await pool.end();
}
