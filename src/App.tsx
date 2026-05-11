/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback } from 'react';
import { NeonRunner } from './components/NeonRunner';
import { GameMenu } from './components/GameMenu';

export default function App() {
  const [isStarted, setIsStarted] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [score, setScore] = useState(0); // Distance score
  const [sessionProcessors, setSessionProcessors] = useState(0); // Processors in current run
  const [totalProcessors, setTotalProcessors] = useState<number>(() => {
    const saved = localStorage.getItem('neon_runner_total_processors');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [lives, setLives] = useState(3);
  const [maxLives, setMaxLives] = useState(3);
  const [isPaused, setIsPaused] = useState(false);
  const [gameId, setGameId] = useState(0);
  const [extraLifePurchased, setExtraLifePurchased] = useState(false);
  const [highScores, setHighScores] = useState<number[]>(() => {
    const saved = localStorage.getItem('neon_runner_scores');
    return saved ? JSON.parse(saved) : [];
  });

  const startGame = useCallback(() => {
    setIsStarted(true);
    setIsGameOver(false);
    setScore(0);
    setSessionProcessors(0);
    const startLives = extraLifePurchased ? 4 : 3;
    setLives(startLives);
    setMaxLives(startLives);
    setExtraLifePurchased(false); // Reset for next game
    setIsPaused(false);
    setGameId(prev => prev + 1);
  }, [extraLifePurchased]);

  const buyExtraLife = useCallback(() => {
    if (totalProcessors >= 100000 && !extraLifePurchased) {
      setTotalProcessors(prev => {
        const next = prev - 100000;
        localStorage.setItem('neon_runner_total_processors', next.toString());
        return next;
      });
      setExtraLifePurchased(true);
    }
  }, [totalProcessors, extraLifePurchased]);

  const handleGameOver = useCallback(() => {
    setIsGameOver(true);
    setIsStarted(false);
    
    // Accumulate total processors
    setTotalProcessors(prev => {
      const newTotal = prev + sessionProcessors;
      localStorage.setItem('neon_runner_total_processors', newTotal.toString());
      return newTotal;
    });

    setHighScores(prev => {
      const newScores = [...prev, score].sort((a, b) => b - a).slice(0, 5);
      localStorage.setItem('neon_runner_scores', JSON.stringify(newScores));
      return newScores;
    });
  }, [score, sessionProcessors]);

  const handleLifeLost = useCallback((newLives: number) => {
    setLives(newLives);
  }, []);

  const updateScore = useCallback((newScore: number, newProcessors: number) => {
    setScore(newScore);
    setSessionProcessors(newProcessors);
  }, []);

  return (
    <main className="w-full h-screen bg-black relative">
      {!isStarted && !isGameOver && (
        <GameMenu 
          type="start" 
          onAction={startGame} 
          totalProcessors={totalProcessors}
          extraLifePurchased={extraLifePurchased}
          onBuyLife={buyExtraLife}
        />
      )}
      
      {isGameOver && (
        <GameMenu 
          type="gameover" 
          score={score} 
          processors={sessionProcessors}
          onAction={startGame} 
          highScores={highScores}
          totalProcessors={totalProcessors + sessionProcessors}
          extraLifePurchased={extraLifePurchased}
          onBuyLife={buyExtraLife}
        />
      )}

      {(isStarted || isGameOver) && (
        <NeonRunner 
          key={gameId}
          onScoreUpdate={updateScore} 
          onGameOver={handleGameOver} 
          onLifeLost={handleLifeLost}
          lives={lives}
          maxLives={maxLives}
          isPaused={isPaused} 
          onTogglePause={() => setIsPaused(!isPaused)}
        />
      )}
    </main>
  );
}
