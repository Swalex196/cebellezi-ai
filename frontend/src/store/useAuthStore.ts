import { create } from 'zustand';
import axios from 'axios';

interface User {
  _id: string;
  name: string;
  email: string;
  budgets: Record<string, number>;
  monthlyBudget: number;
}

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  setBudgets: (budgets: Record<string, number>, monthlyBudget?: number) => void;
  login: (credentials: any) => Promise<boolean>;
  register: (userData: any) => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
}

const API_URL = 'http://127.0.0.1:5000/api';

// Initialize Axios with existing token if present
const savedToken = localStorage.getItem('cebellezi_token');
const savedUser = localStorage.getItem('cebellezi_user');

if (savedToken) {
  axios.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: savedToken,
  user: savedUser ? JSON.parse(savedUser) : null,
  isAuthenticated: !!savedToken,
  loading: false,
  error: null,

  setBudgets: (budgets, monthlyBudget) => {
    set((state) => {
      if (!state.user) return state;
      const updatedUser = { ...state.user, budgets };
      if (monthlyBudget !== undefined) {
        updatedUser.monthlyBudget = monthlyBudget;
      }
      localStorage.setItem('cebellezi_user', JSON.stringify(updatedUser));
      return { user: updatedUser };
    });
  },

  login: async (credentials) => {
    set({ loading: true, error: null });
    try {
      const response = await axios.post(`${API_URL}/auth/login`, credentials);
      const { token, ...userData } = response.data.data;
      
      localStorage.setItem('cebellezi_token', token);
      localStorage.setItem('cebellezi_user', JSON.stringify(userData));
      
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      set({
        token,
        user: userData as User,
        isAuthenticated: true,
        loading: false
      });
      return true;
    } catch (err: any) {
      set({
        error: err.response?.data?.error || 'Login failed',
        loading: false
      });
      return false;
    }
  },

  register: async (userData) => {
    set({ loading: true, error: null });
    try {
      const response = await axios.post(`${API_URL}/auth/register`, userData);
      const { token, ...newUserData } = response.data.data;
      
      localStorage.setItem('cebellezi_token', token);
      localStorage.setItem('cebellezi_user', JSON.stringify(newUserData));
      
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      set({
        token,
        user: newUserData as User,
        isAuthenticated: true,
        loading: false
      });
      return true;
    } catch (err: any) {
      set({
        error: err.response?.data?.error || 'Registration failed',
        loading: false
      });
      return false;
    }
  },

  logout: () => {
    localStorage.removeItem('cebellezi_token');
    localStorage.removeItem('cebellezi_user');
    delete axios.defaults.headers.common['Authorization'];
    set({
      token: null,
      user: null,
      isAuthenticated: false,
      error: null
    });
  },

  clearError: () => set({ error: null })
}));
