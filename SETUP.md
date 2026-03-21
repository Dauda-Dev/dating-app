# Dating App Backend - Local Development Setup

## Prerequisites

- Node.js 18+ 
- PostgreSQL 15+ (local or via Docker)
- Redis 7+ (local or via Docker)
- npm or yarn

## Quick Start (With Docker)

1. **Start services**:
```bash
docker compose up -d
```

This starts:
- PostgreSQL at `localhost:5432`
- Redis at `localhost:6379`
- Backend at `localhost:3000`

Backend will auto-run `npm install` and `npm run dev` inside container.

2. **Check logs**:
```bash
docker compose logs -f backend
```

3. **Seed test data** (after backend is ready):
```bash
docker compose exec backend npm run seed
```

4. **Stop services**:
```bash
docker compose down
```

---

## Quick Start (Local, Without Docker)

### 1. Setup PostgreSQL & Redis

**Option A: Use Docker just for DB services**
```bash
docker compose up postgres redis -d
```

**Option B: Install locally**
- PostgreSQL: https://www.postgresql.org/download/
- Redis: https://redis.io/docs/getting-started/

### 2. Configure environment

Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

If using local PostgreSQL (not Docker), update `.env`:
```env
DB_HOST=localhost
# Keep other values from .env.example
```

### 3. Install dependencies

```bash
npm install
```

### 4. Sync database & seed data

```bash
npm run seed
```

### 5. Start dev server

```bash
npm run dev
```

Server runs at `http://localhost:3000`

---

## API Documentation

Once server is running, visit:
- **Swagger UI**: http://localhost:3000/api-docs
- **Swagger JSON**: http://localhost:3000/api-docs.json
- **Health check**: http://localhost:3000/health

---

## Key Endpoints

### Auth
- `POST /api/auth/signup` - Register user
- `POST /api/auth/login` - Login
- `POST /api/auth/verify-email` - Verify email token
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password with token
- `GET /api/auth/me` - Get current user (requires JWT)
- `POST /api/auth/google` - Google OAuth

### Discovery
- `GET /api/discovery/eligible` - Get eligible users (paginated)
- `POST /api/discovery/like` - Like/reject/super_like user

### Matches
- `GET /api/matches/current` - Get current match
- `GET /api/matches/:id` - Get specific match
- `POST /api/matches/:id/reject` - Reject match

### Video Calls
- `POST /api/video/initialize` - Start video session
- `POST /api/video/sessions/:id/complete` - End video session
- `POST /api/video/webhook` - Daily.co webhook (internal)

### Dates
- `POST /api/dates/propose` - Propose a date
- `POST /api/dates/:id/accept` - Accept date proposal
- `POST /api/dates/:id/complete` - Mark date as complete

### Steals
- `POST /api/steals` - Request steal
- `POST /api/steals/:id/accept` - Accept steal request
- `POST /api/steals/:id/reject` - Reject steal request
- `GET /api/steals/pending` - Get pending steal requests

---

## Development Workflow

### Run tests
```bash
npm test
```

### Check code style
```bash
npm run lint
```

### Format code
```bash
npm run format
```

### Database commands
```bash
# View database
npm run db:migrate

# Seed data
npm run db:seed

# Reset database (dev only)
npm run db:reset
```

---

## Common Issues

### Database connection fails
- Verify PostgreSQL is running: `psql -U dating_user -d dating_app`
- Check `.env` DB credentials match your setup
- If using Docker: ensure `dating_app_postgres` container is running

### Redis connection fails
- Verify Redis is running: `redis-cli ping` (should return `PONG`)
- Check `REDIS_URL` in `.env` is correct

### Port 3000 already in use
- Change `PORT` in `.env` to another port (e.g., `3001`)

### Migrations not running
- Manually run: `npm run db:migrate`

---

## Architecture

```
src/
├── app.js              # Express app setup
├── server.js           # Server entry point
├── config/
│   ├── database.js     # Sequelize config
│   └── swagger.js      # Swagger/OpenAPI config
├── models/             # Sequelize ORM models
├── routes/             # Express route handlers
├── controllers/        # Business logic
├── services/           # External integrations (Email, Video, etc.)
├── middleware/         # Express middleware (auth, error handling)
└── utils/              # Helper functions
```

---

## Mock Credentials for Testing

**Test User Account**:
- Email: `alice@example.com`
- Password: `TestPassword123`

**Other test accounts**: `bob@example.com`, `charlie@example.com` (same password)

---

## Next Steps

1. ✅ Backend infrastructure & models working
2. ⚠️ Complete missing endpoints (video, dates, steals with transactional safety)
3. ⚠️ Implement WebSocket for real-time notifications
4. ⚠️ Add comprehensive unit/integration tests
5. ⚠️ Build React Native mobile frontend

See `IMPLEMENTATION_GUIDE.md` in the mobile project for frontend setup.
