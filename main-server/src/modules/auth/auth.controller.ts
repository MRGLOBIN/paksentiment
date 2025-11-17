import { Body, Controller, Post } from '@nestjs/common';

import { AuthService, AuthResponse } from './auth.service';
import { RegisterUserDTO } from './dto/regiester-user.dto';
import { LoginWithEmailAndPasswordDTO } from './dto/login-user.dto';
import { ForgotPasswordDTO } from './dto/forgot-password.dto';
import { GoogleAuthDto } from './dto/google-auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() registerDto: RegisterUserDTO): Promise<AuthResponse> {
    return this.authService.register(registerDto);
  }

  @Post('login-with-email-password')
  loginWithEmailPassword(
    @Body() loginDto: LoginWithEmailAndPasswordDTO,
  ): Promise<AuthResponse> {
    return this.authService.loginWithEmailAndPassword(loginDto);
  }

  @Post('google')
  loginWithGoogle(@Body() googleDto: GoogleAuthDto): Promise<AuthResponse> {
    return this.authService.loginWithGoogle(googleDto);
  }

  @Post('forgot-password')
  forgotPassword(@Body() body: ForgotPasswordDTO) {
    return this.authService.forgotPassword(body.email);
  }
}
