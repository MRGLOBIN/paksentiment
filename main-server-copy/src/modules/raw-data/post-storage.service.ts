import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';

import { ScrapedDocumentEntity } from '../../database/entities/mongo/scraped-document.entity';

@Injectable()
/**
 * Service to persist scraped data in MongoDB.
 * Handles unified insertion and updation of documents (raw and analyzed sentiment).
 */
export class PostStorageService {
  constructor(
    @InjectRepository(ScrapedDocumentEntity, 'mongo')
    private readonly documentsRepo: MongoRepository<ScrapedDocumentEntity>,
  ) { }

  async storeRawPosts(platform: string, posts: any[]) {
    if (!posts?.length) {
      return;
    }

    for (const post of posts) {
      const sourceId = this.extractSourceId(post);
      const content = this.composeContent(post);
      const timestamp = this.extractTimestamp(post);

      const doc = {
        url: post.url || `https://${platform}.com/${sourceId}`,
        domain: platform, // Extracted or generic
        sourceEngine: platform, // Reddit, Twitter, Scrapling, etc.
        contentType: 'social_post', // Defaulting for simple map, updated later
        title: post.title || null,
        cleanText: content,
        createdAt: timestamp,
        updatedAt: new Date(),
        metadata: {
          sourceId: sourceId,
          author: post.author_name ?? post.author ?? null,
          ...post
        }
      };

      await this.documentsRepo.updateOne(
        { "metadata.sourceId": sourceId, sourceEngine: platform },
        { $set: doc },
        { upsert: true }
      );
    }
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

    for (const post of posts) {
      const sourceId = this.extractSourceId(post);
      const translation = translationsMap.get(sourceId);
      const sentiment = sentimentMap.get(sourceId);

      // Only update if we at least have sentiment or translation
      if (!sentiment && !translation) continue;

      const updatePayload: any = {
        updatedAt: new Date()
      };

      if (translation) {
        updatePayload['metadata.translatedText'] = translation.translatedText;
        updatePayload['metadata.language'] = translation.language;
      }

      if (sentiment) {
        updatePayload.sentiment = {
          label: sentiment.sentiment,
          score: sentiment.confidence ?? 0,
          analyzedAt: new Date(),
          summary: sentiment.summary,
          chunkResults: sentiment.chunk_results
        };
      }

      await this.documentsRepo.updateOne(
        { "metadata.sourceId": sourceId, sourceEngine: platform },
        { $set: updatePayload },
        { upsert: true }
      );
    }
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
      where.sourceEngine = query.platform;
    }

    if (query.sentiment) {
      where['sentiment.label'] = query.sentiment;
    }

    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) where.createdAt.$gte = new Date(query.startDate);
      if (query.endDate) where.createdAt.$lte = new Date(query.endDate);
    }

    if (query.search) {
      where.cleanText = { $regex: new RegExp(query.search, 'i') };
    }

    const [posts, count] = await this.documentsRepo.findAndCount({
      where,
      take: query.limit || 100,
      order: { createdAt: 'DESC' },
    });

    return { posts, count };
  }

  async getProcessedPostsBySourceIds(sourceIds: string[]) {
    if (!sourceIds.length) return { posts: [], count: 0 };

    const cursor = this.documentsRepo.createCursor({
      "metadata.sourceId": { $in: sourceIds }
    });
    const posts = await cursor.toArray();

    return { posts, count: posts.length };
  }

  async getRawPostsBySourceIds(sourceIds: string[]) {
    return this.getProcessedPostsBySourceIds(sourceIds);
  }
}

