import { Controller, Post, Body, UseGuards, HttpException, HttpStatus, Request } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { UsersService } from '../auth/users.service';
import { AuthGuard } from '../auth/auth.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';

class CreatePaymentIntentDto {
    amount: number;
    planName: string;
}

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
    constructor(
        private readonly paymentsService: PaymentsService,
        private readonly usersService: UsersService
    ) { }

    @Post('create-intent')
    @ApiOperation({ summary: 'Create a Stripe PaymentIntent for a specific subscription plan' })
    @ApiResponse({ status: 201, description: 'Payment intent created successfully, yielding a client_secret.' })
    @ApiResponse({ status: 500, description: 'Failed to initialize gateway.' })
    @ApiBody({ type: CreatePaymentIntentDto })
    async createIntent(@Body() body: CreatePaymentIntentDto) {
        if (!body.amount || !body.planName) {
            throw new HttpException('Amount and planName are required.', HttpStatus.BAD_REQUEST);
        }

        return this.paymentsService.createPaymentIntent(body.amount, body.planName);
    }

    @Post('fulfill-subscription')
    @UseGuards(AuthGuard)
    @ApiOperation({ summary: 'Fulfill subscription tier after successful payment' })
    @ApiResponse({ status: 200, description: 'Subscription tier updated successfully.' })
    @ApiResponse({ status: 400, description: 'Invalid plan or unauthorized.' })
    async fulfillSubscription(@Request() req, @Body() body: { planName: string }) {
        if (!body.planName) {
            throw new HttpException('planName is required.', HttpStatus.BAD_REQUEST);
        }

        const tierMap: Record<string, string> = {
            'Premium': 'premium',
            'Super Premium': 'super_premium',
            'Super_Premium': 'super_premium',
            'Super Premium Plan': 'super_premium',
            'Premium Plan': 'premium',
            'Enterprise': 'super_premium',
        };

        const resolvedTier = tierMap[body.planName];
        if (!resolvedTier) {
            throw new HttpException('Invalid plan name provided.', HttpStatus.BAD_REQUEST);
        }

        const userId = req.user.sub;
        await this.usersService.updateSubscriptionTier(userId, resolvedTier as any);
        return { success: true, newTier: resolvedTier };
    }
}
