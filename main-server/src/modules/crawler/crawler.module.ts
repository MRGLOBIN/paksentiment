import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CrawlerController } from './crawler.controller';
import { CrawlerService } from './crawler.service';
import { CrawlJobEntity } from '../../database/entities/mongo/crawl-job.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
    imports: [
        HttpModule,
        AuthModule,
        TypeOrmModule.forFeature([CrawlJobEntity], 'mongo'),
    ],
    controllers: [CrawlerController],
    providers: [CrawlerService],
    exports: [CrawlerService],
})
export class CrawlerModule { }
