import React, { useState } from 'react';
import { Filter, X } from 'lucide-react';

export default function FilterSection({ onFilterChange, filterType = 'alerts' }) {
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    alertType: '',
    severity: '',
    status: '',
    isResolved: '',
    startDate: '',
    endDate: '',
  });

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const resetFilters = () => {
    const emptyFilters = {
      alertType: '',
      severity: '',
      status: '',
      isResolved: '',
      startDate: '',
      endDate: '',
    };
    setFilters(emptyFilters);
    onFilterChange(emptyFilters);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 mb-4">
      <button
        onClick={() => setShowFilters(!showFilters)}
        className="flex items-center gap-2 text-slate-700 font-semibold text-sm hover:text-slate-900"
      >
        <Filter size={18} />
        {showFilters ? 'Hide Filters' : 'Show Filters'}
      </button>

      {showFilters && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filterType === 'alerts' && (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Alert Type</label>
                <select
                  value={filters.alertType}
                  onChange={(e) => handleFilterChange('alertType', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">All Types</option>
                  <option value="low_stock">Low Stock</option>
                  <option value="attendance_anomaly">Attendance Anomaly</option>
                  <option value="purchase_order">Purchase Order</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Severity</label>
                <select
                  value={filters.severity}
                  onChange={(e) => handleFilterChange('severity', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">All Levels</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Status</label>
                <select
                  value={filters.isResolved}
                  onChange={(e) => handleFilterChange('isResolved', e.target.value === 'true' ? true : e.target.value === 'false' ? false : '')}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">All</option>
                  <option value="false">Unresolved</option>
                  <option value="true">Resolved</option>
                </select>
              </div>
            </>
          )}

          {filterType === 'orders' && (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Order Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">All Statuses</option>
                  <option value="draft">Draft</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="dispatched">Dispatched</option>
                  <option value="delivered">Delivered</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Start Date</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">End Date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={resetFilters}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-700 font-semibold text-sm hover:bg-slate-50 flex items-center justify-center gap-2"
            >
              <X size={16} /> Reset
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
