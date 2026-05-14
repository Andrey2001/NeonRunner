import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Play, RotateCcw, Heart, ShoppingBag, ArrowLeft, Shield, Zap, Wind, Palette, Award, CheckCircle2, TrendingUp, Bomb } from 'lucide-react';

interface MenuProps {
  score?: number;
  processors?: number;
  totalProcessors?: number;
  onAction: () => void;
  type: 'start' | 'gameover';
  highScores?: number[];
  extraLifePurchased?: boolean;
  purchasedBuffs?: string[];
  purchasedSkins?: string[];
  earnedAchievements?: string[];
  activeSkin?: string;
  onBuyLife?: () => void;
  onBuyBuff?: (type: string) => void;
  onBuySkin?: (skin: string) => void;
  onSelectSkin?: (skin: string) => void;
  onExit?: () => void;
  onReplayTutorial?: () => void;
  onClaimAchievement?: (id: string, reward: number) => void;
  claimedAchievements?: string[];
}

export const GameMenu: React.FC<MenuProps> = ({ 
  score, 
  processors, 
  totalProcessors = 0, 
  onAction, 
  type, 
  highScores,
  extraLifePurchased,
  purchasedBuffs = [],
  purchasedSkins = ['cyan'],
  earnedAchievements = [],
  claimedAchievements = [],
  activeSkin = 'cyan',
  onBuyLife,
  onBuyBuff,
  onBuySkin,
  onSelectSkin,
  onClaimAchievement,
  onExit,
  onReplayTutorial
}) => {
  const [view, setView] = useState<'main' | 'shop' | 'achievements'>('main');

  const ACHIEVEMENTS = [
    { id: 'steps', title: 'First Steps', desc: 'Run 100m in one go', reward: 1000, difficulty: 'Simple' },
    { id: 'sprint', title: 'Sprint', desc: 'Run 1,000m in one go', reward: 5000, difficulty: 'Medium' },
    { id: 'marathon', title: 'Marathon', desc: 'Run 5,000m in one go', reward: 20000, difficulty: 'Hard' },
    { id: 'godspeed', title: 'Godspeed', desc: 'Run 10,000m in one go', reward: 50000, difficulty: 'Very Hard' },
    
    { id: 'jumper_1', title: 'Bypasser', desc: 'Avoid 25 obstacles in a run', reward: 1000, difficulty: 'Simple' },
    { id: 'jumper_2', title: 'Glitch Runner', desc: 'Avoid 100 obstacles in a run', reward: 5000, difficulty: 'Medium' },
    { id: 'jumper_3', title: 'Firewall Breach', desc: 'Avoid 500 obstacles in a run', reward: 20000, difficulty: 'Hard' },
    { id: 'jumper_4', title: 'Ghost in Shell', desc: 'Avoid 1000 obstacles in a run', reward: 50000, difficulty: 'Very Hard' },

    { id: 'collector_1', title: 'Silicon Collector', desc: 'Collect 1,000 CPUs in a run', reward: 1000, difficulty: 'Simple' },
    { id: 'collector_2', title: 'System Admin', desc: 'Collect 5,000 CPUs in a run', reward: 5000, difficulty: 'Medium' },
    { id: 'collector_3', title: 'Mainframe Master', desc: 'Collect 20,000 CPUs in a run', reward: 20000, difficulty: 'Hard' },
    { id: 'collector_4', title: 'The Architect', desc: 'Collect 100,000 CPUs in a run', reward: 50000, difficulty: 'Very Hard' },

    { id: 'rainbow', title: 'Rainbow', desc: 'Own all 5 robot skins', reward: 50000, difficulty: 'Very Hard' },
  ];

  if (view === 'achievements') {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-slate-950/95 backdrop-blur-md z-50 overflow-hidden">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative p-6 md:p-8 border border-white/10 rounded-[2rem] md:rounded-[2.5rem] bg-black/60 backdrop-blur-xl shadow-[0_0_80px_rgba(34,211,238,0.1)] max-w-sm w-full mx-4 overflow-y-auto max-h-[90vh]"
        >
          <button 
            onClick={() => setView('main')}
            className="absolute top-4 left-4 md:top-6 md:left-6 p-2 text-white/50 hover:text-white transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          
          <h2 className="text-2xl md:text-3xl font-black text-white mt-6 md:mt-4 mb-2 tracking-tighter uppercase italic">
            Achievement <br/>
            <span className="text-cyan-400">Log</span>
          </h2>

          <div className="space-y-3 mt-6">
            {ACHIEVEMENTS.map(ach => {
              const isEarned = earnedAchievements.includes(ach.id);
              const isClaimed = claimedAchievements.includes(ach.id);
              return (
                <div 
                  key={ach.id} 
                  className={`p-4 rounded-2xl border transition-all ${
                    isClaimed
                    ? 'bg-emerald-500/5 border-emerald-500/10 opacity-70'
                    : isEarned 
                      ? 'bg-emerald-500/10 border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.1)]' 
                      : 'bg-white/5 border-white/5 opacity-40'
                  }`}
                >
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <h4 className={`text-xs font-black uppercase tracking-wider ${isEarned ? 'text-emerald-400' : 'text-white/80'}`}>
                        {ach.title}
                      </h4>
                      {isEarned && <CheckCircle2 size={12} className={isClaimed ? 'text-emerald-400/50' : 'text-emerald-400'} />}
                    </div>
                    <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase ${
                      ach.difficulty === 'Simple' ? 'bg-slate-500/20 text-slate-400' :
                      ach.difficulty === 'Medium' ? 'bg-blue-500/20 text-blue-400' :
                      ach.difficulty === 'Hard' ? 'bg-orange-500/20 text-orange-400' :
                      'bg-pink-500/20 text-pink-400 border border-pink-500/30'
                    }`}>
                      {ach.difficulty}
                    </span>
                  </div>
                  <p className="text-[10px] text-white/40 mb-3 leading-tight">{ach.desc}</p>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-yellow-500 font-mono text-[9px] font-black">
                      <Zap size={10} />
                      <span>{ach.reward.toLocaleString()} CPUs</span>
                    </div>

                    {isEarned && !isClaimed && (
                      <button 
                        onClick={() => onClaimAchievement?.(ach.id, ach.reward)}
                        className="px-3 py-1 bg-emerald-500 text-black text-[9px] font-black rounded-lg hover:scale-105 active:scale-95 transition-all shadow-lg shadow-emerald-500/20 uppercase tracking-widest"
                      >
                        Claim
                      </button>
                    )}

                    {isClaimed && (
                      <span className="text-[8px] font-black text-emerald-400/50 uppercase tracking-widest italic">
                        Claimed
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>
    );
  }

  if (view === 'shop') {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-slate-950/95 backdrop-blur-md z-50 overflow-hidden">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative p-6 md:p-8 border border-white/10 rounded-[2rem] md:rounded-[2.5rem] bg-black/60 backdrop-blur-xl shadow-[0_0_80px_rgba(34,211,238,0.1)] max-w-sm w-full mx-4 overflow-y-auto max-h-[90vh]"
        >
          <button 
            onClick={() => setView('main')}
            className="absolute top-4 left-4 md:top-6 md:left-6 p-2 text-white/50 hover:text-white transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          
          <h2 className="text-2xl md:text-3xl font-black text-white mt-6 md:mt-4 mb-1 md:mb-2 tracking-tighter uppercase italic">
            Hardware <br/>
            <span className="text-yellow-400">Shop</span>
          </h2>
          
          <div className="flex items-center gap-2 text-yellow-500 font-mono text-[10px] md:text-xs mb-6 md:mb-8">
            <span className="opacity-50">Balance:</span>
            <span className="font-bold">{totalProcessors.toLocaleString()} CPUs</span>
          </div>

          <div className="space-y-6">
            <section>
              <h3 className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-3">Permanent</h3>
              <div className="p-3 md:p-4 bg-white/5 rounded-2xl border border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-pink-500/20 rounded-full flex items-center justify-center border border-pink-500/30 flex-shrink-0">
                    <Heart className="text-pink-500 animate-pulse" size={18} />
                  </div>
                  <div>
                    <p className="text-white font-bold text-xs">Backup Core</p>
                    <p className="text-white/40 text-[9px]">+1 Life</p>
                  </div>
                </div>
                
                <button 
                  disabled={totalProcessors < 100000 || extraLifePurchased}
                  onClick={onBuyLife}
                  className={`px-4 py-2 rounded-lg font-black text-[10px] transition-all min-w-[80px] ${
                    extraLifePurchased 
                    ? 'bg-emerald-500/20 text-emerald-400' 
                    : totalProcessors >= 100000 
                      ? 'bg-yellow-400 text-black' 
                      : 'bg-white/5 text-white/20'
                  }`}
                >
                  {extraLifePurchased ? 'LOADED' : '100K'}
                </button>
              </div>
            </section>

            <section>
              <h3 className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-3">Pre-game Boosters (25K each)</h3>
              <div className="space-y-2">
                {[
                  { name: 'Shield', type: 'shield', icon: Shield, color: 'text-blue-400', bg: 'bg-blue-400/20', border: 'border-blue-400/30' },
                  { name: 'Double XP', type: 'multiplier', icon: Zap, color: 'text-purple-400', bg: 'bg-purple-400/20', border: 'border-purple-400/30' },
                  { name: 'Snail Mode', type: 'slow', icon: Wind, color: 'text-emerald-400', bg: 'bg-emerald-400/20', border: 'border-emerald-400/30' },
                  { name: 'Sprint Boost', type: 'dist', icon: TrendingUp, color: 'text-cyan-400', bg: 'bg-cyan-400/20', border: 'border-cyan-400/30' },
                  { name: 'Demolition', type: 'bomb', icon: Bomb, color: 'text-orange-400', bg: 'bg-orange-400/20', border: 'border-orange-400/30' }
                ].map((buff) => (
                  <div key={buff.type} className="p-3 bg-white/5 rounded-xl border border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 ${buff.bg} rounded-lg flex items-center justify-center border ${buff.border}`}>
                        <buff.icon className={buff.color} size={14} />
                      </div>
                      <p className="text-white font-bold text-[10px]">{buff.name}</p>
                    </div>
                    
                    <button 
                      disabled={totalProcessors < 25000 || purchasedBuffs.includes(buff.type)}
                      onClick={() => onBuyBuff?.(buff.type)}
                      className={`px-3 py-1.5 rounded-lg font-black text-[9px] transition-all min-w-[70px] ${
                        purchasedBuffs.includes(buff.type)
                        ? 'bg-emerald-500/20 text-emerald-400' 
                        : totalProcessors >= 25000 
                          ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' 
                          : 'bg-white/5 text-white/20'
                      }`}
                    >
                      {purchasedBuffs.includes(buff.type) ? 'ACTIVE' : 'BUY'}
                    </button>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <div className="flex items-center gap-2 mb-3">
                <Palette className="text-white/30" size={12} />
                <h3 className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Robot Skins (100K each)</h3>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { name: 'Default', id: 'cyan', color: 'bg-cyan-400' },
                  { name: 'Ruby', id: 'pink', color: 'bg-pink-500' },
                  { name: 'Emerald', id: 'emerald', color: 'bg-emerald-400' },
                  { name: 'Amber', id: 'amber', color: 'bg-yellow-400' },
                  { name: 'Amethyst', id: 'purple', color: 'bg-purple-500' }
                ].map((skin) => {
                  const isPurchased = purchasedSkins.includes(skin.id);
                  const isActive = activeSkin === skin.id;
                  
                  return (
                    <button 
                      key={skin.id}
                      onClick={() => isPurchased ? onSelectSkin?.(skin.id) : onBuySkin?.(skin.id)}
                      disabled={!isPurchased && totalProcessors < 100000}
                      className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                        isActive 
                        ? 'border-cyan-400 bg-cyan-400/10 shadow-[0_0_15px_rgba(34,211,238,0.2)]' 
                        : isPurchased
                          ? 'border-white/20 bg-white/5 hover:border-white/40'
                          : totalProcessors >= 100000 
                            ? 'border-white/5 bg-white/5 hover:bg-white/10'
                            : 'border-white/5 bg-white/5 opacity-50 grayscale'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full ${skin.color} shadow-lg`} />
                      <div className="flex flex-col items-center">
                        <span className="text-[9px] font-bold text-white uppercase tracking-wider">{skin.name}</span>
                        <span className={`text-[7px] font-black ${isActive ? 'text-cyan-400' : 'text-white/40'}`}>
                          {isActive ? 'ACTIVE' : isPurchased ? 'OWNED' : '100K'}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          </div>
          
          <p className="mt-8 text-[8px] text-white/20 font-mono text-center leading-relaxed">
            BOOSTERS ARE ONE-TIME USE PER RUN. <br/>
            SYSTEM UPGRADES CONSUMED ON START.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-slate-950/90 backdrop-blur-md z-50 overflow-hidden">
      {/* Menu Background Accents */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(34,211,238,0.15)_0%,_transparent_70%)]" />
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-pink-500/20 blur-[120px] rounded-full" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-cyan-500/20 blur-[120px] rounded-full" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative text-center p-6 md:p-8 border border-white/10 rounded-[2.5rem] bg-black/60 backdrop-blur-xl shadow-[0_0_80px_rgba(34,211,238,0.1)] max-w-sm w-full mx-4 max-h-[95vh] overflow-y-auto"
      >
        <div className="mb-2">
          {type === 'start' ? (
            <div className="flex flex-col gap-2 items-center">
              <span className="px-3 py-1 bg-cyan-500/10 text-cyan-400 text-[10px] font-black tracking-[0.3em] uppercase rounded-full border border-cyan-500/20">
                System Online
              </span>
              <div className="flex items-center gap-2 text-yellow-500 font-mono text-xs">
                <span className="opacity-50">Total CPUs:</span>
                <span className="font-bold">{totalProcessors.toLocaleString()}</span>
              </div>
            </div>
          ) : (
            <span className="px-3 py-1 bg-pink-500/10 text-pink-500 text-[10px] font-black tracking-[0.3em] uppercase rounded-full border border-pink-500/20">
              Session Ended
            </span>
          )}
        </div>

        <h1 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tighter uppercase italic leading-none">
          Neon<br />
          <span className={type === 'start' ? 'text-cyan-400' : 'text-pink-500'}>
            {type === 'start' ? 'Runner' : 'Game Over'}
          </span>
        </h1>
        
        {type === 'gameover' && (
          <div className="mb-6 space-y-4">
            <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-left">
                  <p className="text-white/40 font-sans uppercase tracking-[0.4em] text-[8px] mb-1">Distance</p>
                  <p className="text-2xl md:text-3xl font-bold text-white tabular-nums tracking-tighter break-all">
                    {score?.toLocaleString()}m
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-white/40 font-sans uppercase tracking-[0.4em] text-[8px] mb-1">CPUs</p>
                  <p className="text-2xl md:text-3xl font-bold text-yellow-400 tabular-nums tracking-tighter break-all">
                    +{processors?.toLocaleString()}
                  </p>
                </div>
              </div>
              
              <div className="pt-3 border-t border-white/10 text-center">
                <p className="text-white/40 font-sans uppercase tracking-[0.4em] text-[8px] mb-1">Total Bank</p>
                <p className="text-lg md:text-xl font-bold text-yellow-500/80 tabular-nums tracking-tighter">
                  {totalProcessors.toLocaleString()} CPUs
                </p>
              </div>
            </div>

            {highScores && highScores.length > 0 && (
              <div className="p-4 bg-black/20 rounded-2xl border border-white/10">
                <p className="text-white/40 font-sans uppercase tracking-[0.4em] text-[8px] mb-3">Best Distances</p>
                <div className="space-y-1.5">
                  {highScores.map((hs, i) => (
                    <div key={i} className="flex justify-between items-center bg-black/20 px-3 py-1.5 rounded-lg border border-white/5">
                      <span className="text-white/40 font-mono text-[10px]">#{i + 1}</span>
                      <span className={`font-bold tabular-nums text-sm ${i === 0 ? 'text-cyan-400' : 'text-white/80'}`}>
                        {hs.toLocaleString()}m
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col gap-3 mt-4">
          <button 
            onClick={onAction}
            className={`group relative flex items-center justify-center gap-4 w-full py-6 mb-2 ${type === 'start' ? 'bg-cyan-400 shadow-[0_0_40px_rgba(34,211,238,0.4)]' : 'bg-pink-500 shadow-[0_0_40px_rgba(236,72,153,0.4)]'} text-black font-black rounded-2xl overflow-hidden transition-all hover:scale-[1.02] active:scale-95 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.5)]`}
          >
            <div className="absolute inset-0 bg-white/40 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 skew-x-12" />
            <div className="flex items-center gap-4">
              {type === 'start' ? (
                <>
                  <Play className="w-8 h-8 fill-black" strokeWidth={3} />
                  <span className="text-3xl tracking-tighter italic font-black uppercase">RUN</span>
                </>
              ) : (
                <>
                  <RotateCcw className="w-8 h-8" strokeWidth={3} />
                  <span className="text-3xl tracking-tighter italic font-black uppercase">REBOOT</span>
                </>
              )}
            </div>
          </button>

          {type === 'start' ? (
            <>
              <button 
                onClick={() => setView('shop')}
                className="group relative flex items-center justify-center gap-3 py-4 rounded-2xl border border-white/10 bg-white/5 text-white/70 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all text-xs font-black uppercase tracking-[0.2em]"
              >
                <ShoppingBag size={18} className="group-hover:scale-110 transition-transform opacity-50 group-hover:opacity-100" />
                Hardware Shop
              </button>

              <button 
                onClick={() => setView('achievements')}
                className="group relative flex items-center justify-center gap-3 py-4 rounded-2xl border border-white/10 bg-white/5 text-white/70 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all text-xs font-black uppercase tracking-[0.2em]"
              >
                <Award size={18} className="group-hover:scale-110 transition-transform opacity-50 group-hover:opacity-100" />
                Achievements
              </button>

              <button 
                onClick={onReplayTutorial}
                className="group relative flex items-center justify-center gap-3 py-4 rounded-2xl border border-white/10 bg-white/5 text-white/70 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all text-xs font-black uppercase tracking-[0.2em]"
              >
                Instructions
              </button>
            </>
          ) : (
            <button 
              onClick={onExit}
              className="group relative flex items-center justify-center gap-3 py-4 rounded-2xl border border-white/10 bg-white/5 text-white/70 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all text-xs font-black uppercase tracking-[0.2em]"
            >
              <ArrowLeft size={18} className="group-hover:scale-110 transition-transform opacity-50 group-hover:opacity-100" />
              Main Menu
            </button>
          )}
        </div>

      </motion.div>
    </div>
  );
};
