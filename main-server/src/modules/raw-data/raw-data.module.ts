import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';

import { RawDataService } from './raw-data.service';
import { RawDataController } from './raw-data.controller';
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
    PostStorageService,
    // Register Providers
    RedditProvider,
    TwitterProvider,
    YouTubeProvider,
    CommonCrawlProvider,
    ScraplingProvider,
    WebProvider,
  ],
  exports: [RawDataService],
})
export class RawDataModule {}
