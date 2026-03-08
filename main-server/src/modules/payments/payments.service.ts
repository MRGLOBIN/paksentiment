import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Injectable()
export class PaymentsService {
    private stripe: Stripe;
    private readonly logger = new Logger(PaymentsService.name);

    constructor(private configService: ConfigService) {
        // Initialize stripe with the secret key, or a fallback warning if missing during dev
        const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY') || 'sk_test_placeholder_replace_me';

        this.stripe = new Stripe(secretKey, {
            apiVersion: '2023-10-16' as any, // Using stable API version
        });

        if (secretKey === 'sk_test_placeholder_replace_me') {
            this.logger.warn('STRIPE_SECRET_KEY is missing from .env! Using placeholder. Transactions will fail until this is replaced with a real test key.');
        }
    }

    /**
     * Generates a secure PaymentIntent client secret for the frontend to confirm a transaction.
     * @param amount The price in USD dollars (e.g. 19 for $19.00)
     * @param planName The name of the purchased plan (e.g. "Premium")
     */
    async createPaymentIntent(amount: number, planName: string) {
        try {
            // Stripe expects amounts in cents, so we multiply by 100
            const amountInCents = amount * 100;

            const paymentIntent = await this.stripe.paymentIntents.create({
                amount: amountInCents,
                currency: 'usd',
                metadata: {
                    planName: planName
                }
            });

            return {
                clientSecret: paymentIntent.client_secret,
            };
        } catch (error) {
            this.logger.error(`Failed to create PaymentIntent for plan ${planName}: ${error.message}`);
            throw new HttpException(
                'Payment gateway simulation failed to initialize.',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }
}
