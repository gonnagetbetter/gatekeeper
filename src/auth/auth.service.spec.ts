import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import { BadRequestException } from '@nestjs/common';
import { SignUpDto } from './dto/sign-up.dto';
import { LoggerService } from '../logger/logger.service';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt', () => ({
  genSalt: jest.fn(),
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let userService: jest.Mocked<Pick<UserService, 'findByEmail' | 'create'>>;
  let jwtService: jest.Mocked<Pick<JwtService, 'sign' | 'verify'>>;
  let loggerService: jest.Mocked<Pick<LoggerService, 'log' | 'error'>>;

  const mockUser = {
    id: 1,
    email: 'test@example.com',
    fullName: 'Test User',
    passwordHash: 'hashedPassword',
    passwordSalt: 'salt',
    createdAt: new Date(),
  };

  const mockSignUpDto: SignUpDto = {
    email: 'test@example.com',
    password: 'password123',
    fullName: 'Test User',
  };

  beforeEach(async () => {
    userService = {
      findByEmail: jest.fn(),
      create: jest.fn(),
    };

    jwtService = {
      sign: jest.fn(),
      verify: jest.fn(),
    };

    loggerService = {
      log: jest.fn(),
      error: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UserService,
          useValue: userService,
        },
        {
          provide: JwtService,
          useValue: jwtService,
        },
        {
          provide: LoggerService,
          useValue: loggerService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('signUp', () => {
    it('should throw BadRequestException if email already exists', async () => {
      userService.findByEmail.mockResolvedValue(mockUser);

      await expect(service.signUp(mockSignUpDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(userService.findByEmail).toHaveBeenCalledWith(mockSignUpDto.email);
      expect(loggerService.log).toHaveBeenCalledWith(
        'Received sign up request',
      );
      expect(loggerService.log).toHaveBeenCalledWith(
        `User with e-mail ${mockSignUpDto.email} already exists`,
      );
    });

    it('should create a new user with hashed password', async () => {
      userService.findByEmail.mockResolvedValue(null);
      userService.create.mockResolvedValue(mockUser);
      (bcrypt.genSalt as jest.Mock).mockResolvedValue('generatedSalt');
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');

      const result = await service.signUp(mockSignUpDto);

      expect(userService.findByEmail).toHaveBeenCalledWith(mockSignUpDto.email);
      expect(bcrypt.genSalt).toHaveBeenCalled();
      expect(bcrypt.hash).toHaveBeenCalledWith(
        mockSignUpDto.password,
        'generatedSalt',
      );
      expect(userService.create).toHaveBeenCalledWith({
        email: mockSignUpDto.email,
        fullName: mockSignUpDto.fullName,
        passwordSalt: 'generatedSalt',
        passwordHash: 'hashedPassword',
      });
      expect(result).toEqual({ success: true });
      expect(loggerService.log).toHaveBeenCalledWith(
        `User with e-mail ${mockSignUpDto.email} created`,
      );
    });
  });

  describe('signIn', () => {
    it('should throw BadRequestException if user not found', async () => {
      userService.findByEmail.mockResolvedValue(null);

      await expect(service.signIn(mockSignUpDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(userService.findByEmail).toHaveBeenCalledWith(mockSignUpDto.email);
      expect(loggerService.log).toHaveBeenCalledWith(
        `Received sign in request for user ${mockSignUpDto.email}`,
      );
      expect(loggerService.log).toHaveBeenCalledWith(
        `User with e-mail ${mockSignUpDto.email} not found`,
      );
    });

    it('should throw BadRequestException if password does not match', async () => {
      userService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.signIn(mockSignUpDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(userService.findByEmail).toHaveBeenCalledWith(mockSignUpDto.email);
      expect(bcrypt.compare).toHaveBeenCalledWith(
        mockSignUpDto.password,
        mockUser.passwordHash,
      );
      expect(loggerService.log).toHaveBeenCalledWith(
        `Invalid credentials for user ${mockUser.email}`,
      );
    });

    it('should return JWT token if credentials are valid', async () => {
      userService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      jwtService.sign.mockReturnValue('jwt.token.here');

      const result = await service.signIn(mockSignUpDto);

      expect(userService.findByEmail).toHaveBeenCalledWith(mockSignUpDto.email);
      expect(bcrypt.compare).toHaveBeenCalledWith(
        mockSignUpDto.password,
        mockUser.passwordHash,
      );
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: mockUser.id,
        email: mockUser.email,
      });
      expect(result).toEqual({ accessToken: 'jwt.token.here' });
      expect(loggerService.log).toHaveBeenCalledWith(
        `User with e-mail ${mockUser.email} signed in`,
      );
    });
  });

  describe('validate', () => {
    it('should verify and return token payload', () => {
      const payload = { sub: 1, email: 'test@example.com' };
      jwtService.verify.mockReturnValue(payload);

      const result = service.validate('token');

      expect(jwtService.verify).toHaveBeenCalledWith('token');
      expect(result).toEqual(payload);
    });
  });
});
