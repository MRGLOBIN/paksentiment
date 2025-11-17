import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';

import { RawPostEntity } from '../../database/entities/mongo/raw-post.entity';
import { ProcessedPostEntity } from '../../database/entities/mongo/processed-post.entity';

@Injectable()
export class PostStorageService {
  constructor(
    @InjectRepository(RawPostEntity, 'mongo')
    private readonly rawPosts: MongoRepository<RawPostEntity>,
    @InjectRepository(ProcessedPostEntity, 'mongo')
    private readonly processedPosts: MongoRepository<ProcessedPostEntity>,
  ) {}

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
        },
      });
    }

    await this.processedPosts.save(docs);
  }

  private composeContent(post: any): string {
    const title = post.title ?? '';
    const text = post.text ?? post.content ?? '';
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

    return new Date();
  }

  private extractSourceId(post: any): string {
    return (
      post.post_id ??
      post.id ??
      post.tweet_id ??
      post.comment_id ??
      post.url ??
      ''
    ).toString();
  }
}

