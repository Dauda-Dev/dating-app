# Database Migration Guide - Password Reset Fields

**Date:** February 4, 2026  
**Affected Table:** `users`  
**Changes:** Add 2 columns + 2 indexes  
**Downtime:** None (additive change)  

---

## Quick Start

### Option 1: Using Migration Script (Recommended)

```bash
cd dating-app
node scripts/runMigration.js
```

This will:
- Connect to your database
- Apply all pending migrations
- Add password_reset_token column
- Add password_reset_expires column
- Create performance indexes

### Option 2: Manual SQL

Connect to your database and run:

```sql
-- Start transaction
BEGIN;

-- Add password reset token column
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(255);

-- Add password reset expiry column
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMP;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_password_reset_token ON users(password_reset_token);
CREATE INDEX IF NOT EXISTS idx_password_reset_expires ON users(password_reset_expires);

-- Commit transaction
COMMIT;

-- Verify migration
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'users' AND column_name IN ('password_reset_token', 'password_reset_expires');
```

### Option 3: Using Docker

```bash
docker-compose exec postgres psql -U postgres -d dating_app -f /migrations/20260204_add_password_reset_fields.sql
```

---

## Step-by-Step Manual Migration

### 1. Connect to Database

#### PostgreSQL Command Line
```bash
psql postgresql://user:password@localhost:5432/dating_app
```

#### Or using Docker
```bash
docker-compose exec postgres psql -U postgres -d dating_app
```

### 2. Copy & Paste SQL

In your database client, run this exact SQL:

```sql
BEGIN;

ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_password_reset_token ON users(password_reset_token);
CREATE INDEX IF NOT EXISTS idx_password_reset_expires ON users(password_reset_expires);

COMMIT;
```

### 3. Verify Migration

Check that columns were added:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;
```

You should see:
```
password_reset_token  | character varying
password_reset_expires | timestamp without time zone
```

Check indexes were created:

```sql
SELECT indexname 
FROM pg_indexes 
WHERE tablename = 'users' 
AND indexname LIKE '%password_reset%';
```

You should see:
```
idx_password_reset_token
idx_password_reset_expires
```

---

## What Changed

### New Columns

| Column Name | Type | Nullable | Purpose |
|-------------|------|----------|---------|
| password_reset_token | VARCHAR(255) | Yes | Stores unique reset token |
| password_reset_expires | TIMESTAMP | Yes | Token expiry time (1 hour) |

### New Indexes

| Index Name | Columns | Purpose |
|-----------|---------|---------|
| idx_password_reset_token | password_reset_token | Fast token lookup during reset |
| idx_password_reset_expires | password_reset_expires | Fast cleanup of old tokens |

---

## Database Schema After Migration

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR UNIQUE NOT NULL,
  password VARCHAR NOT NULL,
  googleId VARCHAR UNIQUE,
  firstName VARCHAR NOT NULL,
  lastName VARCHAR NOT NULL,
  dateOfBirth DATE NOT NULL,
  gender ENUM NOT NULL,
  profilePhoto VARCHAR,
  relationshipStatus VARCHAR DEFAULT 'available',
  subscriptionTier VARCHAR DEFAULT 'free',
  isEmailVerified BOOLEAN DEFAULT false,
  emailVerificationToken VARCHAR,
  emailVerificationExpires TIMESTAMP,
  password_reset_token VARCHAR,           -- ← NEW
  password_reset_expires TIMESTAMP,       -- ← NEW
  refreshToken VARCHAR,
  lastLoginAt TIMESTAMP,
  isActive BOOLEAN DEFAULT true,
  isSuspended BOOLEAN DEFAULT false,
  timezone VARCHAR DEFAULT 'UTC',
  latitude DECIMAL,
  longitude DECIMAL,
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP
);

-- Indexes
CREATE INDEX idx_email ON users(email);
CREATE INDEX idx_googleId ON users(googleId);
CREATE INDEX idx_relationshipStatus ON users(relationshipStatus);
CREATE INDEX idx_password_reset_token ON users(password_reset_token);    -- ← NEW
CREATE INDEX idx_password_reset_expires ON users(password_reset_expires); -- ← NEW
```

---

## Testing Migration

### 1. Verify Columns Exist

```sql
-- In psql
\d users

-- Should show new columns at the bottom
```

### 2. Test Password Reset Flow

```bash
# Start your server
npm run dev

# In another terminal, test forgot-password
curl -X POST http://localhost:3000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com"}'

# Check database for token
psql -c "SELECT email, password_reset_token, password_reset_expires FROM users WHERE email='test@test.com';"
```

### 3. Verify Token Expiry

```sql
-- Check token was created
SELECT email, password_reset_token, password_reset_expires 
FROM users 
WHERE password_reset_token IS NOT NULL;

-- Should show tokens with expiry ~1 hour in future
```

---

## Rollback (If Needed)

If you need to undo this migration:

```sql
BEGIN;

-- Drop indexes
DROP INDEX IF EXISTS idx_password_reset_token;
DROP INDEX IF EXISTS idx_password_reset_expires;

-- Drop columns
ALTER TABLE users DROP COLUMN IF EXISTS password_reset_token;
ALTER TABLE users DROP COLUMN IF EXISTS password_reset_expires;

COMMIT;
```

---

## Troubleshooting

### Error: "Column already exists"

This means the migration was already applied. That's fine! You can safely ignore it or use `IF NOT EXISTS` in the SQL.

```sql
-- Safe approach (won't error if column exists)
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(255);
```

### Error: "Index already exists"

Same situation - migration was already applied.

```sql
-- Safe approach
CREATE INDEX IF NOT EXISTS idx_password_reset_token ON users(password_reset_token);
```

### Error: "Cannot connect to database"

Check your DATABASE_URL in .env:

```bash
echo $DATABASE_URL
# Should output: postgresql://user:password@host:port/database
```

### Error: "Column not found when running password reset"

Make sure migration was applied successfully:

```sql
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'password_reset_token';
```

If empty, run migration again.

---

## Performance Impact

✅ **Minimal Impact:**
- Adding nullable columns: No rewrite of existing data
- Adding indexes: Built in background, doesn't lock table
- No downtime required
- Backward compatible

✅ **Performance Improvement:**
- Token lookup: O(log n) with index
- Cleanup queries: O(log n) with expiry index
- Negligible memory overhead (2 columns per user)

---

## Verification Checklist

- [ ] Migration file created: `database/migrations/20260204_add_password_reset_fields.sql`
- [ ] Migration script created: `scripts/runMigration.js`
- [ ] Database connected and authenticated
- [ ] Migration applied successfully
- [ ] Columns verified in database
- [ ] Indexes created and visible
- [ ] Password reset endpoint tested
- [ ] Token stored in database
- [ ] Token expiry validated

---

## Next Steps

After applying migration:

1. ✅ Start your server: `npm run dev`
2. ✅ Test password reset: Test with Postman or curl
3. ✅ Verify email sending: Check Mailgun logs
4. ✅ Test complete flow: Forgot → Reset → Login
5. ✅ Deploy to staging
6. ✅ Deploy to production

---

## Timeline

- **Migration Time:** < 1 minute
- **Testing Time:** 15-30 minutes
- **Total Deployment Time:** 1-2 hours (including testing)

---

**Migration Complete! Your database is now ready for password reset functionality. ✅**
