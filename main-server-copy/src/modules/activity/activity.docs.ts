import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

export function GetMyActivitiesDocs() {
    return applyDecorators(
        ApiBearerAuth(),
        ApiOperation({ summary: 'Get current user activity history' })
    );
}
