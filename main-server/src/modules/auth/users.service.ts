import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { UserEntity } from '../../database/entities/user.entity';

interface CreateLocalUserPayload {
  fullName: string;
  email: string;
  passwordHash: string;
}

interface UpsertGoogleUserPayload {
  fullName: string;
  email: string;
  googleId: string;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  async createLocalUser(payload: CreateLocalUserPayload): Promise<UserEntity> {
    const user = this.userRepository.create({
      fullName: payload.fullName,
      email: payload.email.toLowerCase(),
      provider: 'local',
      passwordHash: payload.passwordHash,
      isActive: true,
    });
    return this.userRepository.save(user);
  }

  async upsertGoogleUser(
    payload: UpsertGoogleUserPayload,
  ): Promise<UserEntity> {
    let user = await this.findByEmail(payload.email);
    if (user) {
      user.fullName = payload.fullName;
      user.googleId = payload.googleId;
      user.provider = 'google';
      return this.userRepository.save(user);
    }

    user = this.userRepository.create({
      fullName: payload.fullName,
      email: payload.email.toLowerCase(),
      provider: 'google',
      googleId: payload.googleId,
      isActive: true,
    });

    return this.userRepository.save(user);
  }

  async findByEmail(email: string): Promise<UserEntity | undefined> {
    const user = await this.userRepository.findOne({
      where: { email: email.toLowerCase() },
    });
    return user ?? undefined;
  }
}

