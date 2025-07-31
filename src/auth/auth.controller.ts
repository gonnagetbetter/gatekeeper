import { Body, Controller, Post } from '@nestjs/common';
import { JwtDto } from './dto/jwt.dto';
import { SignUpDto } from './dto/sign-up.dto';
import { AuthService } from './auth.service';
import { SignUpResultDto } from './dto/sign-up-result.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}
  @Post('signUp')
  signUp(@Body() dto: SignUpDto): Promise<SignUpResultDto> {
    return this.authService.signUp(dto);
  }

  @Post('signIn')
  signIn(@Body() dto: SignUpDto): Promise<JwtDto> {
    return this.authService.signIn(dto);
  }
}
