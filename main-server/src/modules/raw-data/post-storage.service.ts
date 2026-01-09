import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';

import { RawPostEntity } from '../../database/entities/mongo/raw-post.entity';
import { ProcessedPostEntity } from '../../database/entities/mongo/processed-post.entity';

@Injectable()
/**
 * Service to persist Raw and Processed posts in MongoDB.
 * Handles data mapping, deduplication (via upsert logic mostly handled by repo or unique index if set), and retrieval.
 */
export class PostStorageService {
  constructor(
    @InjectRepository(RawPostEntity, 'mongo')
    private readonly rawPosts: MongoRepository<RawPostEntity>,
    @InjectRepository(ProcessedPostEntity, 'mongo')
    private readonly processedPosts: MongoRepository<ProcessedPostEntity>,
  ) { }

  /**
   * Save raw data from social platforms.
   * 
   * @param platform Source platform name
   * @param posts Array of raw post objects
   */
  async storeRawPosts(platform: string, posts: any[]) {
    if (!posts?.length) {
      return;
    }

    const docs: Omit<RawPostEntity, '_id'>[] = posts.map((post) => {
      const content = this.composeContent(post);
      const timestamp = this.extractTimestamp(post);
      return {
        platform,
        sourceId: this.extractSourceId(post),
        content,
        author: post.author_name ?? post.author ?? null,
        timestamp,
        metadata: post,
        fetchedAt: new Date(),
      };
    });

    await this.rawPosts.save(docs);
  }

  /**
   * Save processed data (Sentiment, Translation) linked to raw posts.
   * 
   * @param platform Source platform
   * @param posts Original post objects
   * @param translations Translation results
   * @param sentiments Sentiment analysis results
   */
  async storeProcessedPosts(
    platform: string,
    posts: any[],
    translations: any[],
    sentiments: any[],
  ) {
    if (!posts?.length || !sentiments?.length) {
      return;
    }

    const translationsMap = new Map(
      translations?.map((item: any) => [item.id, item]) ?? [],
    );
    const sentimentMap = new Map(
      sentiments.map((item: any) => [item.id, item]),
    );

    const docs: Omit<ProcessedPostEntity, '_id'>[] = [];

    for (const post of posts) {
      const sourceId = this.extractSourceId(post);
      const translation = translationsMap.get(sourceId);
      const sentiment = sentimentMap.get(sourceId);

      const cleanText = this.composeContent(post);
      const translatedText = translation?.translatedText ?? null;
      const language = translation?.language ?? 'unknown';

      docs.push({
        platform,
        rawPostSourceId: sourceId,
        cleanText,
        translatedText,
        language,
        sentiment: sentiment?.sentiment ?? null,
        confidence: sentiment?.confidence ?? null,
        keywords: [],
        processedAt: new Date(),
        metadata: {
          summary: sentiment?.summary,
          chunk_results: sentiment?.chunk_results,
        },
      });
    }

    await this.processedPosts.save(docs);
  }

  private composeContent(post: any): string {
    const title = post.title ?? '';
    const text = post.text ?? post.content ?? post.description ?? ''; // added description for youtube
    return [title, text].filter(Boolean).join('\n').trim();
  }

  private extractTimestamp(post: any): Date {
    if (post.created_utc) {
      const value =
        typeof post.created_utc === 'number'
          ? post.created_utc * 1000
          : Number(post.created_utc);
      if (!Number.isNaN(value)) {
        return new Date(value);
      }
    }

    if (post.timestamp) {
      const date = new Date(post.timestamp);
      if (!Number.isNaN(date.getTime())) {
        return date;
      }
    }

    // YouTube / CommonCrawl
    if (post.published_at || post.date) {
      const dateStr = post.published_at ?? post.date;
      const date = new Date(dateStr);
      if (!Number.isNaN(date.getTime())) {
        return date;
      }
    }

    return new Date();
  }

  private extractSourceId(post: any): string {
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
  }
  async getProcessedPosts(query: any) {
    const where: any = {};

    if (query.platform) {
      where.platform = query.platform;
    }

    if (query.sentiment) {
      where.sentiment = query.sentiment;
    }

    if (query.startDate || query.endDate) {
      where.processedAt = {};
      if (query.startDate) where.processedAt.$gte = new Date(query.startDate);
      if (query.endDate) where.processedAt.$lte = new Date(query.endDate);
    }

    if (query.search) {
      where.cleanText = { $regex: new RegExp(query.search, 'i') };
    }

    const [posts, count] = await this.processedPosts.findAndCount({
      where,
      take: query.limit || 100,
      order: { processedAt: 'DESC' },
    });

    return { posts, count };
  }

  async getProcessedPostsBySourceIds(sourceIds: string[]) {
    if (!sourceIds.length) return { posts: [], count: 0 };

    // We use Mongo 'in' operator
    const posts = await this.processedPosts.find({
      where: {
        rawPostSourceId: { $in: sourceIds }
      }
    });

    // Also count?
    const count = posts.length;
    return { posts, count };
  }

  async getRawPostsBySourceIds(sourceIds: string[]) {
    if (!sourceIds.length) return { posts: [], count: 0 };

    const posts = await this.rawPosts.find({
      where: {
        sourceId: { $in: sourceIds }
      }
    });

    return { posts, count: posts.length };
  }
}

