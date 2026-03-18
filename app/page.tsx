'use client';

import { useState, useEffect } from 'react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import LoginPage from '@/components/LoginPage';
import { GoogleGenAI } from "@google/genai";
import { doc, getDoc, setDoc, collection, onSnapshot, query, orderBy, runTransaction, serverTimestamp, deleteDoc, updateDoc, addDoc, writeBatch, where, getDocs } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  Users, 
  ArrowRightLeft, 
  ArrowRight,
  ArrowLeft,
  Menu,
  LogOut, 
  Wallet, 
  Banknote, 
  TrendingUp, 
  TrendingDown, 
  CheckCircle, 
  XCircle,
  Plus,
  Check,
  Copy,
  AlertCircle,
  Landmark,
  ShieldAlert,
  Activity,
  PieChart,
  Settings,
  FileText,
  BarChart3,
  List,
  Grid,
  ArrowDownCircle,
  Sparkles,
  ShoppingBag,
  Loader2,
  Trash2,
  UserPlus,
  RotateCcw,
  RefreshCw,
  Download,
  FileSpreadsheet
} from 'lucide-react';
import { format } from 'date-fns';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart as RePieChart,
  Pie,
  Cell
} from 'recharts';
import { clsx } from 'clsx';

// --- Types ---
// --- Types ---
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

