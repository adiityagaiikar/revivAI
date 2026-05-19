'use client';

import { useState, useEffect, useRef } from 'react';
import GameShell from '../components/GameShell';
import { saveGameScore } from '../utils/gameScores';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'H', 'L', 'O', 'T'];

export default function NBackGame() {
  const [score, setScore] = useState(0);
  const [strikes, setStrikes] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentLetter, setCurrentLetter] = useState('?');
  const [history, setHistory] = useState<string[]>([]);
  
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startGame = () => {
    setScore(0);
    setStrikes(0);
    setHistory([]);
    setIsPlaying(true);
    nextTurn([]);
  };

  const nextTurn = (currentHistory: string[]) => {
    // 30% chance to force a match to make the game playable
    const forceMatch = Math.random() > 0.7 && currentHistory.length > 0;
    const nextLet = (forceMatch 
      ? currentHistory[currentHistory.length - 1] 
      : LETTERS[Math.floor(Math.random() * LETTERS.length)]) || 'A';
    
    setCurrentLetter(nextLet);
    setHistory([...currentHistory, nextLet]);

    // Automatically move to next letter after 2.5 seconds if user doesn't click
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      handleGuess(false, [...currentHistory, nextLet]);
    }, 2500);
  };

  const handleGuess = (guessedMatch: boolean, currentHist = history) => {
    if (!isPlaying) return;
    if (timerRef.current) clearInterval(timerRef.current);

    const isActuallyMatch = currentHist.length > 1 && currentHist[currentHist.length - 1] === currentHist[currentHist.length - 2];

    if (guessedMatch === isActuallyMatch) {
      if (guessedMatch) setScore(s => s + 1); // Only score points for finding actual matches
    } else {
      setStrikes(s => {
        const newStrikes = s + 1;
        if (newStrikes >= 3) {
          setIsPlaying(false);
          if (timerRef.current) clearInterval(timerRef.current);
          // save score when game ends via strikes
          saveGameScore('1-back-task', Math.min(100, score * 10), `Score: ${score}`)
        }
        return newStrikes;
      });
    }

    if (strikes < 2) {
      nextTurn(currentHist);
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return (
    <GameShell 
      title="1-Back Task" 
      category="Working Memory"
      gameSlug="1-back-task"
      stats={
        <div className="flex gap-4">
          <div className="text-center">
            <p className="text-xs text-neutral-400 uppercase">Strikes</p>
            <p className="text-2xl font-bold text-red-500">{"X ".repeat(strikes)}</p>
          </div>
          <div className="text-center border-l border-white/10 pl-6">
            <p className="text-xs text-neutral-400 uppercase">Score</p>
            <p className="text-2xl font-bold">{score}</p>
          </div>
        </div>
      }
    >
      <div className="flex flex-col items-center w-full max-w-md mx-auto">
        {isPlaying ? (
          <>
            <p className="text-neutral-400 mb-8 text-center text-sm">
              Does this letter match the <strong className="text-white">previous</strong> letter?
            </p>
            
            <div className="w-48 h-48 bg-[#1A1A1A] border border-white/10 rounded-3xl flex items-center justify-center mb-12 shadow-inner">
              <span className="text-8xl font-black text-white">{currentLetter}</span>
            </div>

            <div className="grid grid-cols-2 gap-6 w-full">
              <button 
                onClick={() => handleGuess(true)}
                className="py-4 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition"
              >
                Yes, it's a Match
              </button>
              <button 
                onClick={() => handleGuess(false)}
                className="py-4 bg-[#2A2A2A] text-white font-bold rounded-xl border border-white/10 hover:border-white/30 transition"
              >
                No Match
              </button>
            </div>
          </>
        ) : (
          <div className="text-center">
             {strikes >= 3 && <h2 className="text-3xl font-bold text-red-500 mb-4">Game Over</h2>}
            <button 
              onClick={startGame}
              className="px-8 py-3 bg-white text-black font-semibold rounded-full hover:bg-gray-200 transition"
            >
              {strikes >= 3 ? 'Try Again' : 'Start Task'}
            </button>
          </div>
        )}
      </div>
    </GameShell>
  );
}
