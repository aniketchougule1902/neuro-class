import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService, type AppUser } from '../services/authService';

interface AuthContextType {
  user: AppUser | null;
  userRole: 'teacher' | 'student' | null;
  loading: boolean;
  refreshAuth: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [userRole, setUserRole] = useState<'teacher' | 'student' | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRole = async (uid: string) => {
    const role = await authService.getUserRole(uid);
    setUserRole(role);
  };

  useEffect(() => {
    const unsubscribe = authService.subscribeToAuthState(async (currentUser) => {
      setUser(currentUser);
      if (currentUser && 'id' in currentUser) {
        await fetchRole(currentUser.id);
      } else {
        setUserRole(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const refreshAuth = async () => {
    if (user && 'id' in user) {
      await fetchRole(user.id);
    }
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
    setUserRole(null);
  };

  return (
    <AuthContext.Provider value={{ user, userRole, loading, refreshAuth, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
