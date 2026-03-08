'use client'

import { useState } from 'react'
import Link from 'next/link'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import PaymentModal from '../components/PaymentModal'
import styles from './page.module.scss'
import { Check, Close, Star } from '@mui/icons-material'
import { useAuthStore } from '../../store/useAuthStore'
import { useRouter } from 'next/navigation'
import { Plan, PlanFeature } from '../../types'

const PLANS: Plan[] = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    description:
      'Get started with basic sentiment analysis and explore the platform at no cost.',
    features: [
      { text: '50 analyses per month', included: true },
      { text: 'Single data source (Twitter)', included: true },
      { text: 'Basic sentiment breakdown', included: true },
      { text: 'Community support', included: true },
      { text: 'AI chat assistant (10 msgs/day)', included: true },
      { text: 'Translation (5 requests/day)', included: true },
      { text: 'Advanced analytics dashboard', included: false },
      { text: 'PDF & CSV export', included: false },
      { text: 'Multi-source crawling', included: false },
      { text: 'Priority support', included: false },
    ],
    cta: 'Get Started Free',
    ctaVariant: 'outline',
  },
  {
    name: 'Premium',
    price: '$19',
    period: 'per month',
    badge: 'Most Popular',
    highlighted: true,
    description:
      'Unlock multi-source intelligence and powerful analytics for professionals and researchers.',
    features: [
      { text: '500 analyses per month', included: true },
      { text: 'All data sources (Twitter, Reddit, YouTube)', included: true },
      { text: 'Advanced sentiment & emotion analysis', included: true },
      { text: 'Email support (24h response)', included: true },
      { text: 'Unlimited AI chat assistant', included: true },
      { text: 'Unlimited translations', included: true },
      { text: 'Advanced analytics dashboard', included: true },
      { text: 'PDF & CSV export', included: true },
      { text: 'Common Crawl web scraping', included: false },
      { text: 'Custom API access', included: false },
    ],
    cta: 'Upgrade to Premium',
    ctaVariant: 'primary',
  },
  {
    name: 'Super Premium',
    price: '$49',
    period: 'per month',
    badge: 'Enterprise',
    description:
      'Full platform access with enterprise-grade features, API access, and dedicated support.',
    features: [
      { text: 'Unlimited analyses', included: true },
      { text: 'All data sources + Common Crawl', included: true },
      { text: 'Full sentiment, emotion & sarcasm detection', included: true },
      { text: 'Dedicated support & onboarding', included: true },
      { text: 'Unlimited AI chat assistant', included: true },
      { text: 'Unlimited translations', included: true },
      { text: 'Advanced analytics dashboard', included: true },
      { text: 'PDF, CSV & JSON export', included: true },
      { text: 'Custom API access & webhooks', included: true },
      { text: 'Team collaboration (up to 5 seats)', included: true },
    ],
    cta: 'Go Super Premium',
    ctaVariant: 'gradient',
  },
]

const FAQ = [
  {
    q: 'Can I switch plans at any time?',
    a: 'Yes — you can upgrade, downgrade, or cancel at any time. Changes take effect at the start of your next billing cycle.',
  },
  {
    q: 'Is there a free trial for paid plans?',
    a: 'Every paid plan includes a 14-day free trial. No credit card required to start.',
  },
  {
    q: 'What data sources are supported?',
    a: 'We support Twitter/X, Reddit, YouTube comments, and Common Crawl web data. More sources are being added regularly.',
  },
  {
    q: 'Do you offer student or academic discounts?',
    a: 'Yes! Verified students and academic researchers get 50% off any paid plan. Contact us with your .edu email.',
  },
]

const TIER_WEIGHTS: Record<string, number> = {
  'Free': 0,
  'Premium': 1,
  'Super Premium': 2
}

