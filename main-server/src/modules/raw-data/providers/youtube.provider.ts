
import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import * as crypto from 'crypto';
import { AnalysisSessionEntity } from '../../../database/entities/mongo/analysis-session.entity';
import { PostStorageService } from '../post-storage.service';
import { AbstractDataProvider } from './abstract-data.provider';

@Injectable()
export class YouTubeProvider extends AbstractDataProvider {
    constructor(
        httpService: HttpService,
        postStorage: PostStorageService,
        @InjectRepository(AnalysisSessionEntity, 'mongo')
        sessionRepo: MongoRepository<AnalysisSessionEntity>,
    ) {
        super(httpService, postStorage, sessionRepo, YouTubeProvider.name);
    }

    async fetch(query: any, userId?: number): Promise<any> {
        const response = await this.proxyRequest<any>('/youtube/search', {
            params: query
        });
        await this.storeRaw('youtube', response.videos ?? []);

        if (userId) {
            const sessionId = crypto.randomUUID();
            response.sessionId = sessionId;
            await this.saveSession(sessionId, userId, query.query, 'youtube', response.videos ?? []);
        }

        return response;
    }

    async fetchComments(query: any): Promise<any> {
        const response = await this.proxyRequest<any>('/youtube/comments', {
            params: query
        });
        await this.storeRaw('youtube_comments', response.comments ?? []);
        return response;
    }

    async fetchTranscript(query: any): Promise<any> {
        return this.proxyRequest<any>('/youtube/transcript', {
            params: query
        });
    }

    // Unused but required by abstract class if we want full consistency, 
    // or we make the abstract method optional/throws. 
    // For now, simple implementation or throw unimplemented.
    async fetchSentiment(query: any, userId?: number): Promise<any> {
        throw new Error('Method not implemented.');
    }
}
