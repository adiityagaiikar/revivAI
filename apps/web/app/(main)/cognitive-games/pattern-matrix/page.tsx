'use client';

import { useState, useCallback, memo } from 'react';
import GameShell from '../components/GameShell';
import { saveGameScore } from '../utils/gameScores';

// Memoized tile
const GameTile = memo(({
  index,
  isTarget,
  isSelected,
  phase,
  onClick,
}: {
  index: number;
  isTarget: boolean;
  isSelected: boolean;
  phase: 'idle' | 'memorize' | 'recall';
  onClick: (index: number) => void;
}) => {
  let base = 'w-16 h-16 sm:w-20 sm:h-20 rounded-xl transition-all duration-150 ';
  if (phase === 'memorize' && isTarget) {
    base += 'bg-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.6)] scale-105 cursor-not-allowed';
  } else if (phase === 'recall' && isSelected) {
    base += 'bg-violet-500 shadow-[0_0_20px_rgba(139,92,246,0.5)] scale-105 cursor-pointer';
  } else if (phase === 'recall') {
    base += 'bg-white/8 border border-white/10 hover:bg-white/15 hover:border-white/20 cursor-pointer';
  } else {
    base += 'bg-white/5 border border-white/8 cursor-not-allowed opacity-70';
  }

  return (
    <div
      onClick={() => phase === 'recall' && onClick(index)}
      className={base}
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
  const [lastResult, setLastResult] = useState<'correct' | 'wrong' | null>(null);

  const GRID_SIZE = 16;

  const startLevel = useCallback(async (currentLevel: number) => {
    setPhase('idle');
    setUserTiles([]);
    setVisualUserTiles([]);
    setLastResult(null);

    const tilesToRemember = Math.min(3 + currentLevel, GRID_SIZE - 2);
    const newTiles = new Set<number>();
    while (newTiles.size < tilesToRemember) {
      newTiles.add(Math.floor(Math.random() * GRID_SIZE));
    }

    const tileArray = Array.from(newTiles);
    setActiveTiles(tileArray);

    await new Promise(r => setTimeout(r, 400));
    setPhase('memorize');
    await new Promise(r => setTimeout(r, 2000));
    setPhase('recall');
  }, []);

  const startGame = useCallback(() => {
    setLevel(1);
    startLevel(1);
  }, [startLevel]);

  const handleTileClick = useCallback((index: number) => {
    if (phase !== 'recall') return;

    let newVisual = [...visualUserTiles];
    if (newVisual.includes(index)) {
      newVisual = newVisual.filter(t => t !== index);
    } else {
      newVisual.push(index);
    }
    setVisualUserTiles(newVisual);

    setTimeout(() => {
      let newSelection = [...userTiles];
      if (newSelection.includes(index)) {
        newSelection = newSelection.filter(t => t !== index);
      } else {
        newSelection.push(index);
      }
      setUserTiles(newSelection);

      if (newSelection.length === activeTiles.length) {
        const isCorrect = newSelection.every(t => activeTiles.includes(t));
        setLastResult(isCorrect ? 'correct' : 'wrong');
        setPhase('idle');
        if (isCorrect) {
          setTimeout(() => { setLevel(l => l + 1); startLevel(level + 1); }, 900);
        } else {
          saveGameScore('pattern-matrix', Math.min(100, (level - 1) * 20), `Level: ${level}`);
          setTimeout(() => { setLevel(1); startLevel(1); }, 1500);
        }
      }
    }, 0);
  }, [phase, visualUserTiles, userTiles, activeTiles, level, startLevel]);

  return (
    <GameShell
      title="Pattern Matrix"
      category="Visual Memory"
      gameSlug="pattern-matrix"
      stats={
        <div className="flex items-center gap-3">
          <div className="text-center px-4 py-2 rounded-xl bg-white/5 border border-white/10">
            <p className="text-[10px] text-white/40 uppercase tracking-widest">Level</p>
            <p className="text-xl font-bold text-white">{level}</p>
          </div>
          <div className="text-center px-4 py-2 rounded-xl bg-white/5 border border-white/10">
            <p className="text-[10px] text-white/40 uppercase tracking-widest">Tiles</p>
            <p className="text-xl font-bold text-cyan-400">{Math.min(3 + level, GRID_SIZE - 2)}</p>
          </div>
        </div>
      }
    >
      <div className="flex flex-col items-center gap-6 w-full">

        {/* Phase label */}
        <div className="h-8 flex items-center">
          {phase === 'memorize' && (
            <span className="flex items-center gap-2 text-sm text-cyan-400 font-semibold">
              <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
              Memorize the pattern…
            </span>
          )}
          {phase === 'recall' && (
            <span className="text-sm text-violet-400 font-semibold">Recreate the pattern!</span>
          )}
          {phase === 'idle' && lastResult === 'correct' && (
            <span className="text-sm text-emerald-400 font-bold">✓ Correct! Loading next level…</span>
          )}
          {phase === 'idle' && lastResult === 'wrong' && (
            <span className="text-sm text-red-400 font-bold">✗ Incorrect. Restarting…</span>
          )}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-4 gap-3 bg-white/[0.02] border border-white/8 p-5 rounded-2xl">
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

        {/* Start button */}
        {phase === 'idle' && lastResult === null && (
          <button
            onClick={startGame}
            className="px-8 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 hover:from-cyan-400 hover:to-violet-400 text-white font-semibold text-sm transition-all duration-200 shadow-[0_0_20px_rgba(6,182,212,0.3)]"
          >
            {level > 1 ? 'Continue' : 'Start Game'}
          </button>
        )}

        <p className="text-[11px] text-white/25 text-center">
          Watch the highlighted tiles, then click the same positions from memory.
        </p>
      </div>
    </GameShell>
  );
}
