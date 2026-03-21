# Getting Started - Dating App Backend

This guide walks you through setting up and running the dating app backend locally.

## Prerequisites

- **Node.js** 18+ (download from [nodejs.org](https://nodejs.org))
- **Docker & Docker Compose** (for PostgreSQL)
- **Postman** (optional, for testing APIs)

## Setup Steps

### 1. Install Dependencies

```powershell
cd C:\Users\dauda\Documents\freelance\dating-app
npm install
```

### 2. Configure Environment Variables

Update `.env` file with your credentials:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=dating_app
DB_USER=dating_user
DB_PASSWORD=secure_password_change_me

# JWT
JWT_SECRET=your_super_secret_jwt_key_change_in_production

# Daily.co (for video calls)
DAILY_API_KEY=your_daily_api_key

# Mailgun (for emails)
MAILGUN_API_KEY=your_mailgun_api_key
MAILGUN_DOMAIN=your_mailgun_domain

# Frontend
FRONTEND_URL=http://localhost:3000

# App
NODE_ENV=development
PORT=3000
```

### 3. Start PostgreSQL

```powershell
docker-compose up -d postgres
```

Verify it's running:

```powershell
docker-compose ps
```

### 4. Start the Development Server

```powershell
npm run dev
```

You should see:
```
Database connected.
Database synced.
Server listening on port 3000
```

### 5. Test the API

#### Health Check
```powershell
Invoke-RestMethod http://localhost:3000/health
```

Expected response: `{"status":"ok"}`

#### Signup a User
```powershell
$body = @{
    email = "test@example.com"
    password = "password123"
    firstName = "John"
    lastName = "Doe"
    dateOfBirth = "1990-01-15"
    gender = "MALE"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/auth/signup" `
  -Method POST `
  -Body $body `
  -ContentType "application/json"
```

## API Endpoints Overview

### Authentication
- `POST /api/auth/signup` - Create account
- `POST /api/auth/login` - Login
- `POST /api/auth/verify-email` - Verify email token
- `GET /api/auth/me` - Get current user (requires JWT)

### User Management
- `GET /api/users/profile` - Get profile
- `PUT /api/users/profile` - Update profile
- `GET /api/users/:id` - Get user by ID

### Discovery
- `GET /api/discovery/eligible` - Get eligible users to swipe
- `POST /api/discovery/like` - Like a user

### Matches
- `GET /api/matches/current` - Get active match
- `GET /api/matches/:id` - Get match details
- `POST /api/matches/reject` - Reject current match

### Video Calling
- `POST /api/video/initialize` - Start video session (requires Daily.co API key)
- `POST /api/video/sessions/:sessionId/complete` - End video call
- `GET /api/video/sessions/:sessionId` - Get session details

### Dates
- `POST /api/dates/propose` - Propose a date
- `POST /api/dates/accept` - Accept date proposal
- `POST /api/dates/complete` - Mark date complete (enables stealing)

### Stealing
- `POST /api/steals/request` - Request to "steal" someone
- `POST /api/steals/requests/:id/accept` - Accept steal request
- `POST /api/steals/requests/:id/reject` - Reject steal request
- `GET /api/steals/pending` - Get pending steal requests

## User Status Flow

Users progress through these relationship statuses:

```
AVAILABLE
    ↓ (mutual like)
MATCHED_LOCKED
    ↓ (video call completed)
VIDEO_CALL_COMPLETED
    ↓ (date accepted)
DATE_ACCEPTED
    ↓ (date completed)
POST_DATE_OPEN (eligible for stealing)
```

## Core Features

### 1. One Active Match Rule
- Each user can only have ONE active match at a time
- Database constraints enforce this at the table level
- Attempting to match while already matched will throw an error

### 2. Mutual Like Detection
- When User A likes User B, no match is created
- When User B then likes User A, a match is automatically created
- Both users' status changes to `MATCHED_LOCKED`

### 3. Video Call Enforcement
- Matches must complete a 4-minute video call before dating
- Video calls use Daily.co WebRTC (free tier)
- After completion, status moves to `VIDEO_CALL_COMPLETED`

### 4. Date Planning
- After video call, users propose date location and time
- Both must accept before status changes to `DATE_ACCEPTED`
- Supports manual text input for location (no integration required)

### 5. Stealing Mechanism
- After a date completes, both users are in `POST_DATE_OPEN` status
- AVAILABLE users can request to "steal" someone in `POST_DATE_OPEN`
- If target accepts, their old match is broken and new match is created
- All operations are transaction-safe with row-level database locks

## Testing with Postman

1. Import `postman_collection.json` into Postman
2. Create an environment with variable: `baseUrl = http://localhost:3000`
3. Create users using **Signup** endpoint
4. Copy JWT token to Postman authorization header
5. Test endpoints in sequence: Signup → Update Profile → Like → Match → Video → Date → Steal

## Running Tests

```powershell
npm test
```

To run specific test file:

```powershell
npm test -- tests/smoke.test.js
```

## Troubleshooting

### Database Connection Error
```
Unable to connect to the database
```
**Solution:** Ensure Docker and PostgreSQL are running:
```powershell
docker-compose up -d postgres
```

### Port Already in Use
```
EADDRINUSE: address already in use :::3000
```
**Solution:** Change PORT in `.env` or kill the process:
```powershell
Get-Process -Name node | Stop-Process -Force
```

### JWT Authentication Errors
**Solution:** Make sure token is passed correctly in Authorization header:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Daily.co API Key Missing
**Solution:** Set `DAILY_API_KEY` in `.env` to enable video calls

## Development Workflow

### File Structure
```
src/
├── config/
│   └── database.js (Sequelize setup)
├── controllers/ (API logic)
├── models/ (Database schemas)
├── routes/ (API endpoints)
├── middleware/ (Auth, validation, error handling)
├── services/ (Business logic)
├── utils/ (Helpers, token generation)
├── validators/ (Input validation)
└── app.js
server.js (Entry point)
```

### Adding New Features
1. Create model in `src/models/`
2. Create service in `src/services/`
3. Create controller in `src/controllers/`
4. Create route in `src/routes/`
5. Register route in `src/app.js`

### Database Migrations (Future)
Once you're ready for production, consider using Sequelize CLI:

```powershell
npx sequelize-cli db:create
npx sequelize-cli db:migrate
npx sequelize-cli db:seed:all
```

## Next Steps

1. **Implement React Native Frontend** - Use Expo for cross-platform mobile
2. **Add WebSocket Support** - For real-time notifications (e.g., new matches, steals)
3. **Subscription System** - Wire Paystack integration for premium features
4. **Image Upload** - Add AWS S3 or similar for profile photos
5. **Admin Dashboard** - Monitor matches, steals, and user activity
6. **Advanced Search** - Filter by age, interests, location, zodiac sign, etc.

## Support

For issues or questions, check:
- `ARCHITECTURE.md` - Technical design
- `README.md` - Project overview
- Individual controller files for endpoint documentation
