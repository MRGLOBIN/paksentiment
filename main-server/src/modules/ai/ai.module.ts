import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { AuthModule } from '../auth/auth.module';
import { ActivityModule } from '../activity/activity.module';

@Module({
    imports: [
        HttpModule.register({ timeout: 60000 }),
        AuthModule,
        ActivityModule,
    ],
    controllers: [AiController],
    providers: [AiService],
    exports: [AiService],
})
export class AiModule { }
