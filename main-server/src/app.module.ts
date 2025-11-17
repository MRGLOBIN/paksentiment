import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RawDataModule } from './modules/raw-data/raw-data.module';
import { AuthModule } from './modules/auth/auth.module';

@Module({
  imports: [AuthModule, RawDataModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
