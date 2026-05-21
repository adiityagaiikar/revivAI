'use client'

import { motion } from 'framer-motion'
import {
  Check, Zap, Shield, Building2, ArrowRight,
  Sparkles, Lock, Infinity,
} from 'lucide-react'
import Link from 'next/link'

/* ─────────────────────────────────────────────
   Pricing tiers
───────────────────────────────────────────── */
const TIERS = [
  {
    id: 'starter',
    name: 'Starter',
    price: 'Free',
    period: 'forever',
    description: 'Perfect for individuals beginning their recovery journey.',
    icon: Zap,
    accentColor: 'text-white/60',
    borderClass: 'border-white/10',
    glowStyle: {},
    badgeText: null,
    ctaText: 'Get Started',
    ctaHref: '/signup',
    ctaClass: 'border border-white/15 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white',
    features: [
      { text: 'Browser-based pose tracking',       included: true  },
      { text: '5 exercises with AI feedback',       included: true  },
      { text: '7-day activity history',             included: true  },
      { text: 'Basic rep & angle metrics',          included: true  },
      { text: 'Biomechanical analysis reports',     included: false },
      { text: 'Gemini PDF medical history parsing', included: false },
      { text: 'Unlimited session history',          included: false },
      { text: 'Doctor / PT assignment',             included: false },
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$15',
    period: 'per month',
    description: 'Advanced AI insights for serious athletes and rehab patients.',
    icon: Sparkles,
    accentColor: 'text-emerald-400',
    borderClass: 'border-emerald-500/50',
    glowStyle: {
      boxShadow: '0 0 60px rgba(16,185,129,0.15), inset 0 0 40px rgba(16,185,129,0.05)',
    },
    badgeText: 'Most Popular',
    ctaText: 'Start Free Trial',
    ctaHref: '/signup?plan=pro',
    ctaClass: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xl shadow-emerald-900/40',
    features: [
      { text: 'Everything in Starter',              included: true  },
      { text: 'All 9 exercises + cognitive games',  included: true  },
      { text: 'Advanced biomechanical analysis',    included: true  },
      { text: 'Gemini 2.5 PDF medical parsing',     included: true  },
      { text: 'Unlimited session history',          included: true  },
      { text: 'AI fitness assistant (voice + text)',included: true  },
      { text: 'Session export (JSON / PDF)',        included: true  },
      { text: 'Doctor / PT assignment',             included: false },
    ],
  },
  {
    id: 'clinic',
    name: 'Clinic',
    price: '$99',
    period: 'per month',
    description: 'Enterprise-grade tools for physical therapy clinics and coaches.',
    icon: Building2,
    accentColor: 'text-violet-400',
    borderClass: 'border-violet-500/30',
    glowStyle: {
      boxShadow: '0 0 40px rgba(139,92,246,0.1)',
    },
    badgeText: 'For Clinics',
    ctaText: 'Contact Sales',
    ctaHref: '/contact',
    ctaClass: 'border border-violet-500/40 bg-violet-500/10 hover:bg-violet-500/20 text-violet-300',
    features: [
      { text: 'Everything in Pro',                  included: true  },
      { text: 'Unlimited patient management',       included: true  },
      { text: 'Patient roster & adherence tracking',included: true  },
      { text: 'Bulk session exports',               included: true  },
      { text: 'White-label PDF reports',            included: true  },
      { text: 'Clinic portal dashboard',            included: true  },
      { text: 'Priority support & onboarding',      included: true  },
      { text: 'Custom AI model fine-tuning',        included: true  },
    ],
  },
]

/* ─────────────────────────────────────────────
   FAQ data
───────────────────────────────────────────── */
const FAQS = [
  { q: 'Do I need any special hardware?', a: 'No. reviVAI runs entirely in your browser using your device\'s built-in camera. No sensors, wearables, or downloads required.' },
  { q: 'Is my health data secure?', a: 'Yes. All session data is encrypted in transit and at rest. We never sell your data. Medical history is only visible to you and your assigned clinician.' },
  { q: 'Can I switch plans later?', a: 'Absolutely. You can upgrade or downgrade at any time. Downgrades take effect at the end of your billing cycle.' },
  { q: 'What is the Clinic plan white-label feature?', a: 'Clinic subscribers can generate PDF reports branded with their clinic\'s logo and name, ready to share with patients or insurers.' },
]

/* ─────────────────────────────────────────────
   Primitives
───────────────────────────────────────────── */
const floatUp = {
  hidden: { opacity: 0, y: 28 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { type: 'spring', stiffness: 280, damping: 22, delay: i * 0.1 },
  }),
}

