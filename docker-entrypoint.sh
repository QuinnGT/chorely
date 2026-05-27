#!/bin/sh
set -e

echo "→ Running drizzle-kit push..."
cd /migrator
node ./node_modules/drizzle-kit/bin.cjs push --force --config=./drizzle.config.ts

echo "→ Starting Next.js server..."
cd /app
exec node server.js
