import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { LoginWithEmailAndPasswordDTO } from './dto/login-user.dto';

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  async loginWithEmailAndPassword(
    loginWithEmailAndPasswordDTO: LoginWithEmailAndPasswordDTO,
  ) {
    const { email, password } = loginWithEmailAndPasswordDTO;

    const user = await this.findUserByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { sub: user.id, email: user.email };
    const token = await this.jwtService.signAsync(payload);

    return {
      access_token: token,
      user: {
        id: user.id,
        email: user.email,
        name: user.email,
      },
    };
  }

  // HACK:
  // creating dimmy user by now
  private async findUserByEmail(email: string) {
    if (email == 'test@example.com') {
      return {
        id: 1,
        email,
        name: 'Test User',
        password: await bcrypt.hash('password123', 10),
      };
    }
    return null;
  }
}
