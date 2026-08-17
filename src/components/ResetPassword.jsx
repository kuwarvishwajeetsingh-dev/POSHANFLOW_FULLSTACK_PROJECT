import React, { useState } from 'react';
import { apiService } from '../services/api';

export default function ResetPassword({ onComplete }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const submit = async (event) => {
    event.preventDefault(); setMessage('');
    if (password.length < 8) { setMessage('Password must contain at least 8 characters.'); return; }
    if (password !== confirmPassword) { setMessage('Passwords do not match.'); return; }
    setLoading(true);
    const result = await apiService.updateUserPassword(password);
    setLoading(false);
    if (result.success) { setMessage('Password updated. You can now sign in.'); setTimeout(onComplete, 1000); }
    else setMessage(result.error || 'Unable to update password. Please request a new reset link.');
  };
  return <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4"><div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md border border-slate-200"><h1 className="text-2xl font-bold text-slate-800 text-center">Set New Password</h1><p className="text-xs text-slate-500 text-center mt-1 mb-6">Create a new password for your POSHANFLOW account.</p><form onSubmit={submit} className="space-y-4"><div><label className="block text-xs font-semibold text-slate-600 mb-1">New Password</label><input required minLength="8" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" /></div><div><label className="block text-xs font-semibold text-slate-600 mb-1">Confirm New Password</label><input required minLength="8" type="password" autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" /></div>{message && <div className={`text-xs border rounded-lg px-3 py-2 ${message.startsWith('Password updated') ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>{message}</div>}<button disabled={loading} className="w-full py-2.5 rounded-lg text-white font-semibold text-sm bg-indigo-600 hover:bg-indigo-700 disabled:opacity-75">{loading ? 'Updating...' : 'Update Password'}</button></form></div></div>;
}
