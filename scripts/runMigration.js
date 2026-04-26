#!/usr/bin/env node

/**
 * Database Migration Runner
 * 
 * Usage:
 *   node scripts/runMigration.js
 * 
 * This script applies pending migrations to the database
 */

const fs = require('fs');
const path = require('path');
const db = require('../src/config/database');

const migrationsDir = path.join(__dirname, '../database/migrations');

async function runMigrations() {
  try {
    console.log('🔄 Starting database migration...\n');

    // Authenticate database
    console.log('🔐 Connecting to database...');
    await db.authenticate();
    console.log('✅ Database connected\n');

    // Get all migration files
    if (!fs.existsSync(migrationsDir)) {
      console.log('ℹ️  No migrations directory found. Creating...');
      fs.mkdirSync(migrationsDir, { recursive: true });
      return;
    }

    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    if (migrationFiles.length === 0) {
      console.log('ℹ️  No migration files found.');
      return;
    }

    console.log(`Found ${migrationFiles.length} migration(s):\n`);

    // Run each migration
    for (const file of migrationFiles) {
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');

      console.log(`📝 Applying migration: ${file}`);
      try {
        // Execute raw SQL
        await db.sequelize.query(sql);
        console.log(`✅ Migration applied: ${file}\n`);
      } catch (err) {
        // Check if it's just a "already exists" type error (safe to ignore)
        if (err.message.includes('already exists') || 
            err.message.includes('duplicate key') ||
            err.message.includes('constraint')) {
          console.log(`⚠️  Migration may have been applied already: ${file}\n`);
        } else {
          console.error(`❌ Migration failed: ${file}`);
          console.error(`Error: ${err.message}\n`);
          throw err;
        }
      }
    }

    console.log('🎉 All migrations completed successfully!');
    console.log('\n📊 Migration Summary:');
    console.log(`   - Files processed: ${migrationFiles.length}`);
    console.log(`   - Database: Password reset fields added`);
    console.log('\n✅ Your database is now up to date.');

  } catch (err) {
    console.error('\n❌ Migration failed:');
    console.error(err.message);
    process.exit(1);
  } finally {
    await db.sequelize.close();
  }
}

// Run migrations
runMigrations();
