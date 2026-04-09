#!/bin/sh
set -e

echo "🔄 Running database migrations..."
node scripts/runMigration.js

echo "🚀 Starting server..."
exec node src/server.js
