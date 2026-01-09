import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserActivityEntity } from '../../database/entities/user-activity.entity';
import { AuthModule } from '../auth/auth.module';
import { ActivityController } from './activity.controller';
import { ActivityService } from './activity.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([UserActivityEntity]),
        forwardRef(() => AuthModule)
    ],
    controllers: [ActivityController],
    providers: [ActivityService],
    exports: [ActivityService],
})
export class ActivityModule { }