export default function PricingPage() {
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [actionType, setActionType] = useState<'upgrade' | 'downgrade' | 'current' | null>(null)
  const { user, updateUser, isAuthenticated } = useAuthStore()

  const handlePlanClick = (plan: Plan) => {
    if (!isAuthenticated) {
      window.location.href = '/register'
      return
    }

    const currentTierName = user?.subscriptionTier === 'super_premium' ? 'Super Premium'
      : user?.subscriptionTier === 'premium' ? 'Premium' : 'Free'

    if (plan.name === currentTierName) {
      setActionType('current')
      setSelectedPlan(plan)
      setShowModal(true)
      return
    }

    const requestedWeight = TIER_WEIGHTS[plan.name] || 0
    const currentWeight = TIER_WEIGHTS[currentTierName] || 0

    if (requestedWeight < currentWeight) {
      setActionType('downgrade')
    } else {
      setActionType('upgrade')
    }

    setSelectedPlan(plan)
    setShowModal(true)
  }

  const handlePaymentSuccess = async () => {
    // 1. Physically update DB
    try {
      const res = await fetch('http://localhost:3000/payments/fulfill-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${useAuthStore.getState().token}`,
        },
        body: JSON.stringify({ planName: selectedPlan?.name }),
      })

      if (res.ok) {
        const data = await res.json()
        updateUser({ subscriptionTier: data.newTier })
      }
    } catch (e) {
      console.error('Failed to sync subscription:', e)
    }

    setShowModal(false)
    setSelectedPlan(null)
    setActionType(null)
  }

  const handleDowngrade = async () => {
    // A downgrade doesn't require a credit card charge (Stripe), so we hit the DB directly
    await handlePaymentSuccess()
  }

  return (
    <div className={styles.page}>
      <Navbar />

      <main className={styles.main}>
        {/* Header */}
        <section className={styles.header}>
          <span className={styles.badge}>Pricing</span>
          <h1>Simple, transparent pricing</h1>
          <p>
            Start free and scale as you grow. No hidden fees, cancel anytime.
          </p>
        </section>

        {/* Plans */}
        <section className={styles.plans}>
          {PLANS.map(plan => (
            <div
              key={plan.name}
              className={`${styles.planCard} ${plan.highlighted ? styles.highlighted : ''}`}
            >
              {plan.badge && (
                <span className={styles.planBadge}>
                  <Star style={{ fontSize: 14 }} />
                  {plan.badge}
                </span>
              )}

              <h2 className={styles.planName}>{plan.name}</h2>
              <p className={styles.planDesc}>{plan.description}</p>

              <div className={styles.priceRow}>
                <span className={styles.price}>{plan.price}</span>
                <span className={styles.period}>/{plan.period}</span>
              </div>

              <button
                onClick={() => handlePlanClick(plan)}
                className={`${styles.ctaBtn} ${styles[plan.ctaVariant]}`}
              >
                {plan.cta}
              </button>

              <ul className={styles.featureList}>
                {plan.features.map(f => (
                  <li
                    key={f.text}
                    className={f.included ? styles.included : styles.excluded}
                  >
                    {f.included ? (
                      <Check style={{ fontSize: 18 }} />
                    ) : (
                      <Close style={{ fontSize: 18 }} />
                    )}
                    <span>{f.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>

        {/* FAQ */}
        <section className={styles.faqSection}>
          <h2 className={styles.faqTitle}>Frequently Asked Questions</h2>
          <div className={styles.faqGrid}>
            {FAQ.map(item => (
              <div key={item.q} className={styles.faqCard}>
                <h3>{item.q}</h3>
                <p>{item.a}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <Footer />

      {/* Modal Overlay Controller */}
      {showModal && selectedPlan && (
        <div className={styles.overlay} onClick={() => setShowModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            {/* 1. Already on Plan */}
            {actionType === 'current' && (
              <div className={styles.warningModal}>
                <Close className={styles.warningClose} onClick={() => setShowModal(false)} />
                <h2>Already Subscribed</h2>
                <p>You are already on the <strong>{selectedPlan.name}</strong> plan.</p>
                <p>If you&apos;re looking to modify your account, try selecting an Upgrade or Downgrade tier from the table instead.</p>
                <button className={styles.dismissBtn} onClick={() => setShowModal(false)}>Got it</button>
              </div>
            )}

            {/* 2. Downgrade */}
            {actionType === 'downgrade' && (
              <div className={styles.warningModal}>
                <Close className={styles.warningClose} onClick={() => setShowModal(false)} />
                <h2>Confirm Downgrade</h2>
                <p>Are you sure you want to downgrade to the <strong>{selectedPlan.name}</strong> plan?</p>
                <p>You will immediately lose access to your current premium features.</p>
                <div className={styles.actionRow}>
                  <button className={styles.dismissBtn} onClick={() => setShowModal(false)}>Cancel</button>
                  <button className={styles.dangerBtn} onClick={handleDowngrade}>Confirm Downgrade</button>
                </div>
              </div>
            )}

            {/* 3. Upgrade (Full Flow) */}
            {actionType === 'upgrade' && (
              <PaymentModal
                planName={selectedPlan.name}
                price={selectedPlan.price}
                onClose={() => setShowModal(false)}
                onSuccess={handlePaymentSuccess}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
