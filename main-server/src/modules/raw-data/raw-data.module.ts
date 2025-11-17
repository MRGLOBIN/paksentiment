import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';

import { RawDataController } from './raw-data.controller';
import { RawDataService } from './raw-data.service';

@Module({
  imports: [
    HttpModule.register({
      timeout: 5000,
    }),
  ],
  controllers: [RawDataController],
  providers: [RawDataService],
  exports: [RawDataService],
})
export class RawDataModule {}

