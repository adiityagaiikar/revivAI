'use client'

import { useState } from 'react'
import { Card } from "@workspace/ui/components/card"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Spotlight } from "@workspace/ui/components/spotlight"
import { Mail, Lock, LogIn, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function LoginPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      console.log('Attempting login...')
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await response.json()
      console.log('Login response:', response.status, data)

      if (!response.ok) {
        throw new Error(data.message || data.error || `Login failed (${response.status})`)
      }

      // Store token and redirect
      localStorage.setItem('token', data.token)
      console.log('Token stored, redirecting to dashboard...')
      
      // Try Next.js router first, fallback to hard redirect
      const targetRoute = data.user?.role === 'doctor' ? '/doctor-dashboard' : '/dashboard'
      try {
        router.push(targetRoute)
        router.refresh()
      } catch (e) {
        window.location.href = targetRoute
      }
    } catch (err: any) {
      console.error('Login error:', err)
      if (err.message === 'Failed to fetch') {
        setError('Cannot connect to server. Please make sure backend is running on port 5000.')
      } else {
        setError(err.message)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full bg-black flex flex-col">
      {/* Header with Logo */}
      <header className="w-full flex justify-between items-center p-6">
        <Link href="/" className="text-2xl font-bold text-white tracking-tight hover:opacity-80 transition-opacity">
          revivAl
        </Link>
        <Link href="/">
          <Button 
            variant="ghost" 
            className="text-white hover:text-white hover:bg-white/10"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <Card className="w-full max-w-md bg-black/[0.96] relative overflow-hidden border-white/10 p-8">
          <Spotlight
            className="-top-40 left-0 md:left-60 md:-top-20"
            fill="white"
          />
          
          <div className="relative z-10">
            <h1 className="text-3xl font-bold text-white mb-2">Welcome Back</h1>
            <p className="text-neutral-400 mb-8">Sign in to your account to continue</p>

            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-white">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, email: e.target.value })}
                    className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-neutral-500 focus:border-white/30"
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
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, password: e.target.value })}
                    className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-neutral-500 focus:border-white/30"
                    required
                  />
                </div>
              </div>

              <Button 
                type="submit"
                className="w-full bg-white text-black hover:bg-white/90"
                disabled={loading}
              >
                <LogIn className="mr-2 h-4 w-4" />
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>

            <p className="mt-6 text-center text-neutral-400 text-sm">
              Don&apos;t have an account?{' '}
              <Link href="/signup" className="text-white hover:underline">
                Sign up
              </Link>
            </p>
            <p className="mt-2 text-center text-neutral-500 text-xs">
              Are you a medical professional?{' '}
              <Link href="/doctor-register" className="text-white hover:underline">
                Register as Doctor
              </Link>
            </p>
          </div>
        </Card>
      </main>
    </div>
  )
}
