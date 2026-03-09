import { Column, Entity, ObjectId, ObjectIdColumn } from 'typeorm';

@Entity('analysis_sessions')
export class AnalysisSessionEntity {
    @ObjectIdColumn()
    _id: ObjectId;

    @Column()
    sessionId: string; // UUID

    @Column()
    userId: number; // Linked to Postgres User ID

    @Column()
    query: string;

    @Column()
    source: string;

    @Column()
    postIds: string[]; // List of RawPost _ids (as strings)

    @Column({ type: 'date' })
    createdAt: Date;
}
