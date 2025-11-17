# PakSentiment Main Server

The main backend server for PakSentiment - A comprehensive social media sentiment analysis platform focused on Pakistani social discourse.

Built with [Nest.js](https://nestjs.com/) - A progressive Node.js framework for building efficient and scalable server-side applications.

## Features

- **User Authentication**: Secure registration, login, and OAuth (Google) integration
- **JWT Authorization**: Token-based authentication with bcrypt password hashing
- **Data Aggregation**: Proxy layer to FastAPI gateway for social media data
- **Dual Database**: PostgreSQL for users/config, MongoDB for posts/analytics
- **TypeORM Integration**: Type-safe database operations with entities
- **Validation Pipes**: Automatic request validation using class-validator
- **Swagger Documentation**: Comprehensive API documentation with examples

## API Documentation

### Interactive Swagger UI

Once the server is running, you can access the interactive API documentation at:

**Swagger UI**: http://localhost:3000/api

The Swagger UI provides:

- Complete endpoint documentation with detailed descriptions
- Request/response schemas with examples
- Interactive testing interface (try endpoints directly)
- Authentication testing with Bearer tokens
- Organized by tags (Authentication, Reddit, Twitter, Health)

### API Sections

1. **Authentication** (`/auth`)
   - User registration with email/password
   - Login with credentials
   - Google OAuth integration
   - Password reset functionality

2. **Reddit Data** (`/raw-data/reddit`)
   - Fetch raw Reddit posts
   - Full sentiment analysis pipeline

3. **Twitter Data** (`/raw-data/twitter`)
   - Fetch raw tweets
   - Full sentiment analysis pipeline

## Architecture

```
Frontend (Next.js) → Main Server (Nest.js) → FastAPI Gateway → Social Media APIs
                                                             → AI Services (Gemini, Groq)
```

## Project setup

```bash
$ yarn install
```

## Database Setup

This project uses both PostgreSQL (for relational data) and MongoDB (for document storage).

### PostgreSQL Setup

1. **Ensure PostgreSQL is running locally** (default: `localhost:5432`)

2. **Create the database** using one of these methods:

   **Option A: Using the npm script (recommended)**

   ```bash
   $ yarn db:init
   ```

   **Option B: Using psql directly**

   ```bash
   $ psql -U postgres -c "CREATE DATABASE paksentiment;"
   ```

   **Option C: Using the SQL script**

   ```bash
   $ psql -U postgres -f scripts/init-database.sql
   ```

3. **Configure environment variables** (optional, defaults shown):

   ```env
   POSTGRES_HOST=localhost
   POSTGRES_PORT=5432
   POSTGRES_USER=postgres
   POSTGRES_PASSWORD=postgres
   POSTGRES_DB=paksentiment
   ```

4. **Tables will be created automatically** when you start the server (TypeORM `synchronize: true` is enabled in development).

   Tables created:
   - `users` - User accounts and authentication
   - `user_preferences` - User settings and preferences
   - `api_keys` - API keys for programmatic access
   - `system_configs` - System-wide configuration

### MongoDB Setup

1. **Ensure MongoDB is running locally** (default: `mongodb://localhost:27017`)

2. **Configure environment variables** (optional, defaults shown):

   ```env
   MONGO_URI=mongodb://localhost:27017
   MONGO_DB=paksentiment
   ```

3. **Collections will be created automatically** when data is first stored:
   - `raw_posts` - Original posts from Reddit/Twitter
   - `processed_posts` - Posts with sentiment analysis and translation
   - `analytics_cache` - Aggregated analytics data
   - `system_logs` - System event logs

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Server
PORT=3000
NODE_ENV=development

# PostgreSQL
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=paksentiment

# MongoDB
MONGO_URI=mongodb://localhost:27017
MONGO_DB=paksentiment

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Google OAuth (optional)
GOOGLE_CLIENT_ID=your-google-client-id

# FastAPI Gateway
FAST_API_BASE_URL=http://localhost:8000
```

## Using the API

### Accessing Swagger Documentation

1. Start the server: `yarn run start:dev`
2. Open your browser to: http://localhost:3000/api
3. Explore endpoints, schemas, and try requests directly

### Authentication Flow

1. **Register a new user**:

   ```bash
   POST http://localhost:3000/auth/register
   Content-Type: application/json

   {
     "firstName": "John",
     "lastName": "Doe",
     "email": "john@example.com",
     "password": "SecurePass123!",
     "confirmPassword": "SecurePass123!"
   }
   ```

2. **Get your access token** from the response:

   ```json
   {
     "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
     "user": { ... }
   }
   ```

3. **Use the token** in subsequent requests:
   ```bash
   Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

### Example: Reddit Sentiment Analysis

```bash
GET http://localhost:3000/raw-data/reddit/sentiment?subreddit=pakistan&query=education&limit=10
```

Response includes:

- Original Reddit posts
- Language detection results
- Translations (if needed)
- Sentiment analysis (positive/negative/neutral)
- AI-generated summaries

## Compile and run the project

```bash
# development
$ yarn run start

# watch mode
$ yarn run start:dev

# production mode
$ yarn run start:prod
```

## Run tests

```bash
# unit tests
$ yarn run test

# e2e tests
$ yarn run test:e2e

# test coverage
$ yarn run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ yarn install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
