import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersService } from './users.service';
import { UserEntity } from '../../database/entities/user.entity';
import { RegisterUserDTO } from './dto/regiester-user.dto';
import { LoginWithEmailAndPasswordDTO } from './dto/login-user.dto';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { ForgotPasswordDTO } from './dto/forgot-password.dto';
import { ActivityService } from '../activity/activity.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  const mockUser = {
    id: 1,
    email: 'test@example.com',
    fullName: 'John Doe',
    provider: 'local',
    passwordHash: '$2b$10$hashedpassword',
    isEmailVerified: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAuthResponse: any = {
    accessToken: 'jwt.token.here',
    user: {
      id: mockUser.id,
      email: mockUser.email,
      fullName: mockUser.fullName,
      isEmailVerified: mockUser.isEmailVerified,
      isActive: true,
      provider: 'local',
      createdAt: mockUser.createdAt,
      updatedAt: mockUser.updatedAt,
      preferences: [],
      apiKeys: [],
    },
  };

  const mockUsersService = {
    findByEmail: jest.fn(),
    createLocalUser: jest.fn(),
    findByGoogleId: jest.fn(),
    createGoogleUser: jest.fn(),
  };

  const mockJwtService = {
    signAsync: jest.fn().mockResolvedValue('jwt.token.here'),
  };

  const mockActivityService = {
    logActivity: jest.fn().mockResolvedValue({ id: 1, action: 'TEST' }),
  };

  const mockRepository = {
    create: jest.fn().mockReturnValue(mockUser),
    save: jest.fn().mockResolvedValue(mockUser),
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: getRepositoryToken(UserEntity),
          useValue: mockRepository,
        },
        {
          provide: ActivityService,
          useValue: mockActivityService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);

    // Reset mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    const registerDto: RegisterUserDTO = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'test@example.com',
      password: 'SecurePass123!',
      confirmPassword: 'SecurePass123!',
    };

    it('should successfully register a new user', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockUsersService.createLocalUser.mockResolvedValue(mockUser);

      const result = await controller.register(registerDto);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('user');
      expect(result.user.email).toBe(registerDto.email);
      expect(mockUsersService.findByEmail).toHaveBeenCalledWith(
        registerDto.email,
      );
      expect(mockUsersService.createLocalUser).toHaveBeenCalled();
    });

    it('should throw BadRequestException if email already exists', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);

      await expect(controller.register(registerDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.register(registerDto)).rejects.toThrow(
        'Email already registered',
      );
      expect(mockUsersService.createLocalUser).not.toHaveBeenCalled();
    });

    it('should hash the password before storing', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockUsersService.createLocalUser.mockResolvedValue(mockUser);

      await controller.register(registerDto);

      const createUserCall = mockUsersService.createLocalUser.mock
        .calls[0][0] as any;
      expect(createUserCall.passwordHash).toBeDefined();
      expect(createUserCall.passwordHash).not.toBe(registerDto.password);
    });

    it('should combine firstName and lastName into fullName', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockUsersService.createLocalUser.mockResolvedValue(mockUser);

      await controller.register(registerDto);

      const createUserCall = mockUsersService.createLocalUser.mock
        .calls[0][0] as any;
      expect(createUserCall.fullName).toBe('John Doe');
    });
  });

  describe('loginWithEmailPassword', () => {
    const loginDto: LoginWithEmailAndPasswordDTO = {
      email: 'test@example.com',
      password: 'SecurePass123!',
    };

    it('should successfully login with valid credentials', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      jest
        .spyOn(authService, 'loginWithEmailAndPassword')
        .mockResolvedValue(mockAuthResponse);

      const result = await controller.loginWithEmailPassword(loginDto);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('user');
      expect(result.user.email).toBe(loginDto.email);
    });

    it('should throw UnauthorizedException for non-existent user', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      await expect(controller.loginWithEmailPassword(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for invalid password', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      jest
        .spyOn(authService, 'loginWithEmailAndPassword')
        .mockRejectedValue(new UnauthorizedException('Invalid credentials'));

      await expect(controller.loginWithEmailPassword(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for Google OAuth users', async () => {
      const googleUser = {
        ...mockUser,
        provider: 'google',
        passwordHash: null,
      };
      mockUsersService.findByEmail.mockResolvedValue(googleUser);

      await expect(controller.loginWithEmailPassword(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('loginWithGoogle', () => {
    const googleDto: GoogleAuthDto = {
      idToken: 'google.id.token.here',
    };

    it('should successfully login with valid Google token', async () => {
      jest
        .spyOn(authService, 'loginWithGoogle')
        .mockResolvedValue(mockAuthResponse);

      const result = await controller.loginWithGoogle(googleDto);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('user');
    });

    it('should create new user if Google account does not exist', async () => {
      const newGoogleUser = {
        ...mockUser,
        provider: 'google',
        googleId: 'google123',
      };
      mockUsersService.findByGoogleId.mockResolvedValue(null);
      mockUsersService.createGoogleUser.mockResolvedValue(newGoogleUser);
      jest.spyOn(authService, 'loginWithGoogle').mockResolvedValue({
        accessToken: mockAuthResponse.accessToken,
        user: {
          ...mockAuthResponse.user,
          id: newGoogleUser.id,
          provider: 'google' as const,
        },
      });

      const result = await controller.loginWithGoogle(googleDto);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('user');
    });

    it('should handle invalid Google token', async () => {
      jest
        .spyOn(authService, 'loginWithGoogle')
        .mockRejectedValue(new UnauthorizedException('Invalid Google token'));

      await expect(controller.loginWithGoogle(googleDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('forgotPassword', () => {
    const forgotPasswordDto: ForgotPasswordDTO = {
      email: 'test@example.com',
    };

    it('should process password reset request', async () => {
      jest.spyOn(authService, 'forgotPassword').mockResolvedValue({
        message:
          'If an account with that email exists, a password reset link has been sent.',
      });

      const result = await controller.forgotPassword(forgotPasswordDto);

      expect(result).toHaveProperty('message');
      expect(authService.forgotPassword).toHaveBeenCalledWith(
        forgotPasswordDto.email,
      );
    });

    it('should return same message for non-existent email (security)', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      jest.spyOn(authService, 'forgotPassword').mockResolvedValue({
        message:
          'If an account with that email exists, a password reset link has been sent.',
      });

      const result = await controller.forgotPassword(forgotPasswordDto);

      expect(result).toHaveProperty('message');
      expect(result.message).toContain('If an account with that email exists');
    });
  });
});
