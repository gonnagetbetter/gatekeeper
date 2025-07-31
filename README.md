# Gatekeeper

Gatekeeper is an authentication and user management service built with NestJS. It provides secure user registration, authentication, and profile management.

## Features

- User registration and authentication
- JWT-based authentication
- User profile management
- PostgreSQL database for data storage
- Redis for caching

## API Endpoints

### Authentication

#### POST /auth/signUp
Register a new user.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response:**
```json
{
  "id": "user-uuid",
  "email": "user@example.com"
}
```

#### POST /auth/signIn
Authenticate a user and get a JWT token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response:**
```json
{
  "token": "jwt-token"
}
```

### User

#### GET /user/me
Get the current user's profile (requires authentication).

**Headers:**
```
Authorization: Bearer jwt-token
```

**Response:**
```json
{
  "id": "user-uuid",
  "email": "user@example.com"
}
```

## Running the Application

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Docker and Docker Compose (for containerized setup)

### Environment Variables

Create a `.env` file in the root directory with the following variables:

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/gatekeeper
REDIS_URL=redis://localhost:6379
JWT_SECRET=yourSecretKey
```

### Local Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the PostgreSQL and Redis services using Docker:
   ```bash
   docker-compose up -d
   ```

3. Start the application in development mode:
   ```bash
   npm run start:dev
   ```

The application will be available at http://localhost:3000.

### Production Deployment

1. Build the application:
   ```bash
   npm run build
   ```

2. Start the application in production mode:
   ```bash
   npm run start:prod
   ```

### Using Docker Compose

The project includes a `docker-compose.yml` file that sets up PostgreSQL and Redis services:

```bash
docker-compose up -d
```

This will start:
- PostgreSQL database on port 5432
- Redis on port 6379

## Testing

```bash
# Run unit tests
npm run test

# Run e2e tests
npm run test:e2e

# Generate test coverage
npm run test:cov
```

## License

This project is licensed under the MIT License.
