import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthController } from './module/auth/auth.controller';
import { RawDataController } from './misc/raw-data/raw-data.controller';

@Module({
  imports: [],
  controllers: [AppController, AuthController, RawDataController],
  providers: [AppService],
})
export class AppModule {}
