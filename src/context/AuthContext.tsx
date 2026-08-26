import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role?: 'admin' | 'member';
}

interface AuthContextType {
  user: UserProfile | null;
  setUser: (user: UserProfile | null) => void;
  loginWithEmail: (email: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const ADMIN_EMAILS = ['nazicplay@gmail.com', 'admin@gmail.com'];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    const cached = localStorage.getItem('teamhub_user');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        return null;
      }
    }
    return null;
  });

  useEffect(() => {
    try {
      const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          const userEmail = session.user.email?.toLowerCase() || '';
          const isModerator = ADMIN_EMAILS.includes(userEmail);
          const profile: UserProfile = {
            id: session.user.id,
            email: userEmail,
            name: session.user.user_metadata?.full_name || userEmail.split('@')[0] || 'User',
            role: isModerator ? 'admin' : 'member',
          };
          setUser(profile);
          localStorage.setItem('teamhub_user', JSON.stringify(profile));
        }
      });

      return () => {
        authListener?.subscription.unsubscribe();
      };
    } catch (e) {
      console.warn('Auth listener notice:', e);
    }
  }, []);

  const loginWithEmail = async (email: string, name?: string) => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = (name || cleanEmail.split('@')[0]).trim();
    const isModerator = ADMIN_EMAILS.includes(cleanEmail);
    
    const profile: UserProfile = {
      id: `user-${cleanEmail.replace(/[^a-z0-9]/g, '-')}`,
      email: cleanEmail,
      name: cleanName,
      role: isModerator ? 'admin' : 'member',
    };

    setUser(profile);
    localStorage.setItem('teamhub_user', JSON.stringify(profile));
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch {}
    setUser(null);
    localStorage.removeItem('teamhub_user');
  };

  const isAdmin = user?.role === 'admin' || (!!user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase()));

  return (
    <AuthContext.Provider value={{ user, setUser, loginWithEmail, logout, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
