import { Column, Entity, ObjectId, ObjectIdColumn } from 'typeorm';

@Entity('system_logs')
export class SystemLogEntity {
  @ObjectIdColumn()
  _id: ObjectId;

  @Column()
  level: string;

  @Column()
  message: string;

  @Column({ type: 'date' })
  timestamp: Date;

  @Column()
  component: string;
}

