# 🚀 Quick Reference Card

## Start Development Server
```bash
npm run dev
```
Server runs on `http://localhost:3000`

## Database Setup (Choose One)

### Docker (Recommended)
```bash
docker-compose up -d
```

### Manual PostgreSQL
```sql
CREATE DATABASE dating_app;
CREATE USER dating_user WITH PASSWORD 'secure_password_change_me';
GRANT ALL PRIVILEGES ON DATABASE dating_app TO dating_user;
```

## Common Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start development server with hot reload |
| `npm start` | Start production server |
| `npm test` | Run smoke tests |
| `npm run db:migrate` | Run database migrations |
| `npm run db:reset` | Reset database completely |

## API Endpoints

### Authentication
```
POST   /api/auth/signup          - Register new user
POST   /api/auth/login           - Login with email/password
POST   /api/auth/verify-email    - Verify email token
GET    /api/auth/me              - Get current user
```

### Discovery
```
GET    /api/discovery/eligible   - Get eligible users to like
POST   /api/discovery/like       - Like a user (triggers match if mutual)
GET    /api/discovery/user/:id   - Get user details
```

### Matches
```
GET    /api/matches/current      - Get your active match
GET    /api/matches/:id          - Get match details
POST   /api/matches/reject       - Reject current match
```

### Video Calls (4 min max)
```
POST   /api/video/initialize     - Start video session
POST   /api/video/sessions/:id/complete - End session
GET    /api/video/sessions/:id   - Get session info
```

### Dates
```
POST   /api/dates/propose        - Propose a date
POST   /api/dates/accept         - Accept date proposal
POST   /api/dates/complete       - Complete date (enables stealing)
```

### Stealing
```
POST   /api/steals/request       - Request to steal someone
POST   /api/steals/:id/accept    - Accept steal request
POST   /api/steals/:id/reject    - Reject steal request
GET    /api/steals/pending       - Get pending steal requests
```

## User Relationship States

| Status | Meaning |
|--------|---------|
| `available` | Single and ready to match |
| `matched_locked` | In a match (waiting for video) |
| `video_call_completed` | Video done (waiting for date) |
| `date_accepted` | Date scheduled |
| `post_date_open` | Can be "stolen" by others |

## Match Flow

```
1. User A likes User B
   ↓ (If User B likes User A back)
2. MUTUAL LIKE → Match created (both MATCHED_LOCKED)
   ↓
3. Video call (max 240 seconds)
   ↓
4. Match status → VIDEO_CALL_COMPLETED
   ↓
5. Propose & accept date
   ↓
6. Complete date → POST_DATE_OPEN
   ↓
7. Now other AVAILABLE users can "steal" this person
   ↓
8. If steal accepted → New match created, old match broken
```

## Test User Example

```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@example.com",
    "password": "SecurePass123!",
    "firstName": "Alice",
    "lastName": "Smith",
    "dateOfBirth": "1998-03-20",
    "gender": "female"
  }'
```

## Environment Variables

Create `.env` file with:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=dating_app
DB_USER=dating_user
DB_PASSWORD=secure_password_change_me
JWT_SECRET=your_jwt_secret_key
PORT=3000
NODE_ENV=development
```

## File Organization

```
src/
├── models/        → Database schemas (User, Match, VideoSession, etc.)
├── controllers/   → Handle HTTP requests
├── routes/        → API endpoints
├── services/      → Business logic (MatchService, StealService, etc.)
├── middleware/    → Auth, validation, error handling
├── validators/    → Input validation rules
├── utils/         → Helper functions
└── config/        → Database connection
```

## Important Notes

- 🔒 Never commit `.env` to git
- 🗄️ PostgreSQL required (use Docker or install locally)
- 🧪 Run `npm test` to test complete user flow
- 📚 Check `postman_collection.json` for API examples
- ⚡ Server auto-syncs database in development mode
- 🎯 Transactions with row-level locks prevent race conditions in match/steal operations

---

**Need help?** See SETUP_GUIDE.md or ARCHITECTURE.md
