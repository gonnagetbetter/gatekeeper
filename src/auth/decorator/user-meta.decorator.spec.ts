import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserMeta } from './user-meta.decorator';
import { UserMetadata } from '../types/user-metadata.type';

jest.mock('@nestjs/common', () => {
  const originalModule = jest.requireActual('@nestjs/common');
  return {
    ...originalModule,
    createParamDecorator: jest.fn((factory) => {
      const decorator = function () {};
      decorator.factory = factory;
      return decorator;
    }),
  };
});

describe('UserMeta', () => {
  it('should extract user metadata from request', () => {
    const mockRequest = {
      userId: 123,
      userEmail: 'test@example.com',
    };

    const mockContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(mockRequest),
      }),
    } as unknown as ExecutionContext;

    const factory = (UserMeta as any).factory;

    const result = factory(null, mockContext);

    expect(result).toEqual({
      userId: 123,
      userEmail: 'test@example.com',
    } as UserMetadata);

    expect(mockContext.switchToHttp).toHaveBeenCalled();
    expect(mockContext.switchToHttp().getRequest).toHaveBeenCalled();
  });
});
