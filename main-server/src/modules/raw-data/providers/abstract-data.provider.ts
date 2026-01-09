
import { HttpService } from '@nestjs/axios';
import { InternalServerErrorException, Logger } from '@nestjs/common';
import { AxiosRequestConfig } from 'axios';
import { firstValueFrom } from 'rxjs';
import { MongoRepository } from 'typeorm';
import * as crypto from 'crypto';
import { AnalysisSessionEntity } from '../../../database/entities/mongo/analysis-session.entity';
import { PostStorageService } from '../post-storage.service';

/**
 * Abstract Base Class for Data Providers.
 * Encapsulates common logic for:
 * - Proxying requests to the Data Gateway
 * - Storing raw/processed data
 * - Saving user search sessions
 */
export abstract class AbstractDataProvider {
    protected readonly logger: Logger;
    protected readonly fastApiBaseUrl: string;

    constructor(
        protected readonly httpService: HttpService,
        protected readonly postStorage: PostStorageService,
        protected readonly sessionRepo: MongoRepository<AnalysisSessionEntity>,
        providerName: string
    ) {
        this.logger = new Logger(providerName);
        this.fastApiBaseUrl = process.env.FAST_API_BASE_URL ?? 'http://localhost:8000';
    }

    /**
     * Fetch raw data from the provider.
     */
    abstract fetch(query: any, userId?: number): Promise<any>;

    /**
     * Fetch sentiment-analyzed data from the provider.
     */
    abstract fetchSentiment(query: any, userId?: number): Promise<any>;

    /**
     * Proxy a request to the FastAPI Gateway.
     */
    protected async proxyRequest<T>(
        path: string,
        config: AxiosRequestConfig,
    ): Promise<T> {
        try {
            const url = `${this.fastApiBaseUrl}${path}`;
            const method = config.method || 'GET';
            this.logger.log(`Calling FastAPI [${method}]: ${url}`);

            const response = await firstValueFrom(
                this.httpService.request({
                    url,
                    ...config,
                })
            );

            return response.data as T;
        } catch (error) {
            this.logger.error(`Error details: ${error.message}`, error.response?.data);
            throw new InternalServerErrorException(
                'Failed to fetch data from FastAPI gateway',
            );
        }
    }

    /**
     * Helper to save a session for a user.
     */
    protected async saveSession(
        sessionId: string,
        userId: number,
        query: string,
        source: string,
        rawPosts: any[],
    ) {
        if (!userId) return;

        // Robust ID extraction logic matching PostStorage
        const postIds = rawPosts.map((post) => {
            return (
                post.post_id ??
                post.id ??
                post.tweet_id ??
                post.comment_id ??
                post.url ??
                post.video_id ??
                post.comment_id ??
                ''
            ).toString();
        }).filter(id => id && id !== 'undefined');

        const session = this.sessionRepo.create({
            sessionId,
            userId,
            query,
            source,
            postIds,
            createdAt: new Date(),
        });

        await this.sessionRepo.save(session);
        this.logger.log(`Saved session ${sessionId} with ${postIds.length} posts for user ${userId}`);
    }

    /**
     * Helper to store raw posts via PostStorageService.
     */
    protected async storeRaw(platform: string, posts: any[]) {
        await this.postStorage.storeRawPosts(platform, posts);
    }

    /**
     * Helper to store processed posts via PostStorageService.
     */
    protected async storeProcessed(
        platform: string,
        posts: any[],
        translations: any[],
        sentiments: any[],
    ) {
        await this.postStorage.storeProcessedPosts(platform, posts, translations, sentiments);
    }
}
