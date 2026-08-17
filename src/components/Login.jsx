import React, { useState } from 'react';

export default function Login({ onLogin, loginError }) {
  const [role, setRole] = useState('teacher');
  const [schoolId, setSchoolId] = useState('SCH-101');
  const [email, setEmail] = useState('mohan@tugulpurschool.com');
  const [password, setPassword] = useState('12345');

  const handleSubmit = async (e) => {
    e.preventDefault();

    const loginPayload = {
      role,
      schoolId: schoolId || 'SCH-101',
      email: email || 'mohan@tugulpurschool.com',
      password: password || '12345',
      name: role === 'teacher' ? 'Mohan Kumar' : 'District Education Officer',
    };

    await onLogin(loginPayload);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md border border-slate-200">
        <h1 className="text-2xl font-bold text-slate-800 text-center mb-1">POSHANFLOW</h1>
        <p className="text-slate-500 text-xs text-center mb-6">Mid-Day Meal Inventory Tracking</p>

        <div className="flex bg-slate-100 p-1 rounded-lg mb-6 border border-slate-200">
          <button
            type="button"
            onClick={() => setRole('teacher')}
            className={`flex-1 py-2 text-xs font-bold rounded-md transition ${
              role === 'teacher' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-500'
            }`}
          >
            Teacher / Headmaster
          </button>
          <button
            type="button"
            onClick={() => setRole('inspector')}
            className={`flex-1 py-2 text-xs font-bold rounded-md transition ${
              role === 'inspector' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'
            }`}
          >
            District Inspector
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              {role === 'teacher' ? 'School ID / Code' : 'Inspector ID'}
            </label>
            <input
              type="text"
              required
              placeholder={role === 'teacher' ? 'e.g., SCH-101' : 'e.g., INS-802'}
              value={schoolId}
              onChange={(e) => setSchoolId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {loginError && (
            <div className="bg-rose-50 text-rose-700 text-xs border border-rose-200 rounded-lg px-3 py-2">
              {loginError}
            </div>
          )}

          <button
            type="submit"
            className={`w-full py-2.5 rounded-lg text-white font-semibold text-sm transition ${
              role === 'teacher' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            Login to Portal
          </button>
        </form>
      </div>
    </div>
  );
}