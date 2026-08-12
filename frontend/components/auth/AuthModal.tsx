import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, GraduationCap, Monitor, ArrowRight, Sparkles } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import { clsx, type ClassValue } from 'clsx';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectRole: (role: 'teacher' | 'student') => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSelectRole }) => {
  const [hoveredRole, setHoveredRole] = useState<'teacher' | 'student' | null>(null);
  
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-md"
        />

        {/* Modal */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative w-full max-w-4xl bg-white dark:bg-[#0a0a0a] rounded-[40px] overflow-hidden shadow-2xl flex border border-black/5 dark:border-white/10"
        >
          {/* Left Side: Branding / Copy */}
          <div className="hidden md:flex w-5/12 bg-slate-50 dark:bg-black p-12 flex-col justify-between border-r border-black/5 dark:border-white/5 relative overflow-hidden">
             {/* Background glows */}
             <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px]" />
             <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 rounded-full blur-[80px]" />
             
             <div className="relative z-10 space-y-4">
               <div className="flex items-center gap-2 mb-8">
                  <img src="/logo-dark.png" className="w-8 h-8 hidden dark:block drop-shadow-[0_0_10px_rgba(59,130,246,0.3)]" alt="Logo" />
                  <img src="/logo-light.png" className="w-8 h-8 block dark:hidden" alt="Logo" />
                  <span className="text-xl font-black tracking-tight flex items-center gap-1.5 text-slate-900 dark:text-white">
                    NEURO<span className="text-blue-600 dark:text-blue-400 font-light">CLASS</span>
                  </span>
               </div>
               <h2 className="text-4xl font-light tracking-tighter text-slate-900 dark:text-white leading-tight">
                 Welcome to the <br/><span className="font-bold">Future of Learning.</span>
               </h2>
               <p className="text-slate-500 dark:text-white/40 text-sm leading-relaxed max-w-[250px]">
                 Identify your role to access your personalized AI-powered academic workspace.
               </p>
             </div>
             
             <div className="relative z-10">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                  <Sparkles size={14} className="text-blue-500" /> Powered by NeuroClass AI
                </div>
             </div>
          </div>

          {/* Right Side: Role Selection */}
          <div className="w-full md:w-7/12 p-8 md:p-12 relative bg-white dark:bg-[#0a0a0a]">
            <button 
              onClick={onClose}
              className="absolute top-8 right-8 w-10 h-10 rounded-full flex items-center justify-center bg-slate-100 dark:bg-white/5 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              <X size={20} />
            </button>

            <div className="mt-12 md:mt-8 space-y-8">
              <div>
                <h3 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mb-2">Select your portal</h3>
                <p className="text-sm text-slate-500 dark:text-white/40">Choose how you want to interact with NeuroClass.</p>
              </div>

              <div className="space-y-4">
                {/* Teacher Option */}
                <motion.div
                  onHoverStart={() => setHoveredRole('teacher')}
                  onHoverEnd={() => setHoveredRole(null)}
                  onClick={() => onSelectRole('teacher')}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={cn(
                    "group relative p-6 rounded-3xl border transition-all cursor-pointer overflow-hidden",
                    hoveredRole === 'teacher' || hoveredRole === null 
                      ? "border-blue-500/30 bg-blue-50/50 dark:bg-blue-500/5 shadow-xl shadow-blue-500/10" 
                      : "border-black/5 dark:border-white/5 bg-slate-50 dark:bg-white/5 opacity-50"
                  )}
                >
                   <div className="flex items-center justify-between relative z-10">
                     <div className="flex items-center gap-5">
                       <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:scale-110 transition-transform duration-500">
                         <Monitor size={24} />
                       </div>
                       <div className="text-left">
                         <h4 className="text-lg font-bold text-slate-900 dark:text-white">Instructor</h4>
                         <p className="text-xs text-slate-500 dark:text-white/50 mt-1">Manage classrooms, deploy AI tests, and monitor proctoring.</p>
                       </div>
                     </div>
                     <div className="w-10 h-10 rounded-full bg-white dark:bg-white/10 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:translate-x-1 transition-transform">
                       <ArrowRight size={18} />
                     </div>
                   </div>
                </motion.div>

                {/* Student Option */}
                <motion.div
                  onHoverStart={() => setHoveredRole('student')}
                  onHoverEnd={() => setHoveredRole(null)}
                  onClick={() => onSelectRole('student')}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={cn(
                    "group relative p-6 rounded-3xl border transition-all cursor-pointer overflow-hidden",
                    hoveredRole === 'student' || hoveredRole === null 
                      ? "border-purple-500/30 bg-purple-50/50 dark:bg-purple-500/5 shadow-xl shadow-purple-500/10" 
                      : "border-black/5 dark:border-white/5 bg-slate-50 dark:bg-white/5 opacity-50"
                  )}
                >
                   <div className="flex items-center justify-between relative z-10">
                     <div className="flex items-center gap-5">
                       <div className="w-14 h-14 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-lg shadow-purple-500/30 group-hover:scale-110 transition-transform duration-500">
                         <GraduationCap size={24} />
                       </div>
                       <div className="text-left">
                         <h4 className="text-lg font-bold text-slate-900 dark:text-white">Student</h4>
                         <p className="text-xs text-slate-500 dark:text-white/50 mt-1">Join classrooms, take tests, and view AI evaluations.</p>
                       </div>
                     </div>
                     <div className="w-10 h-10 rounded-full bg-white dark:bg-white/10 flex items-center justify-center text-purple-600 dark:text-purple-400 group-hover:translate-x-1 transition-transform">
                       <ArrowRight size={18} />
                     </div>
                   </div>
                </motion.div>
              </div>
              
              <p className="text-[10px] text-center text-slate-400 font-medium px-4">
                By signing in, you agree to NeuroClass AI's terms of service and biometric privacy policy.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
