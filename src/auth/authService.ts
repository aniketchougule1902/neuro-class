import { signInWithPopup, signOut as firebaseSignOut, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { auth as firebaseAuth, googleProvider, db, handleFirestoreError } from '../database/firebase';
import { supabase, isSupabaseConfigured } from '../database/supabase';

export type AppUser = SupabaseUser | FirebaseUser;

export const authService = {
  /**
   * Initiate Google OAuth Sign In flow with popup
   */
  async loginWithGoogleOAuth(): Promise<FirebaseUser> {
    const result = await signInWithPopup(firebaseAuth, googleProvider);
    const fbUser = result.user;

    const userRef = doc(db, 'users', fbUser.uid);
    try {
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        await setDoc(userRef, {
          uid: fbUser.uid,
          email: fbUser.email,
          displayName: fbUser.displayName,
          photoURL: fbUser.photoURL,
          role: 'teacher',
          createdAt: new Date().toISOString()
        });
      }
    } catch (e) {
      try {
        handleFirestoreError(e, 'get', `users/${fbUser.uid}`);
      } catch (formattedErr) {
        console.warn('Firestore user doc record write warning:', formattedErr);
      }
    }
    return fbUser;
  },

  /**
   * Sign out current active user from both Firebase and Supabase sessions
   */
  async logout(): Promise<void> {
    await firebaseSignOut(firebaseAuth);
    if (isSupabaseConfigured()) {
      await supabase.auth.signOut();
    }
  },

  /**
   * Retrieve user role ('teacher' | 'student') from Firestore
   */
  async getUserRole(uid: string): Promise<'teacher' | 'student'> {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        return userDoc.data().role || 'teacher';
      }
    } catch (e) {
      console.warn('Failed to fetch user role from Firestore:', e);
    }
    return 'teacher';
  },

  /**
   * Subscribe to authentication state changes
   */
  subscribeToAuthState(onUserChanged: (user: AppUser | null) => void): () => void {
    const unsubscribeFirebase = onAuthStateChanged(firebaseAuth, (fbUser) => {
      if (fbUser) {
        onUserChanged(fbUser);
      } else if (isSupabaseConfigured()) {
        supabase.auth.getSession().then(({ data: { session } }) => {
          onUserChanged(session?.user ?? null);
        });
      } else {
        onUserChanged(null);
      }
    });

    let unsubscribeSupabase = () => {};
    if (isSupabaseConfigured()) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!firebaseAuth.currentUser) {
          onUserChanged(session?.user ?? null);
        }
      });
      unsubscribeSupabase = () => subscription.unsubscribe();
    }

    return () => {
      unsubscribeFirebase();
      unsubscribeSupabase();
    };
  }
};
