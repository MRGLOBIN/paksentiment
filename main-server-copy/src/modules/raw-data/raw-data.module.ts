import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';

import { RawDataService } from './raw-data.service';
import { RawDataController } from './raw-data.controller';
import { SmartSearchService } from './smart-search.service';
import { ActivityModule } from '../activity/activity.module';
import { AuthModule } from '../auth/auth.module';

import { ScrapedDocumentEntity } from '../../database/entities/mongo/scraped-document.entity';
import { AnalysisSessionEntity } from '../../database/entities/mongo/analysis-session.entity';
import { PostStorageService } from './post-storage.service';

// Providers
import { RedditProvider } from './providers/reddit.provider';
import { TwitterProvider } from './providers/twitter.provider';
import { YouTubeProvider } from './providers/youtube.provider';
import { CommonCrawlProvider } from './providers/commoncrawl.provider';
import { ScraplingProvider } from './providers/scrapling.provider';
import { WebProvider } from './providers/web.provider';
import { SentimentProvider } from './providers/sentiment.provider';

@Module({
  imports: [
    HttpModule,
    AuthModule,
    TypeOrmModule.forFeature(
      [ScrapedDocumentEntity, AnalysisSessionEntity],
      'mongo',
    ),
    ActivityModule,
  ],
  controllers: [RawDataController],
  providers: [
    RawDataService,
    SmartSearchService,
    PostStorageService,
    // Register Providers
    RedditProvider,
    TwitterProvider,
    YouTubeProvider,
    CommonCrawlProvider,
    ScraplingProvider,
    WebProvider,
    SentimentProvider,
  ],
  exports: [RawDataService, SmartSearchService],
})
export class RawDataModule { }
