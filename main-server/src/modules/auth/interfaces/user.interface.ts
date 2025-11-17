export type AuthProvider = 'local' | 'google';

export interface UserEntity {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  provider: AuthProvider;
  passwordHash?: string;
  googleId?: string;
  createdAt: Date;
}

