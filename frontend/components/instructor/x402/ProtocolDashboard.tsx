import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Wallet, Copy, ExternalLink, Zap, RefreshCw, ShieldCheck, Activity } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { supabase } from '../../../database/supabase';
import { algoClient } from '../../../services/algoClient';

export const ProtocolDashboard = () => {
  const [wallet, setWallet] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchWallet = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_wallets')
        .select('*')
        .eq('user_id', user.id)
        .single();
        
      if (data) {
        // Fetch latest balance
        const balance = await algoClient.getBalance(data.address).catch(() => 0);
        setWallet({ ...data, balanceAlgo: balance });
      }
    };
    fetchWallet();
  }, []);

  const generateWallet = async () => {
    setLoading(true);
    setError('');
    try {
      // Assuming backend runs on 3000 as per default Next.js
      const backendUrl = (import.meta as any).env.VITE_BACKEND_URL || 'http://localhost:3000';
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const response = await fetch(`${backendUrl}/api/x402/demo-wallet`);
      if (!response.ok) throw new Error('Failed to generate wallet');
      
      const data = await response.json();
      if (data.error) throw new Error(data.error);

      // Save to Supabase
      const { error: insertError } = await supabase
        .from('user_wallets')
        .insert({
          user_id: user.id,
          address: data.address,
          mnemonic: data.mnemonic,
          secret_key: data.secretKey
        });

      if (insertError) {
        console.error('Insert error:', insertError);
        throw new Error(`Failed to save wallet securely: ${insertError.message}`);
      }

      setWallet({ ...data, balanceAlgo: 10.0 }); // Demo balance fallback or wait for refresh
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const refreshBalance = async () => {
    if (!wallet) return;
    setLoading(true);
    try {
      const balance = await algoClient.getBalance(wallet.address);
      const updatedWallet = { ...wallet, balanceAlgo: balance };
      setWallet(updatedWallet);
    } catch (err: any) {
      console.error('Failed to refresh balance:', err);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const clearWallet = () => {
    // Only clear local state, wallet remains in DB
    setWallet(null);
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-700">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <Zap className="text-yellow-500" size={32} />
          <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">x402 Protocol</h1>
        </div>
        <p className="text-slate-500 dark:text-slate-400 text-sm">Web3 AI Marketplace & Global Settlements (Algorand Testnet)</p>
      </div>

      {!wallet ? (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-3xl p-12 text-center space-y-6 shadow-xl"
        >
          <div className="w-20 h-20 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto text-yellow-600 dark:text-yellow-400">
            <Wallet size={40} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Initialize your x402 Node</h2>
            <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto text-sm">
              To use premium NeuroClass features like AI Test Generation, you need a Web3 wallet funded with Testnet ALGO.
            </p>
          </div>
          {error && <p className="text-rose-500 text-sm font-medium">{error}</p>}
          <button 
            onClick={generateWallet}
            disabled={loading}
            className="px-8 py-4 bg-yellow-500 hover:bg-yellow-600 text-white rounded-xl font-bold uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2 mx-auto disabled:opacity-50"
          >
            {loading ? <RefreshCw className="animate-spin" size={16} /> : <Zap size={16} />}
            Generate Testnet Wallet
          </button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-gradient-to-br from-slate-900 to-slate-800 dark:from-black dark:to-slate-900 p-8 rounded-3xl text-white shadow-2xl relative overflow-hidden border border-white/10"
            >
              {/* Decorative elements */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-500/10 rounded-full blur-[80px]" />
              
              <div className="relative z-10 space-y-8">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-white/50 text-[10px] font-bold uppercase tracking-widest mb-1">Available Balance</h3>
                    <div className="flex items-end gap-2">
                      <span className="text-5xl font-black tracking-tighter">{wallet.balanceAlgo || '0.00'}</span>
                      <span className="text-xl font-medium text-yellow-500 mb-1">ALGO</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-widest">
                    <Activity size={12} /> Testnet Active
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-white/50 text-[10px] font-bold uppercase tracking-widest block mb-1">Wallet Address</label>
                    <div className="flex items-center gap-2 bg-black/40 p-3 rounded-xl border border-white/5">
                      <code className="text-sm text-white/90 truncate flex-1 font-mono">{wallet.address}</code>
                      <button onClick={() => copyToClipboard(wallet.address)} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/50 hover:text-white shrink-0">
                        <Copy size={16} />
                      </button>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-white/50 text-[10px] font-bold uppercase tracking-widest block mb-1">Mnemonic Phrase (Keep Secret)</label>
                    <div className="flex items-center gap-2 bg-black/40 p-3 rounded-xl border border-white/5 group">
                      <code className="text-sm text-white/30 group-hover:text-white/90 truncate flex-1 font-mono transition-colors blur-sm group-hover:blur-none">{wallet.mnemonic}</code>
                      <button onClick={() => copyToClipboard(wallet.mnemonic)} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/50 hover:text-white shrink-0">
                        <Copy size={16} />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 pt-4 border-t border-white/10">
                  <a 
                    href={`https://dispenser.testnet.aws.algodev.network?account=${wallet.address}`} 
                    target="_blank" 
                    rel="noreferrer"
                    className="flex-1 py-3 bg-white text-black text-center rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-yellow-500 hover:text-white transition-colors flex items-center justify-center gap-2"
                  >
                    Fund via Dispenser <ExternalLink size={14} />
                  </a>
                  <button 
                    onClick={refreshBalance}
                    className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-white transition-colors"
                    title="Refresh Balance"
                  >
                    <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>

          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-3xl p-6 space-y-6">
              <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500 mb-4">
                <ShieldCheck size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">x402 Security</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                NeuroClass utilizes the HTTP 402 Payment Required status code to request micro-payments for intensive AI API calls. All payments are verified on the Algorand blockchain before AI execution.
              </p>

              <div className="p-4 bg-slate-50 dark:bg-black/20 rounded-xl border border-slate-200 dark:border-white/5 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-bold uppercase tracking-widest">Service</span>
                  <span className="text-slate-900 dark:text-white font-bold">Cost</span>
                </div>
                <div className="flex justify-between items-center text-sm border-t border-slate-200 dark:border-white/5 pt-2">
                  <span className="text-slate-600 dark:text-slate-300">AI Test Generation</span>
                  <span className="text-yellow-600 dark:text-yellow-500 font-mono font-bold">0.10 ALGO</span>
                </div>
              </div>

              <button 
                onClick={clearWallet}
                className="w-full py-3 text-rose-500 bg-rose-500/5 hover:bg-rose-500/10 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors"
              >
                Disconnect Wallet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
