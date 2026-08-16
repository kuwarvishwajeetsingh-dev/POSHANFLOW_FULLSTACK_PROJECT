import React, { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { AlertTriangle, LogOut, ShoppingCart, CheckCircle, X, Calendar, Clock } from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function Dashboard({ user, onLogout }) {
  // 1. Attendance State
  const [students, setStudents] = useState(() => {
    return localStorage.getItem('daily_attendance') || 120;
  });
  
  // 2. Weekly Logs
  const [attendanceLog, setAttendanceLog] = useState(() => {
    const saved = localStorage.getItem('attendance_log');
    return saved ? JSON.parse(saved) : [
      { day: 'Mon', count: 115 }, { day: 'Tue', count: 118 }, { day: 'Wed', count: 120 },
      { day: 'Thu', count: 112 }, { day: 'Fri', count: 119 }, { day: 'Sat', count: 121 }, { day: 'Sun', count: 120 }
    ];
  });

  // 3. Orders State (History Table ke liye wapas add kiya)
  const [orders, setOrders] = useState(() => {
    const savedOrders = localStorage.getItem('poshan_orders');
    return savedOrders ? JSON.parse(savedOrders) : [
      { id: 'PO-9508', date: '16/08/2026', items: 'Rice: 100kg, Pulses: 20kg, Oil: 5kg', status: 'Pending Dispatch' },
      { id: 'PO-8842', date: '12/08/2026', items: 'Rice: 100kg, Pulses: 20kg', status: 'Delivered' }
    ];
  });

  const [showPOModal, setShowPOModal] = useState(false);
  const [orderSent, setOrderSent] = useState(false);

  // Stock Calculations
  const riceReq = (students * 0.1).toFixed(1);
  const pulseReq = (students * 0.02).toFixed(1);
  const oilReq = (students * 0.005).toFixed(2);

  const stock = { rice: 18, pulse: 3.5, oil: 0.9 };
  const daysLeft = Math.min(
    Math.floor(stock.rice / (riceReq || 1)),
    Math.floor(stock.pulse / (pulseReq || 1))
  );

  const chartData = {
    labels: ['School A', 'School B', 'School C', 'School D', 'School E'],
    datasets: [
      {
        label: 'Reported Attendance',
        data: [120, 190, 85, 220, 140],
        backgroundColor: 'rgba(99, 102, 241, 0.7)',
      },
      {
        label: 'Daily Ration Consumed (kg)',
        data: [15, 23, 5, 28, 18],
        backgroundColor: 'rgba(16, 185, 129, 0.7)',
      },
    ],
  };

  const handleAttendanceChange = (val) => {
    setStudents(val);
    localStorage.setItem('daily_attendance', val);
  };

  // 4. Modal Fix & Saving Order to Table
  const handleSendOrder = () => {
    setOrderSent(true);
    
    // Naya order create kiya
    const newOrder = {
      id: `PO-${Math.floor(1000 + Math.random() * 9000)}`,
      date: new Date().toLocaleDateString('en-GB'),
      items: 'Rice: 100kg, Pulses: 20kg, Oil: 5kg',
      status: 'Offline Saved'
    };

    setTimeout(() => {
      // Table aur LocalStorage mein order add kiya
      const updatedOrders = [newOrder, ...orders];
      setOrders(updatedOrders);
      localStorage.setItem('poshan_orders', JSON.stringify(updatedOrders));
      
      setOrderSent(false);
      setShowPOModal(false);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-800">POSHANFLOW</h1>
          <p className="text-xs text-slate-500">{user.name} | <span className="uppercase font-bold text-emerald-600">{user.role}</span></p>
        </div>
        <button onClick={onLogout} className="flex items-center gap-1.5 text-xs text-rose-600 font-semibold border border-rose-200 px-3 py-1.5 rounded-lg hover:bg-rose-50">
          <LogOut size={14} /> Logout
        </button>
      </header>

      <main className="p-6 max-w-6xl mx-auto space-y-6">
        {user.role === 'teacher' ? (
          <>
            {/* Attendance Section */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h2 className="text-base font-bold mb-4">Daily Attendance Entry (Offline Enabled)</h2>
              <div className="flex items-center gap-4">
                <input
                  type="number"
                  value={students}
                  onChange={(e) => handleAttendanceChange(e.target.value)}
                  className="px-4 py-2 border rounded-lg w-32 font-bold text-slate-800 text-lg border-slate-300"
                />
                <span className="text-sm text-slate-600">Students present today</span>
              </div>
            </div>

            {/* Weekly Log Section */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="text-slate-500" size={18} />
                <h2 className="text-base font-bold text-slate-800">Last 7 Days Attendance Log</h2>
              </div>
              <div className="grid grid-cols-7 gap-2">
                {attendanceLog.map((item, index) => (
                  <div key={index} className="bg-slate-50 border border-slate-200 p-3 rounded-lg text-center">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">{item.day}</p>
                    <p className="text-lg font-bold text-emerald-600">{item.count}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Low Stock Warning */}
            {daysLeft < 3 && (
              <div className="bg-amber-50 border border-amber-300 p-4 rounded-xl flex items-center justify-between text-amber-900 shadow-sm">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="text-amber-600 shrink-0" />
                  <div>
                    <p className="font-bold text-sm">Low Stock Warning!</p>
                    <p className="text-xs text-amber-700">Estimated ration reserve is under 3 days (~{daysLeft} days remaining).</p>
                  </div>
                </div>
                <button onClick={() => setShowPOModal(true)} className="bg-amber-600 text-white text-xs px-3 py-2 rounded-lg font-semibold flex items-center gap-1 cursor-pointer hover:bg-amber-700">
                  <ShoppingCart size={14} /> Generate Purchase Order
                </button>
              </div>
            )}

            {/* Required Vs Available Stock */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-xs font-bold text-slate-400 mb-1">RICE REQUIRED</p>
                <p className="text-3xl font-extrabold text-slate-800">{riceReq} <span className="text-sm font-normal">kg</span></p>
                <p className="text-xs text-slate-500 mt-2">Available: <span className="font-semibold text-slate-700">{stock.rice} kg</span></p>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-xs font-bold text-slate-400 mb-1">PULSES REQUIRED</p>
                <p className="text-3xl font-extrabold text-slate-800">{pulseReq} <span className="text-sm font-normal">kg</span></p>
                <p className="text-xs text-slate-500 mt-2">Available: <span className="font-semibold text-slate-700">{stock.pulse} kg</span></p>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-xs font-bold text-slate-400 mb-1">OIL REQUIRED</p>
                <p className="text-3xl font-extrabold text-slate-800">{oilReq} <span className="text-sm font-normal">kg</span></p>
                <p className="text-xs text-slate-500 mt-2">Available: <span className="font-semibold text-slate-700">{stock.oil} kg</span></p>
              </div>
            </div>

            {/* Order History Table (Wapas Add Kar Diya!) */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mt-6">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="text-slate-500" size={18} />
                <h2 className="text-base font-bold text-slate-800">Purchase Order History (Offline Supported)</h2>
              </div>
              
              <table className="w-full text-xs text-left border border-slate-200 rounded-lg overflow-hidden">
                <thead className="bg-slate-100 text-slate-600">
                  <tr>
                    <th className="p-3 border-b">Order ID</th>
                    <th className="p-3 border-b">Date</th>
                    <th className="p-3 border-b">Items Included</th>
                    <th className="p-3 border-b">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-slate-50">
                      <td className="p-3 border-b font-bold text-slate-700">{ord.id}</td>
                      <td className="p-3 border-b text-slate-500">{ord.date}</td>
                      <td className="p-3 border-b font-medium text-slate-600">{ord.items}</td>
                      <td className="p-3 border-b">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          ord.status === 'Delivered' 
                            ? 'bg-emerald-100 text-emerald-700' 
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {ord.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-xs text-slate-500 font-semibold">ACTIVE SCHOOLS</p>
                <p className="text-3xl font-bold text-slate-800">124</p>
              </div>
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-xs text-slate-500 font-semibold">LOW STOCK ALERTS</p>
                <p className="text-3xl font-bold text-amber-600">8 Schools</p>
              </div>
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-xs text-slate-500 font-semibold">DISCREPANCY ALERTS</p>
                <p className="text-3xl font-bold text-rose-600">2 Schools</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h2 className="text-sm font-bold text-slate-800 mb-4">District Inventory vs Consumption Graph</h2>
              <Bar data={chartData} />
            </div>
          </div>
        )}
      </main>

      {/* PO Modal with Stuck Fix */}
      {showPOModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-2xl relative">
            <button 
              onClick={() => setShowPOModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X size={18} />
            </button>

            {orderSent ? (
              <div className="text-center py-4">
                <CheckCircle className="mx-auto text-emerald-500 mb-2 animate-bounce" size={40} />
                <h3 className="font-bold text-slate-800">Order Request Logged!</h3>
                <p className="text-xs text-slate-500 mt-2">Closing automatically...</p>
              </div>
            ) : (
              <>
                <h3 className="font-bold mb-4 text-slate-800">Confirm Purchase Order</h3>
                <p className="text-xs text-slate-500 mb-4">Order for 100kg Rice & 20kg Pulses will be queued.</p>
                <button onClick={handleSendOrder} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-lg font-semibold text-xs transition-colors">
                  Confirm & Send
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}