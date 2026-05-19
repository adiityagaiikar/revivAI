'use client'

import { useState } from 'react'
import { Card } from "@workspace/ui/components/card"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Spotlight } from "@workspace/ui/components/spotlight"
import { User, Mail, Lock, UserPlus, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { API } from '@/lib/api'

export default function SignupPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)

    try {
      const response = await fetch(`${API}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          username: formData.username,
          email: formData.email,
          password: formData.password
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Signup failed')
      }

      // Store token and redirect
      localStorage.setItem('token', data.token)
      router.push('/dashboard')
      router.refresh()
      
      // Fallback redirect if router doesn't work
      setTimeout(() => {
        window.location.href = '/dashboard'
      }, 100)
    } catch (err: any) {
      setError(err.message)
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
            <h1 className="text-3xl font-bold text-white mb-2">Create Account</h1>
            <p className="text-neutral-400 mb-8">Sign up to get started with revivAl</p>

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
                    type="text"
                    placeholder="Enter your full name"
                    value={formData.name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, name: e.target.value })}
                    className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-neutral-500 focus:border-white/30"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="username" className="text-white">Username</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
                  <Input
                    id="username"
                    type="text"
                    placeholder="Choose a username"
                    value={formData.username}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, username: e.target.value })}
                    className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-neutral-500 focus:border-white/30"
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
                    placeholder="Create a password"
                    value={formData.password}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, password: e.target.value })}
                    className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-neutral-500 focus:border-white/30"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-white">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm your password"
                    value={formData.confirmPassword}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-neutral-500 focus:border-white/30"
                    required
                  />
                </div>
              </div>

              <Button 
                type="submit"
                className="w-full bg-white text-black hover:bg-white/90 mt-2"
                disabled={loading}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                {loading ? 'Creating account...' : 'Create Account'}
              </Button>
            </form>

            <p className="mt-6 text-center text-neutral-400 text-sm">
              Already have an account?{' '}
              <Link href="/login" className="text-white hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </Card>
      </main>
    </div>
  )
}
