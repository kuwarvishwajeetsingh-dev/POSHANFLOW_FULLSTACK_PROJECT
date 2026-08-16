import React, { useState } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';

export default function App() {
  const [user, setUser] = useState(null);

  return (
    <div>
      {!user ? (
        <Login onLogin={(userData) => setUser(userData)} />
      ) : (
        <Dashboard user={user} onLogout={() => setUser(null)} />
      )}
    </div>
  );
}