import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
} from 'typeorm';
import { UserEntity } from './user.entity';

@Entity({ name: 'user_activities' })
export class UserActivityEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'user_id' })
    userId: number;

    @Column({ type: 'varchar', length: 50 })
    action: string; // 'LOGIN', 'SEARCH_REDDIT', 'PLAN_QUERY', etc.

    @Column({ type: 'jsonb', nullable: true })
    details: any; // Store query params, summary of results, etc.

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @ManyToOne(() => UserEntity, (user) => user.id, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: UserEntity;
}