/* ─────────────────────────────────────────────
   Page
───────────────────────────────────────────── */
export default function PricingPage() {
  return (
    <div
      className="min-h-screen"
      style={{ background: '#050505', fontFamily: "var(--font-sans, 'Inter', sans-serif)" }}
    >
      {/* Ambient glows */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background: [
            'radial-gradient(ellipse 80% 40% at 50% -5%, rgba(16,185,129,0.08) 0%, transparent 60%)',
            'radial-gradient(ellipse 50% 30% at 80% 80%, rgba(139,92,246,0.06) 0%, transparent 60%)',
          ].join(', '),
        }}
      />

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-20 space-y-20">

        {/* ── Header ── */}
        <div className="text-center space-y-5">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 22 }}
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-xs font-semibold text-emerald-400 tracking-wide">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Simple, transparent pricing
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 22, delay: 0.1 }}
            className="text-4xl md:text-5xl font-bold text-white leading-tight tracking-tight"
          >
            Invest in your recovery.<br />
            <span style={{
              background: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              Not your hardware.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 22, delay: 0.18 }}
            className="text-white/45 max-w-xl mx-auto text-base leading-relaxed"
          >
            Start free. Upgrade when you need more. Cancel anytime.
            No credit card required for the Starter plan.
          </motion.p>
        </div>

        {/* ── Pricing cards ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {TIERS.map((tier, i) => (
            <motion.div
              key={tier.id}
              custom={i}
              variants={floatUp}
              initial="hidden"
              animate="visible"
              className="relative"
            >
              {/* Popular badge */}
              {tier.badgeText && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase border ${
                    tier.id === 'pro'
                      ? 'border-emerald-500/40 bg-emerald-500/20 text-emerald-300'
                      : 'border-violet-500/40 bg-violet-500/20 text-violet-300'
                  }`}>
                    {tier.badgeText}
                  </span>
                </div>
              )}

              <div
                className={`rounded-2xl border ${tier.borderClass} bg-white/[0.04] backdrop-blur-md p-7 flex flex-col gap-6 h-full`}
                style={tier.glowStyle}
              >
                {/* Icon + name */}
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl border border-white/10 bg-white/5 ${tier.accentColor}`}>
                    <tier.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">{tier.name}</h3>
                    <p className="text-xs text-white/35 mt-0.5">{tier.description}</p>
                  </div>
                </div>

                {/* Price */}
                <div>
                  <div className="flex items-end gap-1.5">
                    <span className="text-4xl font-bold text-white leading-none">{tier.price}</span>
                    {tier.price !== 'Free' && (
                      <span className="text-white/35 text-sm mb-1">{tier.period}</span>
                    )}
                  </div>
                  {tier.price === 'Free' && (
                    <span className="text-white/35 text-sm">no credit card needed</span>
                  )}
                </div>

                {/* CTA */}
                <Link href={tier.ctaHref}>
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    className={`w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-colors ${tier.ctaClass}`}
                  >
                    {tier.ctaText}
                    <ArrowRight className="h-4 w-4" />
                  </motion.button>
                </Link>

                {/* Divider */}
                <div className="border-t border-white/8" />

                {/* Features */}
                <ul className="space-y-3 flex-1">
                  {tier.features.map((f, fi) => (
                    <li key={fi} className="flex items-start gap-2.5">
                      {f.included ? (
                        <Check className={`h-4 w-4 shrink-0 mt-0.5 ${tier.accentColor}`} />
                      ) : (
                        <Lock className="h-4 w-4 shrink-0 mt-0.5 text-white/20" />
                      )}
                      <span className={`text-sm leading-relaxed ${f.included ? 'text-white/70' : 'text-white/25 line-through'}`}>
                        {f.text}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          ))}
        </div>

        {/* ── Trust strip ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex flex-wrap justify-center gap-8 text-xs text-white/30"
        >
          {[
            { icon: Shield,   text: 'End-to-end encrypted' },
            { icon: Lock,     text: 'HIPAA-aligned storage' },
            { icon: Infinity, text: 'Cancel anytime' },
            { icon: Zap,      text: 'No hardware required' },
          ].map((item) => (
            <div key={item.text} className="flex items-center gap-2">
              <item.icon className="h-3.5 w-3.5" />
              {item.text}
            </div>
          ))}
        </motion.div>

        {/* ── FAQ ── */}
        <div className="max-w-2xl mx-auto space-y-4">
          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ type: 'spring', stiffness: 300, damping: 22 }}
            className="text-2xl font-bold text-white text-center mb-8"
          >
            Frequently asked questions
          </motion.h2>

          {FAQS.map((faq, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ type: 'spring', stiffness: 300, damping: 22, delay: i * 0.07 }}
              className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-md p-5"
            >
              <h3 className="text-sm font-semibold text-white mb-2">{faq.q}</h3>
              <p className="text-sm text-white/45 leading-relaxed">{faq.a}</p>
            </motion.div>
          ))}
        </div>

        {/* ── Bottom CTA ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ type: 'spring', stiffness: 300, damping: 22 }}
          className="text-center rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-md p-12 relative overflow-hidden"
        >
          <div
            className="pointer-events-none absolute inset-0"
            style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(16,185,129,0.1) 0%, transparent 70%)' }}
          />
          <div className="relative z-10 space-y-5">
            <h2 className="text-3xl font-bold text-white">Ready to start your recovery?</h2>
            <p className="text-white/45 max-w-md mx-auto text-sm leading-relaxed">
              Join thousands of patients and physical therapists already using reviVAI to achieve better outcomes, faster.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link href="/signup">
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  className="flex items-center gap-2 px-8 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold shadow-xl shadow-emerald-900/40"
                >
                  Start for Free
                  <ArrowRight className="h-4 w-4" />
                </motion.button>
              </Link>
              <Link href="/provider/dashboard">
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  className="flex items-center gap-2 px-8 py-3 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-sm font-semibold"
                >
                  View Clinic Portal
                </motion.button>
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
