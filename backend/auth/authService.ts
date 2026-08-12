import { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '../database/supabase';

export type AppUser = SupabaseUser;

export const authService = {
  /**
   * Initiate Google OAuth Sign In flow with popup via Supabase
   */
  async loginWithGoogleOAuth(): Promise<AppUser> {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        }
      }
    });
    
    if (error) {
      throw error;
    }

    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.user) {
      const userRef = session.user;
      const { data: userDoc } = await supabase.from('users').select('*').eq('uid', userRef.id).single();
      
      if (!userDoc) {
        await supabase.from('users').insert({
          uid: userRef.id,
          email: userRef.email,
          displayName: userRef.user_metadata?.full_name || '',
          photoURL: userRef.user_metadata?.avatar_url || '',
          role: 'teacher',
          createdAt: new Date().toISOString()
        });
      }
      return userRef;
    }
    
    throw new Error('OAuth login initiated. Waiting for redirect/popup...');
  },

  /**
   * Sign out current active user from Supabase session
   */
  async logout(): Promise<void> {
    await supabase.auth.signOut();
  },

  /**
   * Retrieve user role ('teacher' | 'student') from Supabase
   */
  async getUserRole(uid: string): Promise<'teacher' | 'student'> {
    try {
      const { data: userDoc, error } = await supabase.from('users').select('role').eq('uid', uid).single();
      if (!error && userDoc) {
        return userDoc.role || 'teacher';
      }
    } catch (e) {
      console.warn('Failed to fetch user role from Supabase:', e);
    }
    return 'teacher';
  },

  /**
   * Subscribe to authentication state changes
   */
  subscribeToAuthState(onUserChanged: (user: AppUser | null) => void): () => void {
    supabase.auth.getSession().then(({ data: { session } }) => {
      onUserChanged(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      onUserChanged(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }
};
