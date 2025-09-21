// services/auth-service/src/auth/auth.service.ts
import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Counter, Histogram } from 'prom-client';

import { User, UserRole } from './entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { LoginDto, RegisterDto } from './dto/auth.dto';

// import { EventsService } from '../events/events.service';

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    // private readonly eventsService: EventsService,
    @InjectMetric('auth_operations_total')
    private readonly authOperationsCounter: Counter<string>,
    @InjectMetric('auth_operation_duration_seconds')
    private readonly authOperationDuration: Histogram<string>,
  ) {}

  async register(registerDto: RegisterDto): Promise<{ user: Partial<User> }> {
    const timer = this.authOperationDuration.startTimer({ operation: 'register' });
    
    try {
      // Check if user already exists
      const existingUser = await this.userRepository.findOne({
        where: { email: registerDto.email },
      });

      if (existingUser) {
        throw new ConflictException('User with this email already exists');
      }

      // Hash password
      const hashedPwd = await bcrypt.hash(registerDto.password, 12);

      // Create user
      const user = this.userRepository.create({
        email: registerDto.email,
        passwordHash:hashedPwd,
        role: registerDto.role || UserRole.CLIENT,
        firstName: registerDto.firstName,
        lastName: registerDto.lastName,
      });

      const savedUser = await this.userRepository.save(user);

      // Emit user registered event
      // await this.eventsService.emitUserRegistered({
      //   userId: savedUser.id,
      //   email: savedUser.email,
      //   role: savedUser.role,
      //   firstName: savedUser.firstName,
      //   lastName: savedUser.lastName,
      // });

      this.authOperationsCounter.inc({ operation: 'register', status: 'success' });
      
      this.logger.log(`User registered successfully: ${savedUser.email}`, {
        userId: savedUser.id,
        email: savedUser.email,
        role: savedUser.role,
      });

      // Return user without sensitive data
      const { passwordHash, ...userWithoutPassword } = savedUser;
      return { user: userWithoutPassword };
    } catch (error) {
      this.authOperationsCounter.inc({ operation: 'register', status: 'error' });
      this.logger.error(`Registration failed for ${registerDto.email}:`, error.message, {
        email: registerDto.email,
        error: error.message,
      });
      throw error;
    } finally {
      timer();
    }
  }

  async login(loginDto: LoginDto): Promise<AuthTokens & { user: Partial<User> }> {
    const timer = this.authOperationDuration.startTimer({ operation: 'login' });
    
    try {
      // Find user
      const user = await this.userRepository.findOne({
        where: { email: loginDto.email },
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException('Invalid credentials');
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(loginDto.password, user.passwordHash);
      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid credentials');
      }

      // Generate tokens
      const tokens = await this.generateTokens(user);

      // Emit user logged in event
      // await this.eventsService.emitUserLoggedIn({
      //   userId: user.id,
      //   email: user.email,
      //   role: user.role,
      //   loginAt: new Date(),
      // });

      this.authOperationsCounter.inc({ operation: 'login', status: 'success' });
      
      this.logger.log(`User logged in successfully: ${user.email}`, {
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      const { passwordHash, ...userWithoutPassword } = user;
      return {
        ...tokens,
        user: userWithoutPassword,
      };
    } catch (error) {
      this.authOperationsCounter.inc({ operation: 'login', status: 'error' });
      this.logger.error(`Login failed for ${loginDto.email}:`, error.message, {
        email: loginDto.email,
        error: error.message,
      });
      throw error;
    } finally {
      timer();
    }
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    const timer = this.authOperationDuration.startTimer({ operation: 'refresh' });
    
    try {
      // Find and validate refresh token
      const storedToken = await this.refreshTokenRepository.findOne({
        where: { token: refreshToken, isRevoked: false },
        relations: ['user'],
      });

      if (!storedToken || storedToken.expiresAt < new Date() || !storedToken.user.isActive) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Revoke old token
      storedToken.isRevoked = true;
      await this.refreshTokenRepository.save(storedToken);

      // Generate new tokens
      const tokens = await this.generateTokens(storedToken.user);

      this.authOperationsCounter.inc({ operation: 'refresh', status: 'success' });
      this.logger.log(`Token refreshed successfully for user: ${storedToken.user.email}`, {
        userId: storedToken.user.id,
      });

      return tokens;
    } catch (error) {
      this.authOperationsCounter.inc({ operation: 'refresh', status: 'error' });
      this.logger.error('Token refresh failed:', error.message, {
        error: error.message,
      });
      throw error;
    } finally {
      timer();
    }
  }

  async logout(refreshToken: string): Promise<void> {
    const timer = this.authOperationDuration.startTimer({ operation: 'logout' });
    
    try {
      // Revoke refresh token
      await this.refreshTokenRepository.update(
        { token: refreshToken },
        { isRevoked: true },
      );

      this.authOperationsCounter.inc({ operation: 'logout', status: 'success' });
      this.logger.log('User logged out successfully');
    } catch (error) {
      this.authOperationsCounter.inc({ operation: 'logout', status: 'error' });
      this.logger.error('Logout failed:', error.message);
      throw error;
    } finally {
      timer();
    }
  }

  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id, isActive: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async validateToken(token: string): Promise<JwtPayload> {
    try {
      const payload = this.jwtService.verify(token) as JwtPayload;
      
      // Verify user still exists and is active
      const user = await this.userRepository.findOne({
        where: { id: payload.sub, isActive: true },
      });

      if (!user) {
        throw new UnauthorizedException('User no longer exists');
      }

      return payload;
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  private async generateTokens(user: User): Promise<AuthTokens> {
    const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    // Generate access token
    const accessToken = this.jwtService.sign(payload);

    // Generate refresh token
    const refreshTokenValue = uuidv4();
    const refreshTokenExpiry = new Date();
    refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + 30); // 30 days

    // Store refresh token
    const refreshToken = this.refreshTokenRepository.create({
      userId: user.id,
      token: refreshTokenValue,
      expiresAt: refreshTokenExpiry,
    });

    await this.refreshTokenRepository.save(refreshToken);

    return {
      accessToken,
      refreshToken: refreshTokenValue,
      expiresIn: 15 * 60, // 15 minutes in seconds
    };
  }
}