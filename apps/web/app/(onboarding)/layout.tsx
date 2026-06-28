/**
 * app/(onboarding)/layout.tsx
 *
 * Standalone layout for the onboarding flow.
 * No sidebar, no nav — full-screen dark canvas.
 * AuthProvider is already applied by the root layout.
 */

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div
      className="min-h-screen w-full"
      style={{ background: '#050505' }}
    >
      {/* Cyan ambient glow at top */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            'radial-gradient(ellipse 60% 40% at 50% -5%, rgba(6,182,212,0.09) 0%, transparent 70%)',
        }}
      />
      {/* Violet ambient glow at bottom-right */}
      <div
        className="pointer-events-none fixed z-0"
        style={{
          bottom: '-10%',
          right: '-10%',
          width: 500,
          height: 500,
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 70%)',
          filter: 'blur(50px)',
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  )
}
