'use client';

import { useState, useEffect } from 'react';
import GameShell from '../components/GameShell';
import { saveGameScore } from '../utils/gameScores';
import { API } from '@/lib/api';

const ALL_PAIRS = [
  { q: 'Ocean', a: 'Sand' },
  { q: 'Guitar', a: 'Song' },
  { q: 'Tree', a: 'Leaf' },
  { q: 'Book', a: 'Page' },
  { q: 'Sun', a: 'Light' },
  { q: 'Bird', a: 'Feather' },
  { q: 'Car', a: 'Road' },
  { q: 'Coffee', a: 'Mug' },
  { q: 'Mountain', a: 'Snow' },
  { q: 'River', a: 'Fish' },
];

export default function WordPairsGame() {
  const [phase, setPhase]           = useState<'idle' | 'study' | 'test' | 'results'>('idle');
  const [activePairs, setActivePairs] = useState<{ q: string; a: string }[]>([]);
  const [studyTime, setStudyTime]   = useState(10);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [score, setScore]           = useState(0);
  const [options, setOptions]       = useState<string[]>([]);
  const [lastAnswer, setLastAnswer] = useState<'correct' | 'wrong' | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (phase === 'study' && studyTime > 0) {
      timer = setInterval(() => setStudyTime(p => p - 1), 1000);
    } else if (phase === 'study' && studyTime === 0) {
      startTestPhase();
    }
    return () => clearInterval(timer);
  }, [phase, studyTime]);

  const startGame = () => {
    const shuffled = [...ALL_PAIRS].sort(() => 0.5 - Math.random()).slice(0, 4);
    setActivePairs(shuffled);
    setScore(0);
    setCurrentIdx(0);
    setStudyTime(12);
    setLastAnswer(null);
    setPhase('study');
  };

  const startTestPhase = () => {
    setPhase('test');
    buildOptions(0);
  };

  const buildOptions = (idx: number) => {
    const correct = activePairs[idx]?.a ?? '';
    const wrongs = ALL_PAIRS
      .filter(p => p.a !== correct)
      .sort(() => 0.5 - Math.random())
      .slice(0, 3)
      .map(p => p.a);
    setOptions([correct, ...wrongs].sort(() => 0.5 - Math.random()));
  };

  const saveActivity = async (finalScore: number) => {
    const pct = Math.round((finalScore / 4) * 100);
    saveGameScore('word-pairs', pct, `Score: ${finalScore}/4`);
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      await fetch(`${API}/dashboard/activity`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Word Pairs', type: 'Cognitive', score: `${pct}%`, duration: '1 mins' }),
      });
    } catch { /* silent */ }
  };

  const handleAnswer = (selected: string) => {
    const isCorrect = selected === activePairs[currentIdx]?.a;
    setLastAnswer(isCorrect ? 'correct' : 'wrong');
    const newScore = isCorrect ? score + 1 : score;
    if (isCorrect) setScore(newScore);

    setTimeout(() => {
      setLastAnswer(null);
      if (currentIdx + 1 < activePairs.length) {
        setCurrentIdx(p => p + 1);
        buildOptions(currentIdx + 1);
      } else {
        setPhase('results');
        saveActivity(newScore);
      }
    }, 500);
  };

  const pct = Math.round((score / 4) * 100);

  return (
    <GameShell
      title="Word Pairs"
      category="Associative Memory"
      gameSlug="word-pairs"
      stats={
        <div className="flex items-center gap-3">
          <div className="text-center px-4 py-2 rounded-xl bg-white/5 border border-white/10">
            <p className="text-[10px] text-white/40 uppercase tracking-widest">Score</p>
            <p className="text-xl font-bold text-white">{score} <span className="text-white/30 text-base">/ 4</span></p>
          </div>
          {phase === 'study' && (
            <div className="text-center px-4 py-2 rounded-xl bg-white/5 border border-white/10">
              <p className="text-[10px] text-white/40 uppercase tracking-widest">Time</p>
              <p className={`text-xl font-bold ${studyTime <= 3 ? 'text-red-400 animate-pulse' : 'text-amber-400'}`}>{studyTime}s</p>
            </div>
          )}
          {phase === 'test' && (
            <div className="text-center px-4 py-2 rounded-xl bg-white/5 border border-white/10">
              <p className="text-[10px] text-white/40 uppercase tracking-widest">Q</p>
              <p className="text-xl font-bold text-violet-400">{currentIdx + 1} <span className="text-white/30 text-base">/ 4</span></p>
            </div>
          )}
        </div>
      }
    >
      <div className="flex flex-col items-center w-full max-w-lg mx-auto gap-6">

        {/* ── IDLE state ── */}
        {phase === 'idle' && (
          <div className="text-center space-y-6">
            <div className="p-5 rounded-2xl border border-violet-500/20 bg-violet-500/5 inline-block">
              <p className="text-4xl">🧠</p>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white mb-2">Word Pairs</h2>
              <p className="text-white/50 text-sm leading-relaxed max-w-xs mx-auto">
                Study 4 word pairs for 12 seconds, then answer which word pairs with which.
              </p>
            </div>
            <button
              onClick={startGame}
              className="px-8 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-500 hover:from-violet-400 hover:to-cyan-400 text-white font-semibold text-sm shadow-[0_0_20px_rgba(139,92,246,0.3)] transition-all"
            >
              Start Assessment
            </button>
          </div>
        )}

        {/* ── STUDY state ── */}
        {phase === 'study' && (
          <div className="w-full space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-bold text-white">Memorize These Pairs</h2>
              <span className={`text-sm font-bold px-3 py-1 rounded-full border ${
                studyTime <= 3
                  ? 'text-red-400 border-red-500/30 bg-red-500/10'
                  : 'text-amber-400 border-amber-500/30 bg-amber-500/10'
              }`}>
                {studyTime}s
              </span>
            </div>
            <div className="space-y-3">
              {activePairs.map((pair, i) => (
                <div key={i} className="flex items-center justify-between p-4 rounded-xl border border-white/10 bg-white/[0.03]">
                  <span className="font-semibold text-white text-lg">{pair.q}</span>
                  <span className="text-white/20 text-xl">→</span>
                  <span className="font-semibold text-cyan-400 text-lg">{pair.a}</span>
                </div>
              ))}
            </div>
            {/* Time bar */}
            <div className="h-1 w-full bg-white/8 rounded-full overflow-hidden mt-2">
              <div
                className="h-full bg-gradient-to-r from-violet-500 to-cyan-500 rounded-full transition-all duration-1000"
                style={{ width: `${(studyTime / 12) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* ── TEST state ── */}
        {phase === 'test' && (
          <div className="w-full space-y-6">
            <div className="text-center">
              <p className="text-[11px] text-white/30 uppercase tracking-widest mb-3">What pairs with…</p>
              <h2 className="text-5xl font-black text-white">{activePairs[currentIdx]?.q}</h2>
            </div>

            {/* Feedback flash */}
            {lastAnswer && (
              <div className={`text-center text-sm font-bold py-2 rounded-xl ${
                lastAnswer === 'correct'
                  ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
                  : 'text-red-400 bg-red-500/10 border border-red-500/20'
              }`}>
                {lastAnswer === 'correct' ? '✓ Correct!' : `✗ It was: ${activePairs[currentIdx]?.a}`}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              {options.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => !lastAnswer && handleAnswer(opt)}
                  disabled={!!lastAnswer}
                  className={`py-4 rounded-xl border text-white font-medium text-sm transition-all duration-200 ${
                    lastAnswer
                      ? opt === activePairs[currentIdx]?.a
                        ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                        : 'border-white/8 bg-white/3 opacity-40'
                      : 'border-white/10 bg-white/5 hover:bg-white/10 hover:border-violet-500/30'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── RESULTS state ── */}
        {phase === 'results' && (
          <div className="text-center space-y-6 w-full">
            <div>
              <div className={`text-6xl font-black mb-2 ${
                pct >= 75 ? 'text-emerald-400' : pct >= 50 ? 'text-amber-400' : 'text-red-400'
              }`}>
                {pct}%
              </div>
              <p className="text-white/60 text-sm">
                You recalled <span className="text-white font-bold">{score}</span> out of 4 pairs correctly.
              </p>
            </div>

            {/* Score bar */}
            <div className="w-full h-2 bg-white/8 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  pct >= 75 ? 'bg-emerald-400' : pct >= 50 ? 'bg-amber-400' : 'bg-red-400'
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>

            <button
              onClick={startGame}
              className="px-8 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-500 hover:from-violet-400 hover:to-cyan-400 text-white font-semibold text-sm shadow-[0_0_20px_rgba(139,92,246,0.3)] transition-all"
            >
              Play Again
            </button>
          </div>
        )}
      </div>
    </GameShell>
  );
}
