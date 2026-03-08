import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function setupSwagger(app: INestApplication): void {
    const config = new DocumentBuilder()
        .setTitle('PakSentiment API Documentation')
        .setDescription(
            `
# PakSentiment Main Server API

The main backend server for PakSentiment - A comprehensive social media sentiment analysis platform focused on Pakistani social discourse.

## Overview

This API provides secure authentication and data aggregation services for the PakSentiment platform. It acts as a middleware layer between the frontend and the FastAPI data gateway.

## Features

* **User Authentication**: Secure registration, login, and OAuth (Google) integration
* **Data Aggregation**: Proxy endpoints to FastAPI gateway for Reddit and Twitter data
* **Sentiment Analysis**: Full pipeline from data collection to AI-powered sentiment classification
* **Multi-language Support**: Automatic language detection and translation (Urdu, English, etc.)
* **Database Management**: PostgreSQL for users/config, MongoDB for posts/analytics

## Architecture

\`\`\`
Frontend (Next.js) → Main Server (Nest.js) → FastAPI Gateway → Social Media APIs
                                                            → AI Services (Gemini, Groq)
\`\`\`

## Authentication

Most endpoints require JWT authentication. Use the \`/auth/register\` or \`/auth/login-with-email-password\` endpoints to obtain an access token.

### Bearer Token Format
\`\`\`
Authorization: Bearer <your_access_token>
\`\`\`

## Response Format

All API responses follow a consistent structure with appropriate HTTP status codes and error messages.

## Rate Limits

Rate limiting is handled at the FastAPI gateway level with automatic retry logic.
    `,
        )
        .setTermsOfService('https://paksentiment.com/terms')
        .setContact(
            'PakSentiment Team',
            'https://paksentiment.com',
            'support@paksentiment.com',
        )
        .setLicense('MIT License', 'https://opensource.org/licenses/MIT')
        .addServer('http://localhost:3000', 'Development Server')
        .addServer('https://api.paksentiment.com', 'Production Server')
        .addBearerAuth(
            {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
                description: 'Enter your JWT token',
            },
            'JWT-auth',
        )
        .addTag('Authentication', 'User registration, login, and OAuth endpoints')
        .addTag('Reddit', 'Reddit data collection and sentiment analysis')
        .addTag('Twitter', 'Twitter data collection and sentiment analysis')
        .addTag('Health', 'API health check endpoints')
        .setVersion('1.0.0')
        .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);
}
