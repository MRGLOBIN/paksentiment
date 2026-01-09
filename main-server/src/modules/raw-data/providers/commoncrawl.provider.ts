
import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import * as crypto from 'crypto';
import { AnalysisSessionEntity } from '../../../database/entities/mongo/analysis-session.entity';
import { PostStorageService } from '../post-storage.service';
import { AbstractDataProvider } from './abstract-data.provider';

@Injectable()
export class CommonCrawlProvider extends AbstractDataProvider {
    constructor(
        httpService: HttpService,
        postStorage: PostStorageService,
        @InjectRepository(AnalysisSessionEntity, 'mongo')
        sessionRepo: MongoRepository<AnalysisSessionEntity>,
    ) {
        super(httpService, postStorage, sessionRepo, CommonCrawlProvider.name);
    }

    async fetch(query: any, userId?: number): Promise<any> {
        // CommonCrawl usually fetches sentiment directly in this system
        return this.fetchSentiment(query, userId);
    }

    async fetchSentiment(query: any, userId?: number): Promise<any> {
        const response = await this.proxyRequest<any>('/commoncrawl/sentiment', {
            params: query
        });

        // POst-processing
        if (response.records) {
            response.records = response.records.map((record: any) => {
                const url = record.url;
                let domain = 'CommonCrawl';
                try {
                    domain = new URL(url).hostname;
                } catch (e) { }

                return {
                    ...record,
                    id: url,
                    author: domain
                };
            });
        }

        await this.storeRaw('commoncrawl', response.records ?? []);
        await this.storeProcessed(
            'commoncrawl',
            response.records ?? [],
            [],
            response.sentiment ?? []
        );

        if (userId) {
            const sessionId = crypto.randomUUID();
            response.sessionId = sessionId;
            await this.saveSession(sessionId, userId, query.domain, 'commoncrawl', response.records ?? []);
        }

        return response;
    }
}
