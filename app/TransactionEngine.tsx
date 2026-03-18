import { useState } from 'react';
import { db } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { motion } from 'motion/react';
import { clsx } from 'clsx';
import { ArrowRightLeft, Banknote, Wallet, XCircle } from 'lucide-react';

type Member = any;
type NodeRegistry = any;
type Transaction = any;

export function TransactionEngine({ 
  nodeRegistry, 
  members, 
  currentUser, 
  preselectedMemberId, 
  onClose 
}: { 
  nodeRegistry: NodeRegistry[], 
  members: Member[], 
  currentUser: Member | null, 
  preselectedMemberId?: string,
  onClose: () => void 
}) {
  const [type, setType] = useState<'INFLOW' | 'OUTFLOW'>('INFLOW');
  const [source, setSource] = useState<'BANK' | 'HAND' | ''>('');
  const [nodeCat, setNodeCat] = useState('');
  const [amount, setAmount] = useState('');
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0]);
  const [memberId, setMemberId] = useState(preselectedMemberId || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!source || !nodeCat || !amount || !memberId || !transactionDate) return;

    setIsSubmitting(true);
    try {
      const selectedNode = nodeRegistry.find((n: any) => n.id === nodeCat);
      if (!selectedNode) throw new Error("Invalid node category");

      const txId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      const newTx: Transaction = {
        id: txId,
        type,
        source_fund: source as 'BANK' | 'HAND',
        node_category: selectedNode.name,
        parent_master_node: selectedNode.parent_master_node,
        amount: parseFloat(amount),
        member_id: memberId,
        status: 'PENDING',
        created_by: currentUser?.uid || '',
        created_at: new Date().toISOString(),
        transaction_date: transactionDate,
        description: ''
      };

      await setDoc(doc(db, 'transactions', txId), newTx);
      
      alert("Transaction submitted to Verification Queue.");
      onClose();
    } catch (error: any) {
      alert("Error: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl w-full max-w-2xl"
    >
      <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-white">New Transaction</h2>
          <p className="text-zinc-400 text-sm mt-1">Submit an entry for Maker-Checker verification.</p>
        </div>
        <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors">
          <XCircle className="w-6 h-6" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">Associated Member <span className="text-rose-500">*</span></label>
          <select 
            required
            value={memberId}
            onChange={(e) => setMemberId(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 appearance-none"
          >
            <option value="" disabled>Select member first...</option>
            {members.map((m: any) => (
              <option key={m.uid} value={m.uid}>{m.name}</option>
            ))}
          </select>
        </div>

        {memberId && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-6">
            <div className="flex p-1 bg-zinc-950 rounded-xl border border-zinc-800">
              <button
                type="button"
                onClick={() => setType('INFLOW')}
                className={clsx(
                  "flex-1 py-2 text-sm font-medium rounded-lg transition-colors",
                  type === 'INFLOW' ? "bg-emerald-500/20 text-emerald-400" : "text-zinc-400 hover:text-white"
                )}
              >
                Money In (Inflow)
              </button>
              <button
                type="button"
                onClick={() => setType('OUTFLOW')}
                className={clsx(
                  "flex-1 py-2 text-sm font-medium rounded-lg transition-colors",
                  type === 'OUTFLOW' ? "bg-rose-500/20 text-rose-400" : "text-zinc-400 hover:text-white"
                )}
              >
                Money Out (Outflow)
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Source Fund <span className="text-rose-500">*</span></label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSource('BANK')}
                    className={clsx(
                      "p-4 rounded-xl border text-left transition-all",
                      source === 'BANK' ? "border-indigo-500 bg-indigo-500/10" : "border-zinc-800 bg-zinc-950 hover:border-zinc-700"
                    )}
                  >
                    <Banknote className={clsx("w-6 h-6 mb-2", source === 'BANK' ? "text-indigo-400" : "text-zinc-500")} />
                    <p className={clsx("font-medium", source === 'BANK' ? "text-indigo-400" : "text-zinc-300")}>Bank Account</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSource('HAND')}
                    className={clsx(
                      "p-4 rounded-xl border text-left transition-all",
                      source === 'HAND' ? "border-emerald-500 bg-emerald-500/10" : "border-zinc-800 bg-zinc-950 hover:border-zinc-700"
                    )}
                  >
                    <Wallet className={clsx("w-6 h-6 mb-2", source === 'HAND' ? "text-emerald-400" : "text-zinc-500")} />
                    <p className={clsx("font-medium", source === 'HAND' ? "text-emerald-400" : "text-zinc-300")}>Cash on Hand</p>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Node Category <span className="text-rose-500">*</span></label>
                <select 
                  required
                  value={nodeCat}
                  onChange={(e) => setNodeCat(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 appearance-none"
                >
                  <option value="" disabled>Select category...</option>
                  {nodeRegistry.map((node: any) => (
                    <option key={node.id} value={node.id}>{node.name} ({node.parent_master_node})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Amount <span className="text-rose-500">*</span></label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-mono text-lg">$</span>
                  <input 
                    type="number" 
                    step="0.01"
                    min="0.01"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 pl-8 pr-4 text-white font-mono text-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Transaction Date <span className="text-rose-500">*</span></label>
                <input 
                  type="date" 
                  required
                  value={transactionDate}
                  onChange={(e) => setTransactionDate(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>
            </div>

            <div className="pt-4">
              <button 
                type="submit"
                disabled={isSubmitting || !source || !nodeCat || !amount || !memberId}
                className="w-full bg-white text-black hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {isSubmitting ? 'Submitting...' : 'Submit to Verification Queue'}
                <ArrowRightLeft className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </form>
    </motion.div>
  );
}
