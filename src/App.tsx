/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback } from 'react';
import { NeonRunner } from './components/NeonRunner';
import { GameMenu } from './components/GameMenu';
import { AudioManager } from './services/audioService';
import { TutorialOverlay } from './components/TutorialOverlay';

export default function App() {
  const [isStarted, setIsStarted] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [score, setScore] = useState(0); // Distance score
  const [sessionProcessors, setSessionProcessors] = useState(0); // Processors in current run
  const [totalProcessors, setTotalProcessors] = useState<number>(() => {
    const saved = localStorage.getItem('neon_runner_total_processors');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [hasSeenTutorial, setHasSeenTutorial] = useState<boolean>(() => {
    return localStorage.getItem('neon_runner_tutorial_done') === 'true';
  });
  const [showTutorial, setShowTutorial] = useState(false);
  const [lives, setLives] = useState(3);
  const [maxLives, setMaxLives] = useState(3);
  const [isPaused, setIsPaused] = useState(false);
  const [gameId, setGameId] = useState(0);
  const [extraLifePurchased, setExtraLifePurchased] = useState(false);
  const [purchasedBuffs, setPurchasedBuffs] = useState<string[]>([]);
  const [purchasedSkins, setPurchasedSkins] = useState<string[]>(() => {
    const saved = localStorage.getItem('neon_runner_skins');
    return saved ? JSON.parse(saved) : ['cyan'];
  });
  const [activeSkin, setActiveSkin] = useState<string>(() => {
    const saved = localStorage.getItem('neon_runner_active_skin');
    return saved || 'cyan';
  });
  const [earnedAchievements, setEarnedAchievements] = useState<string[]>(() => {
    const saved = localStorage.getItem('neon_runner_achievements');
    return saved ? JSON.parse(saved) : [];
  });
  const [claimedAchievements, setClaimedAchievements] = useState<string[]>(() => {
    const saved = localStorage.getItem('neon_runner_claimed');
    return saved ? JSON.parse(saved) : [];
  });
  const [notification, setNotification] = useState<{title: string, id: string} | null>(null);
  const [highScores, setHighScores] = useState<number[]>(() => {
    const saved = localStorage.getItem('neon_runner_scores');
    return saved ? JSON.parse(saved) : [];
  });

  const startGame = useCallback(() => {
    if (!hasSeenTutorial) {
      setShowTutorial(true);
      return;
    }

    setIsStarted(true);
    setIsGameOver(false);
    setScore(0);
    setSessionProcessors(0);
    const startLives = extraLifePurchased ? 4 : 3;
    setLives(startLives);
    setMaxLives(startLives);
    setExtraLifePurchased(false); 
    setIsPaused(false);
    setGameId(prev => prev + 1);
    
    // Resume/Start audio on user interaction
    AudioManager.startMusic();
  }, [extraLifePurchased]);

  const completeTutorial = useCallback(() => {
    localStorage.setItem('neon_runner_tutorial_done', 'true');
    setHasSeenTutorial(true);
    setShowTutorial(false);
    setIsStarted(true);
    setIsGameOver(false);
    setScore(0);
    setSessionProcessors(0);
    const startLives = extraLifePurchased ? 4 : 3;
    setLives(startLives);
    setMaxLives(startLives);
    setExtraLifePurchased(false); 
    setIsPaused(false);
    setGameId(prev => prev + 1);
    AudioManager.startMusic();
  }, [extraLifePurchased]);

  const skipTutorial = useCallback(() => {
    localStorage.setItem('neon_runner_tutorial_done', 'true');
    setHasSeenTutorial(true);
    setShowTutorial(false);
    // After skip, just start the game
    setIsStarted(true);
    setIsGameOver(false);
    setScore(0);
    setSessionProcessors(0);
    const startLives = extraLifePurchased ? 4 : 3;
    setLives(startLives);
    setMaxLives(startLives);
    setExtraLifePurchased(false); 
    setIsPaused(false);
    setGameId(prev => prev + 1);
    AudioManager.startMusic();
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

  const buyBuff = useCallback((type: string) => {
    if (totalProcessors >= 25000 && !purchasedBuffs.includes(type)) {
      setTotalProcessors(prev => {
        const next = prev - 25000;
        localStorage.setItem('neon_runner_total_processors', next.toString());
        return next;
      });
      setPurchasedBuffs(prev => [...prev, type]);
    }
  }, [totalProcessors, purchasedBuffs]);

  const buySkin = useCallback((skin: string) => {
    if (totalProcessors >= 100000 && !purchasedSkins.includes(skin)) {
      setTotalProcessors(prev => {
        const next = prev - 100000;
        localStorage.setItem('neon_runner_total_processors', next.toString());
        return next;
      });
      setPurchasedSkins(prev => {
        const next = [...prev, skin];
        localStorage.setItem('neon_runner_skins', JSON.stringify(next));
        return next;
      });
    }
  }, [totalProcessors, purchasedSkins]);

  const handleSetActiveSkin = useCallback((skin: string) => {
    if (purchasedSkins.includes(skin)) {
      setActiveSkin(skin);
      localStorage.setItem('neon_runner_active_skin', skin);
    }
    
    // Skin achievement check
    if (purchasedSkins.length >= 5 && !earnedAchievements.includes('rainbow')) {
      handleAchievementUnlock('rainbow', 'Rainbow');
    }
  }, [purchasedSkins, earnedAchievements]);

  const handleAchievementUnlock = useCallback((id: string, title: string) => {
    setEarnedAchievements(prev => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      localStorage.setItem('neon_runner_achievements', JSON.stringify(next));
      setNotification({ title, id });
      setTimeout(() => setNotification(null), 4000);
      return next;
    });
  }, []);

  const claimAchievement = useCallback((id: string, rewardValue: number) => {
    if (earnedAchievements.includes(id) && !claimedAchievements.includes(id)) {
      setClaimedAchievements(prev => {
        const next = [...prev, id];
        localStorage.setItem('neon_runner_claimed', JSON.stringify(next));
        return next;
      });
      setTotalProcessors(prev => {
        const next = prev + rewardValue;
        localStorage.setItem('neon_runner_total_processors', next.toString());
        return next;
      });
    }
  }, [earnedAchievements, claimedAchievements]);

  const recordSession = useCallback(() => {
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

    setPurchasedBuffs([]); // Consumed
  }, [score, sessionProcessors]);

  const handleGameOver = useCallback(() => {
    recordSession();
    setIsGameOver(true);
    setIsStarted(false);
  }, [recordSession]);

  const handleQuit = useCallback(() => {
    recordSession();
    setIsStarted(false);
    setIsGameOver(false);
    setIsPaused(false);
  }, [recordSession]);

  const handleLifeLost = useCallback((newLives: number) => {
    setLives(newLives);
  }, []);

  const updateScore = useCallback((newScore: number, newProcessors: number) => {
    setScore(newScore);
    setSessionProcessors(newProcessors);
  }, []);

  return (
    <main className="w-full h-screen bg-black relative">
      {notification && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[100] bg-cyan-500/10 border border-cyan-400 bg-black/80 backdrop-blur-md px-6 py-3 rounded-2xl shadow-[0_0_50px_rgba(34,211,238,0.3)] flex items-center gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="bg-cyan-400 rounded-full p-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-black"><path d="m9 11 3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
          </div>
          <div>
            <p className="text-[10px] font-black text-cyan-400 uppercase tracking-widest leading-none mb-1">Achievement Unlocked!</p>
            <p className="text-sm font-bold text-white tracking-tight uppercase italic">{notification.title}</p>
          </div>
        </div>
      )}

      {showTutorial && (
        <TutorialOverlay 
          onComplete={completeTutorial}
          onSkip={skipTutorial}
        />
      )}

      {!isStarted && !isGameOver && (
        <GameMenu 
          type="start" 
          onAction={startGame} 
          totalProcessors={totalProcessors}
          extraLifePurchased={extraLifePurchased}
          purchasedBuffs={purchasedBuffs}
          purchasedSkins={purchasedSkins}
          activeSkin={activeSkin}
          earnedAchievements={earnedAchievements}
          claimedAchievements={claimedAchievements}
          onBuyLife={buyExtraLife}
          onBuyBuff={buyBuff}
          onBuySkin={buySkin}
          onSelectSkin={handleSetActiveSkin}
          onClaimAchievement={claimAchievement}
          onReplayTutorial={() => setShowTutorial(true)}
        />
      )}
      
      {isGameOver && (
        <GameMenu 
          type="gameover" 
          score={score} 
          processors={sessionProcessors}
          onAction={startGame} 
          highScores={highScores}
          totalProcessors={totalProcessors}
          extraLifePurchased={extraLifePurchased}
          purchasedBuffs={purchasedBuffs}
          purchasedSkins={purchasedSkins}
          activeSkin={activeSkin}
          earnedAchievements={earnedAchievements}
          claimedAchievements={claimedAchievements}
          onBuyLife={buyExtraLife}
          onBuyBuff={buyBuff}
          onBuySkin={buySkin}
          onSelectSkin={handleSetActiveSkin}
          onClaimAchievement={claimAchievement}
          onExit={() => setIsGameOver(false)}
          onReplayTutorial={() => setShowTutorial(true)}
        />
      )}

      {(isStarted || isGameOver) && (
        <NeonRunner 
          key={gameId}
          onScoreUpdate={updateScore} 
          onGameOver={handleGameOver} 
          onLifeLost={handleLifeLost}
          onAchievementUnlock={handleAchievementUnlock}
          onQuit={handleQuit}
          lives={lives}
          maxLives={maxLives}
          initialBuffs={purchasedBuffs}
          activeSkin={activeSkin}
          isPaused={isPaused} 
          onTogglePause={() => setIsPaused(!isPaused)}
        />
      )}
    </main>
  );
}
