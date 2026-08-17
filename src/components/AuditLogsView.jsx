import React, { useState, useEffect } from 'react';
import { X, RefreshCw } from 'lucide-react';
import { apiService } from '../services/api';

export default function AuditLogsView({ isOpen, onClose, user }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && user?.schoolId) {
      loadAuditLogs();
    }
  }, [isOpen, user?.schoolId]);

  const loadAuditLogs = async () => {
    setLoading(true);
    const auditLogs = await apiService.getAuditLogs(user.schoolId, 100);
    setLogs(auditLogs);
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-2xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-lg text-slate-800">Audit Logs</h3>
          <div className="flex gap-2">
            <button
              onClick={loadAuditLogs}
              disabled={loading}
              className="text-slate-600 hover:text-slate-800"
            >
              <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <X size={20} />
            </button>
          </div>
        </div>

        {logs.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            {loading ? 'Loading logs...' : 'No audit logs found'}
          </div>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => (
              <div key={log.id} className="border border-slate-200 p-4 rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-sm text-slate-800 capitalize">{log.action.replace('_', ' ')}</p>
                    <p className="text-xs text-slate-600 mt-1">
                      {new Date(log.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                {log.details && (
                  <div className="mt-2 text-xs text-slate-600 bg-slate-50 p-2 rounded">
                    <code>{JSON.stringify(log.details, null, 2)}</code>
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
