import pg from 'pg';

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
