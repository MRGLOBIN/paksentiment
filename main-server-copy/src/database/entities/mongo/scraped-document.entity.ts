import { Column, Entity, ObjectId, ObjectIdColumn } from 'typeorm';

@Entity('scraped_documents')
export class ScrapedDocumentEntity {
    @ObjectIdColumn()
    _id: ObjectId;

    @Column({ nullable: true })
    jobId?: string;

    @Column()
    url: string;

    @Column()
    domain: string;

    @Column()
    sourceEngine: string; // e.g., 'colly', 'scrapling', 'reddit', 'twitter', 'youtube'

    @Column()
    contentType: string; // e.g., 'article', 'social_post', 'video'

    @Column({ nullable: true })
    title?: string;

    @Column()
    cleanText: string;

    @Column({ type: 'json' })
    metadata: Record<string, unknown>;

    @Column({ type: 'json', nullable: true })
    sentiment?: {
        label: string;      // 'positive', 'negative', 'neutral'
        score: number;      // confidence score
        analyzedAt: Date;
        summary?: string;
        chunkResults?: any[];
    };

    @Column({ type: 'date' })
    createdAt: Date;

    @Column({ type: 'date' })
    updatedAt: Date;
}
