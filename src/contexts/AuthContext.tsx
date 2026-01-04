import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Empresa } from '../types/database';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  empresa: Empresa | null;
  empresas: Empresa[];
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  setEmpresa: (empresa: Empresa | null) => void;
  loadEmpresas: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadEmpresasByUserId(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadEmpresasByUserId(session.user.id);
      } else {
        setEmpresa(null);
        setEmpresas([]);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function loadEmpresas() {
    if (!user?.id) return;

    const { data } = await supabase
      .from('empresas')
      .select('*')
      .eq('user_id', user.id)
      .order('razao_social');

    setEmpresas(data || []);

    if (data && data.length > 0 && !empresa) {
      setEmpresa(data[0]);
    }
  }

  async function loadEmpresasByUserId(userId: string) {
    const { data } = await supabase
      .from('empresas')
      .select('*')
      .eq('user_id', userId)
      .order('razao_social');

    setEmpresas(data || []);

    if (data && data.length > 0) {
      setEmpresa(data[0]);
    }
    setLoading(false);
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  }

  async function signUp(email: string, password: string) {
    const { error } = await supabase.auth.signUp({ email, password });
    return { error: error as Error | null };
  }

  async function signOut() {
    await supabase.auth.signOut();
    setEmpresa(null);
    setEmpresas([]);
  }

  return (
    <AuthContext.Provider value={{
      user,
      session,
      empresa,
      empresas,
      loading,
      signIn,
      signUp,
      signOut,
      setEmpresa,
      loadEmpresas
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}