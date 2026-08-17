import React, { useEffect, useMemo, useState } from 'react';
import { Bar, Line, Pie, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, ArcElement, PointElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { AlertTriangle, BookText, Calendar, CheckCircle, Clock, Download, LogOut, Settings, ShoppingCart, X } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { apiService } from '../services/api';
import { calculateRequirements } from '../utils/calculations';
import StockUpdateModal from './StockUpdateModal';
import ProfileModal from './ProfileModal';
import AuditLogsView from './AuditLogsView';
import FilterSection from './FilterSection';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend, Filler);

const fallbackAttendanceLog = [
  { day: 'Mon', count: 115 },
  { day: 'Tue', count: 118 },
  { day: 'Wed', count: 120 },
  { day: 'Thu', count: 112 },
  { day: 'Fri', count: 119 },
  { day: 'Sat', count: 121 },
  { day: 'Sun', count: 120 },
];

const fallbackOrders = [
  { id: 'PO-9508', date: '16/08/2026', items: 'Rice: 100kg, Pulses: 20kg, Oil: 5kg', status: 'Pending Dispatch' },
  { id: 'PO-8842', date: '12/08/2026', items: 'Rice: 100kg, Pulses: 20kg', status: 'Delivered' },
];

export default function Dashboard({ user, onLogout }) {
  const isSchoolOperator = ['teacher', 'headmaster'].includes(user.role);
  const canViewAuditLogs = user.role === 'admin';

  const [students, setStudents] = useState(() => Number(localStorage.getItem('daily_attendance')) || 120);
  const [attendanceLog, setAttendanceLog] = useState(() => {
    const saved = localStorage.getItem('attendance_log');
    return saved ? JSON.parse(saved) : fallbackAttendanceLog;
  });
  const [orders, setOrders] = useState(() => {
    const savedOrders = localStorage.getItem('poshan_orders');
    return savedOrders ? JSON.parse(savedOrders) : fallbackOrders;
  });
  const [filteredAlerts, setFilteredAlerts] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [showPOModal, setShowPOModal] = useState(false);
  const [orderSent, setOrderSent] = useState(false);
  const [stock, setStock] = useState({ rice: 18, pulses: 3.5, oil: 0.9 });
  const [alerts, setAlerts] = useState([]);
  const [inspectorData, setInspectorData] = useState({ activeSchools: 0, lowStockAlerts: 0, discrepancyAlerts: 0 });
  const [loadingInspector, setLoadingInspector] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showAuditLogs, setShowAuditLogs] = useState(false);
  const [isOnline, setIsOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  const [syncMessage, setSyncMessage] = useState('');
  const [schools, setSchools] = useState([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState(user.schoolId || '');

  const activeSchoolId = selectedSchoolId || user.schoolId;

  const requirements = useMemo(() => calculateRequirements(students), [students]);
  const riceReq = requirements.rice.toFixed(1);
  const pulseReq = requirements.pulse.toFixed(1);
  const oilReq = requirements.oil.toFixed(2);
  const daysLeft = Math.min(
    Math.floor((stock.rice || 0) / (Number(riceReq) || 1)),
    Math.floor((stock.pulses || 0) / (Number(pulseReq) || 1))
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

  const stockDistributionChart = {
    labels: ['Rice', 'Pulses', 'Oil'],
    datasets: [
      {
        data: [stock.rice || 18, stock.pulses || 3.5, stock.oil || 0.9],
        backgroundColor: ['rgba(255, 193, 7, 0.8)', 'rgba(233, 30, 99, 0.8)', 'rgba(76, 175, 80, 0.8)'],
        borderColor: ['rgb(255, 193, 7)', 'rgb(233, 30, 99)', 'rgb(76, 175, 80)'],
        borderWidth: 2,
      },
    ],
  };

  const attendanceTrendChart = {
    labels: attendanceLog.slice(-30).map((item, idx) => `Day ${idx + 1}`),
    datasets: [
      {
        label: 'Students Present',
        data: attendanceLog.slice(-30).map((item) => item.count),
        borderColor: 'rgba(99, 102, 241, 1)',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: 'rgba(99, 102, 241, 1)',
      },
    ],
  };

  const orderStatusChart = {
    labels: ['Pending', 'Approved', 'Dispatched', 'Delivered'],
    datasets: [
      {
        data: [
          orders.filter((o) => o.status === 'Pending Dispatch').length,
          orders.filter((o) => o.status === 'Approved').length,
          orders.filter((o) => o.status === 'Dispatched').length,
          orders.filter((o) => o.status === 'Delivered').length,
        ],
        backgroundColor: [
          'rgba(255, 152, 0, 0.8)',
          'rgba(33, 150, 243, 0.8)',
          'rgba(244, 67, 54, 0.8)',
          'rgba(76, 175, 80, 0.8)',
        ],
        borderColor: ['rgb(255, 152, 0)', 'rgb(33, 150, 243)', 'rgb(244, 67, 54)', 'rgb(76, 175, 80)'],
        borderWidth: 2,
      },
    ],
  };

  const consumptionPatternChart = {
    labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
    datasets: [
      {
        label: 'Rice Consumed (kg)',
        data: [8, 7.5, 8.2, 7.8],
        borderColor: 'rgb(255, 193, 7)',
        backgroundColor: 'rgba(255, 193, 7, 0.2)',
        borderWidth: 2,
      },
      {
        label: 'Pulses Consumed (kg)',
        data: [1.6, 1.5, 1.7, 1.6],
        borderColor: 'rgb(233, 30, 99)',
        backgroundColor: 'rgba(233, 30, 99, 0.2)',
        borderWidth: 2,
      },
      {
        label: 'Oil Consumed (ml)',
        data: [0.4, 0.38, 0.42, 0.4],
        borderColor: 'rgb(76, 175, 80)',
        backgroundColor: 'rgba(76, 175, 80, 0.2)',
        borderWidth: 2,
      },
    ],
  };

  useEffect(() => {
    setSelectedSchoolId(user.schoolId || '');
  }, [user.schoolId]);

  useEffect(() => {
    const loadSchools = async () => {
      const userSchools = await apiService.getSchoolsForUser(user.id, user.role);
      setSchools(userSchools);
      if (!selectedSchoolId && userSchools.length > 0) {
        setSelectedSchoolId(userSchools[0].id);
      }
    };

    if (['headmaster', 'inspector', 'admin'].includes(user.role)) {
      loadSchools();
    }
  }, [user.id, user.role, selectedSchoolId]);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const data = await apiService.getDashboardData(activeSchoolId, {
          role: user.role,
          accessibleSchoolIds: schools.map((s) => s.id),
        });

        if (data?.stock) {
          setStock(data.stock);
          localStorage.setItem('dashboard_stock', JSON.stringify(data.stock));
        }

        if (data?.history) {
          setOrders(data.history.length > 0 ? data.history : fallbackOrders);
          localStorage.setItem('poshan_orders', JSON.stringify(data.history));
        }
      } catch (error) {
        console.warn('Dashboard fallback mode enabled:', error);
      }
    };

    if (activeSchoolId) {
      loadDashboard();
    }
  }, [activeSchoolId, user.role, schools]);

  useEffect(() => {
    const loadAttendanceLogs = async () => {
      const logs = await apiService.getAttendanceLast7Days(activeSchoolId);

      if (logs && logs.length > 0) {
        const formattedLogs = logs.map((log) => ({
          day: new Date(log.attendance_date).toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 3),
          count: log.present_students,
          date: log.attendance_date,
        }));
        setAttendanceLog(formattedLogs);
        localStorage.setItem('attendance_log', JSON.stringify(formattedLogs));
      }
    };

    if (activeSchoolId && isSchoolOperator) {
      loadAttendanceLogs();
    }
  }, [activeSchoolId, isSchoolOperator]);

  useEffect(() => {
    const loadAlerts = async () => {
      const alertsList = await apiService.getAlerts(activeSchoolId);
      setAlerts(alertsList);
    };

    if (activeSchoolId && isSchoolOperator) {
      loadAlerts();
    }
  }, [activeSchoolId, isSchoolOperator]);

  useEffect(() => {
    const loadInspectorData = async () => {
      setLoadingInspector(true);
      const data = await apiService.getInspectorDashboard();
      setInspectorData({
        activeSchools: data.activeSchools || 0,
        lowStockAlerts: data.lowStockAlerts || 0,
        discrepancyAlerts: data.discrepancyAlerts || 0,
      });
      setLoadingInspector(false);
    };

    if (['inspector', 'admin'].includes(user.role)) {
      loadInspectorData();
    }
  }, [user.role]);

  useEffect(() => {
    if (!activeSchoolId) return undefined;

    const stockSub = apiService.subscribeToStock(activeSchoolId, () => {
      apiService.getDashboardData(activeSchoolId, { role: user.role }).then((data) => {
        if (data?.stock) setStock(data.stock);
      });
    });

    const orderSub = apiService.subscribeToPurchaseOrders(activeSchoolId, () => {
      apiService.getDashboardData(activeSchoolId, { role: user.role }).then((data) => {
        if (data?.history) setOrders(data.history);
      });
    });

    const alertSub = apiService.subscribeToAlerts(activeSchoolId, () => {
      apiService.getAlerts(activeSchoolId).then((list) => setAlerts(list));
    });

    return () => {
      apiService.unsubscribeFromChannel(stockSub);
      apiService.unsubscribeFromChannel(orderSub);
      apiService.unsubscribeFromChannel(alertSub);
    };
  }, [activeSchoolId, user.role]);

  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      const result = await apiService.syncOfflineQueue();
      if (result.synced > 0) {
        setSyncMessage(`${result.synced} offline changes synced.`);
        setTimeout(() => setSyncMessage(''), 2500);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setSyncMessage('You are offline. Changes will sync automatically.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleAttendanceChange = async (val) => {
    const numericValue = Number(val) || 0;
    setStudents(numericValue);
    localStorage.setItem('daily_attendance', String(numericValue));
    await apiService.saveAttendance(activeSchoolId, user.id, numericValue);
  };

  const handleFilterAlerts = async (filters) => {
    const filtered = await apiService.searchAlerts(activeSchoolId, filters);
    setFilteredAlerts(filtered);
  };

  const handleFilterOrders = async (filters) => {
    const filtered = await apiService.searchOrders(activeSchoolId, filters);
    setFilteredOrders(filtered);
  };

  const handleSendOrder = async () => {
    setOrderSent(true);

    const newOrder = {
      id: `PO-${Math.floor(1000 + Math.random() * 9000)}`,
      date: new Date().toLocaleDateString('en-GB'),
      items: 'Rice: 100kg, Pulses: 20kg, Oil: 5kg',
      status: 'Offline Saved',
    };

    try {
      const result = await apiService.createPurchaseOrder({
        schoolId: activeSchoolId,
        userId: user.id,
        items: [
          { item_name: 'rice', quantity_kg: 100 },
          { item_name: 'pulses', quantity_kg: 20 },
          { item_name: 'oil', quantity_kg: 5 },
        ],
      });

      const finalOrder = {
        ...newOrder,
        id: result?.orderId || newOrder.id,
        status: result?.queued ? 'Queued Offline' : result?.success ? 'Saved to Backend' : 'Offline Saved',
      };

      const updatedOrders = [finalOrder, ...orders];
      setOrders(updatedOrders);
      localStorage.setItem('poshan_orders', JSON.stringify(updatedOrders));

      await apiService.createAlert(
        activeSchoolId,
        'purchase_order',
        'medium',
        `Purchase order ${finalOrder.id} created for Rice, Pulses, and Oil`
      );
    } catch (error) {
      console.warn('Order fallback saved locally:', error);
      const updatedOrders = [newOrder, ...orders];
      setOrders(updatedOrders);
      localStorage.setItem('poshan_orders', JSON.stringify(updatedOrders));
    }

    setTimeout(() => {
      setOrderSent(false);
      setShowPOModal(false);
    }, 1200);
  };

  const exportOrdersToExcel = () => {
    const rows = (filteredOrders.length > 0 ? filteredOrders : orders).map((o) => ({
      order_id: o.id,
      date: o.date,
      items: o.items,
      status: o.status,
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Orders');
    XLSX.writeFile(wb, `poshan-orders-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const exportOrdersToPdf = () => {
    const rows = (filteredOrders.length > 0 ? filteredOrders : orders).map((o) => [o.id, o.date, o.items, o.status]);
    const doc = new jsPDF();
    doc.text('POSHANFLOW Purchase Orders', 14, 14);
    autoTable(doc, {
      startY: 20,
      head: [['Order ID', 'Date', 'Items', 'Status']],
      body: rows,
    });
    doc.save(`poshan-orders-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <header className="bg-white border-b border-slate-200 px-4 md:px-6 py-3 md:py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 shadow-sm">
        <div>
          <h1 className="text-lg md:text-xl font-bold text-slate-800">POSHANFLOW</h1>
          <p className="text-xs md:text-sm text-slate-500">
            {user.name} | <span className="uppercase font-bold text-emerald-600">{user.role}</span>
            {!isOnline && <span className="ml-2 text-rose-600">Offline mode</span>}
          </p>
          {syncMessage && <p className="text-xs text-indigo-600 mt-1">{syncMessage}</p>}
        </div>

        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <button
            onClick={() => setShowProfileModal(true)}
            className="text-xs md:text-sm text-slate-600 font-semibold border border-slate-200 px-2 md:px-3 py-1.5 rounded-lg hover:bg-slate-50 flex items-center gap-1"
          >
            <Settings size={14} /> Profile
          </button>
          {canViewAuditLogs && (
            <button
              onClick={() => setShowAuditLogs(true)}
              className="text-xs md:text-sm text-slate-600 font-semibold border border-slate-200 px-2 md:px-3 py-1.5 rounded-lg hover:bg-slate-50 flex items-center gap-1"
            >
              <BookText size={14} /> Logs
            </button>
          )}
          <button
            onClick={onLogout}
            className="text-xs md:text-sm text-rose-600 font-semibold border border-rose-200 px-2 md:px-3 py-1.5 rounded-lg hover:bg-rose-50 flex items-center gap-1"
          >
            <LogOut size={14} /> Logout
          </button>
        </div>
      </header>

      <main className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
        {schools.length > 1 && (
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <label className="block text-xs font-bold text-slate-600 mb-2">Select School</label>
            <select
              value={activeSchoolId}
              onChange={(e) => setSelectedSchoolId(e.target.value)}
              className="w-full md:w-96 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
            >
              {schools.map((school) => (
                <option key={school.id} value={school.id}>
                  {school.school_name} ({school.school_code})
                </option>
              ))}
            </select>
          </div>
        )}

        {isSchoolOperator ? (
          <>
            <div className="bg-white p-4 md:p-6 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h2 className="text-base font-bold mb-3">Daily Attendance Entry</h2>
                  <div className="flex flex-wrap items-center gap-3">
                    <input
                      type="number"
                      value={students}
                      onChange={(e) => handleAttendanceChange(e.target.value)}
                      className="px-4 py-2 border rounded-lg w-24 font-bold text-slate-800 text-lg border-slate-300"
                    />
                    <span className="text-xs md:text-sm text-slate-600">Students present today</span>
                  </div>
                </div>

                <button
                  onClick={() => setShowStockModal(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs md:text-sm px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition w-full sm:w-auto justify-center"
                >
                  <ShoppingCart size={16} /> Update Stock
                </button>
              </div>
            </div>

            <div className="bg-white p-4 md:p-6 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="text-slate-500" size={18} />
                <h2 className="text-base font-bold text-slate-800">Last 7 Days Attendance Log</h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                {attendanceLog.map((item, index) => (
                  <div key={`${item.day}-${index}`} className="bg-slate-50 border border-slate-200 p-3 rounded-lg text-center">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">{item.day}</p>
                    <p className="text-lg font-bold text-emerald-600">{item.count}</p>
                  </div>
                ))}
              </div>
            </div>

            {daysLeft < 3 && (
              <div className="bg-amber-50 border border-amber-300 p-4 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-amber-900 shadow-sm">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="text-amber-600 shrink-0" />
                  <div>
                    <p className="font-bold text-sm">Low Stock Warning!</p>
                    <p className="text-xs text-amber-700">Estimated ration reserve is under 3 days (~{daysLeft} days remaining).</p>
                  </div>
                </div>
                <button onClick={() => setShowPOModal(true)} className="bg-amber-600 text-white text-xs px-3 py-2 rounded-lg font-semibold flex items-center gap-1 hover:bg-amber-700">
                  <ShoppingCart size={14} /> Generate Purchase Order
                </button>
              </div>
            )}

            {alerts.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-bold text-sm text-slate-800">Alert Filters</h3>
                <FilterSection onFilterChange={handleFilterAlerts} filterType="alerts" />

                <div className="bg-blue-50 border border-blue-300 p-4 rounded-xl space-y-2 shadow-sm">
                  <h3 className="font-bold text-sm text-blue-900">Active Alerts ({(filteredAlerts.length > 0 ? filteredAlerts : alerts).length})</h3>
                  {(filteredAlerts.length > 0 ? filteredAlerts : alerts).slice(0, 5).map((alert) => (
                    <div key={alert.id} className="text-xs text-blue-800 p-3 bg-blue-100 rounded">
                      <span className="font-semibold capitalize">{alert.alert_type.replace('_', ' ')} [{alert.severity}]:</span> {alert.message}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-xs font-bold text-slate-400 mb-1">RICE REQUIRED</p>
                <p className="text-3xl font-extrabold text-slate-800">{riceReq} <span className="text-sm font-normal">kg</span></p>
                <p className="text-xs text-slate-500 mt-2">Available: <span className="font-semibold text-slate-700">{stock.rice} kg</span></p>
              </div>
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-xs font-bold text-slate-400 mb-1">PULSES REQUIRED</p>
                <p className="text-3xl font-extrabold text-slate-800">{pulseReq} <span className="text-sm font-normal">kg</span></p>
                <p className="text-xs text-slate-500 mt-2">Available: <span className="font-semibold text-slate-700">{stock.pulses} kg</span></p>
              </div>
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-xs font-bold text-slate-400 mb-1">OIL REQUIRED</p>
                <p className="text-3xl font-extrabold text-slate-800">{oilReq} <span className="text-sm font-normal">kg</span></p>
                <p className="text-xs text-slate-500 mt-2">Available: <span className="font-semibold text-slate-700">{stock.oil} kg</span></p>
              </div>
            </div>

            <div className="bg-white p-4 md:p-6 rounded-xl border border-slate-200 shadow-sm mt-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <Clock className="text-slate-500" size={18} />
                  <h2 className="text-base font-bold text-slate-800">Purchase Order History</h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={exportOrdersToExcel}
                    className="text-xs md:text-sm text-slate-700 font-semibold border border-slate-300 px-3 py-1.5 rounded-lg hover:bg-slate-50 flex items-center gap-1"
                  >
                    <Download size={14} /> Export Excel
                  </button>
                  <button
                    onClick={exportOrdersToPdf}
                    className="text-xs md:text-sm text-slate-700 font-semibold border border-slate-300 px-3 py-1.5 rounded-lg hover:bg-slate-50 flex items-center gap-1"
                  >
                    <Download size={14} /> Export PDF
                  </button>
                </div>
              </div>

              <FilterSection onFilterChange={handleFilterOrders} filterType="orders" />

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border border-slate-200 rounded-lg overflow-hidden">
                  <thead className="bg-slate-100 text-slate-600">
                    <tr>
                      <th className="p-3 border-b">Order ID</th>
                      <th className="p-3 border-b">Date</th>
                      <th className="p-3 border-b">Items</th>
                      <th className="p-3 border-b">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(filteredOrders.length > 0 ? filteredOrders : orders).map((ord) => (
                      <tr key={ord.id} className="hover:bg-slate-50">
                        <td className="p-3 border-b font-bold text-slate-700">{ord.id}</td>
                        <td className="p-3 border-b text-slate-500">{ord.date}</td>
                        <td className="p-3 border-b font-medium text-slate-600 text-xs">{ord.items}</td>
                        <td className="p-3 border-b">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            ['Delivered', 'Saved to Backend', 'delivered'].includes(ord.status)
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
            </div>

            <div className="space-y-6 mt-6">
              <h2 className="text-lg font-bold text-slate-800">Analytics & Insights</h2>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                  <h3 className="text-base font-bold text-slate-800 mb-4">Stock Distribution (Pie Chart)</h3>
                  <div className="h-80">
                    <Pie data={stockDistributionChart} options={{ maintainAspectRatio: false, responsive: true }} />
                  </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                  <h3 className="text-base font-bold text-slate-800 mb-4">Order Status Breakdown (Doughnut)</h3>
                  <div className="h-80">
                    <Doughnut data={orderStatusChart} options={{ maintainAspectRatio: false, responsive: true }} />
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-base font-bold text-slate-800 mb-4">Attendance Trend (Last 30 Days)</h3>
                <div className="h-80">
                  <Line data={attendanceTrendChart} options={{ maintainAspectRatio: false, responsive: true, plugins: { legend: { position: 'top' } } }} />
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-base font-bold text-slate-800 mb-4">Consumption Pattern (Weekly)</h3>
                <div className="h-80">
                  <Line data={consumptionPatternChart} options={{ maintainAspectRatio: false, responsive: true, plugins: { legend: { position: 'top' } } }} />
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-xs text-slate-500 font-semibold">ACTIVE SCHOOLS</p>
                <p className="text-3xl font-bold text-slate-800">{inspectorData.activeSchools}</p>
              </div>
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-xs text-slate-500 font-semibold">LOW STOCK ALERTS</p>
                <p className="text-3xl font-bold text-amber-600">{inspectorData.lowStockAlerts} Schools</p>
              </div>
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-xs text-slate-500 font-semibold">DISCREPANCY ALERTS</p>
                <p className="text-3xl font-bold text-rose-600">{inspectorData.discrepancyAlerts} Schools</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h2 className="text-sm font-bold text-slate-800 mb-4">District Inventory vs Consumption Graph</h2>
              {loadingInspector ? <p className="text-sm text-slate-500">Loading data...</p> : <Bar data={chartData} />}
            </div>

            <div className="space-y-6 mt-6">
              <h2 className="text-lg font-bold text-slate-800">District Analytics</h2>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                  <h3 className="text-base font-bold text-slate-800 mb-4">Overall Stock Distribution (Pie)</h3>
                  <div className="h-80">
                    <Pie data={stockDistributionChart} options={{ maintainAspectRatio: false, responsive: true }} />
                  </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                  <h3 className="text-base font-bold text-slate-800 mb-4">Order Status Across District (Doughnut)</h3>
                  <div className="h-80">
                    <Doughnut data={orderStatusChart} options={{ maintainAspectRatio: false, responsive: true }} />
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-base font-bold text-slate-800 mb-4">District Attendance Trend (Line)</h3>
                <div className="h-80">
                  <Line data={attendanceTrendChart} options={{ maintainAspectRatio: false, responsive: true, plugins: { legend: { position: 'top' } } }} />
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-base font-bold text-slate-800 mb-4">District Consumption Patterns (Area)</h3>
                <div className="h-80">
                  <Line data={consumptionPatternChart} options={{ maintainAspectRatio: false, responsive: true, plugins: { legend: { position: 'top' } } }} />
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {showPOModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-2xl relative">
            <button onClick={() => setShowPOModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
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

      <StockUpdateModal
        isOpen={showStockModal}
        onClose={() => setShowStockModal(false)}
        user={{ ...user, schoolId: activeSchoolId }}
        onStockUpdated={() => setShowStockModal(false)}
      />
      <ProfileModal isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} user={user} />
      <AuditLogsView isOpen={showAuditLogs} onClose={() => setShowAuditLogs(false)} user={user} />
    </div>
  );
}