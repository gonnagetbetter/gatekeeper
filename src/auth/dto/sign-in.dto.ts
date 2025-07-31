import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class SignInDto {
  @IsEmail()
  @IsNotEmpty({
    message: 'Email is required',
  })
  email: string;

  @IsString({
    message: 'Password must be a string',
  })
  @IsNotEmpty({ message: 'Password is required' })
  @MaxLength(20, {
    message: 'Password must be less than 20 characters',
  })
  @MinLength(8, {
    message: 'Password must be more than 8 characters',
  })
  password: string;
}
