import { create } from 'zustand';
import axios from 'axios';
import { useAuthStore } from './useAuthStore';

export interface LineItem {
  _id?: string;
  name: string;
  price: number;
}

export interface Transaction {
  _id: string;
  merchant: string;
  date: string;
  amount: number;
  tax: number;
  category: 'Food' | 'Travel' | 'Utilities' | 'Shopping' | 'Entertainment' | 'Others';
  items: LineItem[];
  receiptUrl?: string;
  isScanned: boolean;
  createdAt: string;
}

export interface Debt {
  _id: string;
  name: string;
  amount: number;
  createdAt: string;
}

interface TransactionState {
  transactions: Transaction[];
  debts: Debt[];
  loading: boolean;
  uploading: boolean;
  error: string | null;
  fetchTransactions: () => Promise<void>;
  addTransaction: (txData: any) => Promise<boolean>;
  deleteTransaction: (id: string) => Promise<boolean>;
  uploadReceipt: (file: File) => Promise<boolean>;
  addProcessedTransaction: (transaction: Transaction) => void;
  updateLocalBudgets: (newBudgets: Record<string, number>, newMonthlyBudget?: number) => Promise<boolean>;
  fetchDebts: () => Promise<void>;
  addDebt: (debtData: { name: string; amount: number }) => Promise<boolean>;
  updateDebt: (id: string, debtData: { name?: string; amount: number }) => Promise<boolean>;
  deleteDebt: (id: string) => Promise<boolean>;
}

const API_URL = 'http://127.0.0.1:5000/api';

export const useTransactionStore = create<TransactionState>((set, get) => ({
  transactions: [],
  debts: [],
  loading: false,
  uploading: false,
  error: null,

  fetchTransactions: async () => {
    set({ loading: true, error: null });
    try {
      const response = await axios.get(`${API_URL}/transactions`);
      set({ transactions: response.data.data, loading: false });
    } catch (err: any) {
      set({
        error: err.response?.data?.error || 'Failed to fetch transactions',
        loading: false
      });
    }
  },

  addTransaction: async (txData) => {
    set({ loading: true, error: null });
    try {
      const response = await axios.post(`${API_URL}/transactions`, txData);
      set((state) => ({
        transactions: [response.data.data, ...state.transactions],
        loading: false
      }));
      return true;
    } catch (err: any) {
      set({
        error: err.response?.data?.error || 'Failed to add transaction',
        loading: false
      });
      return false;
    }
  },

  deleteTransaction: async (id) => {
    set({ loading: true, error: null });
    try {
      await axios.delete(`${API_URL}/transactions/${id}`);
      set((state) => ({
        transactions: state.transactions.filter((tx) => tx._id !== id),
        loading: false
      }));
      return true;
    } catch (err: any) {
      set({
        error: err.response?.data?.error || 'Failed to delete transaction',
        loading: false
      });
      return false;
    }
  },

  uploadReceipt: async (file) => {
    set({ uploading: true, error: null });
    try {
      const formData = new FormData();
      formData.append('file', file);

      await axios.post(`${API_URL}/transactions/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      // We don't add the transaction here because the Express backend processes the OCR in the background,
      // and Socket.io will broadcast the finished transaction.
      // So we keep uploading: true to show a beautiful spinning overlay,
      // and Socket.io event will turn uploading back to false!
      return true;
    } catch (err: any) {
      set({
        error: err.response?.data?.error || 'Failed to upload receipt',
        uploading: false
      });
      return false;
    }
  },

  addProcessedTransaction: (transaction) => {
    set((state) => {
      // Avoid duplicate transactions in state
      const exists = state.transactions.some((tx) => tx._id === transaction._id);
      if (exists) return { uploading: false };

      return {
        transactions: [transaction, ...state.transactions],
        uploading: false
      };
    });
  },

  updateLocalBudgets: async (newBudgets, newMonthlyBudget) => {
    set({ loading: true, error: null });
    try {
      const response = await axios.put(`${API_URL}/auth/budgets`, { 
        budgets: newBudgets, 
        monthlyBudget: newMonthlyBudget 
      });
      const { budgets, monthlyBudget } = response.data.data;
      
      useAuthStore.getState().setBudgets(budgets, monthlyBudget);
      set({ loading: false });
      return true;
    } catch (err: any) {
      set({
        error: err.response?.data?.error || 'Failed to update budgets',
        loading: false
      });
      return false;
    }
  },

  fetchDebts: async () => {
    set({ loading: true, error: null });
    try {
      const response = await axios.get(`${API_URL}/debts`);
      set({ debts: response.data.data, loading: false });
    } catch (err: any) {
      set({
        error: err.response?.data?.error || 'Borçlar yüklenemedi',
        loading: false
      });
    }
  },

  addDebt: async (debtData) => {
    set({ loading: true, error: null });
    try {
      const response = await axios.post(`${API_URL}/debts`, debtData);
      set((state) => ({
        debts: [response.data.data, ...state.debts],
        loading: false
      }));
      return true;
    } catch (err: any) {
      set({
        error: err.response?.data?.error || 'Borç eklenemedi',
        loading: false
      });
      return false;
    }
  },

  updateDebt: async (id, debtData) => {
    set({ loading: true, error: null });
    try {
      const response = await axios.put(`${API_URL}/debts/${id}`, debtData);
      const { data: updatedDebt, createdTransaction } = response.data;

      set((state) => {
        const newDebts = state.debts.map((d) => d._id === id ? updatedDebt : d);
        // If debt decreased, a payment transaction was auto-created → push it to transactions list
        const newTransactions = createdTransaction
          ? [createdTransaction, ...state.transactions]
          : state.transactions;
        return { debts: newDebts, transactions: newTransactions, loading: false };
      });
      return true;
    } catch (err: any) {
      set({
        error: err.response?.data?.error || 'Borç güncellenemedi',
        loading: false
      });
      return false;
    }
  },

  deleteDebt: async (id) => {
    set({ loading: true, error: null });
    try {
      await axios.delete(`${API_URL}/debts/${id}`);
      set((state) => ({
        debts: state.debts.filter((d) => d._id !== id),
        loading: false
      }));
      return true;
    } catch (err: any) {
      set({
        error: err.response?.data?.error || 'Borç silinemedi',
        loading: false
      });
      return false;
    }
  }
}));
