import { Controller, Get, Post } from '@nestjs/common';

@Controller('auth')
export class AuthController {
  @Post('login-with-email-password')
  loginWithEmailAndPassword(): string {
    return 'h1';
  }

  @Post('forgot-password')
  forgotPassword(): string {
    return 'forgot password';
  }
}
