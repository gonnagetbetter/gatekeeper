import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { UserMetadata } from '../auth/types/user-metadata.type';
import { AuthService } from '../auth/auth.service';

describe('UserController', () => {
  let controller: UserController;
  let userService: jest.Mocked<Pick<UserService, 'findByIdSafe'>>;

  const mockUserMetadata: UserMetadata = {
    userId: 1,
    userEmail: 'test@example.com',
  };

  const mockUserData = {
    email: 'test@example.com',
    fullName: 'Test User',
  };

  beforeEach(async () => {
    userService = {
      findByIdSafe: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: userService,
        },
        {
          provide: AuthGuard,
          useValue: {
            canActivate: jest.fn(),
          },
        },
        {
          provide: AuthService,
          useValue: {
            validate: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<UserController>(UserController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getMe', () => {
    it('should return user data when user exists', async () => {
      userService.findByIdSafe.mockResolvedValue(mockUserData);

      const result = await controller.getMe(mockUserMetadata);

      expect(userService.findByIdSafe).toHaveBeenCalledWith(
        mockUserMetadata.userId,
      );
      expect(result).toEqual(mockUserData);
    });

    it('should propagate exceptions from userService', async () => {
      const error = new Error('User not found');
      userService.findByIdSafe.mockRejectedValue(error);

      await expect(controller.getMe(mockUserMetadata)).rejects.toThrow(error);
      expect(userService.findByIdSafe).toHaveBeenCalledWith(
        mockUserMetadata.userId,
      );
    });
  });
});
