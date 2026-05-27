#!/bin/sh
set -e

echo "→ Running drizzle-kit push..."
cd /migrator
node ./node_modules/drizzle-kit/bin.cjs push --force --config=./drizzle.config.ts

echo "→ Syncing admin PIN..."
cd /app
node ./scripts/seed-admin-pin.mjs

echo "→ Starting Next.js server..."
exec node server.js
