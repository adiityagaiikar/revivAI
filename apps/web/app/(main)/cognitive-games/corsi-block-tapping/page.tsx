'use client';

import { useState, useCallback, memo } from 'react';
import GameShell from '../components/GameShell';
import { Target } from 'lucide-react';
import { saveGameScore } from '../utils/gameScores';

// Memoized block component for performance optimization
const GameBlock = memo(({ 
  index, 
  isActive, 
  isDisabled, 
  onClick 
}: { 
  index: number; 
  isActive: boolean; 
  isDisabled: boolean; 
  onClick: (index: number) => void; 
}) => {
  return (
    <div
      onClick={() => !isDisabled && onClick(index)}
      className={`w-24 h-24 rounded-xl cursor-pointer transition-all duration-150 ${
        isActive 
          ? 'bg-white shadow-[0_0_30px_rgba(255,255,255,0.8),0_0_60px_rgba(255,255,255,0.4)] scale-110 border border-white/50' 
          : 'bg-[#1C1C1C] hover:bg-[#252525] hover:scale-105 hover:shadow-[0_4px_20px_rgba(255,255,255,0.1)] border border-white/10'
      } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    />
  );
});

GameBlock.displayName = 'GameBlock';

export default function CorsiGame() {
  const [sequence, setSequence] = useState<number[]>([]);
  const [userSequence, setUserSequence] = useState<number[]>([]);
  const [activeBlock, setActiveBlock] = useState<number | null>(null);
  const [visualActiveBlock, setVisualActiveBlock] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isUserTurn, setIsUserTurn] = useState(false);
  const [level, setLevel] = useState(3);
  const [gameOver, setGameOver] = useState(false);

  const startGame = useCallback(() => {
    setGameOver(false);
    setUserSequence([]);
    const newSeq = Array.from({ length: level }, () => Math.floor(Math.random() * 9));
    setSequence(newSeq);
    playSequence(newSeq);
  }, [level]);

  const playSequence = useCallback(async (seq: number[]) => {
    setIsPlaying(true);
    setIsUserTurn(false);
    await new Promise(r => setTimeout(r, 800)); // Pause before start
    
    for (let i = 0; i < seq.length; i++) {
      setActiveBlock(seq[i]!);
      setVisualActiveBlock(seq[i]!); // Instant visual feedback
      await new Promise(r => setTimeout(r, 600)); // Flash duration
      setActiveBlock(null);
      setVisualActiveBlock(null);
      await new Promise(r => setTimeout(r, 200)); // Gap between flashes
    }
    
    setIsPlaying(false);
    setIsUserTurn(true);
  }, []);

  const handleBlockClick = useCallback((index: number) => {
    if (!isUserTurn) return;
    
    // Instant visual feedback - decoupled from logic
    setVisualActiveBlock(index);
    setTimeout(() => setVisualActiveBlock(null), 150);

    // Debounced logic processing to prevent blocking
    setTimeout(() => {
      const newUserSeq = [...userSequence, index];
      setUserSequence(newUserSeq);

      // Check if wrong block was clicked
      if (newUserSeq[newUserSeq.length - 1] !== sequence[newUserSeq.length - 1]) {
        setGameOver(true);
        setLevel(3); // Reset level on failure
        setIsUserTurn(false);
        saveGameScore('corsi-block-tapping', Math.min(100, (level - 3) * 14), `Level: ${level}`)
        return;
      }

      // Check if sequence is complete
      if (newUserSeq.length === sequence.length) {
        setIsUserTurn(false);
        setTimeout(() => {
          setLevel(l => l + 1);
          startGame(); 
        }, 1000);
      }
    }, 0); // Non-blocking
  }, [isUserTurn, userSequence, sequence, startGame]);

  return (
    <GameShell 
      title="Corsi Block-Tapping" 
      category="Spatial Memory"
      gameSlug="corsi-block-tapping"
      stats={
        <div className="text-center">
          <p className="text-xs text-gray-500 uppercase">Current Level</p>
          <p className="text-2xl font-bold">{level}</p>
        </div>
      }
    >
      <div className="flex flex-col items-center justify-center">
        <div className="flex items-center justify-center mb-8">
          <Target className="w-16 h-16 text-blue-400" />
        </div>
        
        <div className="grid grid-cols-3 gap-4 w-fit mx-auto">
          {Array.from({ length: 9 }).map((_, i) => (
            <GameBlock
              key={i}
              index={i}
              isActive={visualActiveBlock === i || activeBlock === i}
              isDisabled={!isUserTurn && !isPlaying}
              onClick={handleBlockClick}
            />
          ))}
        </div>

        {!isPlaying && !isUserTurn && (
          <div className="mt-12 text-center">
            {gameOver && <p className="text-red-400 font-medium mb-4">Sequence broken. Try again!</p>}
            <button 
              onClick={startGame}
              className="px-8 py-3 bg-white text-black font-semibold rounded-full hover:bg-gray-200 hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              {gameOver ? 'Restart Training' : 'Start Sequence'}
            </button>
          </div>
        )}
      </div>
    </GameShell>
  );
}
