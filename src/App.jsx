import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import ResetPassword from './components/ResetPassword';
import { apiService } from './services/api';
import { supabase } from './lib/supabase';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loginError, setLoginError] = useState('');
  const [passwordRecovery, setPasswordRecovery] = useState(false);
  const [showPanelIntro, setShowPanelIntro] = useState(false);

  useEffect(() => {
    if (!user) {
      setShowPanelIntro(false);
      return undefined;
    }
    setShowPanelIntro(true);
    const timer = window.setTimeout(() => setShowPanelIntro(false), 1000);
    return () => window.clearTimeout(timer);
  }, [user]);

  useEffect(() => {
    // Check initial authenticated session
    const initSession = async () => {
      try {
        const currentUser = await apiService.getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
        }
      } catch (err) {
        console.warn('Session check failed:', err);
      } finally {
        setLoading(false);
      }
    };

    initSession();

    // Listen for auth state transitions
    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      // handleLogin owns the sign-in transition so it can validate the selected
      // portal against the database role before the dashboard is rendered.
      if (event === 'PASSWORD_RECOVERY') {
        setPasswordRecovery(true);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe?.();
    };
  }, []);

  const handleLogin = async (userData) => {
    setLoginError('');
    const result = await apiService.login(userData);

    if (result?.success) {
      setUser({
        id: result.userId,
        email: result.email,
        name: result.name,
        role: result.role,
        schoolId: result.schoolId,
        schoolName: result.schoolName,
        schoolCode: result.schoolCode,
      });
      return true;
    }

    setLoginError(result?.message || 'Login failed. Please check your credentials.');
    return false;
  };

  const handleLogout = async () => {
    await apiService.logout();
    setUser(null);
    setLoginError('');
  };

  const handleForgotPassword = (email) => apiService.requestPasswordReset(email);

  const handlePasswordResetComplete = async () => {
    await apiService.logout();
    setPasswordRecovery(false);
    setUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-slate-500 font-medium">Connecting to POSHANFLOW...</p>
        </div>
      </div>
    );
  }

  if (passwordRecovery) {
    return <ResetPassword onComplete={handlePasswordResetComplete} />;
  }

  return (
    <div className="relative">
      {!user ? (
        <Login onLogin={handleLogin} onForgotPassword={handleForgotPassword} loginError={loginError} />
      ) : (
        <>
          <Dashboard user={user} onLogout={handleLogout} />
          {showPanelIntro && (
            <div className="panel-entry-overlay" role="status" aria-label="Loading your dashboard">
              <img src="/poshanflow-logo.png" alt="PoshanFlow" className="panel-entry-logo" />
            </div>
          )}
        </>
      )}
    </div>
  );
}
