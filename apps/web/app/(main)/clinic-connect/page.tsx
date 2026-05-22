import { MessageSquare, Video, PhoneCall, CalendarDays } from 'lucide-react'
import { GlassCard } from '@/components/GlassCard'

const CHANNELS = [
  {
    icon: Video,
    label: 'Video Consultation',
    description: 'Schedule a live video session with your assigned physiotherapist.',
    color: 'text-violet-400',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/20',
    badge: 'Coming Soon',
    badgeColor: 'bg-violet-500/15 text-violet-300 border-violet-500/25',
  },
  {
    icon: MessageSquare,
    label: 'Secure Messaging',
    description: 'Send and receive HIPAA-compliant messages with your care team.',
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/20',
    badge: 'Coming Soon',
    badgeColor: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/25',
  },
  {
    icon: PhoneCall,
    label: 'Request Callback',
    description: 'Schedule a phone callback from a clinic coordinator within 24 hours.',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    badge: 'Coming Soon',
    badgeColor: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25',
  },
  {
    icon: CalendarDays,
    label: 'In-Clinic Appointment',
    description: 'Book an in-person slot at your nearest registered clinic location.',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    badge: 'Coming Soon',
    badgeColor: 'bg-amber-500/15 text-amber-300 border-amber-500/25',
  },
]

export default function ClinicConnectPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* ── Header ── */}
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-xl border border-cyan-500/20 bg-cyan-500/10">
          <MessageSquare className="w-6 h-6 text-cyan-400" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Clinic Connect</h1>
          <p className="text-white/60 mt-1">Secure, real-time communication with your clinical care team.</p>
        </div>
      </div>

      {/* ── Central empty state ── */}
      <GlassCard className="p-12 flex flex-col items-center justify-center text-center min-h-[280px]">
        <MessageSquare className="w-16 h-16 text-white/10 mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">No Active Connections</h2>
        <p className="text-white/50 max-w-md text-sm leading-relaxed">
          You are not currently connected to a clinic. Once your care team enrolls you, all communication channels below will activate automatically.
        </p>
      </GlassCard>

      {/* ── Channel cards ── */}
      <div>
        <p className="text-xs font-semibold text-white/20 uppercase tracking-widest mb-3 px-1">Available Channels</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {CHANNELS.map((ch) => {
            const Icon = ch.icon
            return (
              <GlassCard key={ch.label} className="p-5 flex items-start gap-4 opacity-60 pointer-events-none">
                <div className={`p-2.5 rounded-xl border ${ch.bg} ${ch.border} shrink-0`}>
                  <Icon className={`w-5 h-5 ${ch.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-white">{ch.label}</p>
                    <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold tracking-wide ${ch.badgeColor}`}>
                      {ch.badge}
                    </span>
                  </div>
                  <p className="text-xs text-white/40 mt-1 leading-relaxed">{ch.description}</p>
                </div>
              </GlassCard>
            )
          })}
        </div>
      </div>

    </div>
  )
}
