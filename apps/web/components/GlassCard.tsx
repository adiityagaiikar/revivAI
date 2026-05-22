import { cn } from '@workspace/ui/lib/utils'

interface GlassCardProps {
  children: React.ReactNode
  className?: string
  glow?: boolean
  style?: React.CSSProperties
}

/**
 * GlassCard — Shared Antigravity UI card primitive.
 * Glassmorphism: dark translucent background, subtle border, backdrop blur.
 */
export function GlassCard({ children, className, glow = false, style }: GlassCardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-md',
        glow && 'shadow-[0_0_32px_rgba(6,182,212,0.12)] border-cyan-500/20',
        className
      )}
      style={style}
    >
      {children}
    </div>
  )
}
