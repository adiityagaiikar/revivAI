'use client'

import { useState } from "react"
import { Card } from "@workspace/ui/components/card"
import { Calendar, Bell, Plus, Clock, User, AlertCircle, Search, Video } from "lucide-react"

// Dummy Data
const INITIAL_APPOINTMENTS = [
  { id: 1, patientName: "Sarah Connor", date: "2026-04-20", time: "10:00 AM", type: "Video Consult" },
  { id: 2, patientName: "John Smith", date: "2026-04-20", time: "02:30 PM", type: "In-Person Clinic" },
  { id: 3, patientName: "Emma Davis", date: "2026-04-21", time: "09:15 AM", type: "Follow-up" },
]

const ALERTS = [
  { id: 1, message: "Drastic drop in cognitive scores for Patient: Robert Kiyosaki", urgency: "High", date: "Today, 08:30 AM" },
  { id: 2, message: "Alex Mercer missed 3 consecutive physical therapy sessions.", urgency: "Medium", date: "Yesterday" },
  { id: 3, message: "New MRI Results available for Emma Davis.", urgency: "Low", date: "Apr 14" }
]

export default function SchedulerPage() {
  const [appointments, setAppointments] = useState(INITIAL_APPOINTMENTS)
  const [showModal, setShowModal] = useState(false)
  const [newAppt, setNewAppt] = useState({ patientName: '', date: '', time: '', type: 'Video Consult' })

  const handleSchedule = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newAppt.patientName || !newAppt.date || !newAppt.time) return
    setAppointments([...appointments, { id: Date.now(), ...newAppt }].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()))
    setShowModal(false)
    setNewAppt({ patientName: '', date: '', time: '', type: 'Video Consult' })
  }

  return (
    <div className="max-w-6xl mx-auto w-full space-y-8 pb-12 relative animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2 text-white">Scheduler & Alerts</h1>
          <p className="text-neutral-400">Manage patient appointments and monitor critical alerts.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          New Appointment
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Appointments Section */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2 mb-4">
            <Calendar className="h-5 w-5 text-blue-400" />
            Upcoming Appointments
          </h2>
          
          {appointments.map((appt) => (
            <Card key={appt.id} className="bg-black border-white/10 p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-white/20 transition-all shadow-md hover:shadow-xl hover:shadow-blue-500/5 cursor-default">
              <div className="flex items-center gap-4 w-full">
                <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl hidden sm:block">
                  {appt.type.includes('Video') ? <Video className="h-6 w-6" /> : <User className="h-6 w-6" />}
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-white text-lg">{appt.patientName}</h3>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-neutral-400 mt-1">
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3 " /> {appt.date}</span>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3 " /> {appt.time}</span>
                    <span className="px-2 py-0.5 bg-white/5 border border-white/10 rounded-md text-xs">{appt.type}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 self-end sm:self-auto w-full sm:w-auto mt-2 sm:mt-0">
                <button className="flex-1 sm:flex-none px-3 py-1.5 text-sm bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors border border-white/10 cursor-pointer">
                  Reschedule
                </button>
                <button 
                  onClick={() => setAppointments(appointments.filter(a => a.id !== appt.id))}
                  className="flex-1 sm:flex-none px-3 py-1.5 text-sm bg-red-500/10 hover:bg-red-500/20 text-red-500 hover:text-red-400 border border-red-500/10 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </Card>
          ))}
          {appointments.length === 0 && (
            <div className="text-neutral-500 py-12 text-center border border-dashed border-white/10 rounded-xl bg-white/5">
              <Calendar className="h-8 w-8 mx-auto mb-3 opacity-50" />
              <p>No upcoming appointments.</p>
            </div>
          )}
        </div>

        {/* Alerts Section */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2 mb-4">
            <Bell className="h-5 w-5 text-orange-400" />
            Critical Alerts
          </h2>
          
          <div className="space-y-3">
            {ALERTS.map((alert) => (
              <Card key={alert.id} className={`bg-black/80 border border-white/10 p-4 border-l-4 hover:bg-white/5 transition-colors cursor-pointer ${
                alert.urgency === 'High' ? 'border-l-red-500' : alert.urgency === 'Medium' ? 'border-l-orange-500' : 'border-l-blue-500'
              }`}>
                <div className="flex items-start gap-3">
                  <AlertCircle className={`h-5 w-5 shrink-0 mt-0.5 ${
                    alert.urgency === 'High' ? 'text-red-500' : alert.urgency === 'Medium' ? 'text-orange-500' : 'text-blue-500'
                  }`} />
                  <div>
                    <p className="text-white text-sm font-medium leading-snug">{alert.message}</p>
                    <p className="text-neutral-500 text-xs mt-2">{alert.date}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Basic Scheduling Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
          <Card className="w-full max-w-md bg-neutral-950 border border-white/10 p-6 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <h2 className="text-xl font-bold text-white mb-4">Schedule Appointment</h2>
            <form onSubmit={handleSchedule} className="space-y-4">
              <div>
                <label className="block text-sm text-neutral-400 mb-1">Patient Name</label>
                <input 
                  type="text" 
                  autoFocus
                  required
                  value={newAppt.patientName}
                  onChange={e => setNewAppt({...newAppt, patientName: e.target.value})}
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2.5 text-white placeholder-neutral-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all" 
                  placeholder="e.g. John Doe"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-neutral-400 mb-1">Date</label>
                  <input 
                    type="date" 
                    required
                    value={newAppt.date}
                    onChange={e => setNewAppt({...newAppt, date: e.target.value})}
                    className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2.5 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all" 
                    style={{ colorScheme: 'dark' }}
                  />
                </div>
                <div>
                  <label className="block text-sm text-neutral-400 mb-1">Time</label>
                  <input 
                    type="time" 
                    required
                    value={newAppt.time}
                    onChange={e => setNewAppt({...newAppt, time: e.target.value})}
                    className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2.5 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all" 
                    style={{ colorScheme: 'dark' }}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-neutral-400 mb-1">Appointment Type</label>
                <select 
                  value={newAppt.type}
                  onChange={e => setNewAppt({...newAppt, type: e.target.value})}
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2.5 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all"
                >
                  <option className="bg-neutral-900">Video Consult</option>
                  <option className="bg-neutral-900">In-Person Clinic</option>
                  <option className="bg-neutral-900">Follow-up</option>
                  <option className="bg-neutral-900">Therapy Evaluation</option>
                </select>
              </div>
              
              <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-white/10">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-neutral-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-6 py-2 bg-white text-black font-semibold rounded-lg hover:bg-neutral-200 transition-colors shadow-[0_0_15px_rgba(255,255,255,0.2)] cursor-pointer"
                >
                  Confirm 
                </button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  )
}
