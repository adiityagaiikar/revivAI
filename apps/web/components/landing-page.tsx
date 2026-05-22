'use client'

import { SplineScene } from "@workspace/ui/components/splite"
import { Button } from "@workspace/ui/components/button"
import { LogIn, UserPlus, Scan, Brain, ShieldCheck, ChevronRight, Camera, Dumbbell, BarChart3, ArrowRight, Zap } from "lucide-react"
import Link from "next/link"
import { useRef, useCallback, useState } from "react"
import { motion, useInView, type Variants } from "framer-motion"
import { GuestTrial } from "@/components/guest-trial"

/* ─────────────────────────────────────────────
   Shared animation variants
───────────────────────────────────────────── */
const floatUp: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 20 },
  },
}

const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
}

/* ─────────────────────────────────────────────
   Reusable scroll-reveal wrapper
───────────────────────────────────────────── */
function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode
  className?: string
  delay?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: "-80px" })

  return (
    <motion.div
      ref={ref}
      className={className}
      variants={floatUp}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      transition={{ type: "spring", stiffness: 300, damping: 20, delay }}
    >
      {children}
    </motion.div>
  )
}

/* ─────────────────────────────────────────────
   Glassmorphism card primitive
───────────────────────────────────────────── */
function GlassCard({
  children,
  className = "",
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={`rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md ${className}`}
    >
      {children}
    </div>
  )
}

/* ─────────────────────────────────────────────
   Bento feature cards data
───────────────────────────────────────────── */
const features = [
  {
    icon: Scan,
    title: "Skeletal Tracking",
    tag: "Vision",
    description:
      "33-point full-body pose estimation runs entirely in your browser via MediaPipe. Zero latency, zero hardware — just your camera.",
    accent: "from-violet-500/20 to-transparent",
    iconColor: "text-violet-400",
  },
  {
    icon: Brain,
    title: "Biomechanical Feedback",
    tag: "AI Insights",
    description:
      "Our AI engine analyses joint angles, symmetry, and movement velocity in real time to flag form errors before they become injuries.",
    accent: "from-cyan-500/20 to-transparent",
    iconColor: "text-cyan-400",
  },
  {
    icon: ShieldCheck,
    title: "Secure Logging",
    tag: "Progress",
    description:
      "Every session is encrypted end-to-end and stored with enterprise-grade security. Your health data belongs to you — always.",
    accent: "from-emerald-500/20 to-transparent",
    iconColor: "text-emerald-400",
  },
]

/* ─────────────────────────────────────────────
   How it works steps
───────────────────────────────────────────── */
const steps = [
  {
    icon: Camera,
    step: "01",
    title: "Position Your Camera",
    description: "Open reviVAI in any modern browser. Allow camera access and step into frame — no downloads, no plugins.",
  },
  {
    icon: Dumbbell,
    step: "02",
    title: "Perform Your Exercise",
    description: "Follow the on-screen guide. The AI tracks every joint in real time and counts reps with sub-second accuracy.",
  },
  {
    icon: BarChart3,
    step: "03",
    title: "Review Your Insights",
    description: "After each session, receive a detailed biomechanical report with trend charts and personalised recommendations.",
  },
]

