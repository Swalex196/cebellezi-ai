import React, { useState } from 'react';
import { useAuthStore } from './store/useAuthStore';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';

export const App: React.FC = () => {
  const { isAuthenticated } = useAuthStore();
  const [currentView, setCurrentView] = useState<'login' | 'register'>('login');

  if (isAuthenticated) {
    return <Dashboard />;
  }

  return (
    <div className="min-h-screen bg-dark-base text-slate-200 selection:bg-brand-primary selection:text-white">
      {currentView === 'login' ? (
        <Login onNavigateToRegister={() => setCurrentView('register')} />
      ) : (
        <Register onNavigateToLogin={() => setCurrentView('login')} />
      )}
    </div>
  );
};

export default App;
