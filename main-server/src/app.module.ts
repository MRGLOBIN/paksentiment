import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RawDataModule } from './modules/raw-data/raw-data.module';
import { AuthModule } from './modules/auth/auth.module';
import { UserEntity } from './database/entities/user.entity';
import { UserPreferenceEntity } from './database/entities/user-preference.entity';
import { ApiKeyEntity } from './database/entities/api-key.entity';
import { SystemConfigEntity } from './database/entities/system-config.entity';
import { RawPostEntity } from './database/entities/mongo/raw-post.entity';
import { ProcessedPostEntity } from './database/entities/mongo/processed-post.entity';
import { AnalyticsCacheEntity } from './database/entities/mongo/analytics-cache.entity';
import { SystemLogEntity } from './database/entities/mongo/system-log.entity';

@Module({
  imports: [
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
        ],
        synchronize: true,
      }),
    }),
    AuthModule,
    RawDataModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
