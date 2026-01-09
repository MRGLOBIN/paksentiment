import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
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
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get current user activity history' })
    async getMyActivities(
        @Request() req,
        @Query('limit') limit?: number,
    ) {
        const userId = req.user.sub;
        return this.activityService.getUserActivities(userId, limit || 50);
    }
}
