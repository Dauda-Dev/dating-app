# 🚀 Quick Migration Reference

**What:** Add password reset fields to users table  
**When:** Before deploying password reset feature  
**Time:** < 1 minute  
**Risk:** Very low (additive only)  

---

## 🔥 Quick Start (Copy & Paste)

### Option A: Using npm script (Easiest)
```bash
npm run migrate
```

### Option B: Using SQL directly
```bash
psql postgresql://your_user:your_password@localhost/dating_app << EOF
BEGIN;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMP;
CREATE INDEX IF NOT EXISTS idx_password_reset_token ON users(password_reset_token);
CREATE INDEX IF NOT EXISTS idx_password_reset_expires ON users(password_reset_expires);
COMMIT;
EOF
```

### Option C: Using Docker
```bash
docker-compose exec postgres psql -U postgres -d dating_app << EOF
BEGIN;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMP;
CREATE INDEX IF NOT EXISTS idx_password_reset_token ON users(password_reset_token);
CREATE INDEX IF NOT EXISTS idx_password_reset_expires ON users(password_reset_expires);
COMMIT;
EOF
```

---

## ✅ Verify It Worked

```bash
psql -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND column_name LIKE 'password_reset%';"
```

Should return:
```
password_reset_token
password_reset_expires
```

---

## 📊 What Changed

| Added | Type | Purpose |
|-------|------|---------|
| password_reset_token | VARCHAR(255) | Store reset token |
| password_reset_expires | TIMESTAMP | Token expiry (1 hour) |
| idx_password_reset_token | INDEX | Fast token lookup |
| idx_password_reset_expires | INDEX | Fast cleanup |

---

## 🔄 Next Steps

After migration:
1. ✅ Start server: `npm run dev`
2. ✅ Test endpoint: See QUICK_REFERENCE.md
3. ✅ Check logs for errors
4. ✅ Test complete flow (forgot → reset → login)

---

**That's it! Migration complete. 🎉**

For detailed guide, see: **DATABASE_MIGRATION_GUIDE.md**
