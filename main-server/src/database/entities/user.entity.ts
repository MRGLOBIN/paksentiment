import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiKeyEntity } from './api-key.entity';
import { UserPreferenceEntity } from './user-preference.entity';

@Entity({ name: 'users' })
export class UserEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'full_name', type: 'varchar', length: 100 })
  fullName: string;

  @Column({ type: 'varchar', unique: true })
  email: string;

  @Column({ name: 'password_hash', type: 'varchar', nullable: true })
  passwordHash?: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'varchar', length: 20, default: 'local' })
  provider: 'local' | 'google';

  @Column({ name: 'google_id', type: 'varchar', nullable: true })
  googleId?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => UserPreferenceEntity, (pref) => pref.user)
  preferences: UserPreferenceEntity[];

  @OneToMany(() => ApiKeyEntity, (apiKey) => apiKey.user)
  apiKeys: ApiKeyEntity[];
}

