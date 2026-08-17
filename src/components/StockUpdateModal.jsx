import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { apiService } from '../services/api';

export default function StockUpdateModal({ isOpen, onClose, user, onStockUpdated }) {
  const [stock, setStock] = useState({ rice: 0, pulses: 0, oil: 0 });
  const [reorderLevels, setReorderLevels] = useState({ rice: 10, pulses: 5, oil: 2 });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (isOpen && user?.schoolId) {
      loadStockData();
    }
  }, [isOpen, user?.schoolId]);

  const loadStockData = async () => {
    const stockData = await apiService.getStockBySchool(user.schoolId);
    if (stockData && stockData.length > 0) {
      const newStock = { rice: 0, pulses: 0, oil: 0 };
      const newReorder = { rice: 10, pulses: 5, oil: 2 };

      stockData.forEach((item) => {
        newStock[item.item_name] = Number(item.quantity_kg || 0);
        newReorder[item.item_name] = Number(item.reorder_level || 10);
      });

      setStock(newStock);
      setReorderLevels(newReorder);
    }
  };

  const handleSaveStock = async () => {
    setLoading(true);
    setMessage('');

    try {
      for (const itemName of ['rice', 'pulses', 'oil']) {
        await apiService.updateInventoryStock(
          user.schoolId,
          itemName,
          stock[itemName],
          reorderLevels[itemName]
        );

        await apiService.createAuditLog(
          user.id,
          user.schoolId,
          'stock_update',
          { item: itemName, quantity: stock[itemName], reorderLevel: reorderLevels[itemName] }
        );
      }

      setMessage('Stock updated successfully!');
      onStockUpdated?.();

      setTimeout(() => {
        onClose();
        setMessage('');
      }, 1500);
    } catch (error) {
      setMessage('Failed to update stock: ' + error?.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-lg text-slate-800">Update Stock Levels</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          {['rice', 'pulses', 'oil'].map((item) => (
            <div key={item} className="border border-slate-200 p-4 rounded-lg">
              <label className="block text-sm font-bold text-slate-700 mb-2 capitalize">
                {item} Quantity (kg)
              </label>
              <input
                type="number"
                value={stock[item]}
                onChange={(e) => setStock({ ...stock, [item]: Number(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg mb-3 focus:ring-2 focus:ring-emerald-500"
                placeholder="0"
              />

              <label className="block text-xs font-bold text-slate-600 mb-2">Reorder Level (kg)</label>
              <input
                type="number"
                value={reorderLevels[item]}
                onChange={(e) => setReorderLevels({ ...reorderLevels, [item]: Number(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                placeholder="0"
              />
            </div>
          ))}
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

        <button
          onClick={handleSaveStock}
          disabled={loading}
          className="w-full mt-6 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white py-2 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition"
        >
          <Save size={16} /> {loading ? 'Saving...' : 'Save Stock'}
        </button>
      </div>
    </div>
  );
}
