
import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import * as crypto from 'crypto';
import { AnalysisSessionEntity } from '../../../database/entities/mongo/analysis-session.entity';
import { PostStorageService } from '../post-storage.service';
import { AbstractDataProvider } from './abstract-data.provider';
import { TwitterRawDataQueryDto, TwitterSentimentQueryDto } from '../dto/twitter-raw-data-query.dto';
import { TwitterRawDataResponse, TwitterSentimentResponse } from '../interfaces/api-response.interface';

@Injectable()
export class TwitterProvider extends AbstractDataProvider {
    constructor(
        httpService: HttpService,
        postStorage: PostStorageService,
        @InjectRepository(AnalysisSessionEntity, 'mongo')
        sessionRepo: MongoRepository<AnalysisSessionEntity>,
    ) {
        super(httpService, postStorage, sessionRepo, TwitterProvider.name);
    }

    async fetch(query: TwitterRawDataQueryDto, userId?: number): Promise<TwitterRawDataResponse> {
        const maxResults = query.maxResults ?? query.max_results ?? 10;

        const response = await this.proxyRequest<TwitterRawDataResponse>(
            '/twitter/search',
            {
                params: {
                    query: query.query,
                    max_results: maxResults,
                },
            },
        );

        await this.storeRaw('twitter', response.tweets ?? []);

        if (userId) {
            const sessionId = crypto.randomUUID();
            response.sessionId = sessionId;
            await this.saveSession(sessionId, userId, query.query, 'twitter', response.tweets ?? []);
        }

        return response;
    }

    async fetchSentiment(query: TwitterSentimentQueryDto, userId?: number): Promise<TwitterSentimentResponse> {
        const maxResults = query.maxResults ?? query.max_results ?? 10;

        const params: Record<string, any> = {
            query: query.query,
            max_results: maxResults,
        };

        if (query.sentiments) {
            params.sentiments = query.sentiments;
        }

        if (query.customTags) {
            params.custom_sentiments = query.customTags;
        }

        const response = await this.proxyRequest<TwitterSentimentResponse>(
            '/twitter/sentiment',
            { params },
        );

        await this.storeRaw('twitter', response.tweets ?? []);
        await this.storeProcessed(
            'twitter',
            response.tweets ?? [],
            response.translations ?? [],
            response.sentiment ?? [],
        );

        if (userId) {
            const sessionId = crypto.randomUUID();
            response.sessionId = sessionId;
            await this.saveSession(sessionId, userId, query.query, 'twitter_sentiment', response.tweets ?? []);
        }

        return response;
    }
}
