import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersService } from './users.service';
import { UserEntity } from '../../database/entities/user.entity';
import { ActivityModule } from '../activity/activity.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') ?? 'development-secret',
        signOptions: { expiresIn: '1h' },
      }),
      inject: [ConfigService],
    }),
    forwardRef(() => ActivityModule),
  ],
  controllers: [AuthController],
  providers: [AuthService, UsersService],
  exports: [AuthService, JwtModule],
})
export class AuthModule { }
