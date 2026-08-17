import React, { useState } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import { apiService } from './services/api';

export default function App() {
  const [user, setUser] = useState(null);
  const [loginError, setLoginError] = useState('');

  const handleLogin = async (userData) => {
    const result = await apiService.login(userData);

    if (result?.success) {
      setLoginError('');
      setUser({
        ...userData,
        ...result,
        id: result.userId || userData.schoolId || 'local-user',
      });
      return true;
    }

    setLoginError(result?.message || 'Login failed. Please check your credentials.');
    return false;
  };

  const handleLogout = () => {
    setUser(null);
    setLoginError('');
  };

  return (
    <div>
      {!user ? (
        <Login onLogin={handleLogin} loginError={loginError} />
      ) : (
        <Dashboard user={user} onLogout={handleLogout} />
      )}
    </div>
  );
}