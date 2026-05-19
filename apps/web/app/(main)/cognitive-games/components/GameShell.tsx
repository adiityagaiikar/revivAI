'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@workspace/ui/components/button';
import { Card } from '@workspace/ui/components/card';
import { usePatientPlan, isGameAllowed } from '@/hooks/usePatientPlan';

interface GameShellProps {
  title: string;
  category: string;
  stats?: React.ReactNode;
  children: React.ReactNode;
  /** When set, blocks access if doctor personalization excludes this game */
  gameSlug?: string;
}

export default function GameShell({ title, category, stats, children, gameSlug }: GameShellProps) {
  const { plan, loading: planLoading } = usePatientPlan();

  if (gameSlug && planLoading) {
    return (
      <div className="space-y-6 py-12 text-center text-neutral-400">
        <div className="animate-spin h-8 w-8 border-2 border-purple-500 border-t-transparent rounded-full mx-auto" />
        <p>Loading your care plan…</p>
      </div>
    );
  }

  if (gameSlug && !isGameAllowed(gameSlug, plan)) {
    return (
      <div className="space-y-6">
        <Card className="bg-black/[0.96] border-white/10 p-8 max-w-lg mx-auto text-center">
          <h2 className="text-xl font-semibold text-white mb-2">Not assigned to your plan</h2>
          <p className="text-neutral-400 text-sm mb-6">
            Your doctor has personalized your program. This cognitive activity is not part of your current assignments.
          </p>
          <Link href="/cognitive-games">
            <Button className="bg-white text-black hover:bg-white/90">Back to cognitive games</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <Link href="/cognitive-games">
          <Button variant="ghost" className="text-white hover:bg-white/10">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Games
          </Button>
        </Link>
        {stats}
      </div>

      <div className="bg-black/[0.96] border border-white/10 rounded-2xl p-8 min-h-[400px] flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}
