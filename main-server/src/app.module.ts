import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RawDataModule } from './modules/raw-data/raw-data.module';
import { AuthModule } from './modules/auth/auth.module';
import { UserEntity } from './database/entities/user.entity';
import { IdentityEntity } from './database/entities/identity.entity';
import { UserPreferenceEntity } from './database/entities/user-preference.entity';
import { ApiKeyEntity } from './database/entities/api-key.entity';
import { UserActivityEntity } from './database/entities/user-activity.entity';
import { SystemConfigEntity } from './database/entities/system-config.entity';
import { ScrapedDocumentEntity } from './database/entities/mongo/scraped-document.entity';
import { AnalyticsCacheEntity } from './database/entities/mongo/analytics-cache.entity';
import { SystemLogEntity } from './database/entities/mongo/system-log.entity';
import { AnalysisSessionEntity } from './database/entities/mongo/analysis-session.entity';
import { CrawlJobEntity } from './database/entities/mongo/crawl-job.entity';

import { ActivityModule } from './modules/activity/activity.module';
import { AiModule } from './modules/ai/ai.module';
import { CrawlerModule } from './modules/crawler/crawler.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      useFactory: () => {
        if (process.env.NODE_ENV === 'test') {
          return {
            type: 'sqlite',
            database: ':memory:',
            entities: [
              UserEntity,
              IdentityEntity,
              UserPreferenceEntity,
              ApiKeyEntity,
              UserActivityEntity,
              SystemConfigEntity,
            ],
            synchronize: true,
            dropSchema: true,
          };
        }
        return {
          type: 'postgres',
          host: process.env.POSTGRES_HOST ?? 'localhost',
          port: parseInt(process.env.POSTGRES_PORT ?? '5432', 10),
          username: process.env.POSTGRES_USER ?? 'postgres',
          password: process.env.POSTGRES_PASSWORD ?? 'postgres',
          database: process.env.POSTGRES_DB ?? 'paksentiment',
          entities: [
            UserEntity,
            IdentityEntity,
            UserPreferenceEntity,
            ApiKeyEntity,
            UserActivityEntity,
            SystemConfigEntity,
          ],
          synchronize: true,
        };
      },
    }),
    TypeOrmModule.forRootAsync({
      name: 'mongo',
      useFactory: async () => {
        if (process.env.NODE_ENV === 'test') {
          // Use require() instead of dynamic import() to avoid
          // --experimental-vm-modules requirement in Jest
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const { MongoMemoryServer } = require('mongodb-memory-server');
          const mongod = await MongoMemoryServer.create();
          return {
            type: 'mongodb',
            url: mongod.getUri(),
            database: 'paksentiment_test',
            useUnifiedTopology: true,
            entities: [
              ScrapedDocumentEntity,
              AnalyticsCacheEntity,
              SystemLogEntity,
              AnalysisSessionEntity,
              CrawlJobEntity,
            ],
            synchronize: true,
          };
        }
        return {
          type: 'mongodb',
          url: process.env.MONGO_URI ?? 'mongodb://localhost:27017',
          database: process.env.MONGO_DB ?? 'paksentiment',
          useUnifiedTopology: true,
          entities: [
            ScrapedDocumentEntity,
            AnalyticsCacheEntity,
            SystemLogEntity,
            AnalysisSessionEntity,
            CrawlJobEntity,
          ],
          synchronize: true,
        };
      },
    }),
    AuthModule,
    ActivityModule,
    AiModule,
    RawDataModule,
    CrawlerModule,
    PaymentsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
