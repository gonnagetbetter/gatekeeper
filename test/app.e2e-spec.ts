import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { UserService } from '../src/user/user.service';
import { JwtService } from '@nestjs/jwt';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });
});

describe('Auth Endpoints (e2e)', () => {
  let app: INestApplication<App>;
  let userService: UserService;
  let jwtService: JwtService;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    userService = moduleFixture.get<UserService>(UserService);
    jwtService = moduleFixture.get<JwtService>(JwtService);

    // Clean up any test users from previous runs
    jest.spyOn(userService, 'findByEmail').mockImplementation(async (email) => {
      if (email === 'test-e2e@example.com') {
        return null;
      }
      // For other emails, call the original implementation
      return jest
        .requireActual('../src/user/user.service')
        .findByEmail.call(this, email);
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/auth/signUp (POST)', () => {
    it('should create a new user', () => {
      return request(app.getHttpServer())
        .post('/auth/signUp')
        .send({
          email: 'test-e2e@example.com',
          password: 'password123',
          fullName: 'Test E2E User',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('success');
          expect(res.body.success).toBe(true);
        });
    });

    it('should return 400 if email is missing', () => {
      return request(app.getHttpServer())
        .post('/auth/signUp')
        .send({
          password: 'password123',
          fullName: 'Test E2E User',
        })
        .expect(400);
    });

    it('should return 400 if password is missing', () => {
      return request(app.getHttpServer())
        .post('/auth/signUp')
        .send({
          email: 'test-e2e@example.com',
          fullName: 'Test E2E User',
        })
        .expect(400);
    });

    it('should return 400 if fullName is missing', () => {
      return request(app.getHttpServer())
        .post('/auth/signUp')
        .send({
          email: 'test-e2e@example.com',
          password: 'password123',
        })
        .expect(400);
    });
  });

  describe('/auth/signIn (POST)', () => {
    it('should return JWT token for valid credentials', async () => {
      const mockUser = {
        id: 999,
        email: 'test-e2e@example.com',
        fullName: 'Test E2E User',
        passwordHash: await require('bcrypt').hash('password123', 10),
        passwordSalt: 'salt',
        createdAt: new Date(),
      };

      jest.spyOn(userService, 'findByEmail').mockResolvedValue(mockUser);

      return request(app.getHttpServer())
        .post('/auth/signIn')
        .send({
          email: 'test-e2e@example.com',
          password: 'password123',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('accessToken');
          expect(typeof res.body.accessToken).toBe('string');

          // Verify the token
          const accessToken = res.body.accessToken as string;
          const decoded = jwtService.verify(accessToken);
          expect(decoded).toHaveProperty('sub', 999);
          expect(decoded).toHaveProperty('email', 'test-e2e@example.com');
        });
    });

    it('should return 400 for invalid credentials', () => {
      jest.spyOn(userService, 'findByEmail').mockResolvedValue(null);

      return request(app.getHttpServer())
        .post('/auth/signIn')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123',
        })
        .expect(400);
    });
  });
});

describe('User Endpoints (e2e)', () => {
  let app: INestApplication<App>;
  let jwtService: JwtService;
  let userService: UserService;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    jwtService = moduleFixture.get<JwtService>(JwtService);
    userService = moduleFixture.get<UserService>(UserService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/user/me (GET)', () => {
    it('should return user data for authenticated user', async () => {
      const token = jwtService.sign({
        sub: 999,
        email: 'test-e2e@example.com',
      });

      const mockUserData = {
        email: 'test-e2e@example.com',
        fullName: 'Test E2E User',
      };

      jest.spyOn(userService, 'findByIdSafe').mockResolvedValue(mockUserData);

      return request(app.getHttpServer())
        .get('/user/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual(mockUserData);
        });
    });

    it('should return 401 for missing token', () => {
      return request(app.getHttpServer()).get('/user/me').expect(401);
    });

    it('should return 401 for invalid token', () => {
      return request(app.getHttpServer())
        .get('/user/me')
        .set('Authorization', 'Bearer invalid.token')
        .expect(401);
    });
  });
});
