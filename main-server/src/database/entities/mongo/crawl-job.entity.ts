import { Column, Entity, ObjectId, ObjectIdColumn } from 'typeorm';

/**
 * CrawlJobEntity tracks crawl/scrape jobs executed by the Go Colly sidecar.
 * Stored in MongoDB's `crawl_jobs` collection.
 */
@Entity('crawl_jobs')
export class CrawlJobEntity {
  @ObjectIdColumn()
  _id: ObjectId;

  @Column()
  sessionId: string;

  @Column()
  url: string;

  @Column()
  status: string; // 'pending' | 'running' | 'completed' | 'failed'

  @Column()
  engine: string; // 'colly' | 'scrapling'

  @Column({ nullable: true })
  pagesScraped?: number;

  @Column({ nullable: true })
  results?: CrawlResultData[];

  @Column({ type: 'date' })
  createdAt: Date;

  @Column({ type: 'date', nullable: true })
  completedAt?: Date;
}

/**
 * Shape of individual page results within a crawl job.
 */
export interface CrawlResultData {
  url: string;
  status: number;
  title: string;
  text: string;
  links: string[];
  extracted?: Record<string, string>;
  cached_hit: boolean;
  scraped_at: string;
}
