import React, { useState, useEffect } from 'react';
import { X, Save, Lock, User, Check } from 'lucide-react';
import { apiService } from '../services/api';

export default function ProfileModal({ isOpen, onClose, user }) {
  const [fullName, setFullName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (user) {
      setFullName(user.name || '');
      setEmail(user.email || '');
    }
  }, [user, isOpen]);

  const handleUpdateProfile = async () => {
    if (!fullName.trim()) {
      setMessage('Name cannot be empty.');
      setIsSuccess(false);
      return;
    }

    setLoading(true);
    setMessage('');
    setIsSuccess(false);

    try {
      const result = await apiService.updateUserProfile(user.id, {
        full_name: fullName.trim(),
      });

      if (result.success) {
        await apiService.createAuditLog(user.id, user.schoolId, 'profile_update', {
          fullName: fullName.trim(),
        });
        setIsSuccess(true);
        setMessage('Profile updated successfully!');
        setTimeout(() => onClose(), 1200);
      } else {
        setIsSuccess(false);
        setMessage(result.error || 'Failed to update profile.');
      }
    } catch (error) {
      setIsSuccess(false);
      setMessage('Error: ' + error?.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      setMessage('Passwords do not match.');
      setIsSuccess(false);
      return;
    }

    if (newPassword.length < 6) {
      setMessage('Password must be at least 6 characters.');
      setIsSuccess(false);
      return;
    }

    setLoading(true);
    setMessage('');
    setIsSuccess(false);

    try {
      const result = await apiService.updateUserPassword(newPassword);

      if (result.success) {
        await apiService.createAuditLog(user.id, user.schoolId, 'password_change', {});
        setIsSuccess(true);
        setMessage('Password changed successfully!');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => {
          setShowPasswordChange(false);
          onClose();
        }, 1200);
      } else {
        setIsSuccess(false);
        setMessage(result.error || 'Failed to change password.');
      }
    } catch (error) {
      setIsSuccess(false);
      setMessage('Error: ' + error?.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto relative">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <User size={20} />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-800">User Profile</h3>
              <p className="text-xs text-slate-500">Account details & authentication</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        {!showPasswordChange ? (
          <>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  disabled
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-500 text-sm"
                />
                <p className="text-[11px] text-slate-400 mt-1">Managed via Supabase Auth</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Assigned Role</label>
                <input
                  type="text"
                  value={user?.role || ''}
                  disabled
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-700 font-semibold text-sm capitalize"
                />
              </div>

              {user?.schoolName && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Primary School</label>
                  <p className="text-sm font-semibold text-slate-800 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    {user.schoolName} {user.schoolCode && `(${user.schoolCode})`}
                  </p>
                </div>
              )}
            </div>

            {message && (
              <div
                className={`mt-4 p-3 rounded-lg text-xs flex items-center gap-2 ${
                  isSuccess
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border border-rose-200 text-rose-800'
                }`}
              >
                {isSuccess && <Check size={16} />}
                {message}
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleUpdateProfile}
                disabled={loading}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white py-2 rounded-lg font-semibold text-xs flex items-center justify-center gap-1.5 transition"
              >
                <Save size={15} /> Save Changes
              </button>
              <button
                onClick={() => setShowPasswordChange(true)}
                className="flex-1 bg-slate-700 hover:bg-slate-800 text-white py-2 rounded-lg font-semibold text-xs flex items-center justify-center gap-1.5 transition"
              >
                <Lock size={15} /> Change Password
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  placeholder="Minimum 6 characters"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  placeholder="Re-enter password"
                />
              </div>
            </div>

            {message && (
              <div
                className={`mt-4 p-3 rounded-lg text-xs flex items-center gap-2 ${
                  isSuccess
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border border-rose-200 text-rose-800'
                }`}
              >
                {isSuccess && <Check size={16} />}
                {message}
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleChangePassword}
                disabled={loading}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white py-2 rounded-lg font-semibold text-xs flex items-center justify-center gap-1.5 transition"
              >
                <Lock size={15} /> Update Password
              </button>
              <button
                onClick={() => {
                  setShowPasswordChange(false);
                  setMessage('');
                }}
                className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 py-2 rounded-lg font-semibold text-xs transition"
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
