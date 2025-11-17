import { Column, Entity, ObjectId, ObjectIdColumn } from 'typeorm';

@Entity('analytics_cache')
export class AnalyticsCacheEntity {
  @ObjectIdColumn()
  _id: ObjectId;

  @Column({ type: 'date' })
  date: Date;

  @Column({ name: 'total_posts', type: 'int', default: 0 })
  totalPosts: number;

  @Column({ type: 'int', default: 0 })
  positive: number;

  @Column({ type: 'int', default: 0 })
  negative: number;

  @Column({ type: 'int', default: 0 })
  neutral: number;

  @Column('simple-array', { name: 'top_keywords', nullable: true })
  topKeywords?: string[];

  @Column({ name: 'generated_at', type: 'date' })
  generatedAt: Date;
}

