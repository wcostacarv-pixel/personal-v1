import React, { useEffect, useState } from 'react';
import { supabase, supabaseAdmin } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { Shield, Users, Calendar, CheckCircle2, XCircle, Plus, X, DollarSign, Copy } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Navigate } from 'react-router-dom';

interface Professional {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  role: string | null;
  active: boolean;
  created_at: string;
  monthly_fee: number;
}

export default function AdminPanel() {
  const { isSuperAdmin, user } = useAuth();
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmingPaymentId, setConfirmingPaymentId] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [createdProfessional, setCreatedProfessional] = useState<{ email: string; tempPassword: string } | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    active: true,
    monthly_fee: '' as string | number,
    tempPassword: '',
  });

  useEffect(() => {
    if (!isSuperAdmin) return;
    
    fetchProfessionals();
  }, [isSuperAdmin]);

  const fetchProfessionals = async () => {
    try {
      const { data, error } = await supabase.from('profiles').select('*');
      if (error) throw error;
      setProfessionals(data || []);
    } catch (error) {
      console.error('Error fetching professionals:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleProfessionalStatus = async (id: string, currentActive: boolean) => {
    if (!isSuperAdmin) return;
    
    // Prevent master admin from blocking themselves
    if (id === user?.id) {
      alert('O Administrador Mestre não pode ser bloqueado.');
      return;
    }

    setTogglingId(id);
    
    const newActive = !currentActive;
    console.log('Updating professional status:', { id, active: newActive });

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ active: newActive })
        .eq('id', id);

      if (error) throw error;
      
      // Update local state
      setProfessionals(professionals.map(p => 
        p.id === id ? { ...p, active: newActive } : p
      ));
    } catch (error) {
      console.error('Error toggling professional status:', error);
      alert('Erro ao atualizar status do profissional.');
    } finally {
      setTogglingId(null);
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleCreateProfessional = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) return;
    
    setEmailError(null);
    setIsSubmitting(true);

    try {
      // 1. Check if user already exists in Auth by email
      let userId: string | null = null;
      const { data: { users }, error: listError } = await (supabaseAdmin.auth.admin.listUsers() as any);
      
      if (listError) throw listError;
      
      const existingAuthUser = (users as any[]).find(u => u.email === formData.email);
      
      if (existingAuthUser) {
        userId = existingAuthUser.id;
      } else {
        // 2. Create user in Auth if not exists
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: formData.email,
          password: formData.tempPassword,
          email_confirm: true,
          user_metadata: {
            require_password_change: true
          },
          app_metadata: {
            role: 'personal'
          }
        });

        if (authError) throw authError;
        if (authData.user) userId = authData.user.id;
      }

      if (userId) {
        // 3. Upsert the professional profile with all fields
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .upsert({
            id: userId,
            full_name: formData.name,
            email: formData.email,
            phone: formData.phone,
            role: 'personal',
            active: formData.active,
            monthly_fee: Number(formData.monthly_fee) || 0
          });

        if (profileError) {
          console.error('Error upserting into profiles:', profileError);
          throw profileError;
        }

        // 4. Ensure role is 'personal' for existing users too
        await supabaseAdmin.auth.admin.updateUserById(userId, {
          app_metadata: { role: 'personal' }
        });

        showToast('Profissional cadastrado com sucesso!', 'success');
        setCreatedProfessional({ email: formData.email, tempPassword: formData.tempPassword });
        setFormData({ name: '', email: '', phone: '', active: true, monthly_fee: '', tempPassword: '' });
        fetchProfessionals();
      }
    } catch (error: any) {
      console.error('Error creating professional:', error);
      showToast(`Erro ao cadastrar profissional: ${error.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmPayment = async (prof: Professional) => {
    if (!isSuperAdmin) return;
    
    if (!window.confirm(`Confirmar o pagamento de R$ ${prof.monthly_fee} para ${prof.full_name || prof.email}?`)) {
      return;
    }

    setConfirmingPaymentId(prof.id);
    try {
      const now = new Date();
      const { error } = await supabase
        .from('professional_payments')
        .insert({
          professional_id: prof.id,
          amount: prof.monthly_fee,
          month: now.getMonth() + 1,
          year: now.getFullYear()
        });

      if (error) throw error;
      alert('Pagamento confirmado com sucesso!');
    } catch (error: any) {
      console.error('Error confirming payment:', error);
      alert(`Erro ao confirmar pagamento: ${error.message}`);
    } finally {
      setConfirmingPaymentId(null);
    }
  };

  const handleCopyAccess = () => {
    if (!createdProfessional) return;
    const text = `Olá! Seu acesso ao PersonalSaaS foi criado.\n\nLogin: ${createdProfessional.email}\nSenha Inicial: ${createdProfessional.tempPassword}\n\nNo seu primeiro acesso, será solicitado que você crie uma nova senha.`;
    navigator.clipboard.writeText(text);
    showToast('Dados de acesso copiados!', 'success');
  };

  const closeAndResetModal = () => {
    setIsModalOpen(false);
    setCreatedProfessional(null);
  };

  if (!isSuperAdmin) {
    return <Navigate to="/" replace />;
  }

  if (loading) {
    return <div className="text-zinc-400">Carregando painel administrativo...</div>;
  }

  return (
    <div className="space-y-8 relative">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-xl shadow-lg border flex items-center gap-2 animate-in fade-in slide-in-from-top-4 ${
          toast.type === 'success' 
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
            : 'bg-red-500/10 border-red-500/20 text-red-400'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
          <span className="font-medium">{toast.message}</span>
        </div>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-lime-400 tracking-tight flex items-center gap-3">
            <Shield className="w-8 h-8" />
            Painel Administrativo
          </h1>
          <p className="text-zinc-400 mt-1">Visão geral de todos os profissionais cadastrados</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-lime-400 hover:bg-lime-500 text-zinc-950 px-4 py-2 rounded-xl font-semibold flex items-center gap-2 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Novo Personal
        </button>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-6 border-b border-zinc-800 flex items-center gap-4">
          <div className="w-12 h-12 bg-lime-400/10 rounded-xl flex items-center justify-center">
            <Users className="w-6 h-6 text-lime-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-zinc-100">Profissionais</h2>
            <p className="text-sm text-zinc-400">Total: {professionals.length}</p>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-400">
            <thead className="bg-zinc-950/50 text-xs uppercase font-semibold text-zinc-500 border-b border-zinc-800">
              <tr>
                <th className="px-6 py-4">Profissional</th>
                <th className="px-6 py-4">Mensalidade</th>
                <th className="px-6 py-4">Data de Cadastro</th>
                <th className="px-6 py-4">Status / Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {professionals.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-zinc-500">
                    Nenhum profissional encontrado.
                  </td>
                </tr>
              ) : (
                professionals.map((prof) => (
                  <tr key={prof.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-zinc-100">{prof.full_name || 'Sem nome'}</div>
                      <div className="text-xs text-zinc-500">{prof.email}</div>
                    </td>
                    <td className="px-6 py-4 font-medium text-zinc-300">
                      R$ {prof.monthly_fee || 0}
                    </td>
                    <td className="px-6 py-4">
                      <span className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-zinc-500" />
                        {format(new Date(prof.created_at), "dd 'de' MMM, yyyy", { locale: ptBR })}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => toggleProfessionalStatus(prof.id, prof.active)}
                          disabled={togglingId === prof.id}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            prof.active 
                              ? 'bg-lime-400/10 text-lime-400 hover:bg-lime-400/20' 
                              : 'bg-red-400/10 text-red-400 hover:bg-red-400/20'
                          } ${togglingId === prof.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          {prof.active ? (
                            <>
                              <CheckCircle2 className="w-4 h-4" />
                              Ativo (Bloquear)
                            </>
                          ) : (
                            <>
                              <XCircle className="w-4 h-4" />
                              Bloqueado (Ativar)
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => handleConfirmPayment(prof)}
                          disabled={confirmingPaymentId === prof.id || !prof.active}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors bg-zinc-800 text-zinc-300 hover:bg-zinc-700 ${
                            (confirmingPaymentId === prof.id || !prof.active) ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                          title={!prof.active ? "Profissional bloqueado" : "Confirmar pagamento do mês"}
                        >
                          <DollarSign className="w-4 h-4" />
                          Confirmar Pagamento
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col shadow-2xl">
            <div className="flex justify-between items-center p-6 border-b border-zinc-800 shrink-0">
              <h2 className="text-xl font-bold text-zinc-100">
                {createdProfessional ? 'Cadastro Concluído' : 'Novo Personal Trainer'}
              </h2>
              <button 
                onClick={closeAndResetModal}
                className="text-zinc-400 hover:text-zinc-100 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            {createdProfessional ? (
              <div className="p-6 flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                </div>
                <h3 className="text-xl font-bold text-zinc-100 mb-2">Profissional Cadastrado!</h3>
                <p className="text-zinc-400 mb-6">
                  O acesso foi criado com sucesso. Copie os dados abaixo para enviar ao profissional.
                </p>
                
                <div className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 mb-6 text-left">
                  <div className="mb-3">
                    <span className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">Login</span>
                    <span className="text-zinc-100 font-medium">{createdProfessional.email}</span>
                  </div>
                  <div>
                    <span className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">Senha Inicial</span>
                    <span className="text-zinc-100 font-medium font-mono">{createdProfessional.tempPassword}</span>
                  </div>
                </div>

                <div className="flex gap-3 w-full">
                  <button
                    onClick={closeAndResetModal}
                    className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-semibold rounded-xl px-4 py-3 transition-colors"
                  >
                    Fechar
                  </button>
                  <button
                    onClick={handleCopyAccess}
                    className="flex-1 bg-lime-400 hover:bg-lime-500 text-zinc-950 font-semibold rounded-xl px-4 py-3 transition-colors flex items-center justify-center gap-2"
                  >
                    <Copy className="w-5 h-5" />
                    Copiar Acesso
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="overflow-y-auto p-6">
                  <form id="professional-form" onSubmit={handleCreateProfessional} className="space-y-5">
                    <div>
                      <label className="block text-sm font-medium text-zinc-400 mb-1.5">Nome Completo</label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400 transition-all"
                        placeholder="Nome do profissional"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-zinc-400 mb-1.5">Email</label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => {
                          setFormData({...formData, email: e.target.value});
                          if (emailError) setEmailError(null);
                        }}
                        className={`w-full bg-zinc-950 border ${emailError ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/50' : 'border-zinc-800 focus:border-lime-400 focus:ring-lime-400/50'} rounded-xl px-4 py-3 text-zinc-100 focus:outline-none focus:ring-2 transition-all`}
                        placeholder="email@exemplo.com"
                      />
                      {emailError && (
                        <p className="text-red-400 text-sm mt-1.5">{emailError}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-zinc-400 mb-1.5">Senha Temporária</label>
                      <input
                        type="text"
                        required
                        minLength={6}
                        value={formData.tempPassword}
                        onChange={(e) => setFormData({...formData, tempPassword: e.target.value})}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400 transition-all font-mono"
                        placeholder="Ex: Senha123!"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-zinc-400 mb-1.5">Telefone</label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400 transition-all"
                        placeholder="(00) 00000-0000"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-1.5">Mensalidade (R$)</label>
                        <input
                          type="number"
                          required
                          min="0"
                          step="0.01"
                          value={formData.monthly_fee}
                          onChange={(e) => setFormData({...formData, monthly_fee: e.target.value})}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400 transition-all"
                          placeholder="150.00"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-1.5">Status</label>
                        <select
                          value={formData.active ? 'active' : 'inactive'}
                          onChange={(e) => setFormData({...formData, active: e.target.value === 'active'})}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400 transition-all"
                        >
                          <option value="active">Ativo</option>
                          <option value="inactive">Inativo</option>
                        </select>
                      </div>
                    </div>
                  </form>
                </div>

                <div className="p-6 border-t border-zinc-800 shrink-0 bg-zinc-900/50">
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={closeAndResetModal}
                      className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-semibold rounded-xl px-4 py-3 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      form="professional-form"
                      disabled={isSubmitting}
                      className="flex-1 bg-lime-400 hover:bg-lime-500 text-zinc-950 font-semibold rounded-xl px-4 py-3 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-5 h-5 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                          Carregando...
                        </>
                      ) : (
                        <>
                          <Plus className="w-5 h-5" />
                          Cadastrar
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
