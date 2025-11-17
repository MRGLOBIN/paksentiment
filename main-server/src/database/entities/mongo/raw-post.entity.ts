import { Column, Entity, ObjectId, ObjectIdColumn } from 'typeorm';

@Entity('raw_posts')
export class RawPostEntity {
  @ObjectIdColumn()
  _id: ObjectId;

  @Column()
  platform: string;

  @Column({ name: 'source_id', nullable: true })
  sourceId?: string;

  @Column()
  content: string;

  @Column({ nullable: true })
  author?: string;

  @Column({ type: 'date' })
  timestamp: Date;

  @Column()
  metadata: Record<string, unknown>;

  @Column({ name: 'fetched_at', type: 'date' })
  fetchedAt: Date;
}

