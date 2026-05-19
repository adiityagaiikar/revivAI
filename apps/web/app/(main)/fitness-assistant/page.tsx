'use client'

import { Card } from "@workspace/ui/components/card"
import { Spotlight } from "@workspace/ui/components/spotlight"
import { Dumbbell, Mic, MessageSquare, Play } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@workspace/ui/components/dialog"
import { useState } from "react"
import { ElevenLabsVoiceChat } from "@/components/elevenlabs-voice-chat"
import { usePatientPlan, isExerciseAllowed } from "@/hooks/usePatientPlan"

const ELEVENLABS_AGENT_ID = "agent_5201kndzmwmmew99xsex4237d84t"

const QUICK_WORKOUTS = [
  { slug: 'squats', id: 'gcNh17Ckjgg', name: 'Perfect Squats Tutorial', duration: '3 Min', level: 'Clinical', channel: 'Form Guide' },
  { slug: 'lunges', id: 'D7KaRcUTQeE', name: 'Safe Lunges Tutorial', duration: '4 Min', level: 'Clinical', channel: 'Form Guide' },
  { slug: 'warrior-pose', id: 'm1zDkYccTJU', name: 'Warrior Pose Foundation', duration: '5 Min', level: 'Clinical', channel: 'Form Guide' },
];

export default function FitnessAssistantPage() {
  const [voiceChatOpen, setVoiceChatOpen] = useState(false)
  const [activeVideo, setActiveVideo] = useState<{ id: string, name: string } | null>(null)
  const { plan, loading: planLoading } = usePatientPlan()

  const displayedWorkouts = QUICK_WORKOUTS.filter(workout => isExerciseAllowed(workout.slug, plan));

  return (
    <div className="space-y-8">
      <div className="relative">
        <Spotlight
          className="-top-20 left-0"
          fill="white"
        />
        <div className="relative z-10">
          <h1 className="text-4xl font-bold text-white mb-2">Fitness Assistant</h1>
          <p className="text-neutral-400">AI-powered personal trainer and workout guidance</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Assistant */}
        <Card className="lg:col-span-2 bg-black/[0.96] border-white/10 p-8 min-h-[500px] relative overflow-hidden">
          <div className="flex flex-col items-center justify-center h-full space-y-6">
            <div className="w-24 h-24 rounded-full bg-white/10 flex items-center justify-center animate-pulse">
              <Dumbbell className="h-12 w-12 text-white" />
            </div>
            <h2 className="text-2xl font-semibold text-white">How can I help you today?</h2>
            <p className="text-neutral-400 text-center max-w-md">
              Ask me about workouts, exercise form, fitness tips, or get a personalized training plan.
            </p>
            
            <div className="flex gap-4 mt-4">
              <Button
                type="button"
                className="bg-white text-black hover:bg-white/90"
                onClick={() => setVoiceChatOpen(true)}
              >
                <Mic className="mr-2 h-4 w-4" />
                Start Voice Chat
              </Button>
              <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
                <MessageSquare className="mr-2 h-4 w-4" />
                Text Chat
              </Button>
            </div>
          </div>
        </Card>

        {/* Quick Workouts */}
        <Card className="bg-black/[0.96] border-white/10 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Assigned Tutorials</h3>
          <div className="space-y-3">
            {planLoading ? (
              <p className="text-neutral-400 text-sm">Loading your program...</p>
            ) : displayedWorkouts.length === 0 ? (
              <p className="text-neutral-400 text-sm">No clinical tutorials assigned by your doctor.</p>
            ) : (
              displayedWorkouts.map((workout) => (
              <div 
                key={workout.id}
                onClick={() => setActiveVideo({ id: workout.id, name: workout.name })}
                className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer group"
              >
                <div>
                  <p className="font-medium text-white">{workout.name}</p>
                  <p className="text-sm text-neutral-400">{workout.duration} • {workout.channel}</p>
                </div>
                <Button size="icon" variant="ghost" className="text-neutral-400 group-hover:text-white shrink-0">
                  <Play className="h-4 w-4" />
                </Button>
              </div>
              ))
            )}
          </div>
        </Card>
      </div>

      <Dialog open={!!activeVideo} onOpenChange={(open) => !open && setActiveVideo(null)}>
        <DialogContent className="bg-black border-white/10 sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-white">{activeVideo?.name}</DialogTitle>
          </DialogHeader>
          {activeVideo && (
            <div className="aspect-video w-full rounded-md overflow-hidden bg-black mt-2">
              <iframe
                width="100%"
                height="100%"
                src={`https://www.youtube.com/embed/${activeVideo.id}?autoplay=1`}
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ElevenLabsVoiceChat
        agentId={ELEVENLABS_AGENT_ID}
        active={voiceChatOpen}
        onClose={() => setVoiceChatOpen(false)}
      />
    </div>
  )
}
