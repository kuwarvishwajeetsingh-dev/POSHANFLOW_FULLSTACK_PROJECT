import React, { useState, useEffect } from 'react';
import { X, Save, Check } from 'lucide-react';
import { apiService } from '../services/api';

export default function StockUpdateModal({ isOpen, onClose, user, onStockUpdated }) {
  const [stock, setStock] = useState({ rice: 0, pulses: 0, oil: 0 });
  const [reorderLevels, setReorderLevels] = useState({ rice: 10, pulses: 5, oil: 2 });
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (isOpen && user?.schoolId) {
      loadStockData();
    }
  }, [isOpen, user?.schoolId]);

  const loadStockData = async () => {
    setFetching(true);
    try {
      const stockData = await apiService.getStockBySchool(user.schoolId);
      const newStock = { rice: 0, pulses: 0, oil: 0 };
      const newReorder = { rice: 10, pulses: 5, oil: 2 };

      if (stockData && stockData.length > 0) {
        stockData.forEach((item) => {
          const key = item.item_name?.toLowerCase();
          if (key in newStock) {
            newStock[key] = Number(item.quantity_kg || 0);
            newReorder[key] = Number(item.reorder_level || 10);
          }
        });
      }

      setStock(newStock);
      setReorderLevels(newReorder);
    } catch (err) {
      console.warn('Failed to load initial stock:', err);
    } finally {
      setFetching(false);
    }
  };

  const handleSaveStock = async () => {
    if (!user?.schoolId) {
      setMessage('Please select a school first.');
      setIsSuccess(false);
      return;
    }

    setLoading(true);
    setMessage('');
    setIsSuccess(false);

    try {
      for (const itemName of ['rice', 'pulses', 'oil']) {
        const updateRes = await apiService.updateInventoryStock(
          user.schoolId,
          itemName,
          stock[itemName],
          reorderLevels[itemName]
        );

        if (!updateRes.success && !updateRes.queued) {
          throw new Error(updateRes.error || `Failed to update ${itemName} stock.`);
        }

        await apiService.createAuditLog(
          user.id,
          user.schoolId,
          'stock_update',
          { item: itemName, quantity: stock[itemName], reorderLevel: reorderLevels[itemName] }
        );
      }

      setIsSuccess(true);
      setMessage('Inventory stock updated successfully!');
      onStockUpdated?.();

      setTimeout(() => {
        onClose();
        setMessage('');
      }, 1200);
    } catch (error) {
      setIsSuccess(false);
      setMessage('Failed to update stock: ' + error?.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto relative">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="font-bold text-lg text-slate-800">Update Stock Levels</h3>
            <p className="text-xs text-slate-500">Record current available physical stock (kg)</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        {fetching ? (
          <div className="py-8 text-center text-xs text-slate-400">Loading current stock...</div>
        ) : (
          <div className="space-y-4">
            {['rice', 'pulses', 'oil'].map((item) => (
              <div key={item} className="border border-slate-200 p-4 rounded-lg bg-slate-50/50">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-xs font-bold text-slate-700 capitalize">
                    {item} In Stock (kg)
                  </label>
                  <span className="text-[10px] text-slate-400">Unit: Kilograms</span>
                </div>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={stock[item]}
                  onChange={(e) => setStock({ ...stock, [item]: Math.max(0, Number(e.target.value) || 0) })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg mb-3 focus:ring-2 focus:ring-emerald-500 bg-white text-sm font-semibold text-slate-800"
                  placeholder="0"
                />

                <label className="block text-[11px] font-bold text-slate-500 mb-1">Low Stock Warning Threshold (kg)</label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={reorderLevels[item]}
                  onChange={(e) => setReorderLevels({ ...reorderLevels, [item]: Math.max(0, Number(e.target.value) || 0) })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white text-xs text-slate-700"
                  placeholder="0"
                />
              </div>
            ))}
          </div>
        )}

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

        <button
          onClick={handleSaveStock}
          disabled={loading || fetching}
          className="w-full mt-6 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white py-2.5 rounded-lg font-semibold text-xs flex items-center justify-center gap-2 transition shadow-sm"
        >
          <Save size={16} /> {loading ? 'Saving to Database...' : 'Save Stock to Database'}
        </button>
      </div>
    </div>
  );
}
