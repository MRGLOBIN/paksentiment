import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { GetMyActivitiesDocs } from './activity.docs';
import { AuthGuard } from '../auth/auth.guard';
import { ActivityService } from './activity.service';

@ApiTags('User Activity')
@Controller('activity')
/**
 * Controller for accessing user activity logs.
 */
export class ActivityController {
    constructor(private readonly activityService: ActivityService) { }

    @Get('me')
    @UseGuards(AuthGuard)
    @GetMyActivitiesDocs()
    async getMyActivities(
        @Request() req,
        @Query('limit') limit?: number,
    ) {
        const userId = req.user.sub;
        return this.activityService.getUserActivities(userId, limit || 50);
    }
}
