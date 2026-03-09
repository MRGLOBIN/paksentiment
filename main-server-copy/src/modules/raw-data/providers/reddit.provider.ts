
import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import * as crypto from 'crypto';
import { AnalysisSessionEntity } from '../../../database/entities/mongo/analysis-session.entity';
import { PostStorageService } from '../post-storage.service';
import { AbstractDataProvider } from './abstract-data.provider';
import { RedditRawDataQueryDto, RedditSentimentQueryDto } from '../dto/reddit-raw-data-query.dto';
import { RedditRawDataResponse, RedditSentimentResponse } from '../interfaces/api-response.interface';

@Injectable()
export class RedditProvider extends AbstractDataProvider {
    constructor(
        httpService: HttpService,
        postStorage: PostStorageService,
        @InjectRepository(AnalysisSessionEntity, 'mongo')
        sessionRepo: MongoRepository<AnalysisSessionEntity>,
    ) {
        super(httpService, postStorage, sessionRepo, RedditProvider.name);
    }

    async fetch(query: RedditRawDataQueryDto, userId?: number): Promise<RedditRawDataResponse> {
        this.logger.log(`Query: ${JSON.stringify(query)}`);

        const response = await this.proxyRequest<RedditRawDataResponse>(
            '/reddit/search',
            {
                params: {
                    subreddit: query.subreddit,
                    query: query.query,
                    limit: query.limit,
                },
            },
        );

        await this.storeRaw('reddit', response.posts ?? [], 'social_post');

        if (userId) {
            const sessionId = crypto.randomUUID();
            response.sessionId = sessionId;
            await this.saveSession(sessionId, userId, query.query, 'reddit', response.posts ?? []);
        }

        return response;
    }

    async fetchSentiment(query: RedditSentimentQueryDto, userId?: number): Promise<RedditSentimentResponse> {
        const params: Record<string, any> = {
            subreddit: query.subreddit,
            query: query.query,
            limit: query.limit,
        };

        if (query.sentiments) {
            params.sentiments = query.sentiments;
        }

        if (query.customTags) {
            params.custom_sentiments = query.customTags;
        }

        const response = await this.proxyRequest<RedditSentimentResponse>(
            '/reddit/sentiment',
            { params },
        );

        await this.storeRaw('reddit', response.posts ?? [], 'social_post');
        await this.storeProcessed(
            'reddit',
            response.posts ?? [],
            response.translations ?? [],
            response.sentiment ?? [],
        );

        if (userId) {
            const sessionId = crypto.randomUUID();
            response.sessionId = sessionId;
            await this.saveSession(sessionId, userId, query.query, 'reddit_sentiment', response.posts ?? []);
        }

        return response;
    }
}
