import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { UserEntity } from '../../database/entities/user.entity';
import { IdentityEntity } from '../../database/entities/identity.entity';

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
    @InjectRepository(IdentityEntity)
    private readonly identityRepository: Repository<IdentityEntity>,
  ) { }

  async createLocalUser(payload: CreateLocalUserPayload): Promise<UserEntity> {
    const user = this.userRepository.create({
      fullName: payload.fullName,
      email: payload.email.toLowerCase(),
      passwordHash: payload.passwordHash,
      isActive: true,
    });
    const savedUser = await this.userRepository.save(user);

    const identity = this.identityRepository.create({
      provider: 'local',
      userId: savedUser.id,
    });
    await this.identityRepository.save(identity);

    return savedUser;
  }

  async upsertGoogleUser(
    payload: UpsertGoogleUserPayload,
  ): Promise<UserEntity> {
    let user = await this.findByEmail(payload.email);
    if (!user) {
      user = this.userRepository.create({
        fullName: payload.fullName,
        email: payload.email.toLowerCase(),
        isActive: true,
      });
      user = await this.userRepository.save(user);
    } else {
      user.fullName = payload.fullName;
      user = await this.userRepository.save(user);
    }

    let identity = await this.identityRepository.findOne({
      where: { provider: 'google', userId: user.id }
    });

    if (!identity) {
      identity = this.identityRepository.create({
        provider: 'google',
        providerId: payload.googleId,
        userId: user.id,
      });
      await this.identityRepository.save(identity);
    } else if (identity.providerId !== payload.googleId) {
      identity.providerId = payload.googleId;
      await this.identityRepository.save(identity);
    }

    return user;
  }

  async findByEmail(email: string): Promise<UserEntity | undefined> {
    const user = await this.userRepository.findOne({
      where: { email: email.toLowerCase() },
    });
    return user ?? undefined;
  }

  async updateSubscriptionTier(
    userId: number,
    newTier: 'free' | 'premium' | 'super_premium',
  ): Promise<UserEntity> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new Error('User not found');
    }
    user.subscriptionTier = newTier;
    return this.userRepository.save(user);
  }
}

