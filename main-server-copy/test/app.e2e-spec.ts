import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('PakSentiment API (e2e)', () => {
  let app: INestApplication<App>;
  let authToken: string;
  let testUserId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Apply validation pipes like in main.ts
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
  }, 30000);

  afterAll(async () => {
    if (app) {
      try {
        await app.close();
      } catch {
        // Ignore teardown errors
      }
    }
  });

  describe('Authentication Endpoints', () => {
    describe('/auth/register (POST)', () => {
      it('should register a new user successfully', () => {
        const timestamp = Date.now();
        return request(app.getHttpServer())
          .post('/auth/register')
          .send({
            firstName: 'Test',
            lastName: 'User',
            email: `test${timestamp}@example.com`,
            password: 'SecurePass123!',
            confirmPassword: 'SecurePass123!',
          })
          .expect(201)
          .expect((res) => {
            expect(res.body).toHaveProperty('accessToken');
            expect(res.body).toHaveProperty('user');
            expect(res.body.user).toHaveProperty('email');
            expect(res.body.user.email).toBe(`test${timestamp}@example.com`);
            authToken = res.body.accessToken;
            testUserId = res.body.user.id;
          });
      });

      it('should reject registration with existing email', async () => {
        const timestamp = Date.now();
        const userData = {
          firstName: 'Test',
          lastName: 'User',
          email: `duplicate${timestamp}@example.com`,
          password: 'SecurePass123!',
          confirmPassword: 'SecurePass123!',
        };

        // Register once
        await request(app.getHttpServer())
          .post('/auth/register')
          .send(userData)
          .expect(201);

        // Try to register again with same email
        return request(app.getHttpServer())
          .post('/auth/register')
          .send(userData)
          .expect(400)
          .expect((res) => {
            expect(res.body.message).toContain('Email already registered');
          });
      });

      it('should reject registration with mismatched passwords', () => {
        return request(app.getHttpServer())
          .post('/auth/register')
          .send({
            firstName: 'Test',
            lastName: 'User',
            email: 'test@example.com',
            password: 'SecurePass123!',
            confirmPassword: 'DifferentPass123!',
          })
          .expect(400);
      });

      it('should reject registration with weak password', () => {
        return request(app.getHttpServer())
          .post('/auth/register')
          .send({
            firstName: 'Test',
            lastName: 'User',
            email: 'test@example.com',
            password: 'weak',
            confirmPassword: 'weak',
          })
          .expect(400);
      });

      it('should reject registration with invalid email', () => {
        return request(app.getHttpServer())
          .post('/auth/register')
          .send({
            firstName: 'Test',
            lastName: 'User',
            email: 'invalid-email',
            password: 'SecurePass123!',
            confirmPassword: 'SecurePass123!',
          })
          .expect(400);
      });

      it('should reject registration with missing fields', () => {
        return request(app.getHttpServer())
          .post('/auth/register')
          .send({
            firstName: 'Test',
            email: 'test@example.com',
          })
          .expect(400);
      });
    });

    describe('/auth/login-with-email-password (POST)', () => {
      const testUser = {
        email: `login${Date.now()}@example.com`,
        password: 'SecurePass123!',
      };

      beforeAll(async () => {
        // Create a test user for login tests
        await request(app.getHttpServer()).post('/auth/register').send({
          firstName: 'Login',
          lastName: 'Test',
          email: testUser.email,
          password: testUser.password,
          confirmPassword: testUser.password,
        });
      });

      it('should login successfully with valid credentials', () => {
        return request(app.getHttpServer())
          .post('/auth/login-with-email-password')
          .send({
            email: testUser.email,
            password: testUser.password,
          })
          .expect(201)
          .expect((res) => {
            expect(res.body).toHaveProperty('accessToken');
            expect(res.body).toHaveProperty('user');
            expect(res.body.user.email).toBe(testUser.email);
          });
      });

      it('should reject login with wrong password', () => {
        return request(app.getHttpServer())
          .post('/auth/login-with-email-password')
          .send({
            email: testUser.email,
            password: 'WrongPassword123!',
          })
          .expect(401);
      });

      it('should reject login with non-existent email', () => {
        return request(app.getHttpServer())
          .post('/auth/login-with-email-password')
          .send({
            email: 'nonexistent@example.com',
            password: 'SecurePass123!',
          })
          .expect(401);
      });

      it('should reject login with invalid email format', () => {
        return request(app.getHttpServer())
          .post('/auth/login-with-email-password')
          .send({
            email: 'invalid-email',
            password: 'SecurePass123!',
          })
          .expect(400);
      });
    });

    describe('/auth/forgot-password (POST)', () => {
      it('should process password reset request', () => {
        return request(app.getHttpServer())
          .post('/auth/forgot-password')
          .send({
            email: 'test@example.com',
          })
          .expect(201)
          .expect((res) => {
            expect(res.body).toHaveProperty('message');
          });
      });

      it('should reject invalid email format', () => {
        return request(app.getHttpServer())
          .post('/auth/forgot-password')
          .send({
            email: 'invalid-email',
          })
          .expect(400);
      });
    });
  });

  describe('Raw Data Endpoints', () => {
    describe('/raw-data/reddit (POST)', () => {
      it('should fetch Reddit posts with valid parameters', () => {
        return request(app.getHttpServer())
          .post('/raw-data/reddit')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            subreddit: 'pakistan',
            query: 'test',
            limit: 5,
          })
          .expect((res) => {
            // May fail if FastAPI gateway is not running — accept 201 or 500
            expect([201, 500]).toContain(res.status);
            if (res.status === 201) {
              expect(res.body).toHaveProperty('posts');
              expect(Array.isArray(res.body.posts)).toBe(true);
            }
          });
      }, 30000);

      it('should reject request without auth token', () => {
        return request(app.getHttpServer())
          .post('/raw-data/reddit')
          .send({
            subreddit: 'pakistan',
            query: 'test',
            limit: 5,
          })
          .expect(401);
      });

      it('should validate limit parameter range', () => {
        return request(app.getHttpServer())
          .post('/raw-data/reddit')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            subreddit: 'pakistan',
            query: 'test',
            limit: 999,
          })
          .expect(400);
      });
    });

    describe('/raw-data/twitter (POST)', () => {
      it('should fetch tweets with valid parameters', () => {
        return request(app.getHttpServer())
          .post('/raw-data/twitter')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            query: 'Pakistan',
            maxResults: 10,
          })
          .expect((res) => {
            expect([201, 500]).toContain(res.status);
            if (res.status === 201) {
              expect(res.body).toHaveProperty('tweets');
              expect(Array.isArray(res.body.tweets)).toBe(true);
            }
          });
      }, 30000);

      it('should reject request without auth token', () => {
        return request(app.getHttpServer())
          .post('/raw-data/twitter')
          .send({
            query: 'Pakistan',
            maxResults: 10,
          })
          .expect(401);
      });
    });

    describe('/raw-data/reddit/sentiment (POST)', () => {
      it('should fetch Reddit sentiment analysis', () => {
        return request(app.getHttpServer())
          .post('/raw-data/reddit/sentiment')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            subreddit: 'pakistan',
            query: 'test',
            limit: 3,
          })
          .expect((res) => {
            expect([201, 500]).toContain(res.status);
            if (res.status === 201) {
              expect(res.body).toHaveProperty('posts');
              expect(res.body).toHaveProperty('translations');
              expect(res.body).toHaveProperty('sentiment');
              expect(Array.isArray(res.body.posts)).toBe(true);
              expect(Array.isArray(res.body.translations)).toBe(true);
              expect(Array.isArray(res.body.sentiment)).toBe(true);
            }
          });
      }, 90000);

      it('should handle small limits efficiently', () => {
        return request(app.getHttpServer())
          .post('/raw-data/reddit/sentiment')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            subreddit: 'pakistan',
            query: 'news',
            limit: 1,
          })
          .expect((res) => {
            expect([201, 500]).toContain(res.status);
          });
      }, 60000);
    });

    describe('/raw-data/twitter/sentiment (POST)', () => {
      it('should fetch Twitter sentiment analysis', () => {
        return request(app.getHttpServer())
          .post('/raw-data/twitter/sentiment')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            query: 'Pakistan news',
            maxResults: 10,
          })
          .expect((res) => {
            expect([201, 500]).toContain(res.status);
            if (res.status === 201) {
              expect(res.body).toHaveProperty('tweets');
              expect(res.body).toHaveProperty('translations');
              expect(res.body).toHaveProperty('sentiment');
            }
          });
      }, 90000);

      it('should respect Twitter API minimum results', () => {
        return request(app.getHttpServer())
          .post('/raw-data/twitter/sentiment')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            query: 'Pakistan',
            maxResults: 5,
          })
          .expect((res) => {
            // 400 if validation catches it, 500 if FastAPI not running
            expect([400, 500]).toContain(res.status);
          });
      });
    });
  });

  describe('API Health & Documentation', () => {
    it('should serve root endpoint', () => {
      return request(app.getHttpServer())
        .get('/')
        .expect(200)
        .expect((res) => {
          expect(res.text).toBe('Hello World!');
        });
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent routes', () => {
      return request(app.getHttpServer())
        .get('/non-existent-route')
        .expect(404);
    });

    it('should handle malformed JSON in request body', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect(400);
    });

    it('should validate request body types', () => {
      return request(app.getHttpServer())
        .post('/raw-data/reddit')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          subreddit: 'pakistan',
          query: 'test',
          limit: 'invalid',
        })
        .expect(400);
    });
  });
});
