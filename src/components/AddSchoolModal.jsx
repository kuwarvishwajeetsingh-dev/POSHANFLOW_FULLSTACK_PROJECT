import React, { useState } from 'react';
import { X, School, Plus, Check } from 'lucide-react';
import { apiService } from '../services/api';

export default function AddSchoolModal({ isOpen, onClose, onSchoolAdded }) {
  const [schoolName, setSchoolName] = useState('');
  const [schoolCode, setSchoolCode] = useState('');
  const [district, setDistrict] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await apiService.addSchool({
        school_name: schoolName,
        school_code: schoolCode,
        district: district,
      });

      if (res.success) {
        setSuccess(`School "${res.school.school_name}" added successfully!`);
        setTimeout(() => {
          onSchoolAdded?.(res.school);
          onClose();
          setSchoolName('');
          setSchoolCode('');
          setDistrict('');
          setSuccess('');
        }, 1200);
      } else {
        setError(res.message || 'Failed to add school.');
      }
    } catch (err) {
      setError(err.message || 'Error occurred while saving school.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
            <School size={22} />
          </div>
          <div>
            <h3 className="font-bold text-lg text-slate-800">Register New School</h3>
            <p className="text-xs text-slate-500">Add an institution to the district database</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">School Name</label>
            <input
              type="text"
              required
              placeholder="e.g., Dugalpur Primary School"
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">School Code / UDISE</label>
            <input
              type="text"
              required
              placeholder="e.g., SCH-DUG-01"
              value={schoolCode}
              onChange={(e) => setSchoolCode(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">District / Zone</label>
            <input
              type="text"
              required
              placeholder="e.g., Central District"
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          {error && (
            <div className="bg-rose-50 text-rose-700 text-xs border border-rose-200 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-emerald-50 text-emerald-700 text-xs border border-emerald-200 rounded-lg px-3 py-2 flex items-center gap-2">
              <Check size={16} /> {success}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 text-xs font-semibold text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 rounded-lg transition flex items-center justify-center gap-1.5 shadow-sm"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <Plus size={16} /> Save School
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
