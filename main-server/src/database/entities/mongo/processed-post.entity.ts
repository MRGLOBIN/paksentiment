import { Column, Entity, ObjectId, ObjectIdColumn } from 'typeorm';

@Entity('processed_posts')
export class ProcessedPostEntity {
  @ObjectIdColumn()
  _id: ObjectId;

  @Column({ name: 'raw_post_source_id', nullable: true })
  rawPostSourceId?: string;

  @Column()
  platform: string;

  @Column({ name: 'clean_text' })
  cleanText: string;

  @Column({ name: 'translated_text', nullable: true })
  translatedText?: string;

  @Column({ nullable: true })
  language?: string;

  @Column({ nullable: true })
  sentiment?: string;

  @Column({ type: 'double', nullable: true })
  confidence?: number;

  @Column({ nullable: true })
  keywords?: string[];

  @Column({ name: 'processed_at', type: 'date' })
  processedAt: Date;

  @Column()
  metadata: Record<string, unknown>;
}

