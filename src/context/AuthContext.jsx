import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

const GUEST_USER = { id: 'guest', email: 'Guest', isGuest: true };
const GUEST_KEY = 'metal-stacker-guest';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing guest session
    if (localStorage.getItem(GUEST_KEY) === 'true') {
      setUser(GUEST_USER);
      setLoading(false);
      // Still listen for auth changes in case they sign in later
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        setUser(session.user);
        localStorage.removeItem(GUEST_KEY);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        if (session?.user) {
          setUser(session.user);
          localStorage.removeItem(GUEST_KEY);
        } else if (!localStorage.getItem(GUEST_KEY)) {
          setUser(null);
        }
        setLoading(false);
      },
    );

    return () => subscription.unsubscribe();
  }, []);

  const redirectTo = window.location.origin + (import.meta.env.BASE_URL || '/');

  const signUp = (email, password) =>
    supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirectTo },
    });

  const signIn = (email, password) =>
    supabase.auth.signInWithPassword({ email, password });

  const signInWithGoogle = () =>
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });

  const continueAsGuest = () => {
    localStorage.setItem(GUEST_KEY, 'true');
    setUser(GUEST_USER);
  };

  const signOut = async () => {
    localStorage.removeItem(GUEST_KEY);
    setUser(null);
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{ user, session, loading, signUp, signIn, signInWithGoogle, continueAsGuest, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
