import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RawDataModule } from './modules/raw-data/raw-data.module';
import { AuthModule } from './modules/auth/auth.module';
import { UserEntity } from './database/entities/user.entity';
import { UserPreferenceEntity } from './database/entities/user-preference.entity';
import { ApiKeyEntity } from './database/entities/api-key.entity';
import { UserActivityEntity } from './database/entities/user-activity.entity';
import { SystemConfigEntity } from './database/entities/system-config.entity';
import { RawPostEntity } from './database/entities/mongo/raw-post.entity';
import { ProcessedPostEntity } from './database/entities/mongo/processed-post.entity';
import { AnalyticsCacheEntity } from './database/entities/mongo/analytics-cache.entity';
import { SystemLogEntity } from './database/entities/mongo/system-log.entity';
import { AnalysisSessionEntity } from './database/entities/mongo/analysis-session.entity';
import { CrawlJobEntity } from './database/entities/mongo/crawl-job.entity';

import { ActivityModule } from './modules/activity/activity.module';
import { AiModule } from './modules/ai/ai.module';
import { CrawlerModule } from './modules/crawler/crawler.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        type: 'postgres',
        host: process.env.POSTGRES_HOST ?? 'localhost',
        port: parseInt(process.env.POSTGRES_PORT ?? '5432', 10),
        username: process.env.POSTGRES_USER ?? 'postgres',
        password: process.env.POSTGRES_PASSWORD ?? 'postgres',
        database: process.env.POSTGRES_DB ?? 'paksentiment',
        entities: [
          UserEntity,
          UserPreferenceEntity,
          ApiKeyEntity,
          UserActivityEntity,
          SystemConfigEntity,
        ],
        synchronize: true,
      }),
    }),
    TypeOrmModule.forRootAsync({
      name: 'mongo',
      useFactory: () => ({
        type: 'mongodb',
        url: process.env.MONGO_URI ?? 'mongodb://localhost:27017',
        database: process.env.MONGO_DB ?? 'paksentiment',
        useUnifiedTopology: true,
        entities: [
          RawPostEntity,
          ProcessedPostEntity,
          AnalyticsCacheEntity,
          SystemLogEntity,
          AnalysisSessionEntity,
          CrawlJobEntity,
        ],
        synchronize: true,
      }),
    }),
    AuthModule,
    ActivityModule,
    AiModule,
    RawDataModule,
    CrawlerModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
