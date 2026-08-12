import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Users, ShieldCheck, BrainCircuit, BarChart3, Settings, Zap } from 'lucide-react';
import { supabase } from '../../database/supabase';

interface ClassroomDetailProps {
  classroomId: string;
  onBack: () => void;
}

export const ClassroomDetail: React.FC<ClassroomDetailProps> = ({ classroomId, onBack }) => {
  const [classroom, setClassroom] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'students' | 'tests' | 'x402' | 'proctoring' | 'settings'>('students');

  useEffect(() => {
    const fetchDetails = async () => {
      const { data } = await supabase.from('classrooms').select('*').eq('id', classroomId).single();
      if (data) setClassroom(data);
    };
    fetchDetails();
  }, [classroomId]);

  if (!classroom) return <div className="p-8">Loading...</div>;

  const tabs = [
    { id: 'students', label: 'Students', icon: <Users size={16} /> },
    { id: 'tests', label: 'Test Designer', icon: <BrainCircuit size={16} /> },
    { id: 'proctoring', label: 'Proctoring', icon: <ShieldCheck size={16} /> },
    { id: 'x402', label: 'x402 Protocol', icon: <Zap size={16} /> },
    { id: 'settings', label: 'Settings', icon: <Settings size={16} /> },
  ];

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-[#0a0a0a]">
      {/* Header */}
      <div className="px-8 py-6 border-b border-black/5 dark:border-white/10 bg-white/50 dark:bg-white/5 backdrop-blur-xl flex justify-between items-center z-10 sticky top-0">
        <div className="flex items-center gap-6">
          <button 
            onClick={onBack}
            className="w-10 h-10 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-white/20 transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2 className="text-2xl font-black tracking-tight">{classroom.name}</h2>
            <div className="flex items-center gap-4 mt-1">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Code: <code className="text-blue-500">{classroom.code}</code></span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="px-8 pt-4 border-b border-black/5 dark:border-white/10 flex gap-8 sticky top-[89px] bg-slate-50/80 dark:bg-[#0a0a0a]/80 backdrop-blur-md z-10">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 pb-4 text-sm font-bold uppercase tracking-widest transition-colors relative ${
              activeTab === tab.id ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {tab.icon}
            {tab.label}
            {activeTab === tab.id && (
              <motion.div 
                layoutId="activeDetailTab"
                className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 dark:bg-blue-400 rounded-t-full"
              />
            )}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-8 relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="min-h-full"
          >
            {activeTab === 'students' && (
              <div className="bg-white dark:bg-white/5 rounded-3xl p-8 border border-black/5 dark:border-white/10 shadow-xl">
                <h3 className="text-xl font-bold mb-4">Enrolled Students</h3>
                <p className="text-sm text-slate-500 mb-8">Students will appear here once they join using your classroom code.</p>
                {/* Student list will be rendered here from the new `students` table */}
              </div>
            )}
            
            {activeTab === 'tests' && (
              <div className="bg-white dark:bg-white/5 rounded-3xl p-8 border border-black/5 dark:border-white/10 shadow-xl">
                <h3 className="text-xl font-bold mb-4">Test Designer</h3>
                <p className="text-sm text-slate-500">The Test Designer module will be integrated here.</p>
              </div>
            )}

            {activeTab === 'x402' && (
              <div className="bg-gradient-to-br from-indigo-900/50 to-purple-900/50 rounded-3xl p-8 border border-purple-500/30 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/20 rounded-full blur-[100px] pointer-events-none" />
                <h3 className="text-2xl font-black text-white mb-2 flex items-center gap-3">
                  <Zap className="text-amber-400" />
                  x402 Protocol Settlement
                </h3>
                <p className="text-sm text-purple-200 mb-8 max-w-lg">
                  Automated Algorand smart contracts for instructor compensation and tokenized student rewards based on performance milestones.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-black/40 backdrop-blur-md rounded-2xl p-6 border border-white/10">
                    <p className="text-xs uppercase tracking-widest text-purple-300 font-bold mb-2">Pending Settlement</p>
                    <p className="text-3xl font-mono text-white">450 <span className="text-sm text-purple-400">ALGO</span></p>
                  </div>
                  <div className="bg-black/40 backdrop-blur-md rounded-2xl p-6 border border-white/10">
                    <p className="text-xs uppercase tracking-widest text-emerald-300 font-bold mb-2">Total Earned</p>
                    <p className="text-3xl font-mono text-white">2,100 <span className="text-sm text-emerald-400">ALGO</span></p>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};
