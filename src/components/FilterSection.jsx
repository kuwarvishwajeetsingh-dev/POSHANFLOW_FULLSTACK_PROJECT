import { useState } from 'react';
import { Filter, RotateCcw } from 'lucide-react';

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
    <div className="bg-slate-50/70 border border-slate-200 rounded-lg p-3 mb-4">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 text-slate-700 font-semibold text-xs hover:text-slate-900 transition"
        >
          <Filter size={15} />
          {showFilters ? 'Hide Filters' : 'Filter Records'}
        </button>

        {showFilters && (
          <button
            type="button"
            onClick={resetFilters}
            className="text-[11px] text-slate-500 hover:text-slate-700 flex items-center gap-1 transition"
          >
            <RotateCcw size={12} /> Clear all
          </button>
        )}
      </div>

      {showFilters && (
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-slate-200">
          {filterType === 'alerts' && (
            <>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Alert Type</label>
                <select
                  value={filters.alertType}
                  onChange={(e) => handleFilterChange('alertType', e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md text-xs bg-white focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">All Types</option>
                  <option value="low_stock">Low Stock</option>
                  <option value="attendance_anomaly">Attendance Anomaly</option>
                  <option value="purchase_order">Purchase Order</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Severity</label>
                <select
                  value={filters.severity}
                  onChange={(e) => handleFilterChange('severity', e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md text-xs bg-white focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">All Severities</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </>
          )}

          {filterType === 'orders' && (
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Order Status</label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md text-xs bg-white focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="dispatched">Dispatched</option>
                <option value="delivered">Delivered</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Start Date</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md text-xs bg-white focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">End Date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md text-xs bg-white focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>
      )}
    </div>
  );
}
