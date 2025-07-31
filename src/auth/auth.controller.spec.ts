import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SignUpDto } from './dto/sign-up.dto';
import { SignUpResultDto } from './dto/sign-up-result.dto';
import { JwtDto } from './dto/jwt.dto';
import { BadRequestException } from '@nestjs/common';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  const mockSignUpDto: SignUpDto = {
    email: 'test@example.com',
    password: 'password123',
    fullName: 'Test User',
  };

  const mockSignUpResultDto: SignUpResultDto = {
    success: true,
  };

  const mockJwtDto: JwtDto = {
    accessToken: 'mock.jwt.token',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            signUp: jest.fn(),
            signIn: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('signUp', () => {
    it('should call authService.signUp with the provided dto', async () => {
      jest.spyOn(authService, 'signUp').mockResolvedValue(mockSignUpResultDto);

      const result = await controller.signUp(mockSignUpDto);

      expect(authService.signUp).toHaveBeenCalledWith(mockSignUpDto);
      expect(result).toEqual(mockSignUpResultDto);
    });

    it('should throw BadRequestException when email already exists', async () => {
      jest
        .spyOn(authService, 'signUp')
        .mockRejectedValue(new BadRequestException('Email already exists'));

      await expect(controller.signUp(mockSignUpDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(authService.signUp).toHaveBeenCalledWith(mockSignUpDto);
    });
  });

  describe('signIn', () => {
    it('should call authService.signIn with the provided dto', async () => {
      jest.spyOn(authService, 'signIn').mockResolvedValue(mockJwtDto);

      const result = await controller.signIn(mockSignUpDto);

      expect(authService.signIn).toHaveBeenCalledWith(mockSignUpDto);
      expect(result).toEqual(mockJwtDto);
    });

    it('should throw BadRequestException when credentials are invalid', async () => {
      jest
        .spyOn(authService, 'signIn')
        .mockRejectedValue(new BadRequestException('Invalid credentials'));

      await expect(controller.signIn(mockSignUpDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(authService.signIn).toHaveBeenCalledWith(mockSignUpDto);
    });

    it('should throw BadRequestException when user not found', async () => {
      jest
        .spyOn(authService, 'signIn')
        .mockRejectedValue(new BadRequestException('Invalid credentials'));

      await expect(
        controller.signIn({
          email: 'nonexistent@example.com',
          password: 'password123',
          fullName: 'Nonexistent User',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
