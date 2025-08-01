import { Test, TestingModule } from '@nestjs/testing';
import {
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { AuthGuard } from './auth.guard';
import { AuthService } from '../auth.service';

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let authService: jest.Mocked<Pick<AuthService, 'validate'>>;

  beforeEach(async () => {
    authService = {
      validate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthGuard,
        {
          provide: AuthService,
          useValue: authService,
        },
      ],
    }).compile();

    guard = module.get<AuthGuard>(AuthGuard);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    let mockContext: ExecutionContext;
    let mockRequest: any;

    beforeEach(() => {
      mockRequest = {
        headers: {},
      };

      mockContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(mockRequest),
        }),
      } as unknown as ExecutionContext;
    });

    it('should throw UnauthorizedException if authorization header is missing', () => {
      expect(() => guard.canActivate(mockContext)).toThrow(
        UnauthorizedException,
      );
      expect(mockContext.switchToHttp).toHaveBeenCalled();
      expect(mockContext.switchToHttp().getRequest).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException if authorization header is not a string', () => {
      mockRequest.headers.authorization = ['Bearer token'];

      expect(() => guard.canActivate(mockContext)).toThrow(
        UnauthorizedException,
      );
      expect(mockContext.switchToHttp).toHaveBeenCalled();
      expect(mockContext.switchToHttp().getRequest).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException if token format is invalid', () => {
      mockRequest.headers.authorization = 'InvalidFormat';

      expect(() => guard.canActivate(mockContext)).toThrow(
        UnauthorizedException,
      );
      expect(mockContext.switchToHttp).toHaveBeenCalled();
      expect(mockContext.switchToHttp().getRequest).toHaveBeenCalled();
    });

    it('should throw ForbiddenException if token validation fails', () => {
      mockRequest.headers.authorization = 'Bearer validToken';
      authService.validate.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
      expect(mockContext.switchToHttp).toHaveBeenCalled();
      expect(mockContext.switchToHttp().getRequest).toHaveBeenCalled();
      expect(authService.validate).toHaveBeenCalledWith('validToken');
    });

    it('should set userId and userEmail on request and return true if token is valid', () => {
      mockRequest.headers.authorization = 'Bearer validToken';
      const mockPayload = { sub: 123, email: 'test@example.com' };
      authService.validate.mockReturnValue(mockPayload);

      const result = guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(mockContext.switchToHttp).toHaveBeenCalled();
      expect(mockContext.switchToHttp().getRequest).toHaveBeenCalled();
      expect(authService.validate).toHaveBeenCalledWith('validToken');
      expect(mockRequest.userId).toBe(123);
      expect(mockRequest.userEmail).toBe('test@example.com');
    });
  });
});
