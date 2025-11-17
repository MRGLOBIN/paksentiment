import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RawPostEntity } from '../../database/entities/mongo/raw-post.entity';
import { ProcessedPostEntity } from '../../database/entities/mongo/processed-post.entity';
import { PostStorageService } from './post-storage.service';
import { RawDataController } from './raw-data.controller';
import { RawDataService } from './raw-data.service';

@Module({
  imports: [
    TypeOrmModule.forFeature(
      [RawPostEntity, ProcessedPostEntity],
      'mongo',
    ),
    HttpModule.register({
      timeout: 5000,
    }),
  ],
  controllers: [RawDataController],
  providers: [RawDataService, PostStorageService],
  exports: [RawDataService],
})
export class RawDataModule {}

