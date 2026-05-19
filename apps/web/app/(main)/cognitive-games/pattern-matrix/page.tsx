'use client';

import { useState, useCallback, memo } from 'react';
import GameShell from '../components/GameShell';
import { Activity } from 'lucide-react';
import { saveGameScore } from '../utils/gameScores';

// Memoized tile component for performance optimization
const GameTile = memo(({ 
  index, 
  isTarget, 
  isSelected, 
  phase, 
  onClick 
}: { 
  index: number; 
  isTarget: boolean; 
  isSelected: boolean; 
  phase: 'idle' | 'memorize' | 'recall'; 
  onClick: (index: number) => void; 
}) => {
  // Determine tile color based on game phase
  let tileStyle = 'bg-[#2A2A2A] hover:bg-[#333333] cursor-pointer transition-all duration-150';
  if (phase === 'memorize' && isTarget) {
    tileStyle = 'bg-white shadow-[0_0_15px_rgba(255,255,255,0.4)] scale-105';
  } else if (phase === 'recall' && isSelected) {
    tileStyle = 'bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.4)] scale-105';
  } else if (phase !== 'recall') {
    tileStyle = 'bg-[#2A2A2A] cursor-not-allowed opacity-80';
  }

  return (
    <div
      onClick={() => phase === 'recall' && onClick(index)}
      className={`w-16 h-16 sm:w-20 sm:h-20 rounded-xl ${tileStyle}`}
    />
  );
});

GameTile.displayName = 'GameTile';

export default function PatternMatrixGame() {
  const [level, setLevel] = useState(1);
  const [phase, setPhase] = useState<'idle' | 'memorize' | 'recall'>('idle');
  const [activeTiles, setActiveTiles] = useState<number[]>([]);
  const [userTiles, setUserTiles] = useState<number[]>([]);
  const [visualUserTiles, setVisualUserTiles] = useState<number[]>([]);

  const GRID_SIZE = 16; // 4x4 grid

  const startGame = useCallback(() => {
    setLevel(1);
    startLevel(1);
  }, []);

  const startLevel = useCallback(async (currentLevel: number) => {
    setPhase('idle');
    setUserTiles([]);
    setVisualUserTiles([]);
    
    // Number of tiles to remember increases with level
    const tilesToRemember = Math.min(3 + currentLevel, GRID_SIZE - 2); 
    
    // Generate random unique tiles
    const newTiles = new Set<number>();
    while (newTiles.size < tilesToRemember) {
      newTiles.add(Math.floor(Math.random() * GRID_SIZE));
    }
    
    const tileArray = Array.from(newTiles);
    setActiveTiles(tileArray);

    // Show sequence
    await new Promise(r => setTimeout(r, 500));
    setPhase('memorize');
    await new Promise(r => setTimeout(r, 2000)); // Show pattern for 2 seconds
    setPhase('recall');
  }, []);

  const handleTileClick = useCallback((index: number) => {
    if (phase !== 'recall') return;

    // Instant visual feedback - decoupled from logic
    let newVisualSelection = [...visualUserTiles];
    if (newVisualSelection.includes(index)) {
      newVisualSelection = newVisualSelection.filter(t => t !== index);
    } else {
      newVisualSelection.push(index);
    }
    setVisualUserTiles(newVisualSelection);

    // Debounced logic processing to prevent blocking
    setTimeout(() => {
      // Toggle tile selection
      let newSelection = [...userTiles];
      if (newSelection.includes(index)) {
        newSelection = newSelection.filter(t => t !== index);
      } else {
        newSelection.push(index);
      }
      setUserTiles(newSelection);

      // Check if user has selected the required amount of tiles
      if (newSelection.length === activeTiles.length) {
        const isCorrect = newSelection.every(t => activeTiles.includes(t));
        
        setPhase('idle');
        if (isCorrect) {
          setTimeout(() => startLevel(level + 1), 1000);
          setLevel(l => l + 1);
        } else {
          saveGameScore('pattern-matrix', Math.min(100, (level - 1) * 20), `Level: ${level}`)
          setTimeout(() => {
            setLevel(1);
            startLevel(1);
          }, 1500);
        }
      }
    }, 0); // Non-blocking
  }, [phase, visualUserTiles, userTiles, activeTiles, level, startLevel]);

  return (
    <GameShell 
      title="Pattern Matrix" 
      category="Visual Memory"
      gameSlug="pattern-matrix"
      stats={
        <div className="text-center">
          <p className="text-xs text-neutral-400 uppercase">Level</p>
          <p className="text-2xl font-bold text-white">{level}</p>
        </div>
      }
    >
      <div className="flex flex-col items-center">
        <div className="flex items-center justify-center mb-8">
          <Activity className="w-16 h-16 text-green-400" />
        </div>
        <p className="text-neutral-400 mb-8 h-6">
          {phase === 'memorize' && "Memorize the glowing tiles..."}
          {phase === 'recall' && "Recreate the pattern!"}
          {phase === 'idle' && level > 1 && userTiles.length === activeTiles.length && 
            (visualUserTiles.every(t => activeTiles.includes(t)) ? <span className="text-green-400 font-bold">Correct! Ready for next level...</span> : <span className="text-red-400 font-bold">Pattern incorrect. Try again...</span>)
          }
        </p>

        <div className="grid grid-cols-4 gap-3 bg-[#1A1A1A] p-4 rounded-2xl border border-white/5 mb-8">
          {Array.from({ length: GRID_SIZE }).map((_, i) => (
            <GameTile
              key={i}
              index={i}
              isTarget={activeTiles.includes(i)}
              isSelected={visualUserTiles.includes(i)}
              phase={phase}
              onClick={handleTileClick}
            />
          ))}
        </div>

        {phase === 'idle' && (
          <button 
            onClick={startGame}
            className="px-8 py-3 bg-white text-black font-semibold rounded-full hover:bg-gray-200 hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            {level > 1 ? 'Next Level' : 'Start Game'}
          </button>
        )}
      </div>
    </GameShell>
  );
}
