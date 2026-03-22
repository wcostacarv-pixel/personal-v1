/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './lib/AuthContext';
import { TrainingProvider } from './lib/TrainingContext';
import { hasSupabaseConfig } from './lib/supabase';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Students from './pages/Students';
import Exercises from './pages/Exercises';
import Session from './pages/Session';
import History from './pages/History';
import AdminPanel from './pages/AdminPanel';
import StudentProfile from './pages/StudentProfile';
import { FloatingTrainingBadge } from './components/FloatingTrainingBadge';

function SetupRequired() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl">
        <h1 className="text-2xl font-bold text-lime-400 mb-4">Configuração Necessária</h1>
        <p className="text-zinc-300 mb-6">
          Para utilizar o PersonalSaaS, você precisa configurar suas credenciais do Supabase.
        </p>
        <div className="space-y-4 text-sm text-zinc-400">
          <p>
            <strong>1.</strong> Crie um projeto no <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-lime-400 hover:underline">Supabase</a>.
          </p>
          <p>
            <strong>2.</strong> No AI Studio, abra as <strong>Configurações (ícone de engrenagem)</strong> no canto superior direito e selecione <strong>Secrets</strong>.
          </p>
          <p>
            <strong>3.</strong> Adicione as seguintes variáveis com os valores do seu projeto (encontrados em Project Settings &gt; API):
          </p>
          <ul className="list-disc pl-5 space-y-2 text-zinc-300 font-mono bg-zinc-950 p-4 rounded-xl border border-zinc-800">
            <li>VITE_SUPABASE_URL</li>
            <li>VITE_SUPABASE_ANON_KEY</li>
            <li>VITE_SUPABASE_SERVICE_ROLE_KEY</li>
          </ul>
          <p className="mt-4">
            <strong>4.</strong> Execute o script SQL localizado no arquivo <code>database.sql</code> no SQL Editor do Supabase para criar as tabelas e políticas de segurança.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  if (!hasSupabaseConfig) {
    return <SetupRequired />;
  }

  return (
    <AuthProvider>
      <TrainingProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="students" element={<Students />} />
              <Route path="students/:id" element={<StudentProfile />} />
              <Route path="exercises" element={<Exercises />} />
              <Route path="session" element={<Session />} />
              <Route path="history" element={<History />} />
              <Route path="admin" element={<AdminPanel />} />
            </Route>
          </Routes>
          <FloatingTrainingBadge />
        </BrowserRouter>
      </TrainingProvider>
    </AuthProvider>
  );
}
