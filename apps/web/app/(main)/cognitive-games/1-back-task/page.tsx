'use client';

import { useState, useEffect, useRef } from 'react';
import GameShell from '../components/GameShell';
import { saveGameScore } from '../utils/gameScores';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'H', 'L', 'O', 'T'];

type Phase = 'idle' | 'playing' | 'over';

export default function NBackGame() {
  const [score, setScore]     = useState(0);
  const [strikes, setStrikes] = useState(0);
  const [phase, setPhase]     = useState<Phase>('idle');
  const [currentLetter, setCurrentLetter] = useState('?');
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [totalTurns, setTotalTurns] = useState(0);

  const historyRef  = useRef<string[]>([]);
  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const strikesRef  = useRef(0);
  const scoreRef    = useRef(0);
  const phaseRef    = useRef<Phase>('idle');

  // Keep refs in sync
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { strikesRef.current = strikes; }, [strikes]);
  useEffect(() => { scoreRef.current = score; }, [score]);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const endGame = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setPhase('over');
    saveGameScore('1-back-task', Math.min(100, scoreRef.current * 10), `Score: ${scoreRef.current}`);
  };

  const nextTurn = (hist: string[]) => {
    if (phaseRef.current === 'over') return;
    if (timerRef.current) clearInterval(timerRef.current);

    const forceMatch = Math.random() > 0.65 && hist.length > 0;
    const letter = forceMatch
      ? hist[hist.length - 1]!
      : LETTERS[Math.floor(Math.random() * LETTERS.length)]!;

    const newHist = [...hist, letter];
    historyRef.current = newHist;
    setCurrentLetter(letter);
    setTotalTurns(t => t + 1);

    // Auto-advance after 2.5 s (counts as "no match" guess)
    timerRef.current = setInterval(() => {
      handleGuess(false, newHist);
    }, 2500);
  };

  const startGame = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    historyRef.current = [];
    strikesRef.current = 0;
    scoreRef.current   = 0;
    setScore(0);
    setStrikes(0);
    setTotalTurns(0);
    setFeedback(null);
    setPhase('playing');
    nextTurn([]);
  };

  const handleGuess = (guessedMatch: boolean, hist = historyRef.current) => {
    if (phaseRef.current !== 'playing') return;
    if (timerRef.current) clearInterval(timerRef.current);

    const isActualMatch = hist.length > 1 && hist[hist.length - 1] === hist[hist.length - 2];
    const isCorrect = guessedMatch === isActualMatch;

    if (isCorrect) {
      if (guessedMatch) {
        setScore(s => { scoreRef.current = s + 1; return s + 1; });
      }
      setFeedback('correct');
    } else {
      setFeedback('wrong');
      const newStrikes = strikesRef.current + 1;
      strikesRef.current = newStrikes;
      setStrikes(newStrikes);
      if (newStrikes >= 3) {
        setTimeout(endGame, 600);
        return;
      }
    }

    setTimeout(() => {
      setFeedback(null);
      nextTurn(hist);
    }, 500);
  };

  return (
    <GameShell
      title="1-Back Task"
      category="Working Memory"
      gameSlug="1-back-task"
      stats={
        <div className="flex items-center gap-3">
          <div className="text-center px-4 py-2 rounded-xl bg-white/5 border border-white/10">
            <p className="text-[10px] text-white/40 uppercase tracking-widest">Score</p>
            <p className="text-xl font-bold text-white">{score}</p>
          </div>
          <div className="text-center px-4 py-2 rounded-xl bg-white/5 border border-white/10">
            <p className="text-[10px] text-white/40 uppercase tracking-widest">Strikes</p>
            <div className="flex gap-1 justify-center mt-0.5">
              {[0, 1, 2].map(i => (
                <span key={i} className={`h-3 w-3 rounded-full border ${
                  i < strikes ? 'bg-red-500 border-red-400' : 'border-white/20 bg-white/5'
                }`} />
              ))}
            </div>
          </div>
        </div>
      }
    >
      <div className="flex flex-col items-center gap-8 w-full max-w-md mx-auto">

        {/* ── IDLE state ── */}
        {phase === 'idle' && (
          <div className="text-center space-y-6">
            <div className="p-5 rounded-2xl border border-cyan-500/20 bg-cyan-500/5 inline-block">
              <span className="text-5xl">🧠</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white mb-2">1-Back Task</h2>
              <p className="text-white/50 text-sm leading-relaxed max-w-xs mx-auto">
                A letter appears every 2.5 seconds. Say <strong className="text-white">YES</strong> if it matches the <em>previous</em> letter. You get 3 strikes before the game ends.
              </p>
            </div>
            <button
              onClick={startGame}
              className="px-8 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 hover:from-cyan-400 hover:to-violet-400 text-white font-semibold text-sm shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all"
            >
              Start Task
            </button>
          </div>
        )}

        {/* ── PLAYING state ── */}
        {phase === 'playing' && (
          <>
            <p className="text-sm text-white/40 text-center">
              Does this letter match the <strong className="text-white">previous</strong> one?
            </p>

            {/* Letter display */}
            <div
              className={`w-44 h-44 rounded-3xl flex items-center justify-center border transition-all duration-200 ${
                feedback === 'correct'
                  ? 'border-emerald-500/40 bg-emerald-500/10 shadow-[0_0_30px_rgba(52,211,153,0.2)]'
                  : feedback === 'wrong'
                    ? 'border-red-500/40 bg-red-500/10 shadow-[0_0_30px_rgba(239,68,68,0.2)]'
                    : 'border-white/10 bg-white/[0.03]'
              }`}
            >
              <span className="text-8xl font-black text-white leading-none">{currentLetter}</span>
            </div>

            {/* Feedback label */}
            <div className="h-6 flex items-center justify-center">
              {feedback === 'correct' && (
                <span className="text-sm font-semibold text-emerald-400">✓ Correct!</span>
              )}
              {feedback === 'wrong' && (
                <span className="text-sm font-semibold text-red-400">✗ Wrong</span>
              )}
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-4 w-full">
              <button
                onClick={() => handleGuess(true)}
                disabled={!!feedback}
                className="py-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 font-bold text-sm hover:bg-emerald-500/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                ✓ Yes, Match
              </button>
              <button
                onClick={() => handleGuess(false)}
                disabled={!!feedback}
                className="py-4 rounded-xl border border-white/10 bg-white/5 text-white/70 font-bold text-sm hover:bg-white/10 hover:border-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                ✗ No Match
              </button>
            </div>

            <p className="text-[11px] text-white/20 text-center">
              Turn {totalTurns} · {3 - strikes} strike{(3 - strikes) !== 1 ? 's' : ''} remaining
            </p>
          </>
        )}

        {/* ── GAME OVER state ── */}
        {phase === 'over' && (
          <div className="text-center space-y-6 w-full">
            <div>
              <h2 className="text-3xl font-black text-red-400 mb-1">Game Over</h2>
              <p className="text-white/50 text-sm">3 strikes reached</p>
            </div>

            <div className="flex justify-center gap-6">
              <div className="text-center px-6 py-4 rounded-2xl border border-white/10 bg-white/5">
                <p className="text-[10px] text-white/30 uppercase tracking-widest mb-1">Matches Found</p>
                <p className="text-3xl font-black text-white">{score}</p>
              </div>
              <div className="text-center px-6 py-4 rounded-2xl border border-white/10 bg-white/5">
                <p className="text-[10px] text-white/30 uppercase tracking-widest mb-1">Turns Played</p>
                <p className="text-3xl font-black text-white">{totalTurns}</p>
              </div>
            </div>

            <button
              onClick={startGame}
              className="px-8 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 hover:from-cyan-400 hover:to-violet-400 text-white font-semibold text-sm shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </GameShell>
  );
}
