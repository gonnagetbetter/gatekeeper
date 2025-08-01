import { BadRequestException, Injectable } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { JwtService } from '@nestjs/jwt';
import { SignUpResultDto } from './dto/sign-up-result.dto';
import { SignUpDto } from './dto/sign-up.dto';
import { JwtDto } from './dto/jwt.dto';
import * as bcrypt from 'bcrypt';
import { LoggerService } from '../logger/logger.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly logger: LoggerService,
  ) {}

  async signUp(dto: SignUpDto): Promise<SignUpResultDto> {
    this.logger.log('Received sign up request');

    const user = await this.userService.findByEmail(dto.email);

    if (user) {
      this.logger.log(`User with e-mail ${dto.email} already exists`);
      throw new BadRequestException('Email already exists');
    }

    const { password, ...rest } = dto;

    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(password, salt);

    const userData = {
      ...rest,
      passwordSalt: salt,
      passwordHash: hashedPassword,
    };

    await this.userService.create(userData);

    this.logger.log(`User with e-mail ${userData.email} created`);

    return {
      success: true,
    };
  }

  async signIn(dto: SignUpDto): Promise<JwtDto> {
    this.logger.log(`Received sign in request for user ${dto.email}`);

    const user = await this.userService.findByEmail(dto.email);

    if (!user) {
      this.logger.log(`User with e-mail ${dto.email} not found`);
      throw new BadRequestException('Invalid credentials');
    }

    const match = await bcrypt.compare(dto.password, user.passwordHash);

    if (!match) {
      this.logger.log(`Invalid credentials for user ${user.email}`);
      throw new BadRequestException('Invalid credentials');
    }

    const payload = {
      sub: user.id,
      email: user.email,
    };

    this.logger.log(`User with e-mail ${user.email} signed in`);

    return {
      accessToken: this.jwtService.sign(payload),
    };
  }

  validate(token: string): { sub: number; email: string } {
    return this.jwtService.verify(token);
  }
}
