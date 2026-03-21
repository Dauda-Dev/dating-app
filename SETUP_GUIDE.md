# Dating App Backend - Setup Guide

Your project is now organized and ready to launch! Follow these steps to get the development server running.

## ✅ Completed Setup

- ✅ Reorganized all models into `src/models/` directory
  - `User.js` - Core user model with relationship status
  - `Profile.js` - User preferences and personality traits
  - `Like.js` - Like/reject tracking
  - `Match.js` - Match creation and management
  - `VideoSession.js` - Video call tracking
  - `StealRequest.js` - Stealing mechanism requests

- ✅ Verified all controllers (7 total)
  - authController, userController, discoveryController
  - matchController, videoController, dateController, stealController

- ✅ Verified all routes (7 endpoints)
  - /api/auth, /api/users, /api/discovery, /api/matches, /api/video, /api/dates, /api/steals

- ✅ Dependencies installed (npm install completed)

## 🔧 Prerequisites

### 1. PostgreSQL Database
You need a running PostgreSQL database. Choose one:

**Option A: Install PostgreSQL Locally**
- Download from https://www.postgresql.org/download/windows/
- Install with default settings
- Create a new database:
```sql
CREATE DATABASE dating_app;
CREATE USER dating_user WITH PASSWORD 'secure_password_change_me';
GRANT ALL PRIVILEGES ON DATABASE dating_app TO dating_user;
```

**Option B: Use Docker** (Recommended)
```bash
cd c:\Users\dauda\Documents\freelance\dating-app
docker-compose up -d
```
This will start PostgreSQL automatically with the correct credentials.

**Option C: Use Cloud Database** (e.g., Supabase, AWS RDS)
- Create a PostgreSQL instance
- Update `.env` file with connection details

### 2. Environment Variables
Edit `.env` file with your configuration:

```env
# Database (already configured for local)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=dating_app
DB_USER=dating_user
DB_PASSWORD=secure_password_change_me
DB_DIALECT=postgres

# JWT (change for production)
JWT_SECRET=your_super_secret_jwt_key_change_in_production
JWT_EXPIRY=7d

# Google OAuth (optional for now)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Mailgun (optional for email features)
MAILGUN_API_KEY=your_mailgun_api_key
MAILGUN_DOMAIN=your_mailgun_domain

# Daily.co (optional for video calls)
DAILY_API_KEY=your_daily_api_key

# App
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:3000
```

## 🚀 Quick Start

### 1. Start PostgreSQL Database
**Using Docker:**
```bash
cd c:\Users\dauda\Documents\freelance\dating-app
docker-compose up -d
```

**Or if PostgreSQL is installed locally:**
Make sure PostgreSQL service is running via Windows Services or pgAdmin.

### 2. Start Development Server
```bash
cd c:\Users\dauda\Documents\freelance\dating-app
npm run dev
```

You should see:
```
Database connected.
Database synced.
Server listening on port 3000
```

### 3. Verify Server is Running
```bash
curl http://localhost:3000/health
# Response: {"status":"ok"}
```

## 📝 API Testing

### Using Postman
1. Open Postman
2. Import `postman_collection.json` from project root
3. All 20+ endpoints are ready to test with examples

### Using cURL
**Test signup endpoint:**
```bash
curl -X POST http://localhost:3000/api/auth/signup `
  -H "Content-Type: application/json" `
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!",
    "firstName": "John",
    "lastName": "Doe",
    "dateOfBirth": "1995-05-15",
    "gender": "male"
  }'
```

**Test health check:**
```bash
curl http://localhost:3000/health
```

## 🧪 Running Tests

### Smoke Tests (User Flow)
```bash
npm test
```

This runs a complete flow: signup → login → discover → like → match → video → date → steal

## 📁 Project Structure

```
dating-app/
├── src/
│   ├── config/
│   │   └── database.js          # Sequelize setup & model imports
│   ├── models/                  # Database models
│   │   ├── User.js
│   │   ├── Profile.js
│   │   ├── Like.js
│   │   ├── Match.js
│   │   ├── VideoSession.js
│   │   └── StealRequest.js
│   ├── controllers/             # Request handlers
│   ├── routes/                  # API endpoints
│   ├── services/                # Business logic
│   ├── middleware/              # Express middleware
│   ├── validators/              # Input validation
│   ├── utils/                   # Helper functions
│   ├── app.js                   # Express app setup
│   └── server.js                # Server entry point
├── tests/
│   └── smoke.test.js            # End-to-end tests
├── .env                         # Environment variables (KEEP SECURE!)
├── package.json
├── docker-compose.yml           # Docker setup
└── postman_collection.json      # API test collection
```

## 🔑 Key Files to Know

| File | Purpose |
|------|---------|
| `src/server.js` | Main entry point - starts the server |
| `src/app.js` | Express app configuration |
| `src/config/database.js` | Database connection & model relationships |
| `src/models/` | Sequelize model definitions |
| `src/services/` | Business logic (MatchService, StealService, etc.) |
| `src/controllers/` | HTTP request handlers |
| `src/routes/` | API endpoint definitions |
| `.env` | Credentials & configuration (NEVER commit!) |

## ⚠️ Troubleshooting

### Error: "ECONNREFUSED" on port 5432
**Problem:** PostgreSQL is not running
**Solution:** 
- If using Docker: `docker-compose up -d`
- If local: Check Windows Services or start PostgreSQL manually

### Error: "Failed to authenticate database connection"
**Problem:** Wrong database credentials
**Solution:** 
- Verify `.env` DB_USER, DB_PASSWORD, DB_NAME match your PostgreSQL setup
- Check PostgreSQL is running and database `dating_app` exists

### Error: "relation 'users' does not exist"
**Problem:** Tables haven't been created
**Solution:** 
- The app will auto-sync in development mode
- Check `NODE_ENV=development` in `.env`
- Restart the server: `npm run dev`

### Error: Port 3000 already in use
**Problem:** Another process is using port 3000
**Solution:**
```bash
# Find and kill process on port 3000
netstat -ano | findstr :3000
taskkill /PID <PID> /F
# Or change PORT in .env
```

## 📚 Next Steps

1. **Test the API** using Postman or cURL
2. **Create test user** with signup endpoint
3. **Review ARCHITECTURE.md** for technical details
4. **Implement remaining features** from IMPLEMENTATION_PLAN.md

## 🔒 Security Notes

- **Never commit `.env` file** to version control
- Change `JWT_SECRET` for production
- Change database password before deployment
- Enable HTTPS in production
- Implement rate limiting for production
- Use environment-specific configs

## 📞 Support

For questions about specific endpoints or features, check:
- `ARCHITECTURE.md` - Technical design
- `postman_collection.json` - API examples
- `src/controllers/` - Implementation details
- `tests/smoke.test.js` - Example API usage

---

**Ready to start?** Run: `npm run dev`
