import React from 'react';
import { motion } from 'motion/react';
import { Play, RotateCcw, Home } from 'lucide-react';

interface MenuProps {
  score?: number;
  processors?: number;
  totalProcessors?: number;
  onAction: () => void;
  type: 'start' | 'gameover';
  highScores?: number[];
}

export const GameMenu: React.FC<MenuProps> = ({ score, processors, totalProcessors, onAction, type, highScores }) => {
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
              {totalProcessors !== undefined && (
                <div className="flex items-center gap-2 text-yellow-500 font-mono text-xs">
                  <span className="opacity-50">Total CPUs:</span>
                  <span className="font-bold">{totalProcessors.toLocaleString()}</span>
                </div>
              )}
            </div>
          ) : (
            <span className="px-3 py-1 bg-pink-500/10 text-pink-500 text-[10px] font-black tracking-[0.3em] uppercase rounded-full border border-pink-500/20">
              System Breached
            </span>
          )}
        </div>

        <h1 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tighter uppercase italic leading-none">
          {type === 'start' ? 'Neon' : 'Critical'}<br />
          <span className={type === 'start' ? 'text-cyan-400' : 'text-pink-500'}>
            {type === 'start' ? 'Depth' : 'Failure'}
          </span>
        </h1>
        
        {type === 'gameover' && (
          <div className="mb-6 space-y-4">
            <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
              <div className="flex justify-between items-end mb-4">
                <div className="text-left">
                  <p className="text-white/40 font-sans uppercase tracking-[0.4em] text-[8px] mb-1">Session Distance</p>
                  <p className="text-3xl font-bold text-white tabular-nums tracking-tighter">
                    {score?.toLocaleString()}m
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-white/40 font-sans uppercase tracking-[0.4em] text-[8px] mb-1">Session CPUs</p>
                  <p className="text-3xl font-bold text-yellow-400 tabular-nums tracking-tighter">
                    +{processors?.toLocaleString()}
                  </p>
                </div>
              </div>
              
              <div className="pt-4 border-t border-white/10 text-center">
                <p className="text-white/40 font-sans uppercase tracking-[0.4em] text-[8px] mb-1">Network Bank</p>
                <p className="text-xl font-bold text-yellow-500/80 tabular-nums tracking-tighter">
                  {totalProcessors?.toLocaleString()} Total CPUs
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

        <button 
          onClick={onAction}
          className={`group relative inline-flex items-center gap-4 px-8 py-3.5 ${type === 'start' ? 'bg-cyan-400' : 'bg-pink-500'} text-black font-black rounded-xl overflow-hidden transition-all hover:scale-105 active:scale-95 shadow-[0_15px_30px_-5px_rgba(0,0,0,0.5)]`}
        >
          <div className="absolute inset-0 bg-white/30 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 skew-x-12" />
          {type === 'start' ? (
            <>
              <Play className="w-5 h-5 fill-black" />
              <span className="tracking-widest text-sm">INITIALIZE</span>
            </>
          ) : (
            <>
              <RotateCcw className="w-5 h-5" />
              <span className="tracking-widest text-sm">REBOOT</span>
            </>
          )}
        </button>

        <div className="mt-8 flex justify-center gap-6">
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 rounded-lg border border-white/20 flex items-center justify-center text-[10px] font-bold text-white/40">W</div>
            <span className="text-[9px] text-white/30 font-black uppercase tracking-widest">Jump</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 rounded-lg border border-white/20 flex items-center justify-center text-[10px] font-bold text-white/40">A</div>
            <span className="text-[9px] text-white/30 font-black uppercase tracking-widest">Left</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 rounded-lg border border-white/20 flex items-center justify-center text-[10px] font-bold text-white/40">D</div>
            <span className="text-[9px] text-white/30 font-black uppercase tracking-widest">Right</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
