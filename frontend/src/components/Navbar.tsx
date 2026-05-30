import React from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { LogOut, User, Activity, TrendingUp } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuthStore();

  return (
    <nav className="glass-card sticky top-0 z-50 px-6 py-4 flex items-center justify-between border-b border-white/5 rounded-b-xl shadow-lg">
      <div className="flex items-center gap-3">
        <div className="bg-brand-primary p-2 rounded-xl text-white shadow-lg shadow-brand-primary/20 animate-pulse">
          <TrendingUp className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            Cebellezi <span className="text-brand-primary text-xs bg-brand-primary/10 px-2 py-0.5 rounded-full font-semibold border border-brand-primary/20">AI</span>
          </h1>
          <p className="text-[10px] text-slate-400">Akıllı Finansal Denetim Platformu</p>
        </div>
      </div>

      <div className="flex items-center gap-6">
        {/* Real-time status pulse indicator */}
        <div className="hidden sm:flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full text-[11px] text-emerald-400 font-medium">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          Canlı Senkronizasyon Aktif
        </div>

        {user && (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700/50 py-1.5 px-3 rounded-xl">
              <div className="bg-brand-accent/20 text-brand-accent p-1 rounded-lg">
                <User className="w-4 h-4" />
              </div>
              <span className="text-sm font-medium text-slate-200">{user.name}</span>
            </div>

            <button
              onClick={logout}
              className="flex items-center gap-2 text-slate-400 hover:text-red-400 bg-transparent hover:bg-red-500/10 px-3 py-1.5 rounded-xl border border-transparent hover:border-red-500/20 transition-all duration-200"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm font-medium hidden md:inline">Çıkış Yap</span>
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};
