'use client'

import { useState } from 'react'
import { Card } from "@workspace/ui/components/card"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Spotlight } from "@workspace/ui/components/spotlight"
import { Mail, Lock, User, UserCircle, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { API } from '@/lib/api'

export default function DoctorRegisterPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    role: 'doctor'
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch(`${API}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Registration failed')
      }

      // Store token and redirect
      localStorage.setItem('token', data.token)
      
      try {
        router.push('/doctor-dashboard')
        router.refresh()
      } catch (e) {
        window.location.href = '/doctor-dashboard'
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full bg-black flex flex-col">
      <header className="w-full flex justify-between items-center p-6">
        <Link href="/" className="text-2xl font-bold text-white tracking-tight hover:opacity-80 transition-opacity">
          revivAl
        </Link>
        <Link href="/">
          <Button variant="ghost" className="text-white hover:text-white hover:bg-white/10">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <Card className="w-full max-w-md bg-black/[0.96] relative overflow-hidden border-white/10 p-8">
          <Spotlight className="-top-40 left-0 md:left-60 md:-top-20" fill="white" />
          
          <div className="relative z-10">
            <h1 className="text-3xl font-bold text-white mb-2">Doctor Registration</h1>
            <p className="text-neutral-400 mb-8">Create your doctor account to access the dashboard</p>

            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-white">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
                  <Input
                    id="name"
                    placeholder="Dr. John Doe"
                    value={formData.name}
                    onChange={(e: any) => setFormData({ ...formData, name: e.target.value })}
                    className="pl-10 bg-white/5 border-white/10 text-white"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="username" className="text-white">Username</Label>
                <div className="relative">
                  <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
                  <Input
                    id="username"
                    placeholder="johndoe"
                    value={formData.username}
                    onChange={(e: any) => setFormData({ ...formData, username: e.target.value })}
                    className="pl-10 bg-white/5 border-white/10 text-white"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-white">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="dr.johndoe@hospital.com"
                    value={formData.email}
                    onChange={(e: any) => setFormData({ ...formData, email: e.target.value })}
                    className="pl-10 bg-white/5 border-white/10 text-white"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-white">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter password"
                    value={formData.password}
                    onChange={(e: any) => setFormData({ ...formData, password: e.target.value })}
                    className="pl-10 bg-white/5 border-white/10 text-white"
                    required
                    minLength={6}
                  />
                </div>
              </div>

              <Button type="submit" className="w-full bg-blue-500 text-white hover:bg-blue-600 mt-2" disabled={loading}>
                {loading ? 'Registering...' : 'Register as Doctor'}
              </Button>
            </form>

            <p className="mt-6 text-center text-neutral-400 text-sm">
              Already have an account? <Link href="/login" className="text-white hover:underline">Sign in</Link>
            </p>
          </div>
        </Card>
      </main>
    </div>
  )
}
