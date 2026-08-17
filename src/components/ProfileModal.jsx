import React, { useState } from 'react';
import { X, Save, Lock } from 'lucide-react';
import { apiService } from '../services/api';

export default function ProfileModal({ isOpen, onClose, user }) {
  const [fullName, setFullName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleUpdateProfile = async () => {
    setLoading(true);
    setMessage('');

    try {
      const result = await apiService.updateUserProfile(user.id, {
        full_name: fullName,
      });

      if (result.success) {
        await apiService.createAuditLog(user.id, user.schoolId, 'profile_update', {
          fullName,
        });
        setMessage('Profile updated successfully!');
        setTimeout(() => onClose(), 1500);
      } else {
        setMessage('Failed to update profile');
      }
    } catch (error) {
      setMessage('Error: ' + error?.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      setMessage('Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setMessage('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const result = await apiService.updateUserPassword(newPassword);

      if (result.success) {
        await apiService.createAuditLog(user.id, user.schoolId, 'password_change', {});
        setMessage('Password changed successfully!');
        setNewPassword('');
        setConfirmPassword('');
        setShowPasswordChange(false);
        setTimeout(() => onClose(), 1500);
      } else {
        setMessage('Failed to change password');
      }
    } catch (error) {
      setMessage('Error: ' + error?.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-lg text-slate-800">User Profile</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        {!showPasswordChange ? (
          <>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  disabled
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-500"
                />
                <p className="text-xs text-slate-500 mt-1">Email cannot be changed</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Role</label>
                <input
                  type="text"
                  value={user?.role || ''}
                  disabled
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-500 capitalize"
                />
              </div>
            </div>

            {message && (
              <div
                className={`mt-4 p-3 rounded-lg text-sm ${
                  message.includes('successfully')
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                {message}
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleUpdateProfile}
                disabled={loading}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white py-2 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition"
              >
                <Save size={16} /> Save
              </button>
              <button
                onClick={() => setShowPasswordChange(true)}
                className="flex-1 bg-slate-600 hover:bg-slate-700 text-white py-2 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition"
              >
                <Lock size={16} /> Change Password
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  placeholder="Min 6 characters"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {message && (
              <div
                className={`mt-4 p-3 rounded-lg text-sm ${
                  message.includes('successfully')
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                {message}
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleChangePassword}
                disabled={loading}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white py-2 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition"
              >
                <Lock size={16} /> Update Password
              </button>
              <button
                onClick={() => {
                  setShowPasswordChange(false);
                  setMessage('');
                }}
                className="flex-1 bg-slate-300 hover:bg-slate-400 text-slate-800 py-2 rounded-lg font-semibold text-sm transition"
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
