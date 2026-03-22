import React from 'react';
import { Outlet, Link, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { LayoutDashboard, Users, Dumbbell, PlayCircle, History, LogOut, Shield, AlertTriangle, KeyRound, CheckCircle2 } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { supabase } from '../lib/supabase';
import { useState } from 'react';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const navItems = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Alunos', path: '/students', icon: Users },
  { name: 'Exercícios', path: '/exercises', icon: Dumbbell },
  { name: 'Treino', path: '/session', icon: PlayCircle },
  { name: 'Histórico', path: '/history', icon: History },
];

export default function Layout() {
  const { user, loading, isSuperAdmin, isActive, requirePasswordChange, signOut } = useAuth();
  const location = useLocation();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (newPassword !== confirmPassword) {
      setPasswordError('As senhas não coincidem.');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setIsChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
        data: { require_password_change: false }
      });

      if (error) throw error;
      
      // Force reload to update auth context
      window.location.reload();
    } catch (error: any) {
      console.error('Error changing password:', error);
      setPasswordError(error.message || 'Erro ao alterar a senha.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-lime-400"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requirePasswordChange) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
          <div className="p-8">
            <div className="w-16 h-16 bg-lime-400/10 rounded-2xl flex items-center justify-center mb-6">
              <KeyRound className="w-8 h-8 text-lime-400" />
            </div>
            <h1 className="text-2xl font-bold text-zinc-100 mb-2">Defina sua Senha</h1>
            <p className="text-zinc-400 mb-8">
              Este é o seu primeiro acesso. Por favor, defina uma nova senha para continuar.
            </p>

            <form onSubmit={handlePasswordChange} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1.5">Nova Senha</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400 transition-all"
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1.5">Confirmar Nova Senha</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400 transition-all"
                  placeholder="Repita a nova senha"
                />
              </div>

              {passwordError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2 text-red-400 text-sm">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  <p>{passwordError}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isChangingPassword}
                className="w-full bg-lime-400 hover:bg-lime-500 text-zinc-950 font-semibold rounded-xl px-4 py-3 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
              >
                {isChangingPassword ? (
                  <div className="w-5 h-5 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    Salvar e Continuar
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-lime-400 tracking-tight">PersonalSaaS</h1>
          <p className="text-xs text-zinc-500 mt-1">Gestão Premium</p>
        </div>
        
        <nav className="flex-1 px-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-colors",
                  isActive 
                    ? "bg-lime-400/10 text-lime-400 font-medium" 
                    : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50"
                )}
              >
                <Icon className="w-5 h-5" />
                {item.name}
              </Link>
            );
          })}

          {isSuperAdmin && (
            <Link
              to="/admin"
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-colors mt-4 border border-lime-400/20",
                location.pathname === '/admin'
                  ? "bg-lime-400/10 text-lime-400 font-medium"
                  : "text-lime-400/70 hover:text-lime-400 hover:bg-lime-400/10"
              )}
            >
              <Shield className="w-5 h-5" />
              Administração
            </Link>
          )}
        </nav>

        <div className="p-4 border-t border-zinc-800">
          <div className="flex items-center gap-3 px-4 py-3 text-sm text-zinc-400">
            <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-lime-400 font-bold">
              {user.email?.[0].toUpperCase()}
            </div>
            <div className="flex-1 truncate">
              {user.email}
            </div>
          </div>
          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-4 py-3 text-zinc-400 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-colors mt-2"
          >
            <LogOut className="w-5 h-5" />
            Sair
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 md:p-10 max-w-6xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
