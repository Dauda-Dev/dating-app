/**
 * Swagger Configuration
 * Defines OpenAPI 3.0 specification for the Dating App API
 */

const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Dating App API',
      version: '1.0.0',
      description: 'Complete Dating App Backend API with staged matching system, video calling, and stealing mechanism',
      contact: {
        name: 'API Support',
        email: 'support@datingapp.com'
      },
      license: {
        name: 'MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Development Server'
      },
      {
        url: process.env.RENDER_EXTERNAL_URL || 'https://ovally-api.onrender.com',
        description: 'Production Server'
      }
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token obtained from login or signup endpoint'
        },
        OAuth2: {
          type: 'oauth2',
          flows: {
            authorizationCode: {
              authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
              tokenUrl: 'https://oauth2.googleapis.com/token',
              scopes: {
                'profile': 'Access user profile',
                'email': 'Access user email'
              }
            }
          }
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            dateOfBirth: { type: 'string', format: 'date' },
            gender: { type: 'string', enum: ['male', 'female', 'non-binary'] },
            profilePhoto: { type: 'string' },
            relationshipStatus: { 
              type: 'string', 
              enum: ['available', 'matched_locked', 'video_call_completed', 'date_accepted', 'post_date_open']
            },
            emailVerified: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        Profile: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            userId: { type: 'string', format: 'uuid' },
            height: { type: 'integer' },
            weight: { type: 'integer' },
            openness: { type: 'number', format: 'float' },
            conscientiousness: { type: 'number', format: 'float' },
            extraversion: { type: 'number', format: 'float' },
            agreeableness: { type: 'number', format: 'float' },
            neuroticism: { type: 'number', format: 'float' },
            hobbies: { type: 'array', items: { type: 'string' } },
            interests: { type: 'array', items: { type: 'string' } }
          }
        },
        Match: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            user1Id: { type: 'string', format: 'uuid' },
            user2Id: { type: 'string', format: 'uuid' },
            matchStatus: { 
              type: 'string', 
              enum: ['active', 'expired', 'rejected', 'completed']
            },
            compatibilityScore: { type: 'number', format: 'float' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            statusCode: { type: 'integer' },
            message: { type: 'string' }
          }
        },
        SuccessResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' }
          }
        },
        AuthResponse: {
          type: 'object',
          properties: {
            token: { type: 'string', description: 'JWT token for authentication' },
            user: { $ref: '#/components/schemas/User' }
          }
        }
      },
      responses: {
        UnauthorizedError: {
          description: 'Unauthorized - Missing or invalid token',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        },
        NotFoundError: {
          description: 'Not Found - Resource does not exist',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        },
        ValidationError: {
          description: 'Validation Error - Invalid input',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        }
      }
    },
    security: [
      {
        BearerAuth: []
      }
    ]
  },
  apis: [
    './src/routes/auth.js',
    './src/routes/users.js',
    './src/routes/discovery.js',
    './src/routes/matches.js',
    './src/routes/video.js',
    './src/routes/dates.js',
    './src/routes/steals.js'
  ]
};

const specs = swaggerJsdoc(options);

module.exports = specs;