const handleFirestoreError = (error: unknown, operationType: OperationType, path: string | null) => {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// --- Error Boundary ---
import React from 'react';

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, errorInfo: string | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorInfo: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, errorInfo: error.message };
  }

  render() {
    if (this.state.hasError) {
      let parsedError: FirestoreErrorInfo | null = null;
      try {
        parsedError = JSON.parse(this.state.errorInfo || '');
      } catch (e) {}

      return (
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-rose-500/20 rounded-2xl p-8 max-w-lg w-full shadow-2xl">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-rose-500/10 rounded-xl">
                <ShieldAlert className="w-8 h-8 text-rose-500" />
              </div>
              <h1 className="text-2xl font-bold text-white">System Error</h1>
            </div>
            
            <div className="space-y-4">
              <p className="text-zinc-400">
                A critical error occurred while communicating with the database. This is often due to missing permissions or a configuration issue.
              </p>
              
              {parsedError ? (
                <div className="bg-black/40 rounded-xl p-4 border border-zinc-800 font-mono text-xs overflow-auto max-h-48">
                  <p className="text-rose-400 mb-2 font-bold uppercase tracking-widest">Error Details</p>
                  <pre className="text-zinc-300 whitespace-pre-wrap">
                    {JSON.stringify(parsedError, null, 2)}
                  </pre>
                </div>
              ) : (
                <div className="bg-black/40 rounded-xl p-4 border border-zinc-800 font-mono text-xs">
                  <p className="text-rose-400 mb-2 font-bold uppercase tracking-widest">Error Message</p>
                  <p className="text-zinc-300">{this.state.errorInfo}</p>
                </div>
              )}

              <button 
                onClick={() => window.location.reload()}
                className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-medium py-3 rounded-xl transition-colors mt-4"
              >
                Reload Application
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

type Member = {
  uid: string;
  name: string;
  last_name?: string;
  first_name?: string;
  registered_name?: string;
  plate_no?: string;
  route?: string;
  email?: string;
  role: 'admin' | 'member';
  capital_share?: number;
  refund?: number;
  capital_build_up?: number;
  total_capital_share: number;
  loan_balance: number;
  dividend?: number;
  gender?: string;
  created_at: string;
};

type SourceFund = {
  id: 'BANK' | 'HAND';
  balance: number;
  updated_at: string;
};

type MasterNode = {
  id: 'LENDING' | 'INCOME' | 'EXPENSES' | 'CAPITAL';
  balance: number;
  updated_at: string;
};

type NodeRegistry = {
  id: string;
  name: string;
  parent_master_node: 'LENDING' | 'INCOME' | 'EXPENSES' | 'CAPITAL';
  created_at: string;
};

type Transaction = {
  id: string;
  type: 'INFLOW' | 'OUTFLOW';
  source_fund: 'BANK' | 'HAND';
  node_category: string;
  parent_master_node: 'LENDING' | 'INCOME' | 'EXPENSES' | 'CAPITAL';
  amount: number;
  member_id: string;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED';
  created_by: string;
  verified_by?: string;
  created_at: string;
  verified_at?: string;
  transaction_date: string;
  description?: string;
};

// --- Shared Functions ---
const createAndVerifyTransaction = async (newTx: Transaction, currentUserId: string) => {
  await runTransaction(db, async (transaction) => {
    const sourceRef = doc(db, 'source_funds', newTx.source_fund);
    const masterRef = doc(db, 'master_nodes', newTx.parent_master_node);
    const memberRef = doc(db, 'members', newTx.member_id);

    const [sourceDoc, masterDoc, memberDoc] = await Promise.all([
      transaction.get(sourceRef),
      transaction.get(masterRef),
      transaction.get(memberRef)
    ]);

    if (!sourceDoc.exists()) throw new Error(`Source fund ${newTx.source_fund} not found.`);
    if (!masterDoc.exists()) throw new Error(`Master node ${newTx.parent_master_node} not found.`);
    if (!memberDoc.exists()) throw new Error(`Member ${newTx.member_id} not found.`);

    let newSourceBal = sourceDoc.data()?.balance || 0;
    let newMasterBal = masterDoc.data()?.balance || 0;
    let newLoanBal = memberDoc.data()?.loan_balance || 0;
    let newCapitalBal = memberDoc.data()?.capital_share || 0;

    if (newTx.type === 'INFLOW') {
      newSourceBal += newTx.amount;
      if (newTx.parent_master_node === 'LENDING') {
        newMasterBal -= newTx.amount;
        newLoanBal -= newTx.amount;
      } else if (newTx.parent_master_node === 'CAPITAL') {
        newMasterBal += newTx.amount;
        newCapitalBal += newTx.amount;
      } else {
        newMasterBal += newTx.amount;
      }
    } else {
      newSourceBal -= newTx.amount;
      if (newTx.parent_master_node === 'LENDING') {
        newMasterBal += newTx.amount;
        newLoanBal += newTx.amount;
      } else if (newTx.parent_master_node === 'CAPITAL') {
        newMasterBal -= newTx.amount;
        newCapitalBal -= newTx.amount;
      } else {
        newMasterBal += newTx.amount;
      }
    }

    const txRef = doc(db, 'transactions', newTx.id);
    const verifiedTx = { 
      ...newTx, 
      status: 'VERIFIED' as const, 
      verified_by: currentUserId, 
      verified_at: new Date().toISOString() 
    };
    transaction.set(txRef, verifiedTx);

    transaction.update(sourceRef, { balance: newSourceBal, updated_at: new Date().toISOString() });
    transaction.update(masterRef, { balance: newMasterBal, updated_at: new Date().toISOString() });
    transaction.update(memberRef, { 
      loan_balance: newLoanBal, 
      capital_share: newCapitalBal,
      total_capital_share: newCapitalBal // Syncing for reports
    });
  });
};

const verifyTransaction = async (tx: Transaction, isApproved: boolean, currentUserId: string | undefined) => {
  if (!currentUserId) throw new Error("User not authenticated");

  await runTransaction(db, async (transaction) => {
    const txRef = doc(db, 'transactions', tx.id);
    const txDoc = await transaction.get(txRef);
    if (!txDoc.exists() || txDoc.data().status !== 'PENDING') {
      throw new Error("Transaction is no longer pending.");
    }

    if (!isApproved) {
      transaction.update(txRef, { 
        status: 'REJECTED', 
        verified_by: currentUserId,
        verified_at: new Date().toISOString()
      });
      return;
    }

    // Atomic Updates for Verification
    const sourceRef = doc(db, 'source_funds', tx.source_fund);
    const masterRef = doc(db, 'master_nodes', tx.parent_master_node);
    const memberRef = doc(db, 'members', tx.member_id);

    const [sourceDoc, masterDoc, memberDoc] = await Promise.all([
      transaction.get(sourceRef),
      transaction.get(masterRef),
      transaction.get(memberRef)
    ]);

    if (!sourceDoc.exists()) throw new Error(`Source fund ${tx.source_fund} not found.`);
    if (!masterDoc.exists()) throw new Error(`Master node ${tx.parent_master_node} not found.`);
    if (!memberDoc.exists()) throw new Error(`Member ${tx.member_id} not found.`);

    let newSourceBal = sourceDoc.data()?.balance || 0;
    let newMasterBal = masterDoc.data()?.balance || 0;
    let newLoanBal = memberDoc.data()?.loan_balance || 0;
    let newCapitalBal = memberDoc.data()?.capital_share || 0;

    if (tx.type === 'INFLOW') {
      newSourceBal += tx.amount;
      if (tx.parent_master_node === 'LENDING') {
        newMasterBal -= tx.amount; // Paying back loan reduces lending master
        newLoanBal -= tx.amount;
      } else if (tx.parent_master_node === 'CAPITAL') {
        newMasterBal += tx.amount;
        newCapitalBal += tx.amount;
      } else {
        newMasterBal += tx.amount; // Income etc
      }
    } else {
      // OUTFLOW
      newSourceBal -= tx.amount;
      if (tx.parent_master_node === 'LENDING') {
        newMasterBal += tx.amount; // Giving loan increases lending master
        newLoanBal += tx.amount;
      } else if (tx.parent_master_node === 'CAPITAL') {
        newMasterBal -= tx.amount;
        newCapitalBal -= tx.amount;
      } else {
        newMasterBal += tx.amount; // Expenses increase
      }
    }

    transaction.update(sourceRef, { balance: newSourceBal, updated_at: new Date().toISOString() });
    transaction.update(masterRef, { balance: newMasterBal, updated_at: new Date().toISOString() });
    transaction.update(memberRef, { loan_balance: newLoanBal, capital_share: newCapitalBal });

    // If it's a merchandise expense, add to inventory
    if (tx.type === 'OUTFLOW' && tx.node_category.toLowerCase() === 'merchandise') {
      const invRef = doc(collection(db, 'inventory'));
      transaction.set(invRef, {
        id: invRef.id,
        name: `Merchandise (${new Date(tx.created_at).toLocaleDateString()})`,
        buy_price: tx.amount,
        status: 'IN_STOCK',
        created_at: new Date().toISOString(),
        tx_id: tx.id
      });
    }

    transaction.update(txRef, { 
      status: 'VERIFIED', 
      verified_by: currentUserId,
      verified_at: new Date().toISOString()
    });
  });
};

// --- Main App Component ---
export default function DigitalVaultApp() {
  const [user, setUser] = useState<any>(null);
  const [memberProfile, setMemberProfile] = useState<Member | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'members' | 'transaction' | 'income' | 'expenses' | 'lending' | 'reports' | 'export' | 'admin' | 'merchandise'>('dashboard');
  const [navigationStack, setNavigationStack] = useState<string[]>(['dashboard']);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // For mobile sidebar toggle

  const navigateTo = (tab: typeof activeTab) => {
    setActiveTab(tab);
    setNavigationStack(prev => {
      if (prev[prev.length - 1] === tab) return prev;
      return [...prev, tab];
    });
    setIsSidebarOpen(false);
  };

  const handleBack = () => {
    if (navigationStack.length > 1) {
      const newStack = [...navigationStack];
      newStack.pop();
      const prevTab = newStack[newStack.length - 1];
      setNavigationStack(newStack);
      setActiveTab(prevTab as any);
    }
  };

  // Data state
  const [sourceFunds, setSourceFunds] = useState<Record<string, SourceFund>>({});
  const [masterNodes, setMasterNodes] = useState<Record<string, MasterNode>>({});
  const [members, setMembers] = useState<Member[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [nodeRegistry, setNodeRegistry] = useState<NodeRegistry[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [showSoldModal, setShowSoldModal] = useState(false);
  const [itemToSell, setItemToSell] = useState<any>(null);
  const [sellPrice, setSellPrice] = useState('');
  const [isSelling, setIsSelling] = useState(false);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleMarkSold = (item: any) => {
    setItemToSell(item);
    setSellPrice('');
    setShowSoldModal(true);
  };

  const confirmMarkSold = async () => {
    if (!itemToSell || !sellPrice) return;
    setIsSelling(true);
    try {
      const price = parseFloat(sellPrice);
      // 1. Mark inventory as sold
      await updateDoc(doc(db, 'inventory', itemToSell.id), {
        status: 'SOLD',
        sold_at: new Date().toISOString(),
        sold_price: price
      });
      // 2. Add profit to income
      const txRef = doc(collection(db, 'transactions'));
      await setDoc(txRef, {
        id: txRef.id,
        type: 'INFLOW',
        source_fund: 'BANK',
        node_category: 'sales_profit',
        parent_master_node: 'INCOME',
        amount: price - itemToSell.buy_price,
        member_id: 'SYSTEM',
        status: 'VERIFIED',
        created_by: auth.currentUser?.uid || 'system',
        created_at: new Date().toISOString()
      });
      showToast("Item marked as sold and profit recorded.");
      setShowSoldModal(false);
      setItemToSell(null);
    } catch (e: any) {
      showToast("Error: " + e.message, 'error');
    } finally {
      setIsSelling(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Check if member profile exists, if not create it
        const memberRef = doc(db, 'members', currentUser.uid);
        const memberSnap = await getDoc(memberRef);
        
        if (!memberSnap.exists()) {
          const newMember: Member = {
            uid: currentUser.uid,
            name: currentUser.email?.split('@')[0] || 'Unknown',
            email: currentUser.email || '',
            role: (currentUser.email === 'century.decadee@gmail.com' || currentUser.email === 'ronald.narvasa.rn@gmail.com') ? 'admin' : 'member',
            capital_share: 0,
            total_capital_share: 0,
            loan_balance: 0,
            created_at: new Date().toISOString()
          };
          await setDoc(memberRef, newMember);
          setMemberProfile(newMember);
        } else {
          const data = memberSnap.data() as Member;
          // Force admin role for the owner email
          if ((currentUser.email === 'century.decadee@gmail.com' || currentUser.email === 'ronald.narvasa.rn@gmail.com') && data.role !== 'admin') {
            data.role = 'admin';
            // We don't necessarily need to update the DB here, but the local state should be correct
          }
          setMemberProfile(data);
        }
      } else {
        setMemberProfile(null);
      }
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  const initializeDefaultData = async () => {
    const bankRef = doc(db, 'source_funds', 'BANK');
    try {
      const bankSnap = await getDoc(bankRef);
      if (!bankSnap.exists()) {
        await setDoc(bankRef, { id: 'BANK', balance: 0, updated_at: new Date().toISOString() });
        await setDoc(doc(db, 'source_funds', 'HAND'), { id: 'HAND', balance: 0, updated_at: new Date().toISOString() });
        
        await setDoc(doc(db, 'master_nodes', 'LENDING'), { id: 'LENDING', balance: 0, updated_at: new Date().toISOString() });
        await setDoc(doc(db, 'master_nodes', 'INCOME'), { id: 'INCOME', balance: 0, updated_at: new Date().toISOString() });
        await setDoc(doc(db, 'master_nodes', 'EXPENSES'), { id: 'EXPENSES', balance: 0, updated_at: new Date().toISOString() });
        await setDoc(doc(db, 'master_nodes', 'CAPITAL'), { id: 'CAPITAL', balance: 0, updated_at: new Date().toISOString() });

        await setDoc(doc(db, 'node_registry', 'loan_payment'), { id: 'loan_payment', name: 'Loan Payment', parent_master_node: 'LENDING', created_at: new Date().toISOString() });
        await setDoc(doc(db, 'node_registry', 'loan_disbursement'), { id: 'loan_disbursement', name: 'Loan Disbursement', parent_master_node: 'LENDING', created_at: new Date().toISOString() });
        await setDoc(doc(db, 'node_registry', 'capital_deposit'), { id: 'capital_deposit', name: 'Capital Deposit', parent_master_node: 'CAPITAL', created_at: new Date().toISOString() });
        await setDoc(doc(db, 'node_registry', 'management_fee'), { id: 'management_fee', name: 'Management Fee', parent_master_node: 'INCOME', created_at: new Date().toISOString() });
        await setDoc(doc(db, 'node_registry', 'refund'), { id: 'refund', name: 'Refund Capital', parent_master_node: 'CAPITAL', created_at: new Date().toISOString() });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'source_funds/BANK');
    }
  };

  useEffect(() => {
    if (!isAuthReady || !user) return;

    // Listeners
    const unsubSourceFunds = onSnapshot(collection(db, 'source_funds'), (snap) => {
      const funds: Record<string, SourceFund> = {};
      snap.forEach(doc => { funds[doc.id] = doc.data() as SourceFund; });
      setSourceFunds(funds);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'source_funds'));

    const unsubMasterNodes = onSnapshot(collection(db, 'master_nodes'), (snap) => {
      const nodes: Record<string, MasterNode> = {};
      snap.forEach(doc => { nodes[doc.id] = doc.data() as MasterNode; });
      setMasterNodes(nodes);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'master_nodes'));

    const unsubMembers = onSnapshot(collection(db, 'members'), (snap) => {
      const mems: Member[] = [];
      snap.forEach(doc => { mems.push(doc.data() as Member); });
      setMembers(mems);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'members'));

    const unsubTransactions = onSnapshot(query(collection(db, 'transactions'), orderBy('created_at', 'desc')), (snap) => {
      const txs: Transaction[] = [];
      snap.forEach(doc => { txs.push(doc.data() as Transaction); });
      setTransactions(txs);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'transactions'));

    const unsubNodeRegistry = onSnapshot(collection(db, 'node_registry'), (snap) => {
      const nodes: NodeRegistry[] = [];
      snap.forEach(doc => { nodes.push(doc.data() as NodeRegistry); });
      setNodeRegistry(nodes);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'node_registry'));

    const unsubInventory = onSnapshot(collection(db, 'inventory'), (snap) => {
      setInventory(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'inventory'));

    // Initialize default nodes if admin and they don't exist
    if (memberProfile?.role === 'admin') {
      initializeDefaultData();
    }

    return () => {
      unsubSourceFunds();
      unsubMasterNodes();
      unsubMembers();
      unsubTransactions();
      unsubNodeRegistry();
      unsubInventory();
    };
  }, [isAuthReady, user, memberProfile?.role]);

  if (!isAuthReady) {
    return <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-400">Loading Vault...</div>;
  }

  if (!isAuthReady) return <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-white">Loading...</div>;
  if (!user) return <LoginPage />;

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col md:flex-row font-sans selection:bg-emerald-500/30">
      {/* Sidebar */}
      <aside className={clsx(
        "fixed inset-y-0 left-0 z-50 w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col transition-transform duration-300 md:relative md:translate-x-0",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-black">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-lg leading-none tracking-tight">Coop Finance</h2>
              <p className="text-xs text-zinc-500 mt-1">
                {(memberProfile?.role === 'admin' || auth.currentUser?.email === 'century.decadee@gmail.com' || auth.currentUser?.email === 'ronald.narvasa.rn@gmail.com') ? 'Admin Mode' : 'Member Mode'}
              </p>
            </div>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg">
            <XCircle className="w-5 h-5" />
          </button>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <NavItem 
            icon={<LayoutDashboard className="w-5 h-5" />} 
            label="Dashboard" 
            active={activeTab === 'dashboard'} 
            onClick={() => navigateTo('dashboard')} 
          />
          <NavItem 
            icon={<PieChart className="w-5 h-5" />} 
            label="Reports" 
            active={activeTab === 'reports'} 
            onClick={() => navigateTo('reports')} 
          />
          <NavItem 
            icon={<Download className="w-5 h-5" />} 
            label="Export" 
            active={activeTab === 'export'} 
            onClick={() => navigateTo('export')} 
          />
          <div className="pt-4 pb-2 px-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Master Nodes</div>
          <NavItem 
            icon={<TrendingUp className="w-5 h-5" />} 
            label="Income" 
            active={activeTab === 'income'} 
            onClick={() => navigateTo('income')} 
          />
          <NavItem 
            icon={<TrendingDown className="w-5 h-5" />} 
            label="Expenses" 
            active={activeTab === 'expenses'} 
            onClick={() => navigateTo('expenses')} 
          />
          <NavItem 
            icon={<Landmark className="w-5 h-5" />} 
            label="Lending" 
            active={activeTab === 'lending'} 
            onClick={() => navigateTo('lending')} 
          />
          <div className="pt-4 pb-2 px-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Operations</div>
          <NavItem 
            icon={<ArrowRightLeft className="w-5 h-5" />} 
            label="Transaction" 
            active={activeTab === 'transaction'} 
            onClick={() => navigateTo('transaction')} 
          />
          <NavItem 
            icon={<ShoppingBag className="w-5 h-5" />} 
            label="Merchandise" 
            active={activeTab === 'merchandise'} 
            onClick={() => navigateTo('merchandise')} 
          />
          <NavItem 
            icon={<Users className="w-5 h-5" />} 
            label="Member Directory" 
            active={activeTab === 'members'} 
            onClick={() => navigateTo('members')} 
          />
          {(memberProfile?.role === 'admin' || auth.currentUser?.email === 'century.decadee@gmail.com' || auth.currentUser?.email === 'ronald.narvasa.rn@gmail.com') && (
            <>
              <div className="pt-4 pb-2 px-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Admin</div>
              <NavItem 
                icon={<ShieldAlert className="w-5 h-5" />} 
                label="Admin" 
                active={activeTab === 'admin'} 
                onClick={() => navigateTo('admin')} 
              />
            </>
          )}
        </nav>

        {(memberProfile?.role === 'admin' || auth.currentUser?.email === 'century.decadee@gmail.com' || auth.currentUser?.email === 'ronald.narvasa.rn@gmail.com') && (
          <SidebarAutomation masterNodes={masterNodes} members={members} isAdmin={true} showToast={showToast} />
        )}

        <div className="p-4 border-t border-zinc-800">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-sm font-medium">
              {user.displayName?.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.displayName}</p>
              <p className="text-xs text-zinc-500 truncate">{user.email}</p>
            </div>
          </div>
          <button 
            onClick={() => signOut(auth)}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>
      {isSidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Liquidity Header */}
        <header className="bg-zinc-900/50 backdrop-blur-md border-b border-zinc-800 p-4 sticky top-0 z-10">
          <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4">
            <h1 className="text-xl font-semibold tracking-tight">
              {activeTab === 'dashboard' && 'Command Center'}
              {activeTab === 'income' && 'Income Ledger'}
              {activeTab === 'expenses' && 'Expenses Ledger'}
              {activeTab === 'lending' && 'Lending Ledger'}
              {activeTab === 'members' && 'Member Directory'}
              {activeTab === 'transaction' && 'Transaction Engine'}
              {activeTab === 'merchandise' && 'Merchandise Inventory'}
              {activeTab === 'admin' && 'Admin Control Panel'}
            </h1>
            <div className="flex items-center gap-4">
              <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg">
                <Menu className="w-5 h-5" />
              </button>
              {navigationStack.length > 1 && (
                <button 
                  onClick={handleBack} 
                  className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                  title="Go Back"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )}
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Banknote className="w-5 h-5 text-emerald-500" />
                  <div>
                    <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Bank Node</p>
                    <p className="text-lg font-mono font-medium">${(sourceFunds['BANK']?.balance || 0).toLocaleString()}</p>
                  </div>
                </div>
                <div className="w-px h-8 bg-zinc-800"></div>
                <div className="flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-indigo-400" />
                  <div>
                    <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Hand Node</p>
                    <p className="text-lg font-mono font-medium">${(sourceFunds['HAND']?.balance || 0).toLocaleString()}</p>
                  </div>
                </div>
              </div>
              <div className="w-px h-8 bg-zinc-800"></div>
              <button 
                onClick={() => signOut(auth)}
                className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors flex items-center gap-2"
                title="Sign Out"
              >
                <LogOut className="w-5 h-5" />
                <span className="hidden sm:inline text-sm font-medium">Sign Out</span>
              </button>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-6xl mx-auto">
            <AnimatePresence mode="wait">
              {activeTab === 'dashboard' && (
                <DashboardTab 
                  key="dashboard" 
                  masterNodes={masterNodes} 
                  transactions={transactions} 
                  isAdmin={memberProfile?.role === 'admin' || user?.email === 'century.decadee@gmail.com' || user?.email === 'ronald.narvasa.rn@gmail.com'}
                  members={members}
                  showToast={showToast}
                  setActiveTab={setActiveTab}
                  sourceFunds={sourceFunds}
                />
              )}
              {activeTab === 'income' && (
                <FilteredLedgerTab 
                  key="income"
                  title="Income"
                  masterNodeId="INCOME"
                  transactions={transactions}
                  members={members}
                  masterNodes={masterNodes}
                  color="text-emerald-400"
                  bgColor="bg-emerald-500/10"
                  borderColor="border-emerald-500/20"
                  sourceFunds={sourceFunds}
                  nodeRegistry={nodeRegistry}
                  showToast={showToast}
                />
              )}
              {activeTab === 'expenses' && (
                <FilteredLedgerTab 
                  key="expenses"
                  title="Expenses"
                  masterNodeId="EXPENSES"
                  transactions={transactions}
                  members={members}
                  masterNodes={masterNodes}
                  color="text-rose-400"
                  bgColor="bg-rose-500/10"
                  borderColor="border-rose-500/20"
                  sourceFunds={sourceFunds}
                  nodeRegistry={nodeRegistry}
                  showToast={showToast}
                />
              )}
              {activeTab === 'lending' && (
                <FilteredLedgerTab 
                  key="lending"
                  title="Lending"
                  masterNodeId="LENDING"
                  transactions={transactions}
                  members={members}
                  masterNodes={masterNodes}
                  color="text-blue-400"
                  bgColor="bg-blue-500/10"
                  borderColor="border-blue-500/20"
                  sourceFunds={sourceFunds}
                  nodeRegistry={nodeRegistry}
                  showToast={showToast}
                />
              )}
              {activeTab === 'members' && (
                <MembersTab 
                  key="members" 
                  members={members} 
                  transactions={transactions}
                  nodeRegistry={nodeRegistry}
                  currentUser={memberProfile}
                  showToast={showToast}
                />
              )}
              {activeTab === 'transaction' && (
                <TransactionTab 
                  key="transaction" 
                  transactions={transactions}
                  members={members}
                  showToast={showToast}
                />
              )}
              {activeTab === 'merchandise' && (
                <MerchandiseTab 
                  key="merchandise"
                  inventory={inventory}
                  handleMarkSold={handleMarkSold}
                  showToast={showToast}
                />
              )}
              {activeTab === 'admin' && (memberProfile?.role === 'admin' || auth.currentUser?.email === 'century.decadee@gmail.com' || auth.currentUser?.email === 'ronald.narvasa.rn@gmail.com') && (
                <AdminTab 
                  key="admin"
                  nodeRegistry={nodeRegistry}
                  masterNodes={masterNodes}
                  members={members}
                  transactions={transactions}
                  showToast={showToast}
                />
              )}
              {activeTab === 'reports' && (
                <ReportsTab 
                  key="reports"
                  transactions={transactions}
                  masterNodes={masterNodes}
                  members={members}
                  sourceFunds={sourceFunds}
                />
              )}
              {activeTab === 'export' && (
                <ExportTab 
                  key="export"
                  transactions={transactions}
                  masterNodes={masterNodes}
                  members={members}
                  sourceFunds={sourceFunds}
                />
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={clsx(
              "fixed bottom-8 right-8 z-[100] px-6 py-3 rounded-xl shadow-2xl border flex items-center gap-3",
              toast.type === 'success' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-rose-500/10 border-rose-500/20 text-rose-400"
            )}
          >
            {toast.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
            <span className="font-medium">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mark as Sold Modal */}
      <AnimatePresence>
        {showSoldModal && itemToSell && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-white">Mark as Sold</h3>
                <button 
                  onClick={() => setShowSoldModal(false)}
                  className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full transition-colors"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800">
                  <p className="text-sm text-zinc-500 mb-1">Item Name</p>
                  <p className="font-medium text-white">{itemToSell.name}</p>
                  <p className="text-xs text-zinc-500 mt-2">Bought for: <span className="text-zinc-300 font-mono">${itemToSell.buy_price}</span></p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Selling Price</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-mono">$</span>
                    <input 
                      type="number" 
                      step="0.01"
                      value={sellPrice}
                      onChange={(e) => setSellPrice(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 pl-8 pr-4 text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                      placeholder="0.00"
                      autoFocus
                    />
                  </div>
                </div>

                <div className="pt-4">
                  <button 
                    onClick={confirmMarkSold}
                    disabled={isSelling || !sellPrice}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSelling ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                    Confirm Sale
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
    </ErrorBoundary>
  );
}

// --- Components ---

function CopyButton({ text, label }: { text: string, label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-all group"
      title={label ? `Copy ${label}` : 'Copy to clipboard'}
    >
      <span className="text-[10px] font-mono truncate max-w-[80px]">{text}</span>
      {copied ? (
        <Check className="w-3 h-3 text-emerald-400" />
      ) : (
        <Copy className="w-3 h-3 opacity-50 group-hover:opacity-100" />
      )}
    </button>
  );
}

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
        active 
          ? "bg-zinc-800 text-white shadow-sm" 
          : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function FilteredLedgerTab({ title, masterNodeId, transactions, members, masterNodes, color, bgColor, borderColor, sourceFunds, nodeRegistry, showToast }: { title: string, masterNodeId: string, transactions: Transaction[], members: Member[], masterNodes: Record<string, MasterNode>, color: string, bgColor: string, borderColor: string, sourceFunds: Record<string, SourceFund>, nodeRegistry: NodeRegistry[], showToast: (msg: string, type?: 'success' | 'error') => void }) {
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualAmount, setManualAmount] = useState('');
  const [manualDate, setManualDate] = useState(new Date().toISOString().split('T')[0]);
  const [manualDesc, setManualDesc] = useState('');
  const [manualSourceFund, setManualSourceFund] = useState<'BANK' | 'HAND'>('BANK');
  const [manualCategory, setManualCategory] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  const nodeCategories = nodeRegistry.filter(n => n.parent_master_node === masterNodeId);

  const handleManualEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const amount = parseFloat(manualAmount);
      if (isNaN(amount) || amount <= 0) throw new Error("Invalid amount");
      if (!manualCategory) throw new Error("Please select a category");
      if (!manualDate) throw new Error("Please select a date");
      
      const txDate = new Date(manualDate);
      if (txDate.getFullYear() < 2026) {
        throw new Error("Transactions must be dated 2026 or later.");
      }

      const batch = writeBatch(db);
      
      // Update Source Fund
      const fundRef = doc(db, 'source_funds', manualSourceFund);
      const fundDoc = await getDoc(fundRef);
      const currentFundBal = fundDoc.data()?.balance || 0;
      const fundChange = masterNodeId === 'INCOME' ? amount : -amount;
      batch.update(fundRef, { balance: currentFundBal + fundChange, updated_at: new Date().toISOString() });
      
      // Update Master Node
      const masterRef = doc(db, 'master_nodes', masterNodeId);
      const masterDoc = await getDoc(masterRef);
      const currentMasterBal = masterDoc.data()?.balance || 0;
      batch.update(masterRef, { balance: currentMasterBal + amount, updated_at: new Date().toISOString() });
      
      // Create Transaction
      const txRef = doc(collection(db, 'transactions'));
      batch.set(txRef, {
        id: txRef.id,
        type: masterNodeId === 'INCOME' ? 'INFLOW' : 'OUTFLOW',
        source_fund: manualSourceFund,
        node_category: manualCategory,
        parent_master_node: masterNodeId,
        amount: amount,
        member_id: 'SYSTEM',
        status: 'VERIFIED',
        created_by: auth.currentUser?.uid || 'system',
        created_at: new Date().toISOString(),
        verified_at: new Date().toISOString(),
        verified_by: auth.currentUser?.uid || 'system',
        transaction_date: manualDate,
        description: manualDesc
      });
      
      await batch.commit();
      showToast(`Successfully recorded $${amount.toLocaleString()} to ${manualCategory}.`);
      setShowManualEntry(false);
      setManualAmount('');
      setManualDesc('');
    } catch (e: any) {
      showToast("Error: " + e.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  let filteredTxs = transactions.filter(t => t.parent_master_node === masterNodeId && t.status === 'VERIFIED');
  
  if (filterStartDate) {
    filteredTxs = filteredTxs.filter(t => (t.transaction_date || t.created_at.split('T')[0]) >= filterStartDate);
  }
  if (filterEndDate) {
    filteredTxs = filteredTxs.filter(t => (t.transaction_date || t.created_at.split('T')[0]) <= filterEndDate);
  }
  if (filterCategory) {
    filteredTxs = filteredTxs.filter(t => t.node_category === filterCategory);
  }

  // Sort by transaction_date desc
  filteredTxs.sort((a, b) => new Date(b.transaction_date || b.created_at).getTime() - new Date(a.transaction_date || a.created_at).getTime());

  const balance = masterNodes[masterNodeId]?.balance || 0;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      className="space-y-6"
    >
      <div className={clsx("p-6 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4", bgColor, borderColor)}>
        <div>
          <p className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-2">{title} Master Node Balance</p>
          <p className={clsx("text-4xl font-mono font-bold tracking-tight", color)}>
            ${(balance || 0).toLocaleString()}
          </p>
        </div>
        {(masterNodeId === 'INCOME' || masterNodeId === 'EXPENSES') && (
          <button 
            onClick={() => setShowManualEntry(true)}
            className={clsx(
              "px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 whitespace-nowrap bg-zinc-900 border",
              color, borderColor, "hover:bg-zinc-800"
            )}
          >
            <Plus className="w-5 h-5" />
            Manual Entry
          </button>
        )}
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <Activity className="w-5 h-5 text-zinc-400" />
            Verified Ledger
          </h3>
          <div className="flex flex-wrap items-center gap-3">
            <input 
              type="date" 
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              placeholder="Start Date"
            />
            <span className="text-zinc-500">to</span>
            <input 
              type="date" 
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              placeholder="End Date"
            />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="">All Categories</option>
              {Array.from(new Set(transactions.filter(t => t.parent_master_node === masterNodeId).map(t => t.node_category))).map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            {(filterStartDate || filterEndDate || filterCategory) && (
              <button 
                onClick={() => { setFilterStartDate(''); setFilterEndDate(''); setFilterCategory(''); }}
                className="text-xs text-rose-400 hover:text-rose-300 px-2"
              >
                Clear
              </button>
            )}
          </div>
        </div>
        {filteredTxs.length === 0 ? (
          <div className="p-8 text-center text-zinc-500">
            <p>No verified transactions found for this node with the current filters.</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800">
            {filteredTxs.map(tx => {
              const member = members.find(m => m.uid === tx.member_id);
              return (
                <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-zinc-800/30 transition-colors">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-white">{tx.node_category}</p>
                      {tx.description && <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">{tx.description}</span>}
                    </div>
                    <p className="text-sm text-zinc-400">
                      {member?.name || 'System'} • {format(new Date(tx.transaction_date || tx.created_at), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={clsx("font-mono font-medium", tx.type === 'INFLOW' ? "text-emerald-400" : "text-rose-400")}>
                      {tx.type === 'INFLOW' ? '+' : '-'}${(tx.amount || 0).toLocaleString()}
                    </p>
                    <p className="text-xs text-zinc-500 uppercase tracking-wider">{tx.source_fund}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showManualEntry && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-white">Manual {title} Entry</h3>
                <button 
                  onClick={() => setShowManualEntry(false)}
                  className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full transition-colors"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
              
              <form onSubmit={handleManualEntry} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Amount</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                    <input 
                      type="number" 
                      step="0.01"
                      value={manualAmount}
                      onChange={(e) => setManualAmount(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 pl-8 pr-4 text-white focus:outline-none focus:border-indigo-500"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Date</label>
                  <input 
                    type="date" 
                    value={manualDate}
                    onChange={(e) => setManualDate(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Category</label>
                  <select 
                    value={manualCategory}
                    onChange={(e) => setManualCategory(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
                    required
                  >
                    <option value="">Select Category</option>
                    {nodeCategories.map(n => (
                      <option key={n.id} value={n.name}>{n.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Source Fund</label>
                  <select 
                    value={manualSourceFund}
                    onChange={(e) => setManualSourceFund(e.target.value as 'BANK' | 'HAND')}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="BANK">Bank (${(sourceFunds['BANK']?.balance || 0).toLocaleString()})</option>
                    <option value="HAND">Cash on Hand (${(sourceFunds['HAND']?.balance || 0).toLocaleString()})</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Description (Optional)</label>
                  <input 
                    type="text" 
                    value={manualDesc}
                    onChange={(e) => setManualDesc(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
                    placeholder="Brief details..."
                  />
                </div>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-medium py-3 rounded-xl transition-colors disabled:opacity-50 mt-4"
                >
                  {isSubmitting ? 'Recording...' : 'Record Entry'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function ReportsTab({ transactions, masterNodes, members, sourceFunds }: { transactions: Transaction[], masterNodes: Record<string, MasterNode>, members: Member[], sourceFunds: Record<string, SourceFund> }) {
  const verifiedTxs = transactions.filter(t => t.status === 'VERIFIED');
  
  // Income vs Expenses over time (last 6 months)
  const monthlyData = Array.from({ length: 6 }).map((_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (5 - i));
    const monthStr = format(date, 'MMM yyyy');
    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
    const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

    const monthTxs = verifiedTxs.filter(t => {
      const txDate = new Date(t.transaction_date || t.created_at);
      return txDate >= monthStart && txDate <= monthEnd;
    });

    const income = monthTxs.filter(t => t.parent_master_node === 'INCOME').reduce((sum, t) => sum + t.amount, 0);
    const expenses = monthTxs.filter(t => t.parent_master_node === 'EXPENSES').reduce((sum, t) => sum + t.amount, 0);

    return { name: monthStr, income, expenses };
  });

  // Member Capital Distribution
  const pieData = members
    .sort((a, b) => (b.total_capital_share || 0) - (a.total_capital_share || 0))
    .slice(0, 5)
    .map(m => ({ name: m.name, value: m.total_capital_share || 0 }));
  
  const otherCapital = members
    .sort((a, b) => (b.total_capital_share || 0) - (a.total_capital_share || 0))
    .slice(5)
    .reduce((sum, m) => sum + (m.total_capital_share || 0), 0);
  
  if (otherCapital > 0) {
    pieData.push({ name: 'Others', value: otherCapital });
  }

  const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#71717a'];

  const timelineTxs = verifiedTxs
    .filter(t => {
      const dateStr = t.transaction_date || t.created_at.split('T')[0];
      return dateStr >= '2026-01-01';
    })
    .sort((a, b) => {
      const dateA = a.transaction_date || a.created_at.split('T')[0];
      const dateB = b.transaction_date || b.created_at.split('T')[0];
      return new Date(dateA).getTime() - new Date(dateB).getTime();
    });

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      className="space-y-6"
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Income vs Expenses Chart */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-emerald-400" />
              Income vs Expenses
            </h3>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-emerald-500"></div>
                <span className="text-zinc-400">Income</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-rose-500"></div>
                <span className="text-zinc-400">Expenses</span>
              </div>
            </div>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="#71717a" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                />
                <YAxis 
                  stroke="#71717a" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false}
                  tickFormatter={(value) => `$${value}`}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '12px' }}
                  itemStyle={{ fontSize: '12px' }}
                />
                <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Capital Distribution Pie Chart */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <h3 className="font-semibold text-lg flex items-center gap-2 mb-6">
            <PieChart className="w-5 h-5 text-indigo-400" />
            Total Capital Share Distribution
          </h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RePieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '12px' }}
                  itemStyle={{ fontSize: '12px' }}
                  formatter={(value: any) => `$${Number(value || 0).toLocaleString()}`}
                />
                <Legend 
                  verticalAlign="bottom" 
                  align="center"
                  iconType="circle"
                  wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }}
                />
              </RePieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Financial Health Summary */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <h3 className="font-semibold text-lg flex items-center gap-2 mb-6">
          <FileText className="w-5 h-5 text-blue-400" />
          Financial Position Summary
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800">
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Total Assets</p>
            <p className="text-2xl font-mono text-white">
              ${((masterNodes['LENDING']?.balance || 0) + (sourceFunds['BANK']?.balance || 0) + (sourceFunds['HAND']?.balance || 0)).toLocaleString()}
            </p>
            <p className="text-[10px] text-zinc-500 mt-2 italic">Bank + Hand + Lending</p>
          </div>
          <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800">
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Total Liquid Asset</p>
            <p className="text-2xl font-mono text-emerald-400">
              ${((sourceFunds['BANK']?.balance || 0) + (sourceFunds['HAND']?.balance || 0)).toLocaleString()}
            </p>
            <p className="text-[10px] text-zinc-500 mt-2 italic">Bank + Cash on Hand</p>
          </div>
          <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800">
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Total Liabilities (Equity)</p>
            <p className="text-2xl font-mono text-white">
              ${(masterNodes['CAPITAL']?.balance || 0).toLocaleString()}
            </p>
            <p className="text-[10px] text-zinc-500 mt-2 italic">Member Total Capital Shares</p>
          </div>
          <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800">
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Net Reserve</p>
            <p className="text-2xl font-mono text-emerald-400">
              ${((masterNodes['INCOME']?.balance || 0) - (masterNodes['EXPENSES']?.balance || 0)).toLocaleString()}
            </p>
            <p className="text-[10px] text-zinc-500 mt-2 italic">Income - Expenses</p>
          </div>
          <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800">
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Liquidity Ratio</p>
            <p className="text-2xl font-mono text-blue-400">
              {(((sourceFunds['BANK']?.balance || 0) + (sourceFunds['HAND']?.balance || 0)) / (masterNodes['CAPITAL']?.balance || 1) * 100).toFixed(1)}%
            </p>
            <p className="text-[10px] text-zinc-500 mt-2 italic">Cash / Total Capital Share</p>
          </div>
        </div>
      </div>

      {/* Detailed Financial Timeline */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-400" />
            Detailed Financial Timeline (2026 Onwards)
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-zinc-500 uppercase bg-zinc-950/50 border-y border-zinc-800">
              <tr>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Master Node</th>
                <th className="px-4 py-3 font-medium">Source Fund</th>
                <th className="px-4 py-3 font-medium text-right">Amount</th>
                <th className="px-4 py-3 font-medium">Member</th>
                <th className="px-4 py-3 font-medium">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {timelineTxs.map(t => (
                <tr key={t.id} className="hover:bg-zinc-800/20 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap text-zinc-300">
                    {t.transaction_date || t.created_at.split('T')[0]}
                  </td>
                  <td className="px-4 py-3">
                    <span className={clsx(
                      "px-2 py-1 rounded-full text-[10px] font-bold tracking-wider",
                      t.type === 'INFLOW' ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                    )}>
                      {t.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-300">{t.node_category}</td>
                  <td className="px-4 py-3 text-zinc-400 text-xs">{t.parent_master_node}</td>
                  <td className="px-4 py-3 text-zinc-400 text-xs">{t.source_fund || '-'}</td>
                  <td className="px-4 py-3 text-right font-mono text-white">
                    ${t.amount.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-zinc-400 text-xs">
                    {members.find(m => m.uid === t.member_id)?.name || 'System'}
                  </td>
                  <td className="px-4 py-3 text-zinc-400 text-xs max-w-xs truncate" title={t.description || ''}>
                    {t.description || '-'}
                  </td>
                </tr>
              ))}
              {timelineTxs.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-zinc-500">
                    No transactions found from 2026 onwards.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}

function ExportTab({ transactions, masterNodes, members, sourceFunds }: { transactions: Transaction[], masterNodes: Record<string, MasterNode>, members: Member[], sourceFunds: Record<string, SourceFund> }) {
  const handleExportTransactions = () => {
    const headers = ['Date', 'Type', 'Category', 'Master Node', 'Source Fund', 'Amount', 'Member ID', 'Status', 'Description'];
    const rows = transactions.map(t => [
      t.transaction_date || t.created_at.split('T')[0],
      t.type,
      t.node_category,
      t.parent_master_node,
      t.source_fund || '',
      t.amount.toString(),
      t.member_id,
      t.status,
      t.description || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `transactions_export_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportMembers = () => {
    const headers = ['UID', 'Name', 'Email', 'Role', 'Capital Share', 'Total Capital Share', 'Loan Balance', 'Capital Build Up', 'Refund', 'Dividend'];
    const rows = members.map(m => [
      m.uid,
      m.name,
      m.email,
      m.role,
      (m.capital_share || 0).toString(),
      (m.total_capital_share || 0).toString(),
      (m.loan_balance || 0).toString(),
      (m.capital_build_up || 0).toString(),
      (m.refund || 0).toString(),
      (m.dividend || 0).toString()
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `members_export_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      className="space-y-6"
    >
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-6 border-b border-zinc-800">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-emerald-400" />
            Data Export
          </h2>
          <p className="text-zinc-400 text-sm mt-1">Export your financial data to CSV format for Excel or other spreadsheet software.</p>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-zinc-950 border border-zinc-800">
            <div>
              <p className="font-bold text-white">Export Transactions Ledger</p>
              <p className="text-sm text-zinc-400">Download a complete history of all verified and pending transactions.</p>
            </div>
            <button 
              onClick={handleExportTransactions}
              className="px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 whitespace-nowrap bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30"
            >
              <Download className="w-5 h-5" />
              Download CSV
            </button>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-zinc-950 border border-zinc-800">
            <div>
              <p className="font-bold text-white">Export Member Directory</p>
              <p className="text-sm text-zinc-400">Download a list of all members and their current equity and loan balances.</p>
            </div>
            <button 
              onClick={handleExportMembers}
              className="px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 whitespace-nowrap bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/30"
            >
              <Download className="w-5 h-5" />
              Download CSV
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function AdminTab({ nodeRegistry, masterNodes, members, transactions, showToast }: { nodeRegistry: NodeRegistry[], masterNodes: Record<string, MasterNode>, members: Member[], transactions: Transaction[], showToast: (msg: string, type?: 'success' | 'error') => void }) {
  const [confirmReset, setConfirmReset] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const handleRestorePoint = async () => {
    if (!confirmReset) {
      setConfirmReset(true);
      setTimeout(() => setConfirmReset(false), 5000);
      return;
    }

    setIsResetting(true);
    try {
      const batch = writeBatch(db);

      // 1. Delete all transactions
      for (const tx of transactions) {
        batch.delete(doc(db, 'transactions', tx.id));
      }

      // 2. Reset Source Funds
      batch.update(doc(db, 'source_funds', 'BANK'), { balance: 1093762.24, updated_at: new Date().toISOString() });
      batch.update(doc(db, 'source_funds', 'HAND'), { balance: 175570.00, updated_at: new Date().toISOString() });

      // 3. Reset Master Nodes
      batch.update(doc(db, 'master_nodes', 'CAPITAL'), { balance: 981800.00, updated_at: new Date().toISOString() });
      batch.update(doc(db, 'master_nodes', 'INCOME'), { balance: 111962.24, updated_at: new Date().toISOString() });
      batch.update(doc(db, 'master_nodes', 'EXPENSES'), { balance: 0, updated_at: new Date().toISOString() });
      batch.update(doc(db, 'master_nodes', 'LENDING'), { balance: 0, updated_at: new Date().toISOString() });

      // 4. Create the 3 base transactions
      const tx1Ref = doc(collection(db, 'transactions'));
      batch.set(tx1Ref, {
        id: tx1Ref.id,
        type: 'INFLOW',
        source_fund: 'BANK',
        node_category: 'Capital Share',
        parent_master_node: 'CAPITAL',
        amount: 981800.00,
        member_id: 'SYSTEM',
        status: 'VERIFIED',
        created_by: 'system',
        created_at: '2025-12-31T23:59:59.000Z',
        verified_at: new Date().toISOString(),
        verified_by: 'system',
        transaction_date: '2025-12-31',
        description: 'Starting Capital Share'
      });

      const tx2Ref = doc(collection(db, 'transactions'));
      batch.set(tx2Ref, {
        id: tx2Ref.id,
        type: 'INFLOW',
        source_fund: 'BANK',
        node_category: 'Retained Earnings (Pre-2026)',
        parent_master_node: 'INCOME',
        amount: 111962.24,
        member_id: 'SYSTEM',
        status: 'VERIFIED',
        created_by: 'system',
        created_at: '2025-12-31T23:59:59.000Z',
        verified_at: new Date().toISOString(),
        verified_by: 'system',
        transaction_date: '2025-12-31',
        description: 'Starting Retained Earnings'
      });

      const tx3Ref = doc(collection(db, 'transactions'));
      batch.set(tx3Ref, {
        id: tx3Ref.id,
        type: 'INFLOW',
        source_fund: 'HAND',
        node_category: 'Cash on Hand',
        parent_master_node: 'INCOME', // Or Capital, but we'll put it in Income to balance
        amount: 175570.00,
        member_id: 'SYSTEM',
        status: 'VERIFIED',
        created_by: 'system',
        created_at: '2025-12-31T23:59:59.000Z',
        verified_at: new Date().toISOString(),
        verified_by: 'system',
        transaction_date: '2025-12-31',
        description: 'Starting Cash on Hand'
      });

      await batch.commit();

      showToast("System successfully restored to 2026 starting data.");
      setConfirmReset(false);
    } catch (error: any) {
      showToast("Restore failed: " + error.message, 'error');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      className="space-y-6"
    >
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-6 border-b border-zinc-800">
          <h2 className="text-xl font-bold text-white">System Restore Point</h2>
          <p className="text-zinc-400 text-sm mt-1">Reset the system to the exact starting data for 2026.</p>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-rose-600/10 border border-rose-600/30">
            <div>
              <p className="font-bold text-white">Restore to 2026 Starting Data</p>
              <p className="text-sm text-zinc-400">
                This will <span className="text-rose-400 font-bold">WIPE ALL TRANSACTIONS</span> and reset the balances to:<br/>
                Bank: $1,093,762.24 | Cash on Hand: $175,570.00<br/>
                Capital: $981,800.00 | Retained Earnings: $111,962.24
              </p>
            </div>
            <button 
              onClick={handleRestorePoint}
              disabled={isResetting}
              className={clsx(
                "px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 whitespace-nowrap",
                confirmReset 
                  ? "bg-rose-600 text-white shadow-lg shadow-rose-600/40" 
                  : "bg-zinc-800 text-rose-500 hover:bg-rose-600/10 border border-rose-600/30"
              )}
            >
              {isResetting ? <Loader2 className="w-5 h-5 animate-spin" /> : <RotateCcw className="w-5 h-5" />}
              {confirmReset ? 'CONFIRM RESTORE' : 'Restore System'}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function DashboardTab({ masterNodes, transactions, isAdmin, members, showToast, setActiveTab, sourceFunds }: { masterNodes: Record<string, MasterNode>, transactions: Transaction[], isAdmin: boolean, members: Member[], showToast: (msg: string, type?: 'success' | 'error') => void, setActiveTab: (tab: any) => void, sourceFunds: Record<string, SourceFund> }) {
  const pendingTxs = transactions.filter(t => t.status === 'PENDING');
  const verifiedTxs = transactions
    .filter(t => t.status === 'VERIFIED')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const recentTxs = verifiedTxs.slice(0, 5);

  const handleVerify = async (tx: Transaction, isApproved: boolean) => {
    if (!isAdmin) return;
    
    try {
      await verifyTransaction(tx, isApproved, auth.currentUser?.uid);
    } catch (error: any) {
      showToast("Verification failed: " + error.message, 'error');
    }
  };

  const totalLiquidAsset = (sourceFunds['BANK']?.balance || 0) + (sourceFunds['HAND']?.balance || 0);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      className="space-y-8"
    >
      {/* Liquid Asset Card */}
      <div className="bg-gradient-to-br from-indigo-900/50 to-zinc-900 border border-indigo-500/30 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
        <p className="text-sm font-medium text-indigo-300 uppercase tracking-wider mb-2 flex items-center gap-2">
          <Wallet className="w-4 h-4" />
          Total Liquid Asset
        </p>
        <p className="text-5xl font-mono font-bold tracking-tight text-white mb-4">
          ${totalLiquidAsset.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
            <span className="text-zinc-400">Bank: <span className="text-white font-mono">${(sourceFunds['BANK']?.balance || 0).toLocaleString()}</span></span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-400"></div>
            <span className="text-zinc-400">Cash on Hand: <span className="text-white font-mono">${(sourceFunds['HAND']?.balance || 0).toLocaleString()}</span></span>
          </div>
        </div>
      </div>

      {/* Master Node Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MasterNodeCard title="Lending" amount={masterNodes['LENDING']?.balance || 0} color="text-blue-400" />
        <MasterNodeCard title="Income" amount={masterNodes['INCOME']?.balance || 0} color="text-emerald-400" />
        <MasterNodeCard title="Expenses" amount={masterNodes['EXPENSES']?.balance || 0} color="text-rose-400" />
        <MasterNodeCard title="Total Capital Share" amount={masterNodes['CAPITAL']?.balance || 0} color="text-purple-400" />
      </div>

      {/* Recent Transactions Section */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-400" />
            Recent Transactions
          </h3>
          <button 
            onClick={() => setActiveTab('income')}
            className="text-xs text-zinc-500 hover:text-white transition-colors flex items-center gap-1"
          >
            View All <ArrowRight className="w-3 h-3" />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold border-b border-zinc-800">
                <th className="px-6 py-3">Category</th>
                <th className="px-6 py-3">Member</th>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {recentTxs.map(tx => {
                const member = members.find(m => m.uid === tx.member_id);
                return (
                  <tr key={tx.id} className="hover:bg-zinc-800/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={clsx(
                          "w-8 h-8 rounded-full flex items-center justify-center",
                          tx.type === 'INFLOW' ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
                        )}>
                          {tx.type === 'INFLOW' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{tx.node_category}</p>
                          <p className="text-[10px] text-zinc-500 uppercase tracking-widest">{tx.source_fund}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-zinc-300">{member?.name || 'Unknown'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-zinc-500 font-mono">{format(new Date(tx.created_at), 'MMM d, yyyy')}</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className={clsx("text-sm font-mono font-bold", tx.type === 'INFLOW' ? "text-emerald-400" : "text-rose-400")}>
                        {tx.type === 'INFLOW' ? '+' : '-'}${(tx.amount || 0).toLocaleString()}
                      </p>
                    </td>
                  </tr>
                );
              })}
              {recentTxs.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-zinc-500 text-sm italic">
                    No verified transactions recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Verification Queue */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            Verification Queue
            {pendingTxs.length > 0 && (
              <span className="bg-emerald-500/20 text-emerald-400 text-xs px-2 py-1 rounded-full animate-pulse">
                {pendingTxs.length} Pending
              </span>
            )}
          </h3>
        </div>
        
        {pendingTxs.length === 0 ? (
          <div className="p-8 text-center text-zinc-500">
            <CheckCircle className="w-8 h-8 mx-auto mb-3 opacity-20" />
            <p>No pending transactions to verify.</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800">
            {pendingTxs.map(tx => {
              const member = members.find(m => m.uid === tx.member_id);
              return (
                <div key={tx.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-zinc-800/30 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className={clsx(
                      "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                      tx.type === 'INFLOW' ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
                    )}>
                      {tx.type === 'INFLOW' ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-white">
                          {tx.node_category} <span className="text-zinc-500 font-normal">via {tx.source_fund}</span>
                        </p>
                        <CopyButton text={tx.id} label="Transaction ID" />
                      </div>
                      <p className="text-sm text-zinc-400">
                        {member?.name || 'Unknown'} • {format(new Date(tx.created_at), 'MMM d, h:mm a')}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto">
                    <p className="font-mono text-lg font-medium">
                      {tx.type === 'INFLOW' ? '+' : '-'}${(tx.amount || 0).toLocaleString()}
                    </p>
                    {isAdmin && (
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleVerify(tx, false)}
                          className="p-2 text-zinc-400 hover:text-rose-400 hover:bg-rose-400/10 rounded-lg transition-colors"
                          title="Reject"
                        >
                          <XCircle className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => handleVerify(tx, true)}
                          className="p-2 text-zinc-400 hover:text-emerald-400 hover:bg-emerald-400/10 rounded-lg transition-colors"
                          title="Verify & Process"
                        >
                          <CheckCircle className="w-5 h-5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function SidebarAutomation({ masterNodes, members, isAdmin, showToast }: { masterNodes: Record<string, MasterNode>, members: Member[], isAdmin: boolean, showToast: (msg: string, type?: 'success' | 'error') => void }) {
  const isActuallyAdmin = isAdmin || auth.currentUser?.email === 'century.decadee@gmail.com' || auth.currentUser?.email === 'ronald.narvasa.rn@gmail.com';
  const [isImporting, setIsImporting] = useState(false);
  const [confirmImport, setConfirmImport] = useState(false);

  if (!isActuallyAdmin) return null;

  const handleRecalculateBalances = async () => {
    setIsImporting(true);
    try {
      // 1. Sum up all member capital
      const totalCapital = members.reduce((sum, m) => sum + (m.total_capital_share || 0), 0);
      const totalLoans = members.reduce((sum, m) => sum + (m.loan_balance || 0), 0);

      // 2. Update Master Nodes
      await updateDoc(doc(db, 'master_nodes', 'CAPITAL'), {
        balance: totalCapital,
        updated_at: new Date().toISOString()
      });
      await updateDoc(doc(db, 'master_nodes', 'LENDING'), {
        balance: totalLoans,
        updated_at: new Date().toISOString()
      });

      showToast("Master balances recalculated from member data.");
    } catch (error: any) {
      showToast("Recalculation failed: " + error.message, 'error');
    } finally {
      setIsImporting(false);
    }
  };

  const handleImportLedger = async () => {
    setIsImporting(true);
    try {
      const { LEDGER_TRANSACTIONS } = await import('@/lib/ledger_data');
      const batch = writeBatch(db);
      
      let currentHandBalance = 0;
      let totalIncome = 0;
      let totalExpenses = 0;

      for (const tx of LEDGER_TRANSACTIONS) {
        const txId = `ledger_${Math.random().toString(36).substr(2, 9)}`;
        const txRef = doc(db, 'transactions', txId);
        
        if (tx.description === 'Beginning Balance') {
          currentHandBalance = tx.balance || 0;
          continue;
        }

        const type = tx.debit > 0 ? 'INFLOW' : 'OUTFLOW';
        const amount = tx.debit > 0 ? tx.debit : tx.credit;
        
        if (type === 'INFLOW') {
          totalIncome += amount;
          currentHandBalance += amount;
        } else {
          totalExpenses += amount;
          currentHandBalance -= amount;
        }

        batch.set(txRef, {
          id: txId,
          type,
          amount,
          description: tx.description,
          source_fund: 'HAND',
          node_category: tx.splitAccount || (type === 'INFLOW' ? 'INCOME' : 'EXPENSES'),
          parent_master_node: type === 'INFLOW' ? 'INCOME' : 'EXPENSES',
          member_id: 'SYSTEM',
          status: 'VERIFIED',
          created_by: auth.currentUser?.uid || 'system',
          created_at: new Date(tx.date).toISOString(),
          verified_at: new Date().toISOString(),
          verified_by: auth.currentUser?.uid || 'system'
        });
      }

      batch.update(doc(db, 'source_funds', 'HAND'), {
        balance: currentHandBalance,
        updated_at: new Date().toISOString()
      });

      // Update Master Nodes
      batch.update(doc(db, 'master_nodes', 'INCOME'), {
        balance: totalIncome,
        updated_at: new Date().toISOString()
      });
      batch.update(doc(db, 'master_nodes', 'EXPENSES'), {
        balance: totalExpenses,
        updated_at: new Date().toISOString()
      });

      await batch.commit();
      showToast(`Successfully imported ${LEDGER_TRANSACTIONS.length} ledger transactions.`);
    } catch (error: any) {
      showToast("Ledger import failed: " + error.message, 'error');
    } finally {
      setIsImporting(false);
    }
  };

  const handleImportInitialData = async () => {
    if (!confirmImport) {
      setConfirmImport(true);
      setTimeout(() => setConfirmImport(false), 3000);
      return;
    }
    
    setIsImporting(true);
    setConfirmImport(false);
    try {
      const { INITIAL_MEMBERS } = await import('@/lib/initial_members');
      
      let totalImportedCapital = 0;

      for (const memberData of INITIAL_MEMBERS) {
        const uid = `user_${Math.random().toString(36).substr(2, 9)}`;
        const capital = memberData.total_capital_share || 0;
        totalImportedCapital += capital;

        await setDoc(doc(db, 'members', uid), {
          ...memberData,
          uid,
          loan_balance: 0,
          capital_share: capital,
          total_capital_share: capital,
          created_at: new Date().toISOString()
        });
      }

      // Update CAPITAL master node balance
      const capitalRef = doc(db, 'master_nodes', 'CAPITAL');
      const capitalDoc = await getDoc(capitalRef);
      
      if (capitalDoc.exists()) {
        const currentBal = capitalDoc.data()?.balance || 0;
        await updateDoc(capitalRef, {
          balance: currentBal + totalImportedCapital,
          updated_at: new Date().toISOString()
        });
      } else {
        await setDoc(capitalRef, {
          id: 'CAPITAL',
          balance: totalImportedCapital,
          updated_at: new Date().toISOString()
        });
      }
      
      showToast(`Successfully imported ${INITIAL_MEMBERS.length} members and updated Capital node by $${totalImportedCapital.toLocaleString()}.`);
    } catch (error: any) {
      showToast("Import failed: " + error.message, 'error');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="p-4 border-t border-zinc-800">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Admin Engines</p>
      </div>
      <div className="space-y-2">
        <button 
          onClick={handleImportInitialData}
          disabled={isImporting}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs font-bold text-zinc-400 hover:text-white hover:border-zinc-700 transition-all disabled:opacity-50"
        >
          {isImporting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
          {isImporting ? 'Importing...' : confirmImport ? 'Click Again to Confirm' : 'Import Masterlist Data'}
        </button>

        <button 
          onClick={handleRecalculateBalances}
          disabled={isImporting}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs font-bold text-indigo-400 hover:text-white hover:border-indigo-900/50 transition-all disabled:opacity-50"
        >
          <RefreshCw className={clsx("w-3 h-3", isImporting && "animate-spin")} />
          Recalculate Master Balances
        </button>

        <button 
          onClick={handleImportLedger}
          disabled={isImporting}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs font-bold text-amber-400 hover:text-white hover:border-amber-900/50 transition-all disabled:opacity-50"
        >
          <FileText className="w-3 h-3" />
          Import Ledger Transactions
        </button>
      </div>
    </div>
  );
}

function MasterNodeCard({ title, amount, color }: { title: string, amount: number, color: string }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 relative overflow-hidden group hover:border-zinc-700 transition-colors">
      <p className="text-sm text-zinc-400 font-medium uppercase tracking-wider mb-1">{title}</p>
      <p className={clsx("text-2xl font-mono font-bold", color)}>${(amount || 0).toLocaleString()}</p>
    </div>
  );
}

function MembersTab({ members, transactions, nodeRegistry, currentUser, showToast }: { members: Member[], transactions: Transaction[], nodeRegistry: NodeRegistry[], currentUser: Member | null, showToast: (msg: string, type?: 'success' | 'error') => void }) {
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('member');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [type, setType] = useState<'INFLOW' | 'OUTFLOW'>('INFLOW');
  const [source, setSource] = useState<'BANK' | 'HAND' | ''>('');
  const [nodeCat, setNodeCat] = useState('');
  const [amount, setAmount] = useState('');
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0]);
  const [isTxSubmitting, setIsTxSubmitting] = useState(false);
  const [confirmDeleteMember, setConfirmDeleteMember] = useState(false);

  const totalCapitalShare = members.reduce((sum, m) => sum + (m.total_capital_share || 0), 0);
  const totalLoanBalance = members.reduce((sum, m) => sum + (m.loan_balance || 0), 0);

  const handleDeleteMember = async (uid: string) => {
    if (!confirmDeleteMember) {
      setConfirmDeleteMember(true);
      setTimeout(() => setConfirmDeleteMember(false), 3000);
      return;
    }

    try {
      await deleteDoc(doc(db, 'members', uid));
      showToast("Member deleted successfully.");
      setSelectedMember(null);
      setConfirmDeleteMember(false);
    } catch (error: any) {
      showToast("Delete failed: " + error.message, 'error');
    }
  };

  // Filter categories based on transaction type
  const filteredCategories = nodeRegistry.filter(node => {
    if (type === 'INFLOW') {
      return ['loan_payment', 'capital_deposit', 'management_fee', 'late_fee'].includes(node.id);
    } else {
      return ['loan_disbursement', 'dividend_payout', 'refund', 'expense'].includes(node.id) || node.parent_master_node === 'EXPENSES';
    }
  });

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName) return;
    
    setIsSubmitting(true);
    try {
      const newUid = `user_${Date.now()}`;
      await setDoc(doc(db, 'members', newUid), {
        uid: newUid,
        name: newMemberName,
        email: newMemberEmail || '',
        role: newMemberRole,
        capital_share: 0,
        total_capital_share: 0,
        loan_balance: 0,
        created_at: new Date().toISOString()
      });
      setShowAddMember(false);
      setNewMemberName('');
      setNewMemberEmail('');
      setNewMemberRole('member');
    } catch (error) {
      console.error("Error adding member:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTransactionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!source || !nodeCat || !amount || !selectedMember) return;

    setIsTxSubmitting(true);
    try {
      const selectedNode = nodeRegistry.find(n => n.id === nodeCat);
      if (!selectedNode) throw new Error("Invalid node category");

      const txId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      const newTx: Transaction = {
        id: txId,
        type,
        source_fund: source as 'BANK' | 'HAND',
        node_category: selectedNode.name,
        parent_master_node: selectedNode.parent_master_node,
        amount: parseFloat(amount),
        member_id: selectedMember.uid,
        status: 'PENDING',
        created_by: currentUser?.uid || '',
        created_at: new Date().toISOString(),
        transaction_date: transactionDate,
        description: ''
      };

      const isAdminUser = currentUser?.role === 'admin' || currentUser?.email === 'century.decadee@gmail.com' || currentUser?.email === 'ronald.narvasa.rn@gmail.com';

      if (isAdminUser) {
        await createAndVerifyTransaction(newTx, currentUser?.uid || '');
        showToast("Transaction approved and processed.");
      } else {
        await setDoc(doc(db, 'transactions', txId), newTx);
        showToast("Transaction submitted to Verification Queue.");
      }

      // Reset form
      setAmount('');
      setSource('');
      setNodeCat('');
      setShowTransactionForm(false);
    } catch (error: any) {
      showToast("Error: " + error.message, 'error');
    } finally {
      setIsTxSubmitting(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      className="space-y-6"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 relative overflow-hidden group">
          <p className="text-sm text-zinc-400 font-medium uppercase tracking-wider mb-2">Total Capital Share</p>
          <p className="text-3xl font-mono font-bold text-emerald-400">${totalCapitalShare.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Users className="w-32 h-32" />
          </div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 relative overflow-hidden group">
          <p className="text-sm text-zinc-400 font-medium uppercase tracking-wider mb-2">Total Outstanding Loans</p>
          <p className="text-3xl font-mono font-bold text-rose-400">${totalLoanBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Activity className="w-32 h-32" />
          </div>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden flex flex-col">
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Member Directory</h2>
            <p className="text-zinc-400 text-sm mt-1">Manage and view all registered members.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-800 mr-2">
              <button 
                onClick={() => setViewMode('list')}
                className={clsx(
                  "p-2 rounded-lg transition-colors",
                  viewMode === 'list' ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300"
                )}
                title="List View"
              >
                <List className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setViewMode('grid')}
                className={clsx(
                  "p-2 rounded-lg transition-colors",
                  viewMode === 'grid' ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300"
                )}
                title="Grid View"
              >
                <Grid className="w-4 h-4" />
              </button>
            </div>
            <button 
              onClick={() => setShowAddMember(true)}
              className="bg-indigo-500 hover:bg-indigo-600 text-white font-medium py-2 px-4 rounded-xl transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Member
            </button>
          </div>
        </div>
        
        <div className="p-6">
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {members.map(member => (
                <button
                  key={member.uid}
                  onClick={() => setSelectedMember(member)}
                  className="text-left p-4 rounded-2xl bg-zinc-950 border border-zinc-800 hover:border-indigo-500/50 hover:bg-zinc-900 transition-all group"
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-lg font-bold text-indigo-400 group-hover:scale-110 transition-transform">
                      {member.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-white truncate">{member.name}</p>
                      <p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold">{member.role}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-zinc-900/50 p-2 rounded-lg border border-zinc-800/50">
                      <p className="text-[10px] text-zinc-500 uppercase font-bold mb-0.5">Total Capital Share</p>
                      <p className="text-sm font-mono text-emerald-400">${(member.total_capital_share || 0).toLocaleString()}</p>
                    </div>
                    <div className="bg-zinc-900/50 p-2 rounded-lg border border-zinc-800/50">
                      <p className="text-[10px] text-zinc-500 uppercase font-bold mb-0.5">Debt</p>
                      <p className="text-sm font-mono text-rose-400">${(member.loan_balance || 0).toLocaleString()}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold border-b border-zinc-800">
                    <th className="px-4 py-3">Member</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3 text-right">Total Capital Share</th>
                    <th className="px-4 py-3 text-right">Loan Balance</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {members.map(member => (
                    <tr 
                      key={member.uid} 
                      className="hover:bg-zinc-800/30 transition-colors group cursor-pointer"
                      onClick={() => setSelectedMember(member)}
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-indigo-400">
                            {member.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-white">{member.name}</p>
                            <p className="text-[10px] text-zinc-500 font-mono">{member.uid}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={clsx(
                          "text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full",
                          member.role === 'admin' ? "bg-indigo-500/10 text-indigo-400" : "bg-zinc-800 text-zinc-400"
                        )}>
                          {member.role}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right font-mono text-emerald-400">
                        ${(member.total_capital_share || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-4 text-right font-mono text-rose-400">
                        ${(member.loan_balance || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <button className="text-zinc-500 hover:text-white transition-colors">
                          <Activity className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Member Details Modal */}
      <AnimatePresence>
        {selectedMember && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b border-zinc-800 flex flex-wrap gap-6 items-center justify-between bg-zinc-900/50">
                <div>
                  <h2 className="text-3xl font-bold text-white">{selectedMember.name}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-zinc-400 text-sm">{selectedMember.email}</p>
                    <div className="w-1 h-1 rounded-full bg-zinc-700"></div>
                    <CopyButton text={selectedMember.uid} label="Member ID" />
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => handleDeleteMember(selectedMember.uid)}
                    className={clsx(
                      "font-medium py-2.5 px-4 rounded-xl transition-all flex items-center gap-2 border",
                      confirmDeleteMember 
                        ? "bg-rose-500 text-white border-rose-500 shadow-lg shadow-rose-500/20" 
                        : "bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-rose-400 hover:border-rose-500/50"
                    )}
                  >
                    <Trash2 className="w-4 h-4" />
                    {confirmDeleteMember ? 'Confirm Delete' : 'Delete'}
                  </button>
                  <button 
                    onClick={() => {
                      setType('INFLOW');
                      setNodeCat('');
                      setShowTransactionForm(true);
                    }}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white font-medium py-2.5 px-6 rounded-xl transition-colors flex items-center gap-2 shadow-lg shadow-emerald-500/20"
                  >
                    <Plus className="w-4 h-4" />
                    New Transaction
                  </button>
                  <button 
                    onClick={() => setSelectedMember(null)}
                    className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full transition-colors"
                  >
                    <XCircle className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-8">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
                  {/* Debt to Equity Gauge */}
                  <div className="lg:col-span-1 bg-zinc-950 p-6 rounded-2xl border border-zinc-800 flex flex-col items-center justify-center">
                    <div className="relative w-40 h-20 overflow-hidden mb-4">
                      <div className="absolute top-0 left-0 w-40 h-40 rounded-full border-[12px] border-zinc-800"></div>
                      <div 
                        className="absolute top-0 left-0 w-40 h-40 rounded-full border-[12px] border-rose-500 border-b-transparent border-r-transparent transition-transform duration-1000 ease-out"
                        style={{ 
                          transform: `rotate(${Math.min(135, -45 + ((selectedMember.loan_balance / (selectedMember.total_capital_share || 1)) * 180))}deg)` 
                        }}
                      ></div>
                      <div className="absolute bottom-0 left-0 w-full text-center">
                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">D/E Ratio</p>
                        <p className="text-lg font-mono font-bold text-white">
                          {(((selectedMember.loan_balance || 0) / (selectedMember.total_capital_share || 1)) * 100).toFixed(1)}%
                        </p>
                      </div>
                    </div>
                    <div className="w-full grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Total Capital Share</p>
                        <p className="font-mono text-emerald-400 text-lg">${(selectedMember.total_capital_share || 0).toLocaleString()}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Debt</p>
                        <p className="font-mono text-rose-400 text-lg">${(selectedMember.loan_balance || 0).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>

                  {/* Member Info Cards */}
                  <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800">
                      <p className="text-[10px] text-zinc-500 uppercase font-bold mb-2">Vehicle Details</p>
                      <div className="space-y-2">
                        <div>
                          <p className="text-xs text-zinc-400">Plate No.</p>
                          <p className="text-sm font-medium text-white">{selectedMember.plate_no || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-zinc-400">Route</p>
                          <p className="text-sm font-medium text-white">{selectedMember.route || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-zinc-400">Registered Name</p>
                          <p className="text-sm font-medium text-white italic">{selectedMember.registered_name || 'N/A'}</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800">
                      <p className="text-[10px] text-zinc-500 uppercase font-bold mb-2">Total Capital Share Breakdown</p>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <p className="text-xs text-zinc-400">Base Share</p>
                          <p className="text-sm font-mono text-white">${(selectedMember.capital_share || 0).toLocaleString()}</p>
                        </div>
                        <div className="flex justify-between">
                          <p className="text-xs text-zinc-400">Refund</p>
                          <p className="text-sm font-mono text-rose-400">-${(selectedMember.refund || 0).toLocaleString()}</p>
                        </div>
                        <div className="flex justify-between">
                          <p className="text-xs text-zinc-400">Build Up</p>
                          <p className="text-sm font-mono text-emerald-400">+${(selectedMember.capital_build_up || 0).toLocaleString()}</p>
                        </div>
                        <div className="pt-2 border-t border-zinc-800 flex justify-between">
                          <p className="text-xs font-bold text-zinc-300">Total</p>
                          <p className="text-sm font-mono font-bold text-emerald-400">${(selectedMember.total_capital_share || 0).toLocaleString()}</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800">
                      <p className="text-[10px] text-zinc-500 uppercase font-bold mb-2">Earnings & Profile</p>
                      <div className="space-y-2">
                        <div>
                          <p className="text-xs text-zinc-400">Dividend</p>
                          <p className="text-sm font-mono text-indigo-400">${(selectedMember.dividend || 0).toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-zinc-400">Gender</p>
                          <p className="text-sm font-medium text-white">{selectedMember.gender || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-zinc-400">Joined</p>
                          <p className="text-sm text-white">{format(new Date(selectedMember.created_at), 'MMM d, yyyy')}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden">
                  <div className="p-4 border-b border-zinc-800 bg-zinc-900/30">
                    <h3 className="font-bold text-zinc-300 flex items-center gap-2">
                      <Activity className="w-4 h-4 text-indigo-400" />
                      Transaction Ledger
                    </h3>
                  </div>
                  <div className="divide-y divide-zinc-800">
                    {transactions
                      .filter(t => t.member_id === selectedMember.uid)
                      .map(tx => (
                      <div key={tx.id} className="flex items-center justify-between p-4 hover:bg-zinc-900/50 transition-colors">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-white">{tx.node_category}</p>
                            <CopyButton text={tx.id} label="Transaction ID" />
                          </div>
                          <p className="text-xs text-zinc-500">{format(new Date(tx.created_at), 'MMM d, yyyy h:mm a')}</p>
                        </div>
                        <div className="text-right">
                          <p className={clsx(
                            "font-mono font-medium",
                            tx.type === 'INFLOW' ? "text-emerald-400" : "text-rose-400"
                          )}>
                            {tx.type === 'INFLOW' ? '+' : '-'}${(tx.amount || 0).toLocaleString()}
                          </p>
                          <p className={clsx(
                            "text-[10px] uppercase tracking-wider font-bold mt-1 px-2 py-0.5 rounded-full inline-block",
                            tx.status === 'VERIFIED' ? "bg-emerald-500/10 text-emerald-500" : 
                            tx.status === 'PENDING' ? "bg-amber-500/10 text-amber-500" : "bg-rose-500/10 text-rose-500"
                          )}>
                            {tx.status}
                          </p>
                        </div>
                      </div>
                    ))}
                    {transactions.filter(t => t.member_id === selectedMember.uid).length === 0 && (
                      <p className="text-zinc-500 text-sm text-center py-12">No transactions found for this member.</p>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Member Modal */}
      <AnimatePresence>
        {showAddMember && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-white">Add New Member</h3>
                <button 
                  onClick={() => setShowAddMember(false)}
                  className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full transition-colors"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
              
              <form onSubmit={handleAddMember} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1.5">Full Name</label>
                  <input 
                    type="text" 
                    value={newMemberName}
                    onChange={e => setNewMemberName(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    placeholder="Jane Doe"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1.5">Email Address (Optional)</label>
                  <input 
                    type="email" 
                    value={newMemberEmail}
                    onChange={e => setNewMemberEmail(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    placeholder="jane@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1.5">Role</label>
                  <select 
                    value={newMemberRole}
                    onChange={e => setNewMemberRole(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none"
                  >
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                
                <div className="pt-4">
                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-medium py-3 px-4 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Adding Member...' : 'Add Member'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Transaction Modal */}
      <AnimatePresence>
        {showTransactionForm && selectedMember && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-white">New Transaction for {selectedMember.name}</h3>
                <button 
                  onClick={() => setShowTransactionForm(false)}
                  className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full transition-colors"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
              
              <form onSubmit={handleTransactionSubmit} className="space-y-6">
                {/* Type Toggle */}
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
                      {filteredCategories.map(node => (
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
                    disabled={isTxSubmitting || !source || !nodeCat || !amount}
                    className="w-full bg-white text-black hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    {isTxSubmitting ? 'Submitting...' : (currentUser?.role === 'admin' || currentUser?.email === 'century.decadee@gmail.com' || currentUser?.email === 'ronald.narvasa.rn@gmail.com' ? 'Approve Transaction' : 'Submit to Verification Queue')}
                    <ArrowRightLeft className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function MerchandiseTab({ inventory, handleMarkSold, showToast }: { inventory: any[], handleMarkSold: (item: any) => void, showToast: (msg: string, type?: 'success' | 'error') => void }) {
  const [name, setName] = useState('');
  const [buyPrice, setBuyPrice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !buyPrice) return;
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'inventory'), {
        name,
        buy_price: parseFloat(buyPrice),
        status: 'IN_STOCK',
        created_at: new Date().toISOString()
      });
      setName('');
      setBuyPrice('');
      showToast("Item added to inventory.");
    } catch (e: any) {
      showToast("Error: " + e.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      className="space-y-6"
    >
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-6 border-b border-zinc-800">
          <h2 className="text-xl font-bold text-white">Add Merchandise</h2>
          <form onSubmit={handleAdd} className="mt-4 flex gap-4">
            <input 
              type="text" 
              placeholder="Item Name" 
              value={name} 
              onChange={(e) => setName(e.target.value)}
              className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-white"
              required
            />
            <input 
              type="number" 
              placeholder="Buy Price" 
              value={buyPrice} 
              onChange={(e) => setBuyPrice(e.target.value)}
              className="w-32 bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-white"
              required
            />
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-4 py-2 rounded-lg transition-colors"
            >
              {isSubmitting ? 'Adding...' : 'Add'}
            </button>
          </form>
        </div>
        <div className="p-6 border-b border-zinc-800">
          <h2 className="text-xl font-bold text-white">Merchandise Inventory</h2>
          <p className="text-zinc-400 text-sm mt-1">Manage stock and sales.</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {inventory.filter(i => i.status === 'IN_STOCK').map(item => (
              <div key={item.id} className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 flex flex-col justify-between">
                <div>
                  <p className="font-medium text-white mb-1">{item.name}</p>
                  <p className="text-xs text-zinc-500 mb-3">Bought for: <span className="text-zinc-300 font-mono">${item.buy_price}</span></p>
                </div>
                <button 
                  onClick={() => handleMarkSold(item)}
                  className="w-full py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded-lg border border-emerald-500/20 transition-colors"
                >
                  Mark as Sold
                </button>
              </div>
            ))}
            {inventory.filter(i => i.status === 'IN_STOCK').length === 0 && (
              <div className="col-span-full py-8 text-center text-zinc-500 text-sm italic">
                No active merchandise in stock.
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function TransactionTab({ transactions, members, showToast }: { transactions: Transaction[], members: Member[], showToast: (msg: string, type?: 'success' | 'error') => void }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      className="space-y-6"
    >
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-6 border-b border-zinc-800">
          <h2 className="text-xl font-bold text-white">Global Transactions Ledger</h2>
          <p className="text-zinc-400 text-sm mt-1">All transactions across the system.</p>
        </div>

        <div className="p-6">
          <div className="space-y-3">
            {transactions.map(tx => {
              const member = members.find(m => m.uid === tx.member_id);
              return (
                <div key={tx.id} className="flex items-center justify-between p-4 rounded-xl bg-zinc-950 border border-zinc-800">
                  <div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-white">{tx.node_category}</p>
                            <CopyButton text={tx.id} label="Transaction ID" />
                          </div>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300">
                            {tx.parent_master_node}
                          </span>
                        </div>
                    <p className="text-sm text-zinc-400">
                      {member?.name || 'Unknown Member'} • {format(new Date(tx.created_at), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={clsx(
                      "font-mono font-medium",
                      tx.type === 'INFLOW' ? "text-emerald-400" : "text-rose-400"
                    )}>
                      {tx.type === 'INFLOW' ? '+' : '-'}${(tx.amount || 0).toLocaleString()}
                    </p>
                    <p className={clsx(
                      "text-[10px] uppercase tracking-wider font-semibold mt-1",
                      tx.status === 'VERIFIED' ? "text-emerald-500" : 
                      tx.status === 'PENDING' ? "text-amber-500" : "text-rose-500"
                    )}>
                      {tx.status}
                    </p>
                  </div>
                </div>
              );
            })}
            {transactions.length === 0 && (
              <p className="text-zinc-500 text-sm text-center py-8">No transactions found.</p>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
