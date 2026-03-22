import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, supabaseAdmin } from './supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isSuperAdmin: boolean;
  isActive: boolean;
  requirePasswordChange: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  isSuperAdmin: false,
  isActive: true,
  requirePasswordChange: false,
  signOut: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    const checkUserStatus = async (currentUser: User | null) => {
      // All authenticated users are active
      setIsActive(true);

      if (currentUser && currentUser.email === 'wellin_costa@yahoo.com.br') {
        // Ensure super_admin role in app_metadata
        if (currentUser.app_metadata?.role !== 'super_admin') {
          try {
            await supabaseAdmin.auth.admin.updateUserById(currentUser.id, {
              app_metadata: { role: 'super_admin' }
            });
            // Force session refresh to update metadata
            await supabase.auth.refreshSession();
          } catch (err) {
            console.error('Error updating master admin role:', err);
          }
        }

        // Ensure profile exists for the master admin
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', currentUser.id)
            .single();

          if (!profile) {
            await supabase.from('profiles').insert({
              id: currentUser.id,
              full_name: 'Administrador Mestre',
              email: currentUser.email,
              role: 'super_admin',
              active: true
            });
          }
        } catch (err) {
          console.error('Error ensuring master admin profile:', err);
        }
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      checkUserStatus(session?.user ?? null).then(() => setLoading(false));
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      checkUserStatus(session?.user ?? null).then(() => setLoading(false));
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const isSuperAdmin = session?.user?.app_metadata?.role === 'super_admin' || session?.user?.email === 'wellin_costa@yahoo.com.br';
  const requirePasswordChange = session?.user?.user_metadata?.require_password_change === true;

  return (
    <AuthContext.Provider value={{ user, session, loading, isSuperAdmin, isActive, requirePasswordChange, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
