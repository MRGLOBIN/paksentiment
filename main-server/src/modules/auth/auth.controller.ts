import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiInternalServerErrorResponse,
} from '@nestjs/swagger';

import { AuthService, AuthResponse } from './auth.service';
import { RegisterUserDTO } from './dto/regiester-user.dto';
import { LoginWithEmailAndPasswordDTO } from './dto/login-user.dto';
import { ForgotPasswordDTO } from './dto/forgot-password.dto';
import { GoogleAuthDto } from './dto/google-auth.dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({
    summary: 'Register a new user',
    description: `
Create a new user account with email and password.

### Requirements:
- First name (3-50 characters)
- Last name (3-50 characters)
- Valid email address
- Password (8+ characters with alphabet, number, and special character)
- Password confirmation must match

### Response:
Returns a JWT access token and user information (excluding password hash).
    `,
  })
  @ApiBody({ type: RegisterUserDTO })
  @ApiResponse({
    status: 201,
    description: 'User successfully registered',
    schema: {
      example: {
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        user: {
          id: 1,
          email: 'user@example.com',
          fullName: 'John Doe',
          isEmailVerified: false,
          createdAt: '2024-01-01T00:00:00.000Z',
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid input or email already registered',
    schema: {
      example: {
        statusCode: 400,
        message: 'Email already registered',
        error: 'Bad Request',
      },
    },
  })
  @ApiInternalServerErrorResponse({
    description: 'Internal server error during registration',
  })
  register(@Body() registerDto: RegisterUserDTO): Promise<AuthResponse> {
    return this.authService.register(registerDto);
  }

  @Post('login-with-email-password')
  @ApiOperation({
    summary: 'Login with email and password',
    description: `
Authenticate a user with their email and password credentials.

### Requirements:
- Valid email address
- Password (8+ characters)

### Response:
Returns a JWT access token and user information for authenticated sessions.
    `,
  })
  @ApiBody({ type: LoginWithEmailAndPasswordDTO })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    schema: {
      example: {
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        user: {
          id: 1,
          email: 'user@example.com',
          fullName: 'John Doe',
          isEmailVerified: true,
          createdAt: '2024-01-01T00:00:00.000Z',
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid credentials',
    schema: {
      example: {
        statusCode: 401,
        message: 'Invalid email or password',
        error: 'Unauthorized',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid input format',
  })
  loginWithEmailPassword(
    @Body() loginDto: LoginWithEmailAndPasswordDTO,
  ): Promise<AuthResponse> {
    return this.authService.loginWithEmailAndPassword(loginDto);
  }

  @Post('google')
  @ApiOperation({
    summary: 'Login with Google OAuth',
    description: `
Authenticate or register a user using Google OAuth credentials.

### Requirements:
- Valid Google ID token

### Behavior:
- If user exists: Log them in
- If user is new: Create account automatically

### Response:
Returns a JWT access token and user information.
    `,
  })
  @ApiBody({ type: GoogleAuthDto })
  @ApiResponse({
    status: 200,
    description: 'Google authentication successful',
    schema: {
      example: {
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        user: {
          id: 1,
          email: 'user@gmail.com',
          fullName: 'John Doe',
          googleId: 'google_user_id_123',
          isEmailVerified: true,
          createdAt: '2024-01-01T00:00:00.000Z',
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid Google token',
    schema: {
      example: {
        statusCode: 401,
        message: 'Invalid Google token',
        error: 'Unauthorized',
      },
    },
  })
  @ApiInternalServerErrorResponse({
    description: 'Google OAuth verification failed',
  })
  loginWithGoogle(@Body() googleDto: GoogleAuthDto): Promise<AuthResponse> {
    return this.authService.loginWithGoogle(googleDto);
  }

  @Post('forgot-password')
  @ApiOperation({
    summary: 'Request password reset',
    description: `
Initiate a password reset process for a user account.

### Requirements:
- Valid registered email address

### Behavior:
- Generates a password reset token
- Sends reset email to the user

### Response:
Returns a confirmation message (does not reveal if email exists for security).
    `,
  })
  @ApiBody({ type: ForgotPasswordDTO })
  @ApiResponse({
    status: 200,
    description: 'Password reset email sent (if email exists)',
    schema: {
      example: {
        message:
          'If an account with that email exists, a password reset link has been sent.',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid email format',
  })
  forgotPassword(@Body() body: ForgotPasswordDTO) {
    return this.authService.forgotPassword(body.email);
  }
}
