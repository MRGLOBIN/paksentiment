import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { OAuth2Client } from 'google-auth-library';
import { compare, hash } from 'bcrypt';

import { LoginWithEmailAndPasswordDTO } from './dto/login-user.dto';
import { RegisterUserDTO } from './dto/regiester-user.dto';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { UsersService } from './users.service';
import { ActivityService } from '../activity/activity.service';
import { UserEntity } from '../../database/entities/user.entity';

export interface AuthResponse {
  accessToken: string;
  user: Omit<UserEntity, 'passwordHash'>;
}

@Injectable()
export class AuthService {
  private readonly googleClient?: OAuth2Client;

  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly activityService: ActivityService,
  ) {
    const googleClientId = process.env.GOOGLE_CLIENT_ID;
    if (googleClientId) {
      this.googleClient = new OAuth2Client(googleClientId);
    }
  }

  /**
   * Register a new user with email and password.
   * 
   * @param dto Registration data (email, password, name)
   * @returns AuthResponse with new access token and user info
   * @throws BadRequestException if email already exists
   */
  async register(dto: RegisterUserDTO): Promise<AuthResponse> {
    const existingUser = await this.usersService.findByEmail(dto.email);
    if (existingUser) {
      throw new BadRequestException('Email already registered');
    }

    const passwordHash = await hash(dto.password, 10);
    const fullName = `${dto.firstName} ${dto.lastName}`.trim();
    const user = await this.usersService.createLocalUser({
      fullName,
      email: dto.email,
      passwordHash,
    });

    await this.activityService.logActivity(user.id, 'REGISTER', { email: dto.email });

    return this.buildAuthResponse(user);
  }

  /**
   * Authenticate a user using email and password.
   * 
   * @param loginDto Login credentials
   * @returns AuthResponse with access token
   * @throws UnauthorizedException if credentials are invalid or provider mismatch
   */
  async loginWithEmailAndPassword(
    loginDto: LoginWithEmailAndPasswordDTO,
  ): Promise<AuthResponse> {
    const { email, password } = loginDto;

    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.passwordHash) {
      throw new UnauthorizedException('Please login using Google');
    }

    const isPasswordValid = await compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.activityService.logActivity(user.id, 'LOGIN', { method: 'email' });

    return this.buildAuthResponse(user);
  }

  /**
   * Authenticate or Register a user using Google OAuth ID Token.
   * 
   * @param dto Google Auth DTO containing idToken
   * @returns AuthResponse with access token
   * @throws InternalServerErrorException if Google Client ID is missing
   * @throws UnauthorizedException if token is invalid
   */
  async loginWithGoogle(dto: GoogleAuthDto): Promise<AuthResponse> {
    if (!this.googleClient) {
      throw new InternalServerErrorException(
        'Google client ID not configured on the server',
      );
    }

    const ticket = await this.googleClient.verifyIdToken({
      idToken: dto.idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      throw new UnauthorizedException('Invalid Google token');
    }

    const firstName = payload.given_name ?? payload.name ?? 'Google';
    const lastName = payload.family_name ?? '';
    const fullName = `${firstName} ${lastName}`.trim();

    const user = await this.usersService.upsertGoogleUser({
      email: payload.email,
      fullName,
      googleId: payload.sub ?? payload.email,
    });

    await this.activityService.logActivity(user.id, 'LOGIN', { method: 'google' });

    return this.buildAuthResponse(user);
  }

  /**
   * Initiate password reset flow.
   * Note: Currently returns a mock response for security.
   * 
   * @param email User's email address
   * @returns Message indicating status
   */
  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      return {
        message:
          'If an account exists for this email, password reset instructions will be sent.',
      };
    }

    return {
      message: 'Password reset instructions would be emailed in production.',
    };
  }

  /**
   * Helper to build the standardized AuthResponse.
   * Generates JWT token and sanitizes user object.
   */
  private async buildAuthResponse(user: UserEntity): Promise<AuthResponse> {
    const payload = {
      sub: user.id,
      email: user.email,
    };
    const accessToken = await this.jwtService.signAsync(payload);

    const { passwordHash, ...safeUser } = user;
    return {
      accessToken,
      user: safeUser,
    };
  }
}
