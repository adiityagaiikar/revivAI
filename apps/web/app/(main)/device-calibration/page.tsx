import { Settings, Cpu, Wifi, WifiOff, AlertTriangle } from 'lucide-react'
import { GlassCard } from '@/components/GlassCard'

const DEVICE_SLOTS = [
  {
    id: 'imu-01',
    label: 'IMU Sensor — Left Knee',
    status: 'not_paired',
    description: 'Inertial Measurement Unit for knee angle tracking during exercises.',
  },
  {
    id: 'imu-02',
    label: 'IMU Sensor — Right Knee',
    status: 'not_paired',
    description: 'Inertial Measurement Unit for knee angle tracking during exercises.',
  },
  {
    id: 'emg-01',
    label: 'EMG Band — Quadriceps',
    status: 'not_paired',
    description: 'Electromyography band for muscle activation feedback.',
  },
]

export default function DeviceCalibrationPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* ── Header ── */}
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-xl border border-cyan-500/20 bg-cyan-500/10">
          <Settings className="w-6 h-6 text-cyan-400" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Device Calibration</h1>
          <p className="text-white/60 mt-1">Manage and calibrate connected wearable sensors and peripherals.</p>
        </div>
      </div>

      {/* ── Warning banner ── */}
      <GlassCard className="p-4 flex items-center gap-4 border-red-500/20 bg-red-500/5">
        <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20">
          <AlertTriangle className="w-4 h-4 text-red-400" />
        </div>
        <div>
          <p className="text-sm font-semibold text-white">No Devices Detected</p>
          <p className="text-xs text-white/50 mt-0.5">Ensure your sensors are powered on and Bluetooth is enabled on this device.</p>
        </div>
      </GlassCard>

      {/* ── Empty state ── */}
      <GlassCard className="p-12 flex flex-col items-center justify-center text-center min-h-[320px]">
        <div className="relative mb-6">
          <Cpu className="w-16 h-16 text-white/10" />
          <WifiOff className="w-6 h-6 text-red-400/40 absolute -bottom-1 -right-1" />
        </div>
        <h2 className="text-xl font-semibold text-white mb-2">No Active Devices</h2>
        <p className="text-white/50 max-w-md text-sm leading-relaxed">
          Connect a compatible wearable sensor to begin calibration. Supported devices include BLE IMU bands and surface EMG monitors.
        </p>
        <div className="mt-6 flex items-center gap-2 text-xs text-white/25">
          <Wifi className="w-3.5 h-3.5" />
          <span>Scanning for Bluetooth devices…</span>
          <span className="inline-flex gap-0.5">
            <span className="w-1 h-1 rounded-full bg-white/20 animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1 h-1 rounded-full bg-white/20 animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1 h-1 rounded-full bg-white/20 animate-bounce" style={{ animationDelay: '300ms' }} />
          </span>
        </div>
      </GlassCard>

      {/* ── Device slot cards ── */}
      <div>
        <p className="text-xs font-semibold text-white/20 uppercase tracking-widest mb-3 px-1">Expected Device Slots</p>
        <div className="space-y-3">
          {DEVICE_SLOTS.map((device) => (
            <GlassCard key={device.id} className="p-5 flex items-center gap-4 opacity-50 pointer-events-none">
              <div className="p-2.5 rounded-xl border border-white/10 bg-white/5 shrink-0">
                <Cpu className="w-5 h-5 text-white/30" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-white">{device.label}</p>
                  <span className="px-2 py-0.5 rounded-full border border-red-500/20 bg-red-500/10 text-[10px] font-bold text-red-400">
                    Not Paired
                  </span>
                </div>
                <p className="text-xs text-white/35 mt-1">{device.description}</p>
              </div>
              <WifiOff className="w-4 h-4 text-white/15 shrink-0" />
            </GlassCard>
          ))}
        </div>
      </div>

    </div>
  )
}
