import React, { useState, useEffect } from 'react'
import { Close, CheckCircle, CreditCard, AccountBalanceWallet } from '@mui/icons-material'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, CardNumberElement, CardExpiryElement, CardCvcElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js'
import { useTheme } from '../providers/ThemeProvider'
import styles from './PaymentModal.module.scss'
import { PaymentModalProps, StripeCheckoutFormProps } from '../../types'

// Initialize Stripe outside of component to avoid recreating the object
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_sample')

/**
 * Stripe Checkout Form Component
 */
const StripeCheckOutForm = ({ price, onSuccess, setIsProcessing, isProcessing }: StripeCheckoutFormProps) => {
    const stripe = useStripe()
    const elements = useElements()
    const [error, setError] = useState<string | null>(null)
    const { mode } = useTheme()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!stripe || !elements) return

        setIsProcessing(true)
        setError(null)

        // Simulate backend call to get Client Secret
        // In production: const { clientSecret } = await fetch('/api/payments/create-intent').then(r => r.json())

        // Simulate latency then mock success since we can't fully validate a dummy client secret without real keys
        setTimeout(() => {
            setIsProcessing(false)
            onSuccess()
        }, 1500)
    }

    const ELEMENT_OPTIONS = {
        style: {
            base: {
                fontSize: '15px',
                color: mode === 'dark' ? '#e2e8f0' : '#0f172a', // Dynamically adjust based on theme
                '::placeholder': { color: '#64748b' },
                fontFamily: 'Inter, sans-serif'
            },
        },
    }

    return (
        <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.inputGroup}>
                <label>Email Address</label>
                <input type="email" placeholder="investor@example.com" required />
            </div>

            <div className={styles.inputGroup}>
                <label>Name on Card</label>
                <input type="text" placeholder="John Doe" required />
            </div>

            <div className={styles.inputGroup}>
                <label>Card Number</label>
                <div className={styles.stripeWrapper}>
                    <CardNumberElement options={ELEMENT_OPTIONS} />
                </div>
            </div>

            <div className={styles.cardDetailsRow}>
                <div className={styles.inputGroup}>
                    <label>Expiration</label>
                    <div className={styles.stripeWrapper}>
                        <CardExpiryElement options={ELEMENT_OPTIONS} />
                    </div>
                </div>
                <div className={styles.inputGroup}>
                    <label>CVC</label>
                    <div className={styles.stripeWrapper}>
                        <CardCvcElement options={ELEMENT_OPTIONS} />
                    </div>
                </div>
            </div>

            {error && <div className={styles.errorText}>{error}</div>}

            <button type="submit" className={styles.payBtn} disabled={!stripe || isProcessing}>
                {isProcessing ? <span className={styles.spinner}></span> : `Pay ${price}`}
            </button>

            <p className={styles.secureText}>
                🔐 Secure encrypted Stripe payment
            </p>
        </form>
    )
}

/**
 * Main Payment Modal wrapper handling Dual Gateways (Stripe + PayPal)
 */
export default function PaymentModal({
    planName,
    price,
    onClose,
    onSuccess,
}: PaymentModalProps) {
    const [isProcessing, setIsProcessing] = useState(false)
    const [isSuccess, setIsSuccess] = useState(false)
    const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'paypal'>('stripe')

    const handleSuccessFlow = () => {
        setIsSuccess(true)
        setTimeout(() => {
            onSuccess()
        }, 2000)
    }

    // Extract purely the numeric value for PayPal order payload (e.g. "$19" -> "19.00")
    const numericPrice = parseFloat(price.replace('$', '')).toFixed(2)

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div
                className={`${styles.modal} ${isSuccess ? styles.successMode : ''}`}
                onClick={(e) => e.stopPropagation()}
            >
                <button className={styles.closeBtn} onClick={onClose}>
                    <Close fontSize="small" />
                </button>

                {isSuccess ? (
                    <div className={styles.successState}>
                        <CheckCircle className={styles.checkIcon} />
                        <h2>Payment Successful!</h2>
                        <p>You are now subscribed to the <strong>{planName}</strong> plan for 1 month.</p>
                        <p className={styles.redirectText}>Redirecting...</p>
                    </div>
                ) : (
                    <>
                        <div className={styles.header}>
                            <h2>Subscribe to {planName}</h2>
                            <p className={styles.price}>{price}<span>/month</span></p>
                        </div>

                        {/* Gateway Selector Tabs */}
                        <div className={styles.methodSelector}>
                            <button
                                className={`${styles.methodBtn} ${paymentMethod === 'stripe' ? styles.active : ''}`}
                                onClick={() => setPaymentMethod('stripe')}
                            >
                                <CreditCard fontSize="small" /> Credit Card
                            </button>
                            <button
                                className={`${styles.methodBtn} ${paymentMethod === 'paypal' ? styles.active : ''}`}
                                onClick={() => setPaymentMethod('paypal')}
                            >
                                <AccountBalanceWallet fontSize="small" /> PayPal
                            </button>
                        </div>

                        {/* Stripe Flow */}
                        {paymentMethod === 'stripe' && (
                            <Elements stripe={stripePromise}>
                                <StripeCheckOutForm
                                    price={price}
                                    onSuccess={handleSuccessFlow}
                                    isProcessing={isProcessing}
                                    setIsProcessing={setIsProcessing}
                                />
                            </Elements>
                        )}

                        {/* PayPal Flow */}
                        {paymentMethod === 'paypal' && (
                            <div className={styles.paypalWrapper}>
                                <p className={styles.paypalSubtext}>Fast, safe, and secure checkout.</p>
                                <PayPalScriptProvider options={{ clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "test", currency: "USD" }}>
                                    <PayPalButtons
                                        style={{ layout: "vertical", shape: "rect", color: "gold" }}
                                        createOrder={(data, actions) => {
                                            return actions.order.create({
                                                intent: "CAPTURE",
                                                purchase_units: [
                                                    {
                                                        amount: {
                                                            currency_code: "USD",
                                                            value: numericPrice,
                                                        },
                                                    },
                                                ],
                                            });
                                        }}
                                        onApprove={async (data, actions) => {
                                            setIsProcessing(true)
                                            const order = await actions.order?.capture();
                                            setIsProcessing(false)
                                            if (order && order.status === "COMPLETED") {
                                                handleSuccessFlow()
                                            }
                                        }}
                                        onCancel={() => {
                                            // Handle cancellation
                                        }}
                                        onError={(err) => {
                                            console.error("PayPal Error:", err)
                                        }}
                                    />
                                </PayPalScriptProvider>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    )
}
