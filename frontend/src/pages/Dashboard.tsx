import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useTransactionStore, Transaction, Debt } from '../store/useTransactionStore';
import { Navbar } from '../components/Navbar';
import { AIAdvisor } from '../components/AIAdvisor';
import { io } from 'socket.io-client';
import {
  TrendingUp,
  FileText,
  DollarSign,
  PieChart as ChartIcon,
  Upload,
  Plus,
  Trash2,
  Calendar,
  Sparkles,
  Sliders,
  AlertTriangle,
  Bell,
  X,
  CreditCard,
  Pencil,
  Check,
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  LayoutDashboard
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

type TabType = 'dashboard' | 'debts';

export const Dashboard: React.FC = () => {
  const categoryNames: Record<string, string> = {
    'Food': 'Gıda / Yemek',
    'Travel': 'Ulaşım / Seyahat',
    'Utilities': 'Faturalar',
    'Shopping': 'Alışveriş',
    'Entertainment': 'Eğlence',
    'Others': 'Diğer'
  };

  const { user, setBudgets } = useAuthStore();
  const {
    transactions,
    debts,
    loading,
    uploading,
    fetchTransactions,
    addTransaction,
    deleteTransaction,
    uploadReceipt,
    addProcessedTransaction,
    updateLocalBudgets,
    fetchDebts,
    addDebt,
    updateDebt,
    deleteDebt
  } = useTransactionStore();

  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  // Component States
  const [file, setFile] = useState<File | null>(null);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isBudgetEditorOpen, setIsBudgetEditorOpen] = useState(false);
  const [isAIAdvisorOpen, setIsAIAdvisorOpen] = useState(false);
  const [selectedTx, setSelectedTx] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'warning' } | null>(null);

  // Manual Transaction Form
  const [merchant, setMerchant] = useState('');
  const [amount, setAmount] = useState('');
  const [tax, setTax] = useState('');
  const [category, setCategory] = useState<'Food' | 'Travel' | 'Utilities' | 'Shopping' | 'Entertainment' | 'Others'>('Others');
  const [date, setDate] = useState('');

  // Monthly budget direct input
  const [monthlyBudgetInput, setMonthlyBudgetInput] = useState<string>('');
  const [isEditingMonthlyBudget, setIsEditingMonthlyBudget] = useState(false);

  // Budgets Editor Form
  const [editedBudgets, setEditedBudgets] = useState<Record<string, number>>({});

  // Debt states
  const [isDebtModalOpen, setIsDebtModalOpen] = useState(false);
  const [debtName, setDebtName] = useState('');
  const [debtAmount, setDebtAmount] = useState('');
  const [editingDebtId, setEditingDebtId] = useState<string | null>(null);
  const [editDebtValues, setEditDebtValues] = useState<Record<string, { name: string; amount: string }>>({});

  // Initialize data
  useEffect(() => {
    fetchTransactions();
    fetchDebts();
    if (user?.budgets) {
      setEditedBudgets({ ...user.budgets });
    }
    if (user?.monthlyBudget !== undefined) {
      setMonthlyBudgetInput(String(user.monthlyBudget));
    }
  }, []);

  // Configure Socket.io real-time connection
  useEffect(() => {
    if (user) {
      const socket = io('http://127.0.0.1:5000');
      socket.emit('join', user._id);

      socket.on('transaction_processed', (payload: { success: boolean; message: string; data: Transaction }) => {
        console.log('Socket.io Receipt Scan complete event received:', payload);
        addProcessedTransaction(payload.data);
        setToast({
          message: `${payload.data.merchant} fişiniz başarıyla tarandı! (${payload.data.amount} TL)`,
          type: 'success'
        });
      });

      return () => { socket.disconnect(); };
    }
  }, [user]);

  // Clean Toast after 5 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Calculations
  const totalSpent = transactions.reduce((sum, tx) => sum + tx.amount, 0);
  const scannedCount = transactions.filter(t => t.isScanned).length;
  const budgetLimits = user?.budgets || {};
  const totalMonthlyBudget = user?.monthlyBudget || Object.values(budgetLimits).reduce((sum, b) => sum + b, 0);

  const budgetUsedPercent = totalMonthlyBudget > 0
    ? Math.min((totalSpent / totalMonthlyBudget) * 100, 100)
    : 0;
  const remainingBudget = totalMonthlyBudget - totalSpent;

  const totalDebts = debts.reduce((sum, d) => sum + d.amount, 0);

  // Category Aggregates
  const categoryTotals: Record<string, number> = {};
  transactions.forEach(tx => {
    categoryTotals[tx.category] = (categoryTotals[tx.category] || 0) + tx.amount;
  });

  // Recharts Pie Chart Data
  const pieData = Object.keys(categoryTotals).map(cat => ({
    name: categoryNames[cat] || cat,
    value: Math.round(categoryTotals[cat])
  }));

  // Recharts Area Chart Timeline Data
  const timelineMap: Record<string, number> = {};
  transactions.slice().reverse().forEach(tx => {
    const d = new Date(tx.date);
    const label = d.toLocaleDateString('tr-TR', { month: 'short', day: 'numeric' });
    timelineMap[label] = (timelineMap[label] || 0) + tx.amount;
  });
  const areaData = Object.keys(timelineMap).map(label => ({
    date: label,
    tutar: Math.round(timelineMap[label])
  }));

  // Pie colors
  const COLORS = ['#c29b38', '#1d5c42', '#8a1523', '#d4af37', '#a62c2c', '#3d2629'];

  // Handle file drop/change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      handleUploadReceipt(selected);
    }
  };

  const handleUploadReceipt = async (selectedFile: File) => {
    setToast({ message: 'Fiş resmi OCR sunucusuna gönderiliyor...', type: 'info' });
    const success = await uploadReceipt(selectedFile);
    if (success) {
      setToast({
        message: 'Fiş yükleme başarılı! Arka planda yapay zeka analizi başlatıldı.',
        type: 'info'
      });
      setFile(null);
    } else {
      setToast({ message: 'Fiş yüklenirken hata oluştu.', type: 'warning' });
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!merchant || !amount) return;
    const success = await addTransaction({
      merchant,
      amount: parseFloat(amount),
      tax: tax ? parseFloat(tax) : 0,
      category,
      date: date ? new Date(date).toISOString() : new Date().toISOString()
    });
    if (success) {
      setMerchant(''); setAmount(''); setTax(''); setCategory('Others'); setDate('');
      setIsManualModalOpen(false);
      setToast({ message: 'Harcama başarıyla eklendi.', type: 'success' });
    }
  };

  const handleUpdateBudgets = async (e: React.FormEvent) => {
    e.preventDefault();
    const newMonthly = parseFloat(monthlyBudgetInput) || totalMonthlyBudget;
    const success = await updateLocalBudgets(editedBudgets, newMonthly);
    if (success) {
      setBudgets(editedBudgets, newMonthly);
      setIsBudgetEditorOpen(false);
      setToast({ message: 'Bütçe limitleriniz güncellendi.', type: 'success' });
    }
  };

  const handleSaveMonthlyBudget = async () => {
    const newMonthly = parseFloat(monthlyBudgetInput);
    if (isNaN(newMonthly) || newMonthly <= 0) return;
    const success = await updateLocalBudgets(editedBudgets || budgetLimits, newMonthly);
    if (success) {
      setBudgets(budgetLimits, newMonthly);
      setIsEditingMonthlyBudget(false);
      setToast({ message: `Aylık bütçeniz ${newMonthly.toLocaleString('tr-TR')} TL olarak güncellendi.`, type: 'success' });
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Bu işlemi silmek istediğinize emin misiniz?')) {
      const success = await deleteTransaction(id);
      if (success) setToast({ message: 'İşlem başarıyla silindi.', type: 'success' });
    }
  };

  const handleAddDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!debtName || !debtAmount) return;
    const success = await addDebt({ name: debtName, amount: parseFloat(debtAmount) });
    if (success) {
      setDebtName(''); setDebtAmount('');
      setIsDebtModalOpen(false);
      setToast({ message: `"${debtName}" borcu eklendi.`, type: 'success' });
    }
  };

  const handleStartEditDebt = (debt: Debt) => {
    setEditingDebtId(debt._id);
    setEditDebtValues(prev => ({
      ...prev,
      [debt._id]: { name: debt.name, amount: String(debt.amount) }
    }));
  };

  const handleSaveDebt = async (debt: Debt) => {
    const vals = editDebtValues[debt._id];
    if (!vals) return;
    const newAmount = parseFloat(vals.amount);
    if (isNaN(newAmount) || newAmount < 0) return;

    const wasDecrease = newAmount < debt.amount;
    const wasIncrease = newAmount > debt.amount;

    const success = await updateDebt(debt._id, { name: vals.name, amount: newAmount });
    if (success) {
      setEditingDebtId(null);
      if (wasDecrease) {
        const paid = (debt.amount - newAmount).toFixed(2);
        setToast({
          message: newAmount === 0
            ? `✅ "${vals.name}" borcunuz tamamen ödendi! ${paid} TL gider olarak kaydedildi.`
            : `💸 ${paid} TL borç ödemesi gider olarak kaydedildi.`,
          type: 'success'
        });
      } else if (wasIncrease) {
        const diff = (newAmount - debt.amount).toFixed(2);
        setToast({ message: `⚠️ "${vals.name}" borcu ${diff} TL arttı.`, type: 'warning' });
      } else {
        setToast({ message: 'Borç güncellendi.', type: 'info' });
      }
    }
  };

  const handleDeleteDebt = async (id: string, name: string) => {
    if (confirm(`"${name}" borcunu silmek istediğinize emin misiniz?`)) {
      const success = await deleteDebt(id);
      if (success) setToast({ message: 'Borç silindi.', type: 'success' });
    }
  };

  return (
    <div className="min-h-screen bg-dark-base pb-12 relative text-slate-200">
      <Navbar />

      {/* Floating Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 glass-card max-w-sm p-4 rounded-xl border-l-4 border-brand-primary flex items-start gap-3 shadow-2xl animate-bounce">
          <Bell className="w-5 h-5 text-brand-primary shrink-0 mt-0.5" />
          <div className="flex-1 text-xs text-slate-200 font-medium whitespace-pre-line">{toast.message}</div>
          <button onClick={() => setToast(null)} className="text-slate-400 hover:text-white shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* AI advisor */}
      <AIAdvisor
        isOpen={isAIAdvisorOpen}
        onClose={() => setIsAIAdvisorOpen(false)}
        transactions={transactions}
        budgets={budgetLimits}
      />

      <div className="max-w-7xl mx-auto px-6 mt-8 space-y-8">

        {/* TOP HEADER */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              Hoş Geldiniz, {user?.name} <span className="animate-pulse">👋</span>
            </h2>
            <p className="text-xs text-slate-400">Yapay Zeka Destekli Akıllı Finansal Analiz Kontrol Paneli</p>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              onClick={() => setIsAIAdvisorOpen(true)}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-gradient-to-r from-brand-accent to-purple-600 hover:from-brand-accent/95 text-white py-2.5 px-4 rounded-xl font-medium text-xs shadow-lg shadow-brand-accent/20 transition-all hover:scale-[1.02]"
            >
              <Sparkles className="w-4 h-4" /> AI Danışmana Sor
            </button>
            <button
              onClick={() => setIsManualModalOpen(true)}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-brand-primary hover:bg-brand-primary/90 text-white py-2.5 px-4 rounded-xl font-medium text-xs shadow-lg shadow-brand-primary/20 transition-all hover:scale-[1.02]"
            >
              <Plus className="w-4 h-4" /> Manuel Ekle
            </button>
          </div>
        </div>

        {/* ─── MONTHLY BUDGET HERO CARD ─── */}
        <div className="glass-card rounded-2xl p-6 relative overflow-hidden">
          {/* background glow */}
          <div className="absolute inset-0 bg-gradient-to-br from-brand-primary/5 via-transparent to-brand-accent/5 pointer-events-none rounded-2xl" />

          <div className="flex flex-col md:flex-row gap-6 items-start md:items-center relative z-10">
            {/* Left: budget input */}
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-brand-primary" />
                <span className="text-[11px] uppercase font-semibold tracking-wider text-slate-400">Aylık Toplam Bütçe</span>
              </div>

              {isEditingMonthlyBudget ? (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    autoFocus
                    value={monthlyBudgetInput}
                    onChange={e => setMonthlyBudgetInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleSaveMonthlyBudget(); if (e.key === 'Escape') setIsEditingMonthlyBudget(false); }}
                    className="text-3xl font-bold bg-transparent border-b-2 border-brand-primary text-white outline-none w-48"
                    placeholder="10000"
                  />
                  <span className="text-xl text-slate-400 font-semibold">TL</span>
                  <button
                    onClick={handleSaveMonthlyBudget}
                    className="ml-2 bg-brand-primary/20 hover:bg-brand-primary/40 text-brand-primary p-1.5 rounded-lg transition"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setIsEditingMonthlyBudget(false)}
                    className="text-slate-500 hover:text-white p-1.5 rounded-lg transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsEditingMonthlyBudget(true)}
                  className="flex items-center gap-3 group"
                >
                  <span className="text-3xl font-bold text-white group-hover:text-brand-primary transition">
                    {totalMonthlyBudget.toLocaleString('tr-TR')} TL
                  </span>
                  <Pencil className="w-4 h-4 text-slate-500 group-hover:text-brand-primary transition opacity-0 group-hover:opacity-100" />
                </button>
              )}

              <p className="text-[10px] text-slate-500">Düzenlemek için tıklayın</p>
            </div>

            {/* Center: Progress bar */}
            <div className="flex-[2] space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Harcama Durumu</span>
                <span className={`font-bold text-sm ${budgetUsedPercent >= 90 ? 'text-brand-danger' : budgetUsedPercent >= 70 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  %{budgetUsedPercent.toFixed(1)}
                </span>
              </div>
              <div className="w-full bg-slate-900 h-4 rounded-full overflow-hidden border border-white/5">
                <div
                  className={`h-full rounded-full transition-all duration-700 relative ${
                    budgetUsedPercent >= 90 ? 'bg-gradient-to-r from-brand-danger to-red-400' :
                    budgetUsedPercent >= 70 ? 'bg-gradient-to-r from-amber-500 to-yellow-400' :
                    'bg-gradient-to-r from-brand-primary to-emerald-400'
                  }`}
                  style={{ width: `${budgetUsedPercent}%` }}
                >
                  <div className="absolute inset-0 bg-white/10 rounded-full" />
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">
                  Harcandı: <strong className="text-white">{totalSpent.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL</strong>
                </span>
                <span className={remainingBudget < 0 ? 'text-brand-danger font-bold' : 'text-slate-400'}>
                  {remainingBudget >= 0
                    ? <>Kalan: <strong className="text-emerald-400">{remainingBudget.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL</strong></>
                    : <>Aşım: <strong className="text-brand-danger">+{Math.abs(remainingBudget).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL</strong></>
                  }
                </span>
              </div>
              {budgetUsedPercent >= 90 && (
                <p className="text-[10px] text-brand-danger font-medium flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Aylık bütçenizin %90'ını aştınız! Harcamalarınızı gözden geçirin.
                </p>
              )}
            </div>

            {/* Right: quick stats */}
            <div className="flex gap-4 shrink-0">
              <div className="text-center space-y-1">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Toplam Borç</p>
                <p className="text-lg font-bold text-brand-danger">{totalDebts.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL</p>
              </div>
              <div className="w-px bg-white/5" />
              <div className="text-center space-y-1">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Taranan Fiş</p>
                <p className="text-lg font-bold text-emerald-400">{scannedCount}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ─── TAB NAVIGATION ─── */}
        <div className="flex items-center gap-1 bg-slate-900/60 p-1 rounded-xl border border-white/5 w-fit">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'dashboard'
                ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" /> Ana Sayfa
          </button>
          <button
            onClick={() => setActiveTab('debts')}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'debts'
                ? 'bg-brand-danger text-white shadow-lg shadow-brand-danger/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" /> Borçlarım
            {debts.length > 0 && (
              <span className="bg-white/20 text-[10px] px-1.5 py-0.5 rounded-full">{debts.length}</span>
            )}
          </button>
        </div>

        {/* ════════════════════════════════ DASHBOARD TAB ════════════════════════════════ */}
        {activeTab === 'dashboard' && (
          <>
            {/* MIDDLE SECTION: CHARTS & UPLOADER */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

              {/* LEFT COL: UPLOAD + BUDGET LIMITS */}
              <div className="lg:col-span-1 space-y-6">

                {/* FILE UPLOAD */}
                <div className="glass-card p-6 rounded-2xl relative overflow-hidden flex flex-col justify-between min-h-[220px]">
                  {uploading && (
                    <div className="absolute inset-0 bg-[#0f172a]/90 backdrop-blur-md flex flex-col items-center justify-center z-20 space-y-4">
                      <div className="w-12 h-12 border-4 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin" />
                      <div className="text-center">
                        <h4 className="text-sm font-semibold text-white">Yapay Zeka Analiz Ediyor...</h4>
                        <p className="text-[10px] text-slate-400 mt-1">Görselden OCR veri okuma başlatıldı.</p>
                      </div>
                    </div>
                  )}
                  <div>
                    <h4 className="font-bold text-sm text-white mb-2 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-brand-primary" /> Fiş Resmi Tara (OCR)
                    </h4>
                    <p className="text-[10px] text-slate-400 mb-4">
                      Fiş resmini sürükleyip bırakarak yapay zekanın veri madenciliğini başlatın.
                    </p>
                  </div>
                  <label className="border-2 border-dashed border-white/10 hover:border-brand-primary/40 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer bg-slate-900/40 hover:bg-slate-900/60 transition-all duration-200 group">
                    <Upload className="w-8 h-8 text-slate-400 group-hover:text-brand-primary group-hover:scale-110 transition duration-200 mb-2" />
                    <span className="text-xs font-semibold text-slate-300">Bir fiş görseli seçin</span>
                    <span className="text-[9px] text-slate-500 mt-1">PNG, JPG formatları (Max 5MB)</span>
                    <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                  </label>
                </div>

                {/* CATEGORY BUDGETS */}
                <div className="glass-card p-6 rounded-2xl">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-bold text-sm text-white flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-brand-accent" /> Kategori Limitleri
                    </h4>
                    <button
                      onClick={() => setIsBudgetEditorOpen(!isBudgetEditorOpen)}
                      className="text-xs text-brand-accent hover:underline font-semibold"
                    >
                      {isBudgetEditorOpen ? 'Kapat' : 'Düzenle'}
                    </button>
                  </div>

                  {isBudgetEditorOpen ? (
                    <form onSubmit={handleUpdateBudgets} className="space-y-3 bg-slate-900/30 p-3 rounded-xl border border-white/5">
                      {/* Monthly budget field inside editor too */}
                      <div className="flex items-center justify-between gap-2 text-xs border-b border-white/10 pb-2 mb-2">
                        <span className="text-brand-primary font-semibold">Aylık Toplam</span>
                        <input
                          type="number"
                          value={monthlyBudgetInput}
                          onChange={(e) => setMonthlyBudgetInput(e.target.value)}
                          className="w-24 px-2 py-1 rounded glass-input text-right font-bold"
                        />
                      </div>
                      {Object.keys(editedBudgets).map(cat => (
                        <div key={cat} className="flex items-center justify-between gap-2 text-xs">
                          <span className="text-slate-300 font-medium w-28">{categoryNames[cat] || cat}</span>
                          <input
                            type="number"
                            value={editedBudgets[cat]}
                            onChange={(e) => setEditedBudgets({ ...editedBudgets, [cat]: parseFloat(e.target.value) || 0 })}
                            className="w-24 px-2 py-1 rounded glass-input text-right"
                          />
                        </div>
                      ))}
                      <div className="flex gap-2 justify-end mt-4">
                        <button type="button" onClick={() => setIsBudgetEditorOpen(false)} className="bg-transparent text-slate-400 py-1 px-2.5 rounded text-[11px]">İptal</button>
                        <button type="submit" className="bg-brand-accent text-white py-1 px-3 rounded text-[11px] font-semibold">Kaydet</button>
                      </div>
                    </form>
                  ) : (
                    <div className="space-y-4">
                      {Object.keys(budgetLimits).map(cat => {
                        const spent = categoryTotals[cat] || 0;
                        const limit = budgetLimits[cat];
                        const ratio = limit > 0 ? (spent / limit) * 100 : 0;
                        const isExceeded = spent > limit;
                        const remaining = limit - spent;

                        return (
                          <div key={cat} className="space-y-1">
                            <div className="flex items-center justify-between text-xs font-medium">
                              <span className="text-slate-300">{categoryNames[cat] || cat}</span>
                              <div className="text-right">
                                <span className="text-slate-400">{spent.toFixed(0)} / <strong className="text-slate-200">{limit} TL</strong></span>
                              </div>
                            </div>
                            <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-white/5">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${isExceeded ? 'bg-brand-danger' : ratio > 75 ? 'bg-brand-warning' : 'bg-brand-primary'}`}
                                style={{ width: `${Math.min(ratio, 100)}%` }}
                              />
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] text-slate-500">%{ratio.toFixed(0)} kullanıldı</span>
                              {isExceeded ? (
                                <p className="text-[9px] text-brand-danger font-medium flex items-center gap-1">
                                  <AlertTriangle className="w-2.5 h-2.5" /> Limit aşıldı!
                                </p>
                              ) : (
                                <span className="text-[9px] text-emerald-500">{remaining.toFixed(0)} TL kaldı</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* CHARTS */}
              <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8">

                {/* AREA CHART */}
                <div className="glass-card p-6 rounded-2xl flex flex-col justify-between min-h-[350px]">
                  <div>
                    <h4 className="font-bold text-sm text-white mb-1">Zaman Serisi Harcama Analizi</h4>
                    <p className="text-[10px] text-slate-400 mb-6">Harcamalarınızın günlere göre dağılımı</p>
                  </div>
                  <div className="h-[240px] w-full">
                    {areaData.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-xs text-slate-500">Grafik için veri yok</div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={areaData}>
                          <defs>
                            <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#c29b38" stopOpacity={0.4} />
                              <stop offset="95%" stopColor="#c29b38" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="date" stroke="#475569" fontSize={10} />
                          <YAxis stroke="#475569" fontSize={10} />
                          <Tooltip contentStyle={{ backgroundColor: '#1a1012', borderColor: '#2d1c1f', color: '#f8fafc', fontSize: 11 }} />
                          <Area type="monotone" dataKey="tutar" stroke="#c29b38" strokeWidth={2} fillOpacity={1} fill="url(#colorAmount)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                {/* PIE CHART */}
                <div className="glass-card p-6 rounded-2xl flex flex-col justify-between min-h-[350px]">
                  <div>
                    <h4 className="font-bold text-sm text-white mb-1">Kategori Dağılım Payı</h4>
                    <p className="text-[10px] text-slate-400 mb-6">Hangi kategoriye ne kadar bütçe ayrıldı?</p>
                  </div>
                  <div className="h-[240px] w-full flex items-center justify-center">
                    {pieData.length === 0 ? (
                      <div className="text-xs text-slate-500">Grafik için veri yok</div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={5} dataKey="value">
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: '#1a1012', borderColor: '#2d1c1f', color: '#f8fafc', fontSize: 11 }} />
                          <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: 9 }} />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* TRANSACTION LEDGER */}
            <div className="glass-card rounded-2xl overflow-hidden shadow-2xl">
              <div className="p-6 border-b border-white/5 flex items-center justify-between bg-slate-800/40">
                <div>
                  <h4 className="font-bold text-sm text-white">İşlem Defteri</h4>
                  <p className="text-[10px] text-slate-400">Fiş analizlerinizi, kalem detaylarını ve manuel kayıtlarınızı inceleyin</p>
                </div>
              </div>

              <div className="overflow-x-auto w-full">
                {transactions.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500">Henüz kayıtlı harcama bulunmamaktadır.</div>
                ) : (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-900/60 text-slate-400 font-semibold border-b border-white/5 uppercase tracking-wider text-[10px]">
                        <th className="p-4">Kategori</th>
                        <th className="p-4">İşyeri / Bayi</th>
                        <th className="p-4">Tarih</th>
                        <th className="p-4">Yöntem</th>
                        <th className="p-4 text-right">Tutar (TL)</th>
                        <th className="p-4 text-center">İşlem</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {transactions.map(tx => {
                        const isOpen = selectedTx === tx._id;
                        const dateObj = new Date(tx.date);
                        return (
                          <React.Fragment key={tx._id}>
                            <tr onClick={() => setSelectedTx(isOpen ? null : tx._id)} className="hover:bg-slate-800/40 cursor-pointer transition">
                              <td className="p-4">
                                <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-semibold ${
                                  tx.category === 'Food' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                                  tx.category === 'Travel' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                  tx.category === 'Utilities' ? 'bg-violet-500/10 text-violet-400 border border-violet-500/20' :
                                  tx.category === 'Shopping' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                  tx.category === 'Entertainment' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                                  'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                                }`}>
                                  {categoryNames[tx.category] || tx.category}
                                </span>
                              </td>
                              <td className="p-4 font-medium text-slate-200">{tx.merchant}</td>
                              <td className="p-4 text-slate-400">{dateObj.toLocaleDateString('tr-TR', { year: 'numeric', month: '2-digit', day: '2-digit' })}</td>
                              <td className="p-4">
                                {tx.isScanned ? (
                                  <span className="text-emerald-400 font-semibold flex items-center gap-1 text-[10px]">
                                    <Sparkles className="w-3.5 h-3.5 shrink-0" /> AI Taramalı
                                  </span>
                                ) : (
                                  <span className="text-slate-400 text-[10px]">Manuel Giriş</span>
                                )}
                              </td>
                              <td className="p-4 text-right font-bold text-white text-sm">{tx.amount.toFixed(2)} TL</td>
                              <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                                <button onClick={() => handleDelete(tx._id)} className="text-slate-500 hover:text-brand-danger p-1 rounded hover:bg-red-500/10 transition">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>

                            {isOpen && (
                              <tr className="bg-slate-900/35">
                                <td colSpan={6} className="p-6 border-b border-white/5">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-300">
                                    <div>
                                      <h5 className="font-bold text-white mb-3 text-xs flex items-center gap-1.5">🛒 Fiş Fatura Kalemleri</h5>
                                      {tx.items && tx.items.length > 0 ? (
                                        <div className="space-y-2 max-h-[150px] overflow-y-auto bg-slate-900/50 p-3 rounded-xl border border-white/5">
                                          {tx.items.map((item, idx) => (
                                            <div key={idx} className="flex justify-between border-b border-white/5 pb-1">
                                              <span>{item.name}</span>
                                              <span className="font-semibold text-slate-200">{item.price.toFixed(2)} TL</span>
                                            </div>
                                          ))}
                                        </div>
                                      ) : (
                                        <p className="text-slate-500 text-[11px] italic">Bu işlem için ayrıntılı kalem bilgisi bulunmamaktadır.</p>
                                      )}
                                    </div>
                                    <div className="space-y-4">
                                      <div>
                                        <h5 className="font-bold text-white mb-2 text-xs">📊 Vergi & KDV Detayları</h5>
                                        <p>Vergi (Yaklaşık %10 KDV): <strong className="text-slate-200 font-semibold">{tx.tax.toFixed(2)} TL</strong></p>
                                        <p>Net Tutar: <strong className="text-slate-200 font-semibold">{(tx.amount - tx.tax).toFixed(2)} TL</strong></p>
                                      </div>
                                      {tx.receiptUrl && (
                                        <div>
                                          <h5 className="font-bold text-white mb-1.5 text-xs">🖼️ Orijinal Fiş Görseli</h5>
                                          <a href={`http://127.0.0.1:5000${tx.receiptUrl}`} target="_blank" rel="noopener noreferrer" className="text-brand-primary hover:underline text-[11px] font-semibold">
                                            Dosyayı Ayrı Pencerede Aç ↗
                                          </a>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </>
        )}

        {/* ════════════════════════════════ BORÇLAR TAB ════════════════════════════════ */}
        {activeTab === 'debts' && (
          <div className="space-y-6">

            {/* Summary Banner */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="glass-card p-5 rounded-2xl flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-400">Toplam Borç</span>
                  <h3 className="text-2xl font-bold text-brand-danger">{totalDebts.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL</h3>
                </div>
                <div className="bg-brand-danger/10 text-brand-danger p-3 rounded-xl">
                  <ArrowDownCircle className="w-6 h-6" />
                </div>
              </div>
              <div className="glass-card p-5 rounded-2xl flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-400">Borç Sayısı</span>
                  <h3 className="text-2xl font-bold text-white">{debts.length} Borç</h3>
                </div>
                <div className="bg-brand-primary/10 text-brand-primary p-3 rounded-xl">
                  <CreditCard className="w-6 h-6" />
                </div>
              </div>
              <div className="glass-card p-5 rounded-2xl flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-400">Toplam Harcama</span>
                  <h3 className="text-2xl font-bold text-brand-primary">{totalSpent.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL</h3>
                </div>
                <div className="bg-emerald-500/10 text-emerald-400 p-3 rounded-xl">
                  <ArrowUpCircle className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* Info Banner */}
            <div className="glass-card p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-200/80">
                <strong className="text-amber-300">Nasıl çalışır?</strong> Bir borcu düzenleyip tutarı azaltırsanız, fark otomatik olarak gider olarak kaydedilir. Tutarı sıfıra indirirseniz borç tamamen ödenmiş sayılır. Tutarı artırırsanız borç büyüdü demektir.
              </div>
            </div>

            {/* Debt List */}
            <div className="glass-card rounded-2xl overflow-hidden">
              <div className="p-5 border-b border-white/5 flex items-center justify-between bg-slate-800/40">
                <div>
                  <h4 className="font-bold text-sm text-white flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-brand-danger" /> Güncel Borçlarım
                  </h4>
                  <p className="text-[10px] text-slate-400">Borçlarınızı düzenleyin — ödeme yaptığınızda otomatik gider oluşturulur</p>
                </div>
                <button
                  onClick={() => setIsDebtModalOpen(true)}
                  className="flex items-center gap-2 bg-brand-danger hover:bg-brand-danger/90 text-white py-2 px-4 rounded-xl font-semibold text-xs shadow-lg shadow-brand-danger/20 transition-all hover:scale-[1.02]"
                >
                  <Plus className="w-3.5 h-3.5" /> Yeni Borç Ekle
                </button>
              </div>

              {debts.length === 0 ? (
                <div className="p-12 text-center space-y-2">
                  <CreditCard className="w-12 h-12 text-slate-700 mx-auto" />
                  <p className="text-sm text-slate-500 font-medium">Kayıtlı borç bulunmuyor</p>
                  <p className="text-xs text-slate-600">Yeni Borç Ekle butonuna tıklayarak borçlarınızı takip edin</p>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {debts.map(debt => {
                    const isEditing = editingDebtId === debt._id;
                    const vals = editDebtValues[debt._id] || { name: debt.name, amount: String(debt.amount) };

                    return (
                      <div key={debt._id} className="p-5 hover:bg-slate-800/20 transition group">
                        {isEditing ? (
                          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                            <input
                              type="text"
                              value={vals.name}
                              onChange={e => setEditDebtValues(prev => ({ ...prev, [debt._id]: { ...vals, name: e.target.value } }))}
                              className="flex-1 px-3 py-2 rounded-xl glass-input text-sm"
                              placeholder="Borç adı"
                            />
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                value={vals.amount}
                                onChange={e => setEditDebtValues(prev => ({ ...prev, [debt._id]: { ...vals, amount: e.target.value } }))}
                                className="w-36 px-3 py-2 rounded-xl glass-input text-right text-sm font-bold"
                                placeholder="0"
                                min="0"
                              />
                              <span className="text-slate-400 text-sm">TL</span>
                            </div>
                            {/* Diff preview */}
                            {parseFloat(vals.amount) !== debt.amount && !isNaN(parseFloat(vals.amount)) && (
                              <div className={`text-xs font-semibold px-2 py-1 rounded-lg ${
                                parseFloat(vals.amount) < debt.amount
                                  ? 'text-emerald-400 bg-emerald-500/10'
                                  : 'text-brand-danger bg-brand-danger/10'
                              }`}>
                                {parseFloat(vals.amount) < debt.amount
                                  ? `−${(debt.amount - parseFloat(vals.amount)).toFixed(2)} TL ödendi`
                                  : `+${(parseFloat(vals.amount) - debt.amount).toFixed(2)} TL arttı`
                                }
                              </div>
                            )}
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleSaveDebt(debt)}
                                className="bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-400 p-2 rounded-lg transition"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setEditingDebtId(null)}
                                className="bg-slate-700/40 hover:bg-slate-700 text-slate-400 p-2 rounded-lg transition"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className="w-10 h-10 rounded-xl bg-brand-danger/10 border border-brand-danger/20 flex items-center justify-center shrink-0">
                                <CreditCard className="w-5 h-5 text-brand-danger" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-white text-sm truncate">{debt.name}</p>
                                <p className="text-[10px] text-slate-500">
                                  {new Date(debt.createdAt).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' })} tarihinde eklendi
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4 shrink-0">
                              <div className="text-right">
                                <p className="font-bold text-brand-danger text-lg">{debt.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL</p>
                              </div>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => handleStartEditDebt(debt)}
                                  className="bg-brand-primary/10 hover:bg-brand-primary/30 text-brand-primary p-2 rounded-lg transition"
                                  title="Düzenle"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteDebt(debt._id, debt.name)}
                                  className="bg-brand-danger/10 hover:bg-brand-danger/30 text-brand-danger p-2 rounded-lg transition"
                                  title="Sil"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* ─── MANUAL TRANSACTION MODAL ─── */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-card w-full max-w-md p-6 rounded-2xl shadow-2xl border border-white/10 relative">
            <h3 className="text-lg font-bold text-white mb-4">Manuel Harcama Ekle</h3>
            <button onClick={() => setIsManualModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
            <form onSubmit={handleManualSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">İşyeri / Bayi</label>
                <input type="text" required value={merchant} onChange={(e) => setMerchant(e.target.value)} placeholder="Örn: Starbucks, Migros" className="w-full px-3 py-2 rounded-xl glass-input" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Tutar (TL)</label>
                  <input type="number" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="250.00" className="w-full px-3 py-2 rounded-xl glass-input text-right" />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">KDV / Vergi</label>
                  <input type="number" step="0.01" value={tax} onChange={(e) => setTax(e.target.value)} placeholder="25.00" className="w-full px-3 py-2 rounded-xl glass-input text-right" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Kategori</label>
                  <select value={category} onChange={(e) => setCategory(e.target.value as any)} className="w-full px-3 py-2 rounded-xl glass-input">
                    <option value="Food">Gıda / Yemek</option>
                    <option value="Travel">Ulaşım / Seyahat</option>
                    <option value="Utilities">Faturalar</option>
                    <option value="Shopping">Alışveriş / Giyim</option>
                    <option value="Entertainment">Eğlence / Sosyal</option>
                    <option value="Others">Diğer</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Tarih</label>
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full px-3 py-2 rounded-xl glass-input" />
                </div>
              </div>
              <button type="submit" className="w-full bg-brand-primary hover:bg-brand-primary/95 text-white py-3 rounded-xl font-semibold shadow-lg shadow-brand-primary/10 transition mt-4">
                Harcamayı Kaydet
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ─── ADD DEBT MODAL ─── */}
      {isDebtModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-card w-full max-w-sm p-6 rounded-2xl shadow-2xl border border-white/10 relative">
            <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-brand-danger" /> Yeni Borç Ekle
            </h3>
            <p className="text-[10px] text-slate-400 mb-5">Kredi kartı, kişisel borç veya herhangi bir yükümlülük</p>
            <button onClick={() => setIsDebtModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
            <form onSubmit={handleAddDebt} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Borç Adı / Açıklama</label>
                <input
                  type="text"
                  required
                  value={debtName}
                  onChange={(e) => setDebtName(e.target.value)}
                  placeholder="Örn: Kredi Kartı, Arkadaş Borcu"
                  className="w-full px-3 py-2 rounded-xl glass-input"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Borç Tutarı (TL)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={debtAmount}
                  onChange={(e) => setDebtAmount(e.target.value)}
                  placeholder="1500.00"
                  className="w-full px-3 py-2 rounded-xl glass-input text-right text-lg font-bold"
                />
              </div>
              <button type="submit" className="w-full bg-brand-danger hover:bg-brand-danger/90 text-white py-3 rounded-xl font-semibold shadow-lg shadow-brand-danger/20 transition mt-2">
                Borcu Kaydet
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
