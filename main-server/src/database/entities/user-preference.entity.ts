import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserEntity } from './user.entity';

@Entity({ name: 'user_preferences' })
export class UserPreferenceEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id', type: 'integer' })
  userId: number;

  @ManyToOne(() => UserEntity, (user) => user.preferences, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @Column({ type: 'varchar', length: 20, default: 'light' })
  theme: string;

  @Column({ name: 'default_platform', type: 'varchar', length: 50, nullable: true })
  defaultPlatform: string | null;

  @Column({ name: 'default_language', type: 'varchar', length: 10, nullable: true })
  defaultLanguage: string | null;

  @Column({ name: 'items_per_page', type: 'integer', default: 20 })
  itemsPerPage: number;
}

