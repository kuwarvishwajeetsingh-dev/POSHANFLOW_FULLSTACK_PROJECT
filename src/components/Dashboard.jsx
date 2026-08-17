import React, { useEffect, useMemo, useState } from 'react';
import { Bar, Line, Pie, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  ArcElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import {
  AlertTriangle,
  BookText,
  Calendar,
  CheckCircle,
  Clock,
  Download,
  LogOut,
  Plus,
  RefreshCw,
  School,
  Settings,
  ShoppingCart,
  Users,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { apiService } from '../services/api';
import { calculateRequirements } from '../utils/calculations';
import { getIndiaDateString, formatIndiaDate, getIndiaWeekday } from '../utils/indiaDate';
import StockUpdateModal from './StockUpdateModal';
import ProfileModal from './ProfileModal';
import AuditLogsView from './AuditLogsView';
import FilterSection from './FilterSection';
import AddSchoolModal from './AddSchoolModal';
import AddTeacherModal from './AddTeacherModal';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function Dashboard({ user, onLogout }) {
  const isSchoolOperator = ['teacher', 'headmaster'].includes(user.role);
  const isInspectorOrAdmin = ['inspector', 'admin'].includes(user.role);

  // States
  const [students, setStudents] = useState(0);
  const [todaySubmitted, setTodaySubmitted] = useState(false);
  const [submittingAttendance, setSubmittingAttendance] = useState(false);
  const [attendanceMessage, setAttendanceMessage] = useState('');
  
  const [attendanceLog, setAttendanceLog] = useState([]);
  const [orders, setOrders] = useState([]);
  const [filteredAlerts, setFilteredAlerts] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  
  const [stock, setStock] = useState({ rice: 0, pulses: 0, oil: 0 });
  const [alerts, setAlerts] = useState([]);
  
  const [inspectorData, setInspectorData] = useState({
    activeSchools: 0,
    lowStockAlerts: 0,
    discrepancyAlerts: 0,
    schoolsData: [],
    inventoryData: [],
    attendanceData: [],
    ordersData: [],
  });
  const [loadingInspector, setLoadingInspector] = useState(false);
  const [updatingOrderId, setUpdatingOrderId] = useState(null);

  // Modals
  const [showPOModal, setShowPOModal] = useState(false);
  const [poItems, setPoItems] = useState({ rice: 100, pulses: 20, oil: 5 });
  const [poNotes, setPoNotes] = useState('');
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [orderSent, setOrderSent] = useState(false);
  const [orderError, setOrderError] = useState('');

  const [showStockModal, setShowStockModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showAuditLogs, setShowAuditLogs] = useState(false);
  const [showAddSchoolModal, setShowAddSchoolModal] = useState(false);
  const [showAddTeacherModal, setShowAddTeacherModal] = useState(false);

  // Network & Sync
  const [isOnline, setIsOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  const [syncMessage, setSyncMessage] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Schools list & selection
  const [schools, setSchools] = useState([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState(user.schoolId || '');

  const activeSchoolId = selectedSchoolId || user.schoolId || (schools[0]?.id ?? '');

  // Computed requirements
  const requirements = useMemo(() => calculateRequirements(students), [students]);
  const riceReq = requirements.rice.toFixed(1);
  const pulseReq = requirements.pulse.toFixed(1);
  const oilReq = requirements.oil.toFixed(2);

  const daysLeft = useMemo(() => {
    const dailyRice = Number(riceReq) > 0 ? Number(riceReq) : 1;
    const dailyPulse = Number(pulseReq) > 0 ? Number(pulseReq) : 0.2;
    if (stock.rice === 0 && stock.pulses === 0) return 0;
    return Math.min(
      Math.floor((stock.rice || 0) / dailyRice),
      Math.floor((stock.pulses || 0) / dailyPulse)
    );
  }, [stock, riceReq, pulseReq]);

  // ==========================================
  // DATA LOADERS
  // ==========================================

  const loadSchools = async () => {
    try {
      const list = await apiService.getSchoolsForUser(user.id, user.role);
      setSchools(list || []);
      if (!selectedSchoolId && list && list.length > 0) {
        setSelectedSchoolId(list[0].id);
      }
    } catch (err) {
      console.error('Error loading schools:', err);
    }
  };

  const loadSchoolDashboardData = async (schoolId) => {
    if (!schoolId) return;
    try {
      // 1. Stock & Orders
      const data = await apiService.getDashboardData(schoolId, { role: user.role });
      if (data?.stock) {
        setStock(data.stock);
      }
      if (data?.history) {
        setOrders(data.history);
      }

      // 2. Attendance History
      const logs = await apiService.getAttendanceLast7Days(schoolId);
      const formatted = (logs || []).map((rec) => ({
        id: rec.id,
        date: rec.attendance_date,
        day: getIndiaWeekday(rec.attendance_date),
        count: rec.present_students,
      }));
      setAttendanceLog(formatted);

      // Check if today's attendance was already submitted
      const todayStr = getIndiaDateString();
      const todayRec = formatted.find((r) => r.date === todayStr);
      if (todayRec) {
        setStudents(todayRec.count);
        setTodaySubmitted(true);
      } else {
        setTodaySubmitted(false);
      }

      // 3. Alerts
      const alertsList = await apiService.getAlerts(schoolId);
      setAlerts(alertsList || []);
    } catch (err) {
      console.error('Error loading school dashboard:', err);
    }
  };

  const loadInspectorDashboardData = async () => {
    setLoadingInspector(true);
    try {
      const data = await apiService.getInspectorDashboard();
      setInspectorData(data);
    } catch (err) {
      console.error('Error loading inspector dashboard:', err);
    } finally {
      setLoadingInspector(false);
    }
  };

  const refreshAllData = async () => {
    setRefreshing(true);
    await loadSchools();
    if (isSchoolOperator && activeSchoolId) {
      await loadSchoolDashboardData(activeSchoolId);
    }
    if (isInspectorOrAdmin) {
      await loadInspectorDashboardData();
    }
    setRefreshing(false);
  };

  // Initial load
  useEffect(() => {
    loadSchools();
  }, [user.id, user.role]);

  useEffect(() => {
    if (activeSchoolId && isSchoolOperator) {
      loadSchoolDashboardData(activeSchoolId);
    }
  }, [activeSchoolId, isSchoolOperator]);

  useEffect(() => {
    if (isInspectorOrAdmin) {
      loadInspectorDashboardData();
    }
  }, [isInspectorOrAdmin]);

  // Real-time Subscriptions
  useEffect(() => {
    if (!activeSchoolId && !isInspectorOrAdmin) return undefined;

    const subscriptionSchoolId = isInspectorOrAdmin ? null : activeSchoolId;
    const stockSub = apiService.subscribeToStock(subscriptionSchoolId, () => {
      if (isInspectorOrAdmin) loadInspectorDashboardData();
      else loadSchoolDashboardData(activeSchoolId);
    });

    const orderSub = apiService.subscribeToPurchaseOrders(subscriptionSchoolId, () => {
      if (isInspectorOrAdmin) loadInspectorDashboardData();
      else loadSchoolDashboardData(activeSchoolId);
    });

    const alertSub = apiService.subscribeToAlerts(activeSchoolId, () => {
      apiService.getAlerts(activeSchoolId).then((res) => setAlerts(res || []));
    });

    const schoolsSub = apiService.subscribeToSchools(() => {
      loadSchools();
      if (isInspectorOrAdmin) loadInspectorDashboardData();
    });

    return () => {
      apiService.unsubscribeFromChannel(stockSub);
      apiService.unsubscribeFromChannel(orderSub);
      apiService.unsubscribeFromChannel(alertSub);
      apiService.unsubscribeFromChannel(schoolsSub);
    };
  }, [activeSchoolId, isInspectorOrAdmin]);

  // Online / Offline Listeners
  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      setSyncMessage('Back online. Synchronizing offline queue...');
      const result = await apiService.syncOfflineQueue();
      if (result.synced > 0) {
        setSyncMessage(`✓ ${result.synced} offline records synchronized to database.`);
        refreshAllData();
      } else {
        setSyncMessage('Database connection active.');
      }
      setTimeout(() => setSyncMessage(''), 3500);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setSyncMessage('Offline mode. Changes are saved locally and will sync when internet returns.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [activeSchoolId]);

  // ==========================================
  // ACTION HANDLERS
  // ==========================================

  const handleAttendanceSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!activeSchoolId) {
      setAttendanceMessage('Please select a school first.');
      return;
    }

    const count = Math.max(0, Number(students) || 0);
    setSubmittingAttendance(true);
    setAttendanceMessage('');

    try {
      const res = await apiService.saveAttendance(activeSchoolId, user.id, count);

      if (res.success) {
        setTodaySubmitted(true);
        if (res.queued) {
          setAttendanceMessage('Saved offline. Will sync to Supabase when reconnected.');
        } else {
          setAttendanceMessage(`Attendance of ${count} students saved for today (${formatIndiaDate(getIndiaDateString())}).`);
        }
        await loadSchoolDashboardData(activeSchoolId);
      } else {
        setAttendanceMessage(res.message || 'Failed to save attendance.');
      }
    } catch (err) {
      setAttendanceMessage('Error saving attendance: ' + err.message);
    } finally {
      setSubmittingAttendance(false);
      setTimeout(() => setAttendanceMessage(''), 4000);
    }
  };

  const handleSendOrder = async () => {
    if (!activeSchoolId) {
      setOrderError('No active school selected.');
      return;
    }

    setOrderSubmitting(true);
    setOrderError('');

    const items = [
      { item_name: 'rice', quantity_kg: Number(poItems.rice) || 0 },
      { item_name: 'pulses', quantity_kg: Number(poItems.pulses) || 0 },
      { item_name: 'oil', quantity_kg: Number(poItems.oil) || 0 },
    ].filter((i) => i.quantity_kg > 0);

    if (items.length === 0) {
      setOrderError('Please specify quantity for at least one item.');
      setOrderSubmitting(false);
      return;
    }

    try {
      const res = await apiService.createPurchaseOrder({
        schoolId: activeSchoolId,
        userId: user.id,
        items,
        notes: poNotes || 'Standard ration replenishment',
      });

      if (res.success) {
        setOrderSent(true);
        await loadSchoolDashboardData(activeSchoolId);
        setTimeout(() => {
          setOrderSent(false);
          setShowPOModal(false);
          setPoNotes('');
        }, 1500);
      } else {
        setOrderError(res.message || 'Failed to create purchase order.');
      }
    } catch (err) {
      setOrderError('Error: ' + err.message);
    } finally {
      setOrderSubmitting(false);
    }
  };

  const handleDeliverOrder = async (orderId) => {
    setUpdatingOrderId(orderId);
    const result = await apiService.updatePurchaseOrderStatus(orderId, 'delivered', user.id);
    if (result.success) await loadInspectorDashboardData();
    else window.alert(result.message || 'Unable to update order status.');
    setUpdatingOrderId(null);
  };

  const handleFilterAlerts = async (filters) => {
    const filtered = await apiService.searchAlerts(activeSchoolId, filters);
    setFilteredAlerts(filtered);
  };

  const handleFilterOrders = async (filters) => {
    const filtered = await apiService.searchOrders(activeSchoolId, filters);
    setFilteredOrders(filtered);
  };

  const exportOrdersToExcel = () => {
    const dataRows = (filteredOrders.length > 0 ? filteredOrders : orders).map((o) => ({
      'Order ID': o.id,
      'Date': o.date,
      'Items & Quantities': o.items,
      'Status': o.status,
    }));

    if (dataRows.length === 0) {
      alert('No purchase orders to export.');
      return;
    }

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(dataRows);
    XLSX.utils.book_append_sheet(wb, ws, 'Purchase Orders');
    XLSX.writeFile(wb, `poshan-orders-${getIndiaDateString()}.xlsx`);
  };

  const exportOrdersToPdf = () => {
    const dataRows = (filteredOrders.length > 0 ? filteredOrders : orders).map((o) => [
      o.id,
      o.date,
      o.items,
      o.status,
    ]);

    if (dataRows.length === 0) {
      alert('No purchase orders to export.');
      return;
    }

    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text('POSHANFLOW - Purchase Orders Report', 14, 15);
    doc.setFontSize(9);
    doc.text(`Generated on: ${formatIndiaDate(getIndiaDateString())} | School ID: ${activeSchoolId || 'District'}`, 14, 22);

    autoTable(doc, {
      startY: 28,
      head: [['Order ID', 'Date', 'Items & Quantities', 'Status']],
      body: dataRows,
      theme: 'grid',
      headStyles: { fillColor: [16, 185, 129] },
    });

    doc.save(`poshan-orders-${getIndiaDateString()}.pdf`);
  };

  // ==========================================
  // DYNAMIC CHARTS COMPUTATION (REAL DB DATA)
  // ==========================================

  // Inspector District Inventory Bar Chart (Real schools from Supabase)
  const districtBarChartData = useMemo(() => {
    const schoolList = inspectorData.schoolsData || [];
    if (schoolList.length === 0) {
      return {
        labels: [],
        datasets: [],
      };
    }

    const labels = schoolList.map((s) => s.school_name || s.school_code);
    
    // Aggregate total stock (kg) per school
    const stockMapBySchool = {};
    (inspectorData.inventoryData || []).forEach((item) => {
      stockMapBySchool[item.school_id] = (stockMapBySchool[item.school_id] || 0) + Number(item.quantity_kg || 0);
    });

    // Aggregate latest attendance per school
    const attendanceMapBySchool = {};
    (inspectorData.attendanceData || []).forEach((att) => {
      if (!attendanceMapBySchool[att.school_id]) {
        attendanceMapBySchool[att.school_id] = Number(att.present_students || 0);
      }
    });

    const stockValues = schoolList.map((s) => stockMapBySchool[s.id] || 0);
    const attendanceValues = schoolList.map((s) => attendanceMapBySchool[s.id] || 0);

    return {
      labels,
      datasets: [
        {
          label: 'Total Stock in Reserve (kg)',
          data: stockValues,
          backgroundColor: 'rgba(16, 185, 129, 0.75)',
          borderRadius: 6,
        },
        {
          label: 'Latest Attendance',
          data: attendanceValues,
          backgroundColor: 'rgba(99, 102, 241, 0.75)',
          borderRadius: 6,
        },
      ],
    };
  }, [inspectorData]);

  // Stock Distribution Pie Chart
  const stockDistributionChart = useMemo(() => {
    let rice = 0;
    let pulses = 0;
    let oil = 0;

    if (isInspectorOrAdmin) {
      (inspectorData.inventoryData || []).forEach((item) => {
        const name = String(item.item_name || '').trim().toLowerCase().replace(/[^a-z]/g, '');
        const qty = Number.parseFloat(item.quantity_kg ?? item.quantity ?? item.stock) || 0;
        if (name.includes('rice')) rice += qty;
        else if (name.includes('pulse') || name.includes('dal')) pulses += qty;
        else if (name.includes('oil')) oil += qty;
      });
    } else {
      rice = stock.rice || 0;
      pulses = stock.pulses || 0;
      oil = stock.oil || 0;
    }

    const hasData = rice > 0 || pulses > 0 || oil > 0;

    return {
      labels: ['Rice (kg)', 'Pulses (kg)', 'Oil (kg)'],
      datasets: [
        {
          data: hasData ? [rice, pulses, oil] : [0, 0, 0],
          backgroundColor: ['rgba(245, 158, 11, 0.8)', 'rgba(236, 72, 153, 0.8)', 'rgba(16, 185, 129, 0.8)'],
          borderColor: ['rgb(245, 158, 11)', 'rgb(236, 72, 153)', 'rgb(16, 185, 129)'],
          borderWidth: 2,
        },
      ],
    };
  }, [isInspectorOrAdmin, inspectorData.inventoryData, stock]);

  // Order Status Breakdown Doughnut Chart
  const orderStatusChart = useMemo(() => {
    const orderList = isInspectorOrAdmin ? inspectorData.ordersData || [] : orders || [];
    const pending = orderList.filter((o) => ['pending', 'Pending', 'Pending Dispatch'].includes(o.status)).length;
    const approved = orderList.filter((o) => ['approved', 'Approved'].includes(o.status)).length;
    const dispatched = orderList.filter((o) => ['dispatched', 'Dispatched'].includes(o.status)).length;
    const delivered = orderList.filter((o) => ['delivered', 'Delivered', 'Saved to Backend'].includes(o.status)).length;

    const total = pending + approved + dispatched + delivered;

    return {
      labels: ['Pending', 'Approved', 'Dispatched', 'Delivered'],
      datasets: [
        {
          data: total > 0 ? [pending, approved, dispatched, delivered] : [0, 0, 0, 0],
          backgroundColor: [
            'rgba(245, 158, 11, 0.8)',
            'rgba(59, 130, 246, 0.8)',
            'rgba(168, 85, 247, 0.8)',
            'rgba(16, 185, 129, 0.8)',
          ],
          borderWidth: 2,
        },
      ],
    };
  }, [isInspectorOrAdmin, inspectorData.ordersData, orders]);

  // Attendance Trend Line Chart
  const attendanceTrendChart = useMemo(() => {
    let records = [];
    if (isInspectorOrAdmin) {
      records = inspectorData.attendanceData || [];
    } else {
      records = attendanceLog || [];
    }

    if (records.length === 0) {
      return {
        labels: ['No Attendance Recorded Yet'],
        datasets: [
          {
            label: 'Students Present',
            data: [0],
            borderColor: 'rgba(99, 102, 241, 0.3)',
            backgroundColor: 'rgba(99, 102, 241, 0.05)',
          },
        ],
      };
    }

    const labels = records.map((r) => r.day ? `${r.day} (${formatIndiaDate(r.date)})` : formatIndiaDate(r.attendance_date));
    const counts = records.map((r) => Number(r.count ?? r.present_students ?? 0));

    return {
      labels,
      datasets: [
        {
          label: 'Students Present',
          data: counts,
          borderColor: 'rgba(99, 102, 241, 1)',
          backgroundColor: 'rgba(99, 102, 241, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.3,
          pointRadius: 4,
          pointBackgroundColor: 'rgba(99, 102, 241, 1)',
        },
      ],
    };
  }, [isInspectorOrAdmin, inspectorData.attendanceData, attendanceLog]);

  const activeSchoolName = schools.find((s) => s.id === activeSchoolId)?.school_name || user.schoolName || 'School Dashboard';

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Header */}
      <header className={`border-b-2 border-t-4 px-4 md:px-6 py-3.5 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 shadow-xs ${isInspectorOrAdmin ? 'bg-indigo-50 border-indigo-300' : 'bg-emerald-50 border-emerald-300'}`}>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg md:text-xl font-bold text-slate-800 tracking-tight">POSHANFLOW</h1>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${isInspectorOrAdmin ? 'bg-indigo-200 text-indigo-900' : 'bg-emerald-200 text-emerald-900'}`}>
              {user.role}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-700">{user.name}</span>
            <span>({user.email})</span>
            {isOnline ? (
              <span className="inline-flex items-center gap-1 text-emerald-600 text-[11px] font-medium">
                <Wifi size={12} /> Database Connected
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-rose-600 text-[11px] font-medium animate-pulse">
                <WifiOff size={12} /> Offline Mode
              </span>
            )}
          </p>
          {syncMessage && (
            <p className="text-xs text-indigo-600 font-semibold mt-1 animate-fade-in">{syncMessage}</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          <button
            onClick={refreshAllData}
            disabled={refreshing}
            title="Refresh Data"
            className="text-xs text-slate-600 font-semibold border border-slate-200 px-2.5 py-1.5 rounded-lg hover:bg-slate-50 flex items-center gap-1.5 transition"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {isInspectorOrAdmin && (
            <>
              <button onClick={() => setShowAddTeacherModal(true)} className="text-xs text-indigo-700 bg-indigo-50 hover:bg-indigo-100 font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition"><Users size={14} /> Add Teacher</button>
              <button onClick={() => setShowAddSchoolModal(true)} className="text-xs text-white bg-indigo-600 hover:bg-indigo-700 font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition shadow-xs"><Plus size={14} /> Add School</button>
            </>
          )}

          <button
            onClick={() => setShowProfileModal(true)}
            className="text-xs text-slate-600 font-semibold border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 flex items-center gap-1.5 transition"
          >
            <Settings size={14} /> Profile
          </button>

          <button
            onClick={() => setShowAuditLogs(true)}
            className="text-xs text-slate-600 font-semibold border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 flex items-center gap-1.5 transition"
          >
            <BookText size={14} /> Audit Logs
          </button>

          <button
            onClick={onLogout}
            className="text-xs text-rose-600 font-semibold border border-rose-200 px-3 py-1.5 rounded-lg hover:bg-rose-50 flex items-center gap-1.5 transition"
          >
            <LogOut size={14} /> Logout
          </button>
        </div>
      </header>

      <main className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
        {/* School Selector (for multi-school users or inspector) */}
        {schools.length > 0 && (
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <School className="text-slate-500 shrink-0" size={18} />
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Active School Context
                </label>
                <select
                  value={activeSchoolId}
                  onChange={(e) => setSelectedSchoolId(e.target.value)}
                  className="mt-0.5 px-3 py-1.5 border border-slate-300 rounded-lg text-sm font-semibold text-slate-800 bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  {schools.map((school) => (
                    <option key={school.id} value={school.id}>
                      {school.school_name} ({school.school_code}) - {school.district}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="text-right text-xs text-slate-500">
              <p>Total Registered Schools: <span className="font-bold text-slate-800">{schools.length}</span></p>
              <p>Current Date (IST): <span className="font-semibold text-slate-700">{formatIndiaDate(getIndiaDateString())}</span></p>
            </div>
          </div>
        )}

        {schools.length === 0 && (
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-amber-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="text-amber-600 shrink-0" />
              <div>
                <p className="font-bold text-sm">No Schools Registered in Database</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  {isInspectorOrAdmin
                    ? "Click 'Add School' above to register the first school in PM-POSHAN."
                    : "Please ask your District Inspector to register your school."}
                </p>
              </div>
            </div>
            {isInspectorOrAdmin && (
              <button
                onClick={() => setShowAddSchoolModal(true)}
                className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition"
              >
                Register School
              </button>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TEACHER / HEADMASTER OPERATOR VIEW */}
        {/* ------------------------------------------------------------- */}
        {isSchoolOperator ? (
          <>
            {/* Daily Attendance Form */}
            <div className="bg-white p-5 md:p-6 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Users className="text-emerald-600" size={20} />
                    <h2 className="text-base font-bold text-slate-800">Daily Attendance Entry (PM-POSHAN)</h2>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Date: <span className="font-semibold text-slate-700">{formatIndiaDate(getIndiaDateString())}</span> (Asia/Kolkata)
                    {todaySubmitted && (
                      <span className="ml-2 text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded text-[11px]">
                        ✓ Attendance Submitted for Today
                      </span>
                    )}
                  </p>

                  <form onSubmit={handleAttendanceSubmit} className="flex flex-wrap items-center gap-3 mt-4">
                    <input
                      type="number"
                      min="0"
                      value={students}
                      onChange={(e) => setStudents(Math.max(0, Number(e.target.value) || 0))}
                      className="px-3 py-2 border border-slate-300 rounded-lg w-28 font-bold text-slate-800 text-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                    <span className="text-xs font-semibold text-slate-600">Students Present for MDM</span>

                    <button
                      type="submit"
                      disabled={submittingAttendance || !activeSchoolId}
                      className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition flex items-center gap-1.5 shadow-xs"
                    >
                      {submittingAttendance ? (
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <CheckCircle size={15} />
                      )}
                      {todaySubmitted ? 'Update Today Attendance' : 'Submit Attendance'}
                    </button>
                  </form>

                  {attendanceMessage && (
                    <p className={`text-xs mt-2 font-medium ${
                      attendanceMessage.includes('saved') || attendanceMessage.includes('Saved')
                        ? 'text-emerald-600'
                        : 'text-rose-600'
                    }`}>
                      {attendanceMessage}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-2 w-full md:w-auto">
                  <button
                    onClick={() => setShowStockModal(true)}
                    disabled={!activeSchoolId}
                    className="bg-slate-800 hover:bg-slate-900 disabled:bg-slate-300 text-white text-xs px-4 py-2.5 rounded-lg font-semibold flex items-center gap-2 transition justify-center shadow-xs"
                  >
                    <ShoppingCart size={15} /> Update Physical Stock
                  </button>
                  <button
                    onClick={() => setShowPOModal(true)}
                    disabled={!activeSchoolId}
                    className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition justify-center"
                  >
                    <Plus size={15} /> Create Purchase Order
                  </button>
                </div>
              </div>
            </div>

            {/* Attendance History (Real Database Logs) */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="text-slate-500" size={18} />
                <h2 className="text-sm font-bold text-slate-800">Recent Attendance Records (From Database)</h2>
              </div>

              {attendanceLog.length === 0 ? (
                <div className="text-center py-6 text-slate-400 border border-dashed border-slate-200 rounded-lg text-xs">
                  No attendance records yet for this school. Submit today attendance above to record the first entry.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
                  {attendanceLog.map((item) => (
                    <div key={item.id || item.date} className="bg-slate-50 border border-slate-200 p-3 rounded-lg text-center hover:border-emerald-300 transition">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{item.day}</p>
                      <p className="text-[11px] text-slate-500">{formatIndiaDate(item.date)}</p>
                      <p className="text-xl font-extrabold text-emerald-600 mt-1">{item.count}</p>
                      <p className="text-[10px] text-slate-400">students</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Low Stock Alert Banner */}
            {daysLeft < 3 && (stock.rice > 0 || stock.pulses > 0) && (
              <div className="bg-amber-50 border border-amber-300 p-4 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-amber-900 shadow-xs">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="text-amber-600 shrink-0" size={22} />
                  <div>
                    <p className="font-bold text-sm">Low Stock Alert!</p>
                    <p className="text-xs text-amber-700">Estimated ration reserve is under 3 days (~{daysLeft} days remaining at current attendance).</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowPOModal(true)}
                  className="bg-amber-600 text-white text-xs px-3.5 py-2 rounded-lg font-semibold flex items-center gap-1.5 hover:bg-amber-700 transition"
                >
                  <ShoppingCart size={14} /> Reorder Ration
                </button>
              </div>
            )}

            {/* Active Alerts */}
            {alerts.length > 0 && (
              <div className="space-y-3">
                <FilterSection onFilterChange={handleFilterAlerts} filterType="alerts" />
                <div className="bg-blue-50/70 border border-blue-200 p-4 rounded-xl space-y-2 shadow-xs">
                  <h3 className="font-bold text-xs text-blue-900 uppercase tracking-wider">
                    Active School Alerts ({(filteredAlerts.length > 0 ? filteredAlerts : alerts).length})
                  </h3>
                  {(filteredAlerts.length > 0 ? filteredAlerts : alerts).map((alert) => (
                    <div key={alert.id} className="text-xs text-blue-900 p-2.5 bg-white/80 border border-blue-100 rounded-lg flex items-start gap-2">
                      <span className="font-bold capitalize bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded text-[10px]">
                        {alert.alert_type?.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[10px] uppercase font-bold text-amber-700 bg-amber-50 px-1 rounded">
                        {alert.severity}
                      </span>
                      <span className="flex-1">{alert.message}</span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(alert.created_at).toLocaleDateString('en-IN')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Daily Requirement vs Available Stock Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                <div className="flex justify-between items-start">
                  <p className="text-[11px] font-bold text-slate-400 tracking-wider">RICE REQUIRED TODAY</p>
                  <span className="text-[10px] bg-amber-50 text-amber-700 font-semibold px-2 py-0.5 rounded">100g / student</span>
                </div>
                <p className="text-3xl font-extrabold text-slate-800 mt-2">
                  {riceReq} <span className="text-sm font-normal text-slate-500">kg</span>
                </p>
                <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between items-center text-xs">
                  <span className="text-slate-500">In Stock:</span>
                  <span className={`font-bold ${stock.rice < Number(riceReq) ? 'text-rose-600' : 'text-slate-800'}`}>
                    {stock.rice} kg
                  </span>
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                <div className="flex justify-between items-start">
                  <p className="text-[11px] font-bold text-slate-400 tracking-wider">PULSES REQUIRED TODAY</p>
                  <span className="text-[10px] bg-pink-50 text-pink-700 font-semibold px-2 py-0.5 rounded">20g / student</span>
                </div>
                <p className="text-3xl font-extrabold text-slate-800 mt-2">
                  {pulseReq} <span className="text-sm font-normal text-slate-500">kg</span>
                </p>
                <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between items-center text-xs">
                  <span className="text-slate-500">In Stock:</span>
                  <span className={`font-bold ${stock.pulses < Number(pulseReq) ? 'text-rose-600' : 'text-slate-800'}`}>
                    {stock.pulses} kg
                  </span>
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                <div className="flex justify-between items-start">
                  <p className="text-[11px] font-bold text-slate-400 tracking-wider">OIL REQUIRED TODAY</p>
                  <span className="text-[10px] bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded">5g / student</span>
                </div>
                <p className="text-3xl font-extrabold text-slate-800 mt-2">
                  {oilReq} <span className="text-sm font-normal text-slate-500">kg</span>
                </p>
                <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between items-center text-xs">
                  <span className="text-slate-500">In Stock:</span>
                  <span className={`font-bold ${stock.oil < Number(oilReq) ? 'text-rose-600' : 'text-slate-800'}`}>
                    {stock.oil} kg
                  </span>
                </div>
              </div>
            </div>

            {/* Purchase Order History */}
            <div className="bg-white p-5 md:p-6 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <Clock className="text-slate-500" size={18} />
                  <h2 className="text-base font-bold text-slate-800">Purchase Order History (Supabase)</h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={exportOrdersToExcel}
                    className="text-xs text-slate-700 font-semibold border border-slate-300 px-3 py-1.5 rounded-lg hover:bg-slate-50 flex items-center gap-1.5 transition"
                  >
                    <Download size={13} /> Export Excel
                  </button>
                  <button
                    onClick={exportOrdersToPdf}
                    className="text-xs text-slate-700 font-semibold border border-slate-300 px-3 py-1.5 rounded-lg hover:bg-slate-50 flex items-center gap-1.5 transition"
                  >
                    <Download size={13} /> Export PDF
                  </button>
                </div>
              </div>

              <FilterSection onFilterChange={handleFilterOrders} filterType="orders" />

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border border-slate-200 rounded-lg overflow-hidden">
                  <thead className="bg-slate-100 text-slate-600 font-bold">
                    <tr>
                      <th className="p-3 border-b">Order UUID</th>
                      <th className="p-3 border-b">Date</th>
                      <th className="p-3 border-b">Items & Quantities</th>
                      <th className="p-3 border-b">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(filteredOrders.length > 0 ? filteredOrders : orders).length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-6 text-center text-slate-400">
                          No purchase orders recorded yet in database.
                        </td>
                      </tr>
                    ) : (
                      (filteredOrders.length > 0 ? filteredOrders : orders).map((ord) => (
                        <tr key={ord.id} className="hover:bg-slate-50 border-b border-slate-100">
                          <td className="p-3 font-mono text-[11px] font-semibold text-slate-700">
                            {ord.id.length > 12 ? `${ord.id.slice(0, 8)}...` : ord.id}
                          </td>
                          <td className="p-3 text-slate-500">{ord.date}</td>
                          <td className="p-3 font-medium text-slate-700">{ord.items}</td>
                          <td className="p-3">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              ['delivered', 'Delivered'].includes(ord.status)
                                ? 'bg-emerald-100 text-emerald-700'
                                : ['approved', 'Approved'].includes(ord.status)
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}>
                              {ord.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* School Analytics Charts */}
            <div className="space-y-4">
              <h2 className="text-base font-bold text-slate-800">School Analytics & Data Visualizations</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4">Stock Distribution (Pie)</h3>
                  <div className="h-64">
                    <Pie data={stockDistributionChart} options={{ maintainAspectRatio: false, responsive: true }} />
                  </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4">Order Statuses (Doughnut)</h3>
                  <div className="h-64">
                    <Doughnut data={orderStatusChart} options={{ maintainAspectRatio: false, responsive: true }} />
                  </div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4">Attendance Trend (Daily Present)</h3>
                <div className="h-64">
                  <Line data={attendanceTrendChart} options={{ maintainAspectRatio: false, responsive: true, plugins: { legend: { position: 'top' } } }} />
                </div>
              </div>
            </div>
          </>
        ) : (
          /* ------------------------------------------------------------- */
          /* DISTRICT INSPECTOR / ADMIN VIEW */
          /* ------------------------------------------------------------- */
          <div className="space-y-6">
            {/* Inspector Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">REGISTERED SCHOOLS</p>
                <p className="text-3xl font-extrabold text-slate-800 mt-1">{inspectorData.activeSchools}</p>
                <p className="text-xs text-slate-500 mt-2">Institutions under supervision</p>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">LOW STOCK ALERTS</p>
                <p className="text-3xl font-extrabold text-amber-600 mt-1">{inspectorData.lowStockAlerts}</p>
                <p className="text-xs text-amber-700 mt-2">Schools requiring stock dispatch</p>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">DISCREPANCY ALERTS</p>
                <p className="text-3xl font-extrabold text-rose-600 mt-1">{inspectorData.discrepancyAlerts}</p>
                <p className="text-xs text-rose-700 mt-2">Attendance / Ration anomalies</p>
              </div>
            </div>

            {/* Real District Inventory vs Consumption Graph */}
            <div className="bg-white p-5 md:p-6 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-800">District School Reserves & Attendance (From Supabase)</h2>
                  <p className="text-xs text-slate-500">Live data aggregated across all registered district schools</p>
                </div>
                <button
                  onClick={() => setShowAddSchoolModal(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition"
                >
                  <Plus size={14} /> Add School
                </button>
              </div>

              {loadingInspector ? (
                <div className="py-16 text-center text-xs text-slate-400">Loading district database data...</div>
              ) : inspectorData.schoolsData.length === 0 ? (
                <div className="text-center py-16 text-slate-400 border border-dashed border-slate-200 rounded-lg text-xs">
                  No schools registered yet. Click &quot;Add School&quot; to register your first district school.
                </div>
              ) : (
                <div className="h-80">
                  <Bar
                    data={districtBarChartData}
                    options={{
                      maintainAspectRatio: false,
                      responsive: true,
                      plugins: {
                        legend: { position: 'top' },
                      },
                    }}
                  />
                </div>
              )}
            </div>

            <div className="bg-white p-5 md:p-6 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-800">Purchase Demand Review</h2>
                  <p className="text-xs text-slate-500">Mark dispatched ration as delivered for the school to see the update immediately.</p>
                </div>
                <ShoppingCart className="text-indigo-600" size={20} />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-600 font-bold"><tr><th className="p-3">School</th><th className="p-3">Requested ration</th><th className="p-3">Status</th><th className="p-3 text-right">Action</th></tr></thead>
                  <tbody>
                    {(inspectorData.ordersData || []).length === 0 ? <tr><td colSpan={4} className="p-5 text-center text-slate-400">No purchase demands yet.</td></tr> : inspectorData.ordersData.map((order) => (
                      <tr key={order.id} className="border-b border-slate-100">
                        <td className="p-3 font-semibold text-slate-700">{order.school_name || schools.find((school) => String(school.id).trim().toLowerCase() === String(order.school_id).trim().toLowerCase())?.school_name || 'School name unavailable'}</td>
                        <td className="p-3 text-slate-600">{(order.purchase_order_items || []).map((item) => `${item.item_name}: ${item.quantity_kg} kg`).join(', ') || '—'}</td>
                        <td className="p-3"><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${order.status === 'delivered' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{order.status}</span></td>
                        <td className="p-3 text-right">{order.status !== 'delivered' && <button onClick={() => handleDeliverOrder(order.id)} disabled={updatingOrderId === order.id} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-emerald-700 disabled:bg-slate-300">{updatingOrderId === order.id ? 'Updating…' : 'Mark Delivered'}</button>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* District Analytics Charts */}
            <div className="space-y-4">
              <h2 className="text-base font-bold text-slate-800">District-Wide Analytics</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4">Total District Stock Distribution</h3>
                  <div className="h-64">
                    <Pie data={stockDistributionChart} options={{ maintainAspectRatio: false, responsive: true }} />
                  </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4">District Purchase Order Statuses</h3>
                  <div className="h-64">
                    <Doughnut data={orderStatusChart} options={{ maintainAspectRatio: false, responsive: true }} />
                  </div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4">District Attendance Trends</h3>
                <div className="h-64">
                  <Line data={attendanceTrendChart} options={{ maintainAspectRatio: false, responsive: true, plugins: { legend: { position: 'top' } } }} />
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Purchase Order Modal */}
      {showPOModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setShowPOModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X size={20} />
            </button>

            {orderSent ? (
              <div className="text-center py-6">
                <CheckCircle className="mx-auto text-emerald-500 mb-2 animate-bounce" size={44} />
                <h3 className="font-bold text-lg text-slate-800">Purchase Order Created!</h3>
                <p className="text-xs text-slate-500 mt-1">Saved to Supabase purchase_orders & items.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                    <ShoppingCart size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-slate-800">Create Purchase Order</h3>
                    <p className="text-xs text-slate-500">School: {activeSchoolName}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Rice Quantity (kg)</label>
                    <input
                      type="number"
                      min="0"
                      value={poItems.rice}
                      onChange={(e) => setPoItems({ ...poItems, rice: Number(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Pulses Quantity (kg)</label>
                    <input
                      type="number"
                      min="0"
                      value={poItems.pulses}
                      onChange={(e) => setPoItems({ ...poItems, pulses: Number(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Oil Quantity (kg)</label>
                    <input
                      type="number"
                      min="0"
                      value={poItems.oil}
                      onChange={(e) => setPoItems({ ...poItems, oil: Number(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Order Notes (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Urgent ration replenishment"
                      value={poNotes}
                      onChange={(e) => setPoNotes(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {orderError && (
                  <div className="mt-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs p-2.5 rounded-lg">
                    {orderError}
                  </div>
                )}

                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowPOModal(false)}
                    className="flex-1 py-2 text-xs font-semibold text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSendOrder}
                    disabled={orderSubmitting}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white py-2 rounded-lg font-semibold text-xs transition flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    {orderSubmitting ? (
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <CheckCircle size={15} /> Confirm & Save Order
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Stock Update Modal */}
      <StockUpdateModal
        isOpen={showStockModal}
        onClose={() => setShowStockModal(false)}
        user={{ ...user, schoolId: activeSchoolId }}
        onStockUpdated={() => {
          loadSchoolDashboardData(activeSchoolId);
          if (isInspectorOrAdmin) loadInspectorDashboardData();
        }}
      />

      {/* Profile Modal */}
      <ProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        user={{ ...user, schoolName: activeSchoolName }}
      />

      {/* Audit Logs Modal */}
      <AuditLogsView
        isOpen={showAuditLogs}
        onClose={() => setShowAuditLogs(false)}
        user={{ ...user, schoolId: isSchoolOperator ? activeSchoolId : null }}
      />

      {/* Add School Modal */}
      <AddSchoolModal
        isOpen={showAddSchoolModal}
        onClose={() => setShowAddSchoolModal(false)}
        onSchoolAdded={(newSchool) => {
          loadSchools();
          setSelectedSchoolId(newSchool.id);
          if (isInspectorOrAdmin) loadInspectorDashboardData();
        }}
      />

      <AddTeacherModal
        isOpen={showAddTeacherModal}
        onClose={() => setShowAddTeacherModal(false)}
        schools={schools}
        onTeacherAdded={() => { loadSchools(); loadInspectorDashboardData(); }}
      />
    </div>
  );
}
