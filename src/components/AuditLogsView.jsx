import React, { useState, useEffect } from 'react';
import { X, RefreshCw, BookText } from 'lucide-react';
import { apiService } from '../services/api';

export default function AuditLogsView({ isOpen, onClose, user }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadAuditLogs();
    }
  }, [isOpen, user?.schoolId]);

  const loadAuditLogs = async () => {
    setLoading(true);
    try {
      const auditLogs = await apiService.getAuditLogs(user?.schoolId || null, 100);
      setLogs(auditLogs || []);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-2xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto relative">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-slate-100 text-slate-700 rounded-lg">
              <BookText size={20} />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-800">System Audit Logs</h3>
              <p className="text-xs text-slate-500">Real-time database activity & modification records</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadAuditLogs}
              disabled={loading}
              title="Refresh Logs"
              className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition">
              <X size={20} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400">Loading audit records from database...</div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12 text-slate-400 border border-dashed border-slate-200 rounded-xl">
            <BookText size={32} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm font-semibold text-slate-600">No audit logs recorded yet</p>
            <p className="text-xs text-slate-400 mt-1">Actions performed across the system will be logged here automatically.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => (
              <div key={log.id} className="border border-slate-200 p-3.5 rounded-lg bg-slate-50/50 hover:bg-slate-50 transition">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-xs text-slate-800 uppercase tracking-wide">
                      {log.action?.replace(/_/g, ' ')}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {new Date(log.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                    </p>
                  </div>
                  <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-mono">
                    {log.id.slice(0, 8)}
                  </span>
                </div>
                {log.details && (
                  <div className="mt-2 text-xs text-slate-600 bg-white p-2.5 rounded border border-slate-200/80 font-mono">
                    <pre className="whitespace-pre-wrap break-all text-[11px]">
                      {typeof log.details === 'object' ? JSON.stringify(log.details, null, 2) : String(log.details)}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
