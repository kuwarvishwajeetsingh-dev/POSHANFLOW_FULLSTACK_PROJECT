import React, { useState } from 'react';

export default function Login({ onLogin }) {
  const [role, setRole] = useState('teacher');
  const [schoolId, setSchoolId] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin({
      role,
      schoolId: schoolId || 'SCH-101',
      name: role === 'teacher' ? 'GPS Primary School' : 'District Education Officer',
    });
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
            <label className="block text-xs font-semibold text-slate-600 mb-1">Password</label>
            <input
              type="password"
              required
              defaultValue="123456"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
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