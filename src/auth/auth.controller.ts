// services/auth-service/src/auth/auth.controller.ts
import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

import { AuthService } from './auth.service';
import { User } from './entities/user.entity';
import { LoginDto, RegisterDto } from './dto/auth.dto';

export interface RequestWithUser extends Request {
  user: User;
}

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @ApiResponse({ status: 409, description: 'User already exists' })
  async register(@Body() registerDto: RegisterDto) {
    const startTime = Date.now();
    
    try {
      const result = await this.authService.register(registerDto);
      
      this.logger.log(`Registration completed in ${Date.now() - startTime}ms`, {
        email: registerDto.email,
        responseTime: Date.now() - startTime,
      });
      
      return {
        success: true,
        message: 'User registered successfully',
        data: result,
      };
    } catch (error) {
      this.logger.error(`Registration failed in ${Date.now() - startTime}ms`, {
        email: registerDto.email,
        error: error.message,
        responseTime: Date.now() - startTime,
      });
      throw error;
    }
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login user' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const startTime = Date.now();
    
    try {
      const result = await this.authService.login(loginDto);
      
      // Set refresh token as httpOnly cookie
      response.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      });
      
      this.logger.log(`Login completed in ${Date.now() - startTime}ms`, {
        email: loginDto.email,
        userId: result.user.id,
        responseTime: Date.now() - startTime,
      });
      
      return {
        success: true,
        message: 'Login successful',
        data: {
          user: result.user,
          accessToken: result.accessToken,
          expiresIn: result.expiresIn,
        },
      };
    } catch (error) {
      this.logger.error(`Login failed in ${Date.now() - startTime}ms`, {
        email: loginDto.email,
        error: error.message,
        responseTime: Date.now() - startTime,
      });
      throw error;
    }
    }
}