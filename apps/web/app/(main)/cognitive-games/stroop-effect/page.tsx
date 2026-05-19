'use client';

import { useState, useEffect, useCallback } from 'react';
import GameShell from '../components/GameShell';
import { calculateProcessingSpeedWCI } from '../utils/neuroWeights';
import { saveGameScore } from '../utils/gameScores';
import { Zap } from 'lucide-react';

const COLORS = [
  { name: 'RED', hex: '#EF4444' },
  { name: 'BLUE', hex: '#3B82F6' },
  { name: 'GREEN', hex: '#22C55E' },
  { name: 'YELLOW', hex: '#EAB308' }
];

export default function StroopGame() {
  const [score, setScore] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [totalAnswers, setTotalAnswers] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [isPlaying, setIsPlaying] = useState(false);
  const [wordText, setWordText] = useState<{ name: string; hex: string }>(COLORS[0]!);
  const [wordColor, setWordColor] = useState<{ name: string; hex: string }>(COLORS[0]!);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (isPlaying && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (timeLeft === 0) {
      setIsPlaying(false);
    }
    return () => clearInterval(timer);
  }, [isPlaying, timeLeft]);

  const generateNewWord = useCallback(() => {
    const randomText = COLORS[Math.floor(Math.random() * COLORS.length)]!;
    const randomColor = COLORS[Math.floor(Math.random() * COLORS.length)]!;
    setWordText(randomText);
    setWordColor(randomColor);
  }, []);

  const startGame = useCallback(() => {
    setScore(0);
    setCorrectAnswers(0);
    setTotalAnswers(0);
    setTimeLeft(60);
    setIsPlaying(true);
    generateNewWord();
  }, [generateNewWord]);

  const handleColorClick = useCallback((clickedColorHex: string) => {
    if (!isPlaying) return;
    
    setTotalAnswers(prev => prev + 1);
    
    // The core Stroop logic: User must click the COLOR of the font, not the text word!
    if (clickedColorHex === wordColor.hex) {
      setScore(prev => prev + 1);
      setCorrectAnswers(prev => prev + 1);
    } else {
      setScore(prev => Math.max(0, prev - 1)); // Penalty for wrong guess
    }
    generateNewWord();
  }, [isPlaying, wordColor.hex, generateNewWord]);

  // Calculate and report WCI when game ends
  useEffect(() => {
    if (timeLeft === 0 && totalAnswers > 0) {
      const totalTimeInSeconds = 60 - timeLeft;
      const wciMetrics = calculateProcessingSpeedWCI(correctAnswers, totalAnswers, totalTimeInSeconds);
      
      saveGameScore('stroop-effect', Math.round(wciMetrics.score), `Score: ${score}`)

      // Attempt to call global callback if it exists
      if (typeof window !== 'undefined' && (window as any).gameFinishCallback) {
        try {
          (window as any).gameFinishCallback(wciMetrics.score, {
            gameId: 'stroop',
            correctAnswers,
            totalAnswers,
            totalTimeInSeconds,
            wciMetrics
          });
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, [timeLeft, totalAnswers, correctAnswers]);

  return (
    <GameShell 
      title="Stroop Effect" 
      category="Cognitive Flexibility"
      gameSlug="stroop-effect"
      stats={
        <div className="flex gap-4">
          <div className="text-center">
            <p className="text-xs text-neutral-400 uppercase">Time</p>
            <p className={`text-2xl font-bold ${timeLeft <= 10 ? 'text-red-400 animate-pulse' : 'text-white'}`}>
              {timeLeft}s
            </p>
          </div>
          <div className="text-center border-l border-white/10 pl-6">
            <p className="text-xs text-neutral-400 uppercase">Score</p>
            <p className="text-2xl font-bold text-white">{score}</p>
          </div>
        </div>
      }
    >
      <div className="flex flex-col items-center">
        <div className="flex items-center justify-center mb-8">
          <Zap className="w-16 h-16 text-yellow-400" />
        </div>
        
        {isPlaying ? (
          <>
            <p className="text-neutral-400 mb-12 text-sm uppercase tracking-widest text-center">
              Select the <span className="text-white font-bold underline">Color of the ink</span>, not the word.
            </p>
            
            {/* The Target Word */}
            <div 
              className="text-7xl font-black mb-16 tracking-tighter"
              style={{ color: wordColor.hex }}
            >
              {wordText.name}
            </div>

            {/* The Choice Buttons */}
            <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
              {COLORS.map((color) => (
                <button
                  key={color.name}
                  onClick={() => handleColorClick(color.hex)}
                  className="py-4 rounded-xl border border-white/10 hover:border-white/30 transition-all duration-300 text-lg font-medium bg-[#1C1C1C] hover:bg-[#252525] hover:scale-105 hover:shadow-[0_4px_20px_rgba(255,255,255,0.1)] text-white"
                >
                  {color.name}
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center">
            {timeLeft === 0 && (
              <div className="mb-8">
                <h2 className="text-4xl font-bold mb-2 text-white">Time's Up!</h2>
                <p className="text-neutral-400">Final Score: <span className="text-white font-bold">{score}</span></p>
              </div>
            )}
            <button 
              onClick={startGame}
              className="px-8 py-3 bg-white text-black font-semibold rounded-full hover:bg-gray-200 hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              {timeLeft === 0 ? 'Play Again' : 'Start Assessment'}
            </button>
          </div>
        )}
      </div>
    </GameShell>
  );
}
