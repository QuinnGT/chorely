import pg from 'pg';
import { existsSync, readFileSync } from 'node:fs';

function loadEnvFile(path) {
  if (!existsSync(path)) return;

  const contents = readFileSync(path, 'utf8');
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    if (!key || process.env[key] !== undefined) continue;

    let value = trimmed.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

loadEnvFile('.env.local');
loadEnvFile('.env');

const pin = process.env.DEFAULT_ADMIN_PIN;
if (!pin) {
  console.log('→ DEFAULT_ADMIN_PIN not set, skipping admin PIN seed');
  process.exit(0);
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

try {
  await pool.query(
    `INSERT INTO app_settings (key, value)
     VALUES ('admin_pin', $1)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
    [pin],
  );
  console.log('→ Admin PIN synced from DEFAULT_ADMIN_PIN');
} finally {
  await pool.end();
}
