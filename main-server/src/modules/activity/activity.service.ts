import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserActivityEntity } from '../../database/entities/user-activity.entity';

@Injectable()
/**
 * Service to log and retrieve user activity.
 * Tracks actions like searches, logins, and API usage.
 */
export class ActivityService {
    constructor(
        @InjectRepository(UserActivityEntity)
        private readonly activityRepo: Repository<UserActivityEntity>,
    ) { }

    /**
     * Log a new user activity.
     * 
     * @param userId ID of the user performing the action
     * @param action Action type identifier (e.g. 'LOGIN', 'SEARCH_REDDIT')
     * @param details Optional JSON details relating to the action
     * @returns Created activity entity
     */
    async logActivity(
        userId: number,
        action: string,
        details?: any,
    ): Promise<UserActivityEntity> {
        const activity = this.activityRepo.create({
            userId,
            action,
            details,
        });
        return this.activityRepo.save(activity);
    }

    /**
     * Retrieve recent activities for a user.
     * 
     * @param userId ID of the user
     * @param limit Max records to return (default 50)
     * @returns List of activity entities ordered by time (descending)
     */
    async getUserActivities(userId: number, limit = 50): Promise<UserActivityEntity[]> {
        return this.activityRepo.find({
            where: { userId },
            order: { createdAt: 'DESC' },
            take: limit,
        });
    }
}
