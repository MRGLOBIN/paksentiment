import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'system_configs' })
export class SystemConfigEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'config_key', type: 'varchar', unique: true, length: 100 })
  configKey: string;

  @Column({ name: 'config_value', type: 'text' })
  configValue: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

