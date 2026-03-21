# Swagger/OpenAPI Documentation

## Status: ✅ COMPLETE - 31/31 Endpoints Documented

All API endpoints are now fully documented with Swagger/OpenAPI 3.0 specifications using JSDoc comments.

## Installation

Swagger packages have been installed:
```bash
npm install swagger-jsdoc swagger-ui-express
```

**Installed versions:**
- swagger-jsdoc: 6.2+ 
- swagger-ui-express: Latest

## Accessing the Documentation

### Interactive Swagger UI
Navigate to: **`http://localhost:3000/api-docs`**

Features:
- Interactive endpoint testing
- Request/response examples
- Authentication via Bearer Token
- Try It Out button to test endpoints
- Download OpenAPI spec as JSON or YAML

### Raw OpenAPI Specification
Navigate to: **`http://localhost:3000/api-docs.json`**

This returns the complete OpenAPI 3.0 specification as JSON.

## Documented Endpoints by Category

### Authentication (9 endpoints) ✅
- POST `/api/auth/signup` - Register new user
- POST `/api/auth/login` - User login
- POST `/api/auth/verify-email` - Verify email address
- POST `/api/auth/forgot-password` - Request password reset
- POST `/api/auth/reset-password` - Complete password reset
- GET `/api/auth/google` - Google OAuth login
- GET `/api/auth/google/callback` - Google OAuth callback
- POST `/api/auth/logout` - User logout
- GET `/api/auth/me` - Get current user profile

### Users (5 endpoints) ✅
- GET `/api/users/profile` - Get user profile
- PUT `/api/users/profile` - Update user profile
- POST `/api/users/profile-picture` - Upload profile picture
- POST `/api/users/last-active` - Update last active timestamp
- GET `/api/users/search` - Search for users
- GET `/api/users/:id` - Get user by ID

### Discovery (3 endpoints) ✅
- GET `/api/discovery/eligible` - Get eligible matches
- POST `/api/discovery/like` - Like a user
- GET `/api/discovery/user-card` - Get user card details

### Matches (3 endpoints) ✅
- GET `/api/matches/current` - Get current match
- GET `/api/matches/:id` - Get match by ID
- POST `/api/matches/reject` - Reject current match

### Video (3 endpoints) ✅
- POST `/api/video/initialize` - Initialize video call
- POST `/api/video/sessions/:sessionId/complete` - Complete video session
- GET `/api/video/sessions/:sessionId` - Get session information

### Dates (3 endpoints) ✅
- POST `/api/dates/propose` - Propose a date
- POST `/api/dates/accept` - Accept date proposal
- POST `/api/dates/complete` - Mark date as completed

### Steals (4 endpoints) ✅
- POST `/api/steals/request` - Create steal request
- POST `/api/steals/requests/:id/accept` - Accept steal request
- POST `/api/steals/requests/:id/reject` - Reject steal request
- GET `/api/steals/pending` - Get pending steal requests

## OpenAPI Configuration

### File: `src/config/swagger.js`
Contains the OpenAPI 3.0 specification with:

**Security Schemes:**
- `BearerAuth` - JWT Bearer token authentication
- `OAuth2` - Google OAuth2 authentication

**Base URLs:**
- Development: `http://localhost:3000`
- Production: `https://api.datingapp.com`

**Component Schemas (Reusable Models):**
- `User` - User profile information
- `Profile` - Extended profile data
- `Match` - Match between two users
- `Error` - Error response format
- `SuccessResponse` - Standard success response
- `AuthResponse` - Authentication response with token

## JSDoc Comment Pattern

All endpoints follow this Swagger documentation pattern:

```javascript
/**
 * @swagger
 * /api/endpoint-path:
 *   method:
 *     summary: Brief description
 *     description: Detailed description (optional)
 *     tags: [CategoryName]
 *     security:
 *       - BearerAuth: []
 *     parameters: [...]
 *     requestBody: {...}
 *     responses:
 *       200:
 *         description: Success response
 *         content: {...}
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
```

## Files Modified

### Route Files (Added Swagger Documentation)
1. `src/routes/auth.js` - +200 lines of JSDoc
2. `src/routes/users.js` - +170 lines of JSDoc
3. `src/routes/discovery.js` - +120 lines of JSDoc
4. `src/routes/matches.js` - +60 lines of JSDoc
5. `src/routes/video.js` - +70 lines of JSDoc
6. `src/routes/dates.js` - +80 lines of JSDoc
7. `src/routes/steals.js` - +90 lines of JSDoc

### Configuration Files (New)
- `src/config/swagger.js` - OpenAPI 3.0 specification (145 lines)

### Application Files (Modified)
- `src/app.js` - Added Swagger UI middleware and endpoints (+15 lines)

## Starting the Server

```bash
# Development mode with Swagger UI
npm run dev

# Production mode
npm start
```

Then visit: `http://localhost:3000/api-docs`

## Testing Endpoints with Swagger UI

### Step 1: Authenticate
1. Click "Authorize" button in top-right
2. Enter JWT token from login endpoint
3. Click "Authorize"

### Step 2: Test Endpoint
1. Expand endpoint in the list
2. Click "Try it out"
3. Fill in parameters and request body
4. Click "Execute"
5. View response and status code

## Postman Integration

You can also import the OpenAPI spec into Postman:
1. Postman → File → Import
2. Paste URL: `http://localhost:3000/api-docs.json`
3. Postman will create a collection from the spec

## Key Features

- ✅ All 31 endpoints documented
- ✅ Request/response examples for all endpoints
- ✅ Proper HTTP status codes and error descriptions
- ✅ Security scheme definitions (Bearer JWT + OAuth2)
- ✅ Parameter descriptions and data types
- ✅ Reusable component schemas
- ✅ Interactive testing with Swagger UI
- ✅ Machine-readable OpenAPI 3.0 spec
- ✅ Pagination examples where applicable
- ✅ Authentication flow documented

## Notes

1. **Swagger UI Features:**
   - `persistAuthorization: true` - Keeps auth token between page refreshes
   - `tryItOutEnabled: true` - Users can test endpoints directly
   - `defaultModelsExpandDepth: 1` - Schemas collapsed by default

2. **Bearer Token Format:**
   - In Swagger UI, enter token without "Bearer " prefix
   - Swagger UI automatically adds the prefix

3. **OpenAPI Validation:**
   - All endpoints use OpenAPI 3.0 specification
   - Compatible with major API tools (Postman, Insomnia, etc.)
   - Can be used to generate client SDKs

4. **Next Steps:**
   - Run `npm start` or `npm run dev` to start server
   - Visit `/api-docs` to view interactive documentation
   - Use Swagger UI to test endpoints
   - Share `/api-docs.json` with frontend/mobile teams for SDK generation
