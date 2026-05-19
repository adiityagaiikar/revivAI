'use client';

import { useState, useEffect } from 'react';
import GameShell from '../components/GameShell';
import { Trophy } from 'lucide-react';
import { saveGameScore } from '../utils/gameScores';

const ALL_PAIRS = [
  { q: "Ocean", a: "Sand" },
  { q: "Guitar", a: "Song" },
  { q: "Tree", a: "Leaf" },
  { q: "Book", a: "Page" },
  { q: "Sun", a: "Light" },
  { q: "Bird", a: "Feather" },
  { q: "Car", a: "Road" },
  { q: "Coffee", a: "Mug" }
];

export default function WordPairsGame() {
  const [phase, setPhase] = useState<'idle' | 'study' | 'test' | 'results'>('idle');
  const [activePairs, setActivePairs] = useState<{q: string, a: string}[]>([]);
  const [studyTime, setStudyTime] = useState(10);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [options, setOptions] = useState<string[]>([]);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (phase === 'study' && studyTime > 0) {
      timer = setInterval(() => setStudyTime(prev => prev - 1), 1000);
    } else if (phase === 'study' && studyTime === 0) {
      startTestingPhase();
    }
    return () => clearInterval(timer);
  }, [phase, studyTime]);

  const startGame = () => {
    // Pick 4 random pairs
    const shuffled = [...ALL_PAIRS].sort(() => 0.5 - Math.random());
    setActivePairs(shuffled.slice(0, 4));
    setScore(0);
    setCurrentQuestionIndex(0);
    setStudyTime(10);
    setPhase('study');
  };

  const startTestingPhase = () => {
    setPhase('test');
    generateOptions(0);
  };

  const generateOptions = (index: number) => {
    const correctAnswer = activePairs[index]?.a || '';
    const wrongAnswers = ALL_PAIRS
      .filter(p => p.a !== correctAnswer)
      .sort(() => 0.5 - Math.random())
      .slice(0, 3)
      .map(p => p.a);
    
    setOptions([correctAnswer, ...wrongAnswers].sort(() => 0.5 - Math.random()));
  };

  const saveActivity = async (finalScore: number) => {
    const pct = Math.round((finalScore / 4) * 100)
    saveGameScore('word-pairs', pct, `Score: ${finalScore}/4`)
    const token = localStorage.getItem('token')
    if (!token) return

    try {
      await fetch('http://localhost:5000/api/dashboard/activity', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: 'Word Pairs',
          type: 'Cognitive',
          score: `${Math.round((finalScore / 4) * 100)}%`,
          duration: '1 mins'
        })
      })
    } catch (e) {
      console.error('Failed to log game score', e)
    }
  }

  const handleAnswer = (selectedAnswer: string) => {
    let newScore = score
    if (selectedAnswer === activePairs[currentQuestionIndex]?.a) {
      newScore = score + 1
      setScore(newScore)
    }

    if (currentQuestionIndex + 1 < activePairs.length) {
      setCurrentQuestionIndex(prev => prev + 1);
      generateOptions(currentQuestionIndex + 1);
    } else {
      setPhase('results');
      saveActivity(newScore)
    }
  };

  return (
    <GameShell 
      title="Word Pairs" 
      category="Associative Memory"
      gameSlug="word-pairs"
      stats={
        <div className="text-center">
          <p className="text-xs text-neutral-400 uppercase">Score</p>
          <p className="text-2xl font-bold text-white">{score} / 4</p>
        </div>
      }
    >
      <div className="flex flex-col items-center w-full max-w-md mx-auto">
        <div className="flex items-center justify-center mb-8">
          <Trophy className="w-16 h-16 text-orange-400" />
        </div>
        
        {phase === 'idle' && (
          <div className="text-center">
            <p className="text-neutral-400 mb-8">Memorize the word pairs, then test your recall.</p>
            <button onClick={startGame} className="px-8 py-3 bg-white text-black font-semibold rounded-full hover:bg-gray-200 transition">
              Start Assessment
            </button>
          </div>
        )}

        {phase === 'study' && (
          <div className="text-center w-full">
            <h2 className="text-2xl font-bold mb-2 text-white">Memorize These Pairs</h2>
            <p className="text-red-400 font-bold mb-8">Time left: {studyTime}s</p>
            <div className="grid grid-cols-1 gap-4">
              {activePairs.map((pair, i) => (
                <div key={i} className="bg-[#1A1A1A] border border-white/10 rounded-xl p-4 flex justify-around items-center text-xl">
                  <span className="font-semibold text-white">{pair.q}</span>
                  <span className="text-neutral-500">→</span>
                  <span className="font-semibold text-blue-400">{pair.a}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {phase === 'test' && (
          <div className="text-center w-full">
            <p className="text-neutral-400 mb-2 text-sm uppercase tracking-widest">What pairs with...</p>
            <h2 className="text-5xl font-black mb-12 text-white">{activePairs[currentQuestionIndex]?.q}</h2>
            
            <div className="grid grid-cols-2 gap-4">
              {options.map((opt, i) => (
                <button 
                  key={i} 
                  onClick={() => handleAnswer(opt)}
                  className="py-4 bg-[#2A2A2A] text-white font-medium rounded-xl border border-white/10 hover:border-white/30 hover:bg-[#333] transition"
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        )}

        {phase === 'results' && (
          <div className="text-center">
            <h2 className="text-4xl font-bold mb-2 text-white">Assessment Complete</h2>
            <p className="text-neutral-400 mb-8">You recalled <span className="text-white font-bold">{score}</span> out of 4 pairs correctly.</p>
            <button onClick={startGame} className="px-8 py-3 bg-white text-black font-semibold rounded-full hover:bg-gray-200 transition">
              Play Again
            </button>
          </div>
        )}

      </div>
    </GameShell>
  );
}
