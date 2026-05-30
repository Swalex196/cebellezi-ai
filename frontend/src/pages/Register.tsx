import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { Mail, Lock, User, UserPlus, AlertCircle, ArrowLeft } from 'lucide-react';

interface RegisterProps {
  onNavigateToLogin: () => void;
}

export const Register: React.FC<RegisterProps> = ({ onNavigateToLogin }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { register, error, loading, clearError } = useAuthStore();

  useEffect(() => {
    clearError();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) return;
    await register({ name, email, password });
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 relative">
      <div className="absolute top-1/4 right-1/4 w-72 h-72 bg-brand-secondary/10 rounded-full filter blur-[80px] -z-10"></div>
      <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-brand-accent/10 rounded-full filter blur-[100px] -z-10 animate-pulse"></div>

      <div className="glass-card w-full max-w-md p-8 rounded-2xl shadow-2xl border border-white/10 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-secondary via-brand-primary to-brand-accent"></div>

        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold text-white tracking-tight">Hesap Oluştur</h2>
          <p className="text-sm text-slate-400 mt-2">Cebellezi AI ile ücretsiz olarak hemen başlayın</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-200 px-4 py-3 rounded-xl mb-6 flex items-start gap-3 text-sm">
            <AlertCircle className="w-5 h-5 text-brand-danger shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Ad Soyad
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ahmet Yılmaz"
                className="w-full pl-11 pr-4 py-2.5 rounded-xl glass-input text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              E-Posta Adresi
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ahmet@example.com"
                className="w-full pl-11 pr-4 py-2.5 rounded-xl glass-input text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Şifre
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="•••••••• (Min 6 karakter)"
                className="w-full pl-11 pr-4 py-2.5 rounded-xl glass-input text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-secondary hover:bg-brand-secondary/95 text-white py-3 rounded-xl font-medium text-sm flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-brand-secondary/20 transition-all duration-200 disabled:opacity-50"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                Kayıt Ol
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-white/5 text-center">
          <p className="text-xs text-slate-400">
            Zaten bir hesabınız var mı?{' '}
            <button
              onClick={onNavigateToLogin}
              className="text-brand-secondary hover:text-brand-secondary/80 font-medium inline-flex items-center gap-1 hover:underline"
            >
              <ArrowLeft className="w-3 h-3" />
              Giriş ekranına dön
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