/* ─────────────────────────────────────────────
   Main component
───────────────────────────────────────────── */
export function LandingPage() {
  const cardRef = useRef<HTMLDivElement>(null)
  const blobRef = useRef<HTMLDivElement>(null)
  const coreRef = useRef<HTMLDivElement>(null)
  const [trialOpen, setTrialOpen] = useState(false)

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = cardRef.current?.getBoundingClientRect()
    if (!rect || !blobRef.current || !coreRef.current) return
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    blobRef.current.style.left = `${x}px`
    blobRef.current.style.top = `${y}px`
    blobRef.current.style.opacity = "1"
    coreRef.current.style.left = `${x}px`
    coreRef.current.style.top = `${y}px`
    coreRef.current.style.opacity = "1"
  }, [])

  const handleMouseLeave = useCallback(() => {
    if (blobRef.current) blobRef.current.style.opacity = "0"
    if (coreRef.current) coreRef.current.style.opacity = "0"
  }, [])

  return (
    <div
      className="min-h-screen w-full flex flex-col"
      style={{ background: "#050505", fontFamily: "var(--font-sans, 'Inter', sans-serif)" }}
    >
      {/* Guest trial overlay */}
      {trialOpen && <GuestTrial onClose={() => setTrialOpen(false)} />}
      {/* ── Ambient background glow ── */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(139,92,246,0.12) 0%, transparent 70%), radial-gradient(ellipse 60% 40% at 80% 80%, rgba(6,182,212,0.08) 0%, transparent 60%)",
        }}
      />

      {/* ══════════════════════════════════════
          HEADER
      ══════════════════════════════════════ */}
      <header className="relative z-50 w-full flex justify-between items-center px-6 py-5 border-b border-white/5 backdrop-blur-md bg-black/20">
        <Link
          href="/"
          className="text-xl font-bold tracking-tight text-white hover:opacity-80 transition-opacity"
        >
          revi<span className="text-violet-400">VAI</span>
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-sm text-white/60">
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
          <a href="#testimonials" className="hover:text-white transition-colors">Testimonials</a>
        </nav>

        <div className="flex items-center gap-3">
          <Link href="/login">
            <Button
              variant="ghost"
              className="text-white/70 hover:text-white hover:bg-white/10 text-sm"
            >
              <LogIn className="mr-2 h-4 w-4" />
              Login
            </Button>
          </Link>
          <Link href="/signup">
            <Button className="bg-violet-600 hover:bg-violet-500 text-white text-sm px-5 rounded-xl transition-all duration-200 shadow-lg shadow-violet-900/40">
              <UserPlus className="mr-2 h-4 w-4" />
              Sign Up
            </Button>
          </Link>
        </div>
      </header>

      {/* ══════════════════════════════════════
          HERO
      ══════════════════════════════════════ */}
      <section className="relative z-10 flex-1 flex items-center px-6 pt-8 pb-4 min-h-[calc(100vh-73px)]">
        <div
          ref={cardRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="w-full relative rounded-3xl border border-white/10 bg-white/3 backdrop-blur-sm overflow-hidden"
          style={{ minHeight: 560 }}
        >
          {/* cursor blob */}
          <div
            ref={blobRef}
            className="pointer-events-none absolute z-20"
            style={{
              left: -200, top: -200,
              transform: "translate(-50%, -50%)",
              opacity: 0,
              width: 220, height: 220,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(139,92,246,0.22) 0%, rgba(139,92,246,0.06) 40%, transparent 70%)",
              filter: "blur(10px)",
              transition: "opacity 0.3s",
            }}
          />
          <div
            ref={coreRef}
            className="pointer-events-none absolute z-20"
            style={{
              left: -200, top: -200,
              transform: "translate(-50%, -50%)",
              opacity: 0,
              width: 20, height: 20,
              borderRadius: "50%",
              background: "rgba(167,139,250,0.9)",
              filter: "blur(4px)",
              transition: "opacity 0.3s",
            }}
          />

          <div className="flex flex-col lg:flex-row h-full" style={{ minHeight: 560 }}>
            {/* ── Left: text column ── */}
            <div className="flex-1 flex flex-col justify-center p-10 lg:p-16 relative z-10 gap-8">
              {/* badge */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.1 }}
              >
                <span className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1.5 text-xs font-medium text-violet-300 tracking-wide">
                  <span className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-pulse" />
                  Browser-native · No hardware required
                </span>
              </motion.div>

              {/* headline */}
              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.2 }}
                className="text-4xl md:text-5xl xl:text-6xl font-bold leading-[1.1] tracking-tight"
                style={{
                  background: "linear-gradient(160deg, #ffffff 0%, #a78bfa 50%, #67e8f9 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                Recover Your Body.<br />Sharpen Your Mind.
              </motion.h1>

              {/* subheadline */}
              <motion.p
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.32 }}
                className="text-base md:text-lg text-white/55 max-w-md leading-relaxed"
              >
                The world&apos;s first browser-based, AI-powered physical therapy and exercise
                tracking platform. No hardware required — just your camera.
              </motion.p>

              {/* CTAs */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.44 }}
                className="flex flex-wrap items-center gap-3"
              >
                <Link href="/signup" className="flex">
                  <Button className="h-11 bg-violet-600 hover:bg-violet-500 text-white px-7 rounded-xl text-sm font-semibold shadow-xl shadow-violet-900/50 transition-all duration-200 hover:scale-[1.03]">
                    Get Started
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  onClick={() => setTrialOpen(true)}
                  className="h-11 flex items-center gap-2 border border-violet-500/40 bg-violet-500/10 hover:bg-violet-500/20 text-violet-300 hover:text-violet-200 px-7 rounded-xl text-sm font-semibold backdrop-blur-sm transition-colors duration-200"
                  style={{ boxShadow: '0 0 20px rgba(139,92,246,0.15)' }}
                >
                  <Zap className="h-4 w-4" />
                  Try Now — 60s Free
                </motion.button>
                <Button
                  variant="ghost"
                  className="h-11 border border-white/15 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white px-7 rounded-xl text-sm font-semibold backdrop-blur-sm transition-all duration-200"
                >
                  Watch Demo
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </motion.div>

              {/* social proof strip */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="flex items-center gap-3 text-xs text-white/35"
              >
                <div className="flex -space-x-2">
                  {["bg-violet-500", "bg-cyan-500", "bg-emerald-500", "bg-pink-500"].map((c, i) => (
                    <div key={i} className={`h-6 w-6 rounded-full border-2 border-black/80 ${c}`} />
                  ))}
                </div>
                <span>Trusted by <strong className="text-white/60">2,400+</strong> patients & therapists</span>
              </motion.div>
            </div>

            {/* ── Right: Spline robot ── */}
            <div className="flex-1 relative min-h-[400px] lg:min-h-0">
              <SplineScene
                scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode"
                className="w-full h-full"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          FEATURES BENTO GRID
      ══════════════════════════════════════ */}
      <section id="features" className="relative z-10 px-6 py-24">
        <div className="max-w-6xl mx-auto">
          <Reveal className="text-center mb-14">
            <p className="text-xs font-semibold tracking-widest text-violet-400 uppercase mb-3">
              Core Capabilities
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-white">
              Everything your recovery needs
            </h2>
            <p className="mt-4 text-white/45 max-w-xl mx-auto text-sm md:text-base">
              reviVAI combines computer vision, AI, and clinical-grade data security into a single, frictionless platform.
            </p>
          </Reveal>

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            className="grid grid-cols-1 md:grid-cols-3 gap-5"
          >
            {features.map((f) => (
              <motion.div key={f.title} variants={floatUp}>
                <GlassCard className="p-7 h-full flex flex-col gap-5 group hover:border-white/20 transition-colors duration-300 relative overflow-hidden">
                  {/* accent gradient */}
                  <div
                    className={`absolute inset-0 bg-linear-to-br ${f.accent} opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`}
                  />
                  <div className="relative z-10 flex flex-col gap-5 h-full">
                    <div className="flex items-start justify-between">
                      <div className={`p-2.5 rounded-xl border border-white/10 bg-white/5 ${f.iconColor}`}>
                        <f.icon className="h-5 w-5" />
                      </div>
                      <span className="text-[10px] font-semibold tracking-widest text-white/30 uppercase">
                        {f.tag}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-2">{f.title}</h3>
                      <p className="text-sm text-white/50 leading-relaxed">{f.description}</p>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          HOW IT WORKS
      ══════════════════════════════════════ */}
      <section id="how-it-works" className="relative z-10 px-6 py-24">
        <div className="max-w-5xl mx-auto">
          <Reveal className="text-center mb-16">
            <p className="text-xs font-semibold tracking-widest text-cyan-400 uppercase mb-3">
              Simple Process
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-white">
              Up and running in 60 seconds
            </h2>
          </Reveal>

          <div className="relative">
            {/* connecting line */}
            <div className="hidden md:block absolute top-10 left-[calc(16.67%+1rem)] right-[calc(16.67%+1rem)] h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />

            <motion.div
              variants={stagger}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              className="grid grid-cols-1 md:grid-cols-3 gap-8"
            >
              {steps.map((s) => (
                <motion.div key={s.step} variants={floatUp} className="flex flex-col items-center text-center gap-5">
                  <div className="relative">
                    <div className="h-20 w-20 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md flex items-center justify-center">
                      <s.icon className="h-8 w-8 text-white/70" />
                    </div>
                    <span className="absolute -top-2 -right-2 text-[10px] font-bold text-white/30 bg-black border border-white/10 rounded-full h-5 w-5 flex items-center justify-center">
                      {s.step}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-white mb-2">{s.title}</h3>
                    <p className="text-sm text-white/45 leading-relaxed">{s.description}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          TESTIMONIALS
      ══════════════════════════════════════ */}
      <section id="testimonials" className="relative z-10 px-6 py-24">
        <div className="max-w-6xl mx-auto">
          <Reveal className="text-center mb-14">
            <p className="text-xs font-semibold tracking-widest text-emerald-400 uppercase mb-3">
              Social Proof
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-white">
              Loved by clinicians &amp; patients
            </h2>
            <p className="mt-4 text-white/45 max-w-xl mx-auto text-sm md:text-base">
              From post-surgical recovery to elite athletic performance — real outcomes from real people.
            </p>
          </Reveal>

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            className="grid grid-cols-1 md:grid-cols-3 gap-5"
          >
            {[
              {
                quote:
                  "reviVAI has fundamentally changed how I monitor patients between sessions. The real-time skeletal data gives me objective, reproducible evidence I simply never had before. It's the closest thing to having a clinical eye in the patient's living room.",
                name: "Dr. Sarah Chen, DPT",
                role: "Clinical Director, Stanford Rehabilitation Center",
                initial: "S",
                accent: "from-violet-500 to-purple-600",
                glow: "rgba(139,92,246,0.18)",
                stars: 5,
              },
              {
                quote:
                  "After my ACL reconstruction I used reviVAI every single day. The AI flagged a quad-dominant compensation pattern my PT hadn't caught yet. I returned to the field three weeks ahead of my projected timeline — and my surgeon was genuinely surprised.",
                name: "Marcus T.",
                role: "Semi-professional footballer · Post-ACL rehab",
                initial: "M",
                accent: "from-cyan-500 to-blue-600",
                glow: "rgba(6,182,212,0.18)",
                stars: 5,
              },
              {
                quote:
                  "Six weeks post hip replacement and I was doing my home exercises with zero confidence I was doing them right. reviVAI gave me instant visual feedback and counted every rep. My recovery score at the 8-week check-up was in the top 10% for my age group.",
                name: "Patricia W.",
                role: "Post-operative hip replacement patient, 64",
                initial: "P",
                accent: "from-emerald-500 to-teal-600",
                glow: "rgba(16,185,129,0.18)",
                stars: 5,
              },
            ].map((t) => (
              <motion.div key={t.name} variants={floatUp}>
                <div
                  className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 md:p-8 backdrop-blur-md relative overflow-hidden h-full flex flex-col gap-5 hover:border-white/20 transition-colors duration-300 group"
                >
                  {/* Subtle glow accent */}
                  <div
                    className="pointer-events-none absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{
                      background: `radial-gradient(circle, ${t.glow} 0%, transparent 70%)`,
                      filter: "blur(20px)",
                    }}
                  />

                  {/* Stars */}
                  <div className="relative z-10 flex gap-1">
                    {Array.from({ length: t.stars }).map((_, i) => (
                      <svg key={i} className="h-4 w-4 fill-amber-400 text-amber-400" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>

                  {/* Quote */}
                  <p className="relative z-10 text-sm text-white/65 leading-relaxed flex-1">
                    &ldquo;{t.quote}&rdquo;
                  </p>

                  {/* Author */}
                  <div className="relative z-10 flex items-center gap-3 pt-4 border-t border-white/8">
                    <div
                      className={`h-9 w-9 rounded-full bg-gradient-to-br ${t.accent} flex items-center justify-center text-xs font-bold text-white shrink-0`}
                    >
                      {t.initial}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{t.name}</p>
                      <p className="text-xs text-white/40">{t.role}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          BOTTOM CTA
      ══════════════════════════════════════ */}
      <section className="relative z-10 px-6 py-24">
        <Reveal>
          <GlassCard className="max-w-3xl mx-auto p-12 text-center relative overflow-hidden">
            {/* glow */}
            <div
              className="pointer-events-none absolute inset-0 rounded-2xl"
              style={{
                background:
                  "radial-gradient(ellipse 70% 60% at 50% 50%, rgba(139,92,246,0.15) 0%, transparent 70%)",
              }}
            />
            <div className="relative z-10 flex flex-col items-center gap-6">
              <span className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1.5 text-xs font-medium text-violet-300 tracking-wide">
                <span className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-pulse" />
                Free to start · No credit card required
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-white leading-tight">
                Start your recovery journey today
              </h2>
              <p className="text-white/50 max-w-md text-sm md:text-base leading-relaxed">
                Join thousands of patients and therapists already using reviVAI to achieve better outcomes, faster.
              </p>
              <div className="flex flex-wrap gap-4 justify-center">
                <Link href="/signup">
                  <Button className="bg-violet-600 hover:bg-violet-500 text-white px-8 py-3 rounded-xl text-sm font-semibold shadow-xl shadow-violet-900/50 transition-all duration-200 hover:scale-[1.03]">
                    Create Free Account
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/login">
                  <Button
                    variant="ghost"
                    className="border border-white/15 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white px-8 py-3 rounded-xl text-sm font-semibold backdrop-blur-sm"
                  >
                    Sign In
                  </Button>
                </Link>
              </div>
            </div>
          </GlassCard>
        </Reveal>
      </section>

      {/* ══════════════════════════════════════
          FOOTER
      ══════════════════════════════════════ */}
      <footer className="relative z-10 border-t border-white/5 px-6 py-10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <Link href="/" className="text-lg font-bold text-white tracking-tight">
            revi<span className="text-violet-400">VAI</span>
          </Link>

          <nav className="flex flex-wrap justify-center gap-6 text-xs text-white/35">
            <a href="#features" className="hover:text-white/70 transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-white/70 transition-colors">How It Works</a>
            <Link href="/login" className="hover:text-white/70 transition-colors">Login</Link>
            <Link href="/signup" className="hover:text-white/70 transition-colors">Sign Up</Link>
            <Link href="/doctor-register" className="hover:text-white/70 transition-colors">For Clinicians</Link>
          </nav>

          <p className="text-xs text-white/25">
            © {new Date().getFullYear()} reviVAI. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
