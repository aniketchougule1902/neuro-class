import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, X, BrainCircuit, Check, AlertCircle, Loader2, Zap } from 'lucide-react';
import { X402PaymentModal, X402Challenge } from '../payment/X402PaymentModal';
import { getApiUrl } from '../../config/apiConfig';

interface AITestGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTestGenerated: (test: any) => void;
}

export const AITestGeneratorModal: React.FC<AITestGeneratorModalProps> = ({
  isOpen,
  onClose,
  onTestGenerated
}) => {
  const [topic, setTopic] = useState('Data Structures & Algorithms');
  const [subject, setSubject] = useState('Computer Science');
  const [difficulty, setDifficulty] = useState<'Easy' | 'Medium' | 'Hard' | 'Adaptive'>('Medium');
  const [questionCount, setQuestionCount] = useState(5);
  const [durationMins, setDurationMins] = useState(45);
  const [totalMarks, setTotalMarks] = useState(50);
  const [instructions, setInstructions] = useState('Focus on time complexity analysis and edge case bounds.');

  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  // x402 Payment Challenge State
  const [x402Challenge, setX402Challenge] = useState<X402Challenge | null>(null);
  const [showX402Modal, setShowX402Modal] = useState(false);

  if (!isOpen) return null;

  const executeGeneration = async (paymentTxId?: string) => {
    setIsGenerating(true);
    setErrorMsg('');

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (paymentTxId) {
      headers['X-402-Payment-TxId'] = paymentTxId;
    }

    try {
      const response = await fetch(getApiUrl('/api/ai/generate-test'), {
        method: 'POST',
        headers,
        body: JSON.stringify({
          topic,
          subject,
          difficulty,
          questionCount,
          durationMins,
          totalMarks,
          instructions
        })
      });

      // Handle HTTP 402 Payment Required Challenge
      if (response.status === 402) {
        const data = await response.json();
        if (data.challenge) {
          setX402Challenge(data.challenge);
          setShowX402Modal(true);
        } else {
          setErrorMsg(data.message || 'Payment required to trigger AI Generation.');
        }
        setIsGenerating(false);
        return;
      }

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'AI Test Generation service failed.');
      }

      const result = await response.json();
      if (result.test) {
        onTestGenerated(result.test);
        onClose();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'AI Generation service error.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeGeneration();
  };

  const handlePaymentSettled = (txId: string) => {
    executeGeneration(txId);
  };

  return (
    <>
      <AnimatePresence>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="max-w-xl w-full bg-white dark:bg-slate-900 rounded-3xl p-8 border border-black/10 dark:border-white/10 shadow-2xl space-y-6 relative overflow-hidden"
          >
            <header className="flex justify-between items-center border-b border-black/5 dark:border-white/5 pb-4">
              <div className="flex items-center gap-3">
                <img src="/logo-light.png" alt="NeuroClass Logo" className="h-9 w-auto object-contain block dark:hidden drop-shadow-[0_0_8px_rgba(59,130,246,0.2)]" />
                <img src="/logo-dark.png" alt="NeuroClass Logo" className="h-9 w-auto object-contain hidden dark:block drop-shadow-[0_0_10px_rgba(59,130,246,0.4)]" />
                <div>
                  <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-white uppercase">AI Test Designer</h2>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest">
                    Orynex Intelligent Question Generator
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-full bg-slate-100 dark:bg-white/5"
              >
                <X size={18} />
              </button>
            </header>

            {errorMsg && (
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center gap-2">
                <AlertCircle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Topic / Domain</label>
                  <input
                    type="text"
                    value={topic}
                    onChange={e => setTopic(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Subject</label>
                  <input
                    type="text"
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Difficulty</label>
                  <select
                    value={difficulty}
                    onChange={e => setDifficulty(e.target.value as any)}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                    <option value="Adaptive">Adaptive</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Questions</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={questionCount}
                    onChange={e => setQuestionCount(Number(e.target.value))}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total Marks</label>
                  <input
                    type="number"
                    min={10}
                    max={200}
                    value={totalMarks}
                    onChange={e => setTotalMarks(Number(e.target.value))}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Instructions / Guidelines</label>
                <textarea
                  rows={2}
                  value={instructions}
                  onChange={e => setInstructions(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Zap size={16} />
                  <span className="font-bold">x402 Payment Protocol Active</span>
                </div>
                <span className="font-mono font-bold text-[11px] bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/30">
                  0.10 ALGO
                </span>
              </div>

              <button
                type="submit"
                disabled={isGenerating}
                className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold uppercase tracking-widest text-xs rounded-2xl shadow-xl shadow-indigo-500/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Synthesizing Test Paper via AI...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={18} />
                    <span>Generate AI Test Paper (0.10 ALGO)</span>
                  </>
                )}
              </button>
            </form>
          </motion.div>
        </div>
      </AnimatePresence>

      <X402PaymentModal
        isOpen={showX402Modal}
        challenge={x402Challenge}
        onClose={() => setShowX402Modal(false)}
        onPaymentSettled={handlePaymentSettled}
      />
    </>
  );
};
