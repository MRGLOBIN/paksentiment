import { Injectable } from '@nestjs/common';

import { UserEntity } from './interfaces/user.interface';

interface CreateLocalUserPayload {
  firstName: string;
  lastName: string;
  email: string;
  passwordHash: string;
}

interface UpsertGoogleUserPayload {
  firstName: string;
  lastName: string;
  email: string;
  googleId: string;
}

@Injectable()
export class UsersService {
  private users: UserEntity[] = [];
  private idCounter = 1;

  async createLocalUser(payload: CreateLocalUserPayload): Promise<UserEntity> {
    const newUser: UserEntity = {
      id: this.idCounter++,
      firstName: payload.firstName,
      lastName: payload.lastName,
      email: payload.email.toLowerCase(),
      provider: 'local',
      passwordHash: payload.passwordHash,
      createdAt: new Date(),
    };
    this.users.push(newUser);
    return newUser;
  }

  async upsertGoogleUser(
    payload: UpsertGoogleUserPayload,
  ): Promise<UserEntity> {
    const existing = await this.findByEmail(payload.email);
    if (existing) {
      existing.googleId = payload.googleId;
      existing.provider = 'google';
      existing.firstName = payload.firstName;
      existing.lastName = payload.lastName;
      return existing;
    }

    const newUser: UserEntity = {
      id: this.idCounter++,
      firstName: payload.firstName,
      lastName: payload.lastName,
      email: payload.email.toLowerCase(),
      provider: 'google',
      googleId: payload.googleId,
      createdAt: new Date(),
    };
    this.users.push(newUser);
    return newUser;
  }

  async findByEmail(email: string): Promise<UserEntity | undefined> {
    return this.users.find(
      (user) => user.email.toLowerCase() === email.toLowerCase(),
    );
  }
}

