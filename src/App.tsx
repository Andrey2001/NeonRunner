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
  const [isPaused, setIsPaused] = useState(false);
  const [gameId, setGameId] = useState(0);
  const [highScores, setHighScores] = useState<number[]>(() => {
    const saved = localStorage.getItem('neon_runner_scores');
    return saved ? JSON.parse(saved) : [];
  });

  const startGame = useCallback(() => {
    setIsStarted(true);
    setIsGameOver(false);
    setScore(0);
    setSessionProcessors(0);
    setLives(3);
    setIsPaused(false);
    setGameId(prev => prev + 1);
  }, []);

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
        />
      )}

      {(isStarted || isGameOver) && (
        <NeonRunner 
          key={gameId}
          onScoreUpdate={updateScore} 
          onGameOver={handleGameOver} 
          onLifeLost={handleLifeLost}
          lives={lives}
          isPaused={isPaused} 
          onTogglePause={() => setIsPaused(!isPaused)}
        />
      )}
    </main>
  );
}
