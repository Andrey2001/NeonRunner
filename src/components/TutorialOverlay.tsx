import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MousePointer2, Move, ArrowBigUp, SkipForward, ArrowBigDown, Cpu, Zap, Skull } from 'lucide-react';

interface TutorialOverlayProps {
  onComplete: () => void;
  onSkip: () => void;
}

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({ onComplete, onSkip }) => {
  const [step, setStep] = useState(0);

  const steps = [
    {
      title: "Movement",
      description: "Use A / D keys or Swipe Left / Right to change lanes.",
      icon: Move,
      color: "text-cyan-400",
      bg: "bg-cyan-400/20"
    },
    {
      title: "Jump",
      description: "Press SPACE / W or Swipe Up to jump over obstacles.",
      icon: ArrowBigUp,
      color: "text-pink-400",
      bg: "bg-pink-400/20"
    },
    {
      title: "Slide / Roll",
      description: "Press S / Arrow Down or Swipe Down to slide under high laser barriers.",
      icon: ArrowBigDown,
      color: "text-amber-400",
      bg: "bg-amber-400/20"
    },
    {
      title: "Processors",
      description: "Collect Memory CPUs for points. All are gold, but larger ones (+100, +250) are more valuable than small ones (+50).",
      icon: Cpu,
      color: "text-yellow-400",
      bg: "bg-yellow-400/20"
    },
    {
      title: "Powerups",
      description: "Shields (Blue), 2x XP (Purple), Slow-motion (Green), Sonic Blasts (Orange), Distance Boosts (Cyan), and Hearts (Red) help you survive and score more.",
      icon: Zap,
      color: "text-emerald-400",
      bg: "bg-emerald-400/20"
    },
    {
      title: "Hazards",
      description: "Avoid red barriers. Low ones must be jumped, but high laser curtains require a Slide/Roll to pass!",
      icon: Skull,
      color: "text-red-500",
      bg: "bg-red-500/20"
    }
  ];

  const nextStep = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      onComplete();
    }
  };

  const CurrentIcon = steps[step].icon;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="max-w-sm w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-slate-900 border border-white/10 rounded-[2.5rem] p-8 md:p-10 shadow-[0_0_50px_rgba(0,0,0,0.5)] text-center relative overflow-hidden"
          >
            {/* Background Glow */}
            <div className={`absolute -top-24 -left-24 w-48 h-48 rounded-full blur-[80px] opacity-20 ${steps[step].bg}`} />
            
            <div className={`w-20 h-20 rounded-3xl ${steps[step].bg} flex items-center justify-center mx-auto mb-8 border border-white/5`}>
              <CurrentIcon className={`w-10 h-10 ${steps[step].color}`} />
            </div>

            <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter mb-4">
              {steps[step].title}
            </h2>
            
            <p className="text-white/60 text-sm leading-relaxed mb-10 px-4">
              {steps[step].description}
            </p>

            <div className="flex flex-col gap-3">
              <button
                onClick={nextStep}
                className={`w-full py-4 font-black rounded-2xl transition-all shadow-lg flex items-center justify-center gap-3 active:scale-95 ${
                  step === steps.length - 1 ? 'bg-cyan-400 text-black' : 'bg-white/10 text-white'
                }`}
              >
                {step === steps.length - 1 ? 'Get Started' : 'Next Step'}
              </button>
              
              <button
                onClick={onSkip}
                className="group flex items-center justify-center gap-2 py-2 text-[10px] text-white/30 hover:text-white/60 transition-colors uppercase font-black tracking-[0.2em]"
              >
                <SkipForward className="w-3 h-3" />
                Skip Tutorial
              </button>
            </div>

            {/* Step Indicators */}
            <div className="flex justify-center gap-2 mt-8">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                    i === step ? 'w-6 ' + steps[step].bg.replace('/20', '') : 'bg-white/10'
                  }`}
                />
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};
