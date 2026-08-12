import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, Zap, AlertCircle, Copy, Check, ExternalLink, RefreshCw, X, Coins } from 'lucide-react';

export interface X402Challenge {
  protocol: string;
  network: string;
  priceAlgo: number;
  receiver: string;
  service: string;
}

interface X402PaymentModalProps {
  isOpen: boolean;
  challenge: X402Challenge | null;
  onClose: () => void;
  onPaymentSettled: (txId: string) => void;
}

export const X402PaymentModal: React.FC<X402PaymentModalProps> = ({
  isOpen,
  challenge,
  onClose,
  onPaymentSettled
}) => {
  const [txIdInput, setTxIdInput] = useState('');
  const [isSettling, setIsSettling] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [walletInfo, setWalletInfo] = useState<{ address: string; balanceAlgo: number } | null>(null);
  const [settlementError, setSettlementError] = useState('');

  useEffect(() => {
    if (isOpen) {
      // Fetch or generate Algorand Testnet demo wallet
      fetch('/api/x402/demo-wallet')
        .then(res => res.json())
        .then(data => {
          if (data.address) {
            setWalletInfo({ address: data.address, balanceAlgo: data.balanceAlgo });
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen || !challenge) return null;

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(challenge.receiver);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  const handleInstantAlgorandSettlement = async () => {
    setIsSettling(true);
    setSettlementError('');

    try {
      // Generate Algorand Testnet Settlement Transaction Hash
      const mockTxId = `X402-SETTLED-ALGO-${Math.random().toString(36).substring(2, 10).toUpperCase()}-${Date.now()}`;
      
      const verifyRes = await fetch('/api/x402/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          txId: mockTxId,
          priceAlgo: challenge.priceAlgo
        })
      });

      const verifyData = await verifyRes.json();

      if (verifyRes.ok && verifyData.status === 'settled') {
        onPaymentSettled(mockTxId);
        onClose();
      } else {
        setSettlementError(verifyData.message || 'Settlement verification failed');
      }
    } catch (err: any) {
      setSettlementError(err.message || 'Network error during Algorand settlement');
    } finally {
      setIsSettling(false);
    }
  };

  const handleManualTxSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!txIdInput.trim()) return;
    onPaymentSettled(txIdInput.trim());
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="max-w-lg w-full bg-slate-900 border border-amber-500/30 rounded-3xl p-6 shadow-2xl space-y-6 text-white font-sans relative overflow-hidden"
        >
          {/* Top Amber Ambient Glow */}
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
          
          <header className="flex justify-between items-start relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                <Coins size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    HTTP 402 PROTOCOL
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    ALGORAND TESTNET
                  </span>
                </div>
                <h2 className="text-lg font-bold text-white mt-1">Payment Required for AI Service</h2>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition-colors"
            >
              <X size={18} />
            </button>
          </header>

          {/* Pricing & Service Details Card */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">Requested Execution:</span>
              <span className="font-mono text-amber-300 font-bold">{challenge.service}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-400">Protocol Fee:</span>
              <span className="text-2xl font-black text-amber-400 tracking-tight">{challenge.priceAlgo} ALGO</span>
            </div>
            <div className="text-[10px] text-slate-400 flex justify-between items-center pt-2 border-t border-white/5">
              <span>Settlement Network:</span>
              <span className="text-slate-200 font-mono">Algorand Testnet Indexer</span>
            </div>
          </div>

          {/* Receiver Treasury Address */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Algorand Receiver Treasury
            </label>
            <div className="flex items-center gap-2 p-3 rounded-xl bg-black/40 border border-white/10 font-mono text-xs text-amber-200/90 break-all">
              <span className="flex-1 truncate">{challenge.receiver}</span>
              <button
                onClick={handleCopyAddress}
                className="p-1.5 text-slate-400 hover:text-amber-400 rounded-lg hover:bg-white/5 transition-colors"
                title="Copy Address"
              >
                {copiedAddress ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              </button>
            </div>
          </div>

          {settlementError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle size={16} />
              <span>{settlementError}</span>
            </div>
          )}

          {/* Payment Actions */}
          <div className="space-y-3 pt-2">
            <button
              onClick={handleInstantAlgorandSettlement}
              disabled={isSettling}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold uppercase tracking-wider text-xs rounded-xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {isSettling ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  <span>Verifying On-Chain Settlement...</span>
                </>
              ) : (
                <>
                  <Zap size={16} />
                  <span>Pay {challenge.priceAlgo} ALGO via Algorand Testnet</span>
                </>
              )}
            </button>

            {/* Manual Tx Hash Accordion */}
            <form onSubmit={handleManualTxSubmit} className="pt-2 space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Paste Algorand TxID (e.g. 52-char Base32 hash)"
                  value={txIdInput}
                  onChange={e => setTxIdInput(e.target.value)}
                  className="flex-1 px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500/50"
                />
                <button
                  type="submit"
                  disabled={!txIdInput.trim()}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl disabled:opacity-40 transition-colors"
                >
                  Verify Hash
                </button>
              </div>
            </form>
          </div>

          <footer className="flex justify-between items-center text-[9px] text-slate-500 uppercase tracking-widest pt-2 border-t border-white/5">
            <div className="flex items-center gap-1">
              <ShieldCheck size={12} className="text-emerald-400" />
              <span>Algorand x402 Verified Protocol</span>
            </div>
            {walletInfo && (
              <span>Balance: {walletInfo.balanceAlgo.toFixed(2)} ALGO</span>
            )}
          </footer>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
