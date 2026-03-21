# Dating App Backend

A dating app backend with unique staged matching and "stealing" system.

## Features

- **Staged Locking System**: Users go through stages: AVAILABLE → MATCHED_LOCKED → VIDEO_CALL_COMPLETED → DATE_ACCEPTED → POST_DATE_OPEN
- **One Active Match Rule**: Each user can have only ONE active match at a time
- **Video Calling**: 4-minute mandatory video calls before date planning
- **Stealing Mechanism**: Users can "steal" partners after dates using DB transactions
- **Subscription System**: Free tier with Paystack integration
- **Google OAuth**: Seamless authentication

## Tech Stack

- **Backend**: Express.js, Sequelize ORM
- **Database**: PostgreSQL
- **Authentication**: JWT + Google OAuth
- **Email**: Mailgun
- **Payments**: Paystack
- **Video**: WebRTC (Daily.co)
- **Cache**: Redis

## Quick Start

1. **Start Docker Services**:
   ```bash
   docker-compose up -d
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Setup Environment**:
   ```bash
   cp .env.example .env
   # Configure your environment variables
   ```

4. **Run Migrations**:
   ```bash
   npm run db:migrate
   ```

5. **Start Development Server**:
   ```bash
   npm run dev
   ```

## API Documentation

### Authentication Endpoints
- `POST /api/auth/google` - Google OAuth
- `POST /api/auth/verify-email` - Email verification
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout

### User Management
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update profile
- `POST /api/users/upload-photo` - Upload profile photo

### Matching System
- `GET /api/users/discover` - Get users to discover
- `POST /api/matches/like/:userId` - Like a user
- `GET /api/matches/active` - Get current active match
- `POST /api/matches/reject` - Reject current match

### Video Calling
- `POST /api/video/create-session` - Create video session
- `PUT /api/video/complete-session` - Complete video session

### Date Planning
- `POST /api/dates/propose` - Propose a date
- `PUT /api/dates/respond` - Respond to date proposal
- `PUT /api/dates/complete` - Mark date as completed

### Stealing System
- `POST /api/steals/request` - Request to steal someone
- `PUT /api/steals/respond` - Respond to steal request

### Subscriptions
- `GET /api/subscriptions/status` - Get subscription status
- `POST /api/subscriptions/create` - Create subscription
- `POST /api/subscriptions/webhook` - Paystack webhook

## Database Schema

### Core Models
- **User**: Base user data with relationship status
- **Profile**: Personality, hobbies, interests
- **Match**: Connection between two users
- **VideoSession**: Video call tracking
- **DatePlan**: Date agreements and locations
- **StealRequest**: Stealing mechanism
- **Subscription**: Paystack subscription data

### Relationship States
- `AVAILABLE`: Single and ready to match
- `MATCHED_LOCKED`: In a match, waiting for video call
- `VIDEO_CALL_COMPLETED`: Video call done, waiting for date agreement
- `DATE_ACCEPTED`: Both agreed to date, waiting for completion
- `POST_DATE_OPEN`: Date completed, open to being "stolen"

## Environment Variables

```env
# Database
DATABASE_URL=postgresql://postgres:password123@localhost:5432/dating_app

# JWT
JWT_SECRET=your-jwt-secret
JWT_EXPIRES_IN=7d

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Mailgun
MAILGUN_API_KEY=your-mailgun-api-key
MAILGUN_DOMAIN=your-mailgun-domain

# Paystack
PAYSTACK_SECRET_KEY=your-paystack-secret-key
PAYSTACK_PUBLIC_KEY=your-paystack-public-key

# Video Calling
DAILY_API_KEY=your-daily-api-key

# Redis
REDIS_URL=redis://localhost:6379
```

## Development

### Database Operations
```bash
# Reset database
npm run db:reset

# Run migrations
npm run db:migrate

# Run seeders
npm run db:seed
```

### Testing
```bash
npm test
```

## Security Features

- JWT authentication with refresh tokens
- Rate limiting on all endpoints
- Input validation and sanitization
- CORS configuration
- Helmet security headers
- Database transaction safety for matching operations

## License

MIT
