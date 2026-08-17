import { supabase, isSupabaseConfigured } from '../lib/supabase';

const OFFLINE_QUEUE_KEY = 'offline_queue';

function isBrowserOnline() {
  return typeof navigator === 'undefined' ? true : navigator.onLine;
}

function readOfflineQueue() {
  try {
    return JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]');
  } catch {
    return [];
  }
}

function writeOfflineQueue(queue) {
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
}

export const apiService = {
  login: async (credentials) => {
    if (!isSupabaseConfigured) {
      return {
        success: false,
        message: 'Supabase environment variables are missing. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
      };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      if (error) {
        throw error;
      }

      const userId = data?.user?.id;
      let profile = null;
      let schoolData = null;

      if (userId) {
        const { data: profileResult, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();

        if (profileError) throw profileError;
        profile = profileResult;

        if (profile?.school_id) {
          const { data: schoolResult, error: schoolError } = await supabase
            .from('schools')
            .select('*')
            .eq('id', profile.school_id)
            .maybeSingle();

          if (schoolError) throw schoolError;
          schoolData = schoolResult;
        }
      }

      return {
        success: true,
        userId,
        role: profile?.role || credentials.role,
        schoolId: profile?.school_id || credentials.schoolId,
        name: profile?.full_name || credentials.name,
        schoolName: schoolData?.school_name || credentials.schoolId,
      };
    } catch (error) {
      console.error('Supabase login failed:', error);
      return {
        success: false,
        message: error?.message || 'Login failed. Please check the email and password.',
      };
    }
  },

  getDashboardData: async (schoolId, options = {}) => {
    const { role = 'teacher', accessibleSchoolIds = [] } = options;
    if (!isSupabaseConfigured) {
      return {
        stock: { rice: 18, pulses: 3.5, oil: 0.9 },
        history: [
          { id: 'PO-9508', date: '16/08/2026', items: 'Rice: 100kg, Pulses: 20kg, Oil: 5kg', status: 'Pending Dispatch' },
          { id: 'PO-8842', date: '12/08/2026', items: 'Rice: 100kg, Pulses: 20kg', status: 'Delivered' },
        ],
      };
    }

    try {
      let stockQuery = supabase.from('inventory_stock').select('*');
      let orderQuery = supabase.from('purchase_orders').select('*');

      if (role === 'inspector' || role === 'admin') {
        // District-level users can read all rows allowed by RLS.
      } else if (role === 'headmaster' && accessibleSchoolIds.length > 0) {
        stockQuery = stockQuery.in('school_id', accessibleSchoolIds);
        orderQuery = orderQuery.in('school_id', accessibleSchoolIds);
      } else {
        stockQuery = stockQuery.eq('school_id', schoolId || null);
        orderQuery = orderQuery.eq('school_id', schoolId || null);
      }

      const { data: stockData, error: stockError } = await stockQuery;

      if (stockError) throw stockError;

      const { data: orderData, error: orderError } = await orderQuery.order('order_date', { ascending: false });

      if (orderError) throw orderError;

      return {
        stock: (stockData || []).reduce((acc, item) => {
          acc[item.item_name] = Number(item.quantity_kg || 0);
          return acc;
        }, { rice: 0, pulses: 0, oil: 0 }),
        history: (orderData || []).map((order) => ({
          id: order.id,
          date: new Date(order.order_date).toLocaleDateString('en-GB'),
          items: 'Rice / Pulses / Oil',
          status: order.status,
        })),
      };
    } catch (error) {
      console.warn('Using fallback dashboard data because Supabase data connection is unavailable:', error);
      return {
        stock: { rice: 18, pulses: 3.5, oil: 0.9 },
        history: [
          { id: 'PO-9508', date: '16/08/2026', items: 'Rice: 100kg, Pulses: 20kg, Oil: 5kg', status: 'Pending Dispatch' },
          { id: 'PO-8842', date: '12/08/2026', items: 'Rice: 100kg, Pulses: 20kg', status: 'Delivered' },
        ],
      };
    }
  },

  createPurchaseOrder: async (orderPayload) => {
    if (!isBrowserOnline()) {
      apiService.saveToLocalQueue('purchase_order', orderPayload);
      return { success: true, orderId: `LOCAL-${Date.now()}`, queued: true };
    }

    if (!isSupabaseConfigured) {
      return { success: true, orderId: `PO-${Math.floor(1000 + Math.random() * 9000)}` };
    }

    try {
      const { data, error } = await supabase
        .from('purchase_orders')
        .insert({
          school_id: orderPayload.schoolId,
          generated_by: orderPayload.userId,
          status: 'pending',
          notes: 'Generated by POSHANFLOW frontend',
        })
        .select();

      if (error) throw error;

      const orderId = data?.[0]?.id || `PO-${Math.floor(1000 + Math.random() * 9000)}`;

      if (orderPayload.items?.length) {
        const { error: itemError } = await supabase.from('purchase_order_items').insert(
          orderPayload.items.map((item) => ({
            purchase_order_id: orderId,
            item_name: item.item_name,
            quantity_kg: item.quantity_kg,
          }))
        );

        if (itemError) throw itemError;
      }

      return { success: true, orderId };
    } catch (error) {
      console.warn('Supabase purchase order write failed. Falling back to local mode:', error);
      return { success: true, orderId: `PO-${Math.floor(1000 + Math.random() * 9000)}` };
    }
  },

  saveAttendance: async (schoolId, userId, presentStudents) => {
    if (!isBrowserOnline()) {
      apiService.saveToLocalQueue('attendance', {
        schoolId,
        userId,
        students: presentStudents,
      });
      return { success: true, attendanceId: `LOCAL-${Date.now()}`, queued: true };
    }

    if (!isSupabaseConfigured) {
      return { success: true, attendanceId: 'local-' + Date.now() };
    }

    try {
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('attendance_records')
        .upsert({
          school_id: schoolId,
          attendance_date: today,
          present_students: presentStudents,
          recorded_by: userId,
        }, { onConflict: 'school_id,attendance_date' })
        .select();

      if (error) throw error;

      return { success: true, attendanceId: data?.[0]?.id };
    } catch (error) {
      console.warn('Supabase attendance save failed:', error);
      return { success: false, error: error?.message };
    }
  },

  getAttendanceLast7Days: async (schoolId) => {
    if (!isSupabaseConfigured) {
      return [];
    }

    try {
      const today = new Date();
      const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('attendance_records')
        .select('attendance_date, present_students')
        .eq('school_id', schoolId)
        .gte('attendance_date', sevenDaysAgo)
        .order('attendance_date', { ascending: true });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.warn('Failed to fetch attendance logs:', error);
      return [];
    }
  },

  updateInventoryStock: async (schoolId, itemName, quantity, reorderLevel) => {
    if (!isBrowserOnline()) {
      apiService.saveToLocalQueue('stock', {
        schoolId,
        itemName,
        quantity,
        reorderLevel,
      });
      return { success: true, queued: true };
    }

    if (!isSupabaseConfigured) {
      return { success: true };
    }

    try {
      const { data, error } = await supabase
        .from('inventory_stock')
        .upsert({
          school_id: schoolId,
          item_name: itemName,
          quantity_kg: quantity,
          reorder_level: reorderLevel,
          last_updated: new Date().toISOString(),
        }, { onConflict: 'school_id,item_name' })
        .select();

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.warn('Supabase stock update failed:', error);
      return { success: false, error: error?.message };
    }
  },

  getAlerts: async (schoolId) => {
    if (!isSupabaseConfigured) {
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .eq('school_id', schoolId)
        .eq('is_resolved', false)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.warn('Failed to fetch alerts:', error);
      return [];
    }
  },

  createAlert: async (schoolId, alertType, severity, message) => {
    if (!isSupabaseConfigured) {
      return { success: true };
    }

    try {
      const { data, error } = await supabase
        .from('alerts')
        .insert({
          school_id: schoolId,
          alert_type: alertType,
          severity,
          message,
        })
        .select();

      if (error) throw error;

      return { success: true, alertId: data?.[0]?.id };
    } catch (error) {
      console.warn('Supabase alert creation failed:', error);
      return { success: false };
    }
  },

  getInspectorDashboard: async () => {
    if (!isSupabaseConfigured) {
      return { activeSchools: 0, lowStockAlerts: 0, discrepancyAlerts: 0, schoolsData: [] };
    }

    try {
      const { data: schools, error: schoolsError } = await supabase
        .from('schools')
        .select('*');

      if (schoolsError) throw schoolsError;

      const { data: alerts, error: alertsError } = await supabase
        .from('alerts')
        .select('*')
        .eq('is_resolved', false);

      if (alertsError) throw alertsError;

      const lowStockAlerts = (alerts || []).filter(a => a.alert_type === 'low_stock').length;
      const discrepancyAlerts = (alerts || []).filter(a => a.alert_type === 'attendance_anomaly').length;

      const { data: inventory, error: inventoryError } = await supabase
        .from('inventory_stock')
        .select('school_id, item_name, quantity_kg, reorder_level');

      if (inventoryError) throw inventoryError;

      return {
        activeSchools: (schools || []).length,
        lowStockAlerts,
        discrepancyAlerts,
        schoolsData: schools || [],
        inventoryData: inventory || [],
      };
    } catch (error) {
      console.warn('Failed to fetch inspector dashboard:', error);
      return { activeSchools: 0, lowStockAlerts: 0, discrepancyAlerts: 0, schoolsData: [] };
    }
  },

  // Feature 1: Stock Update Button
  getStockBySchool: async (schoolId) => {
    if (!isSupabaseConfigured) return [];
    try {
      const { data, error } = await supabase
        .from('inventory_stock')
        .select('*')
        .eq('school_id', schoolId);
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.warn('Failed to fetch stock:', error);
      return [];
    }
  },

  // Feature 2: Realtime Updates
  subscribeToStock: (schoolId, callback) => {
    if (!isSupabaseConfigured) return null;
    return supabase
      .channel(`stock-${schoolId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'inventory_stock',
        filter: `school_id=eq.${schoolId}`,
      }, callback)
      .subscribe();
  },

  subscribeToPurchaseOrders: (schoolId, callback) => {
    if (!isSupabaseConfigured) return null;
    return supabase
      .channel(`orders-${schoolId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'purchase_orders',
        filter: `school_id=eq.${schoolId}`,
      }, callback)
      .subscribe();
  },

  subscribeToAlerts: (schoolId, callback) => {
    if (!isSupabaseConfigured) return null;
    return supabase
      .channel(`alerts-${schoolId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'alerts',
        filter: `school_id=eq.${schoolId}`,
      }, callback)
      .subscribe();
  },

  unsubscribeFromChannel: async (subscription) => {
    if (subscription) {
      await supabase.removeChannel(subscription);
    }
  },

  // Feature 3: Offline Mode
  saveToLocalQueue: (action, payload) => {
    const queue = readOfflineQueue();
    queue.push({ action, payload, timestamp: Date.now() });
    writeOfflineQueue(queue);
  },

  syncOfflineQueue: async () => {
    const queue = readOfflineQueue();
    if (queue.length === 0) return { success: true, synced: 0 };

    let synced = 0;
    for (const item of queue) {
      try {
        if (item.action === 'attendance') {
          await apiService.saveAttendance(item.payload.schoolId, item.payload.userId, item.payload.students);
        } else if (item.action === 'stock') {
          await apiService.updateInventoryStock(
            item.payload.schoolId,
            item.payload.itemName,
            item.payload.quantity,
            item.payload.reorderLevel
          );
        } else if (item.action === 'purchase_order') {
          await apiService.createPurchaseOrder(item.payload);
        }
        synced++;
      } catch (error) {
        console.warn('Sync failed for item:', item, error);
      }
    }
    writeOfflineQueue([]);
    return { success: true, synced };
  },

  // Feature 4: Role-Based Permissions
  getSchoolsForUser: async (userId, userRole) => {
    if (!isSupabaseConfigured) return [];
    try {
      let schoolIds = [];

      const { data: assignments, error: assignmentError } = await supabase
        .from('school_assignments')
        .select('school_id')
        .eq('user_id', userId);

      if (!assignmentError && assignments?.length) {
        schoolIds = assignments.map((s) => s.school_id);
      }

      if (schoolIds.length === 0) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('school_id')
          .eq('id', userId)
          .maybeSingle();

        if (profileError) throw profileError;
        if (profileData?.school_id) {
          schoolIds = [profileData.school_id];
        }
      }

      if (schoolIds.length === 0) return [];

      const { data: schools, error: schoolsError } = await supabase
        .from('schools')
        .select('*')
        .in('id', schoolIds);

      if (schoolsError) throw schoolsError;

      const allowedRoles = ['teacher', 'headmaster', 'inspector', 'admin'];
      if (!allowedRoles.includes(userRole)) {
        return [];
      }

      return schools || [];
    } catch (error) {
      console.warn('Failed to fetch user schools:', error);
      return [];
    }
  },

  // Feature 5: User Profile Management
  updateUserProfile: async (userId, updates) => {
    if (!isSupabaseConfigured) return { success: false };
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select();

      if (error) throw error;
      return { success: true, data: data?.[0] };
    } catch (error) {
      console.warn('Profile update failed:', error);
      return { success: false, error: error?.message };
    }
  },

  updateUserPassword: async (newPassword) => {
    if (!isSupabaseConfigured) return { success: false };
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.warn('Password update failed:', error);
      return { success: false, error: error?.message };
    }
  },

  // Feature 6: Multi-School Support (already covered by getSchoolsForUser)

  // Feature 7: Analytics & Reports
  getAnalyticsData: async (schoolId, dateRange = 30) => {
    if (!isSupabaseConfigured) return {};
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - dateRange);

      const { data: attendance, error: attendanceError } = await supabase
        .from('attendance_records')
        .select('attendance_date, present_students')
        .eq('school_id', schoolId)
        .gte('attendance_date', startDate.toISOString().split('T')[0]);

      if (attendanceError) throw attendanceError;

      const { data: orders, error: ordersError } = await supabase
        .from('purchase_orders')
        .select('*')
        .eq('school_id', schoolId)
        .gte('order_date', startDate.toISOString().split('T')[0]);

      if (ordersError) throw ordersError;

      return { attendance: attendance || [], orders: orders || [] };
    } catch (error) {
      console.warn('Failed to fetch analytics:', error);
      return {};
    }
  },

  // Feature 8: Audit Logs
  createAuditLog: async (userId, schoolId, action, details) => {
    if (!isSupabaseConfigured) return { success: true };
    try {
      const { error } = await supabase
        .from('audit_logs')
        .insert({
          user_id: userId,
          school_id: schoolId,
          action,
          details,
        });

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.warn('Audit log creation failed:', error);
      return { success: false };
    }
  },

  getAuditLogs: async (schoolId, limit = 50) => {
    if (!isSupabaseConfigured) return [];
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.warn('Failed to fetch audit logs:', error);
      return [];
    }
  },

  // Feature 9: Advanced Search & Filter
  searchAlerts: async (schoolId, filters) => {
    if (!isSupabaseConfigured) return [];
    try {
      let query = supabase
        .from('alerts')
        .select('*')
        .eq('school_id', schoolId);

      if (filters?.alertType) {
        query = query.eq('alert_type', filters.alertType);
      }
      if (filters?.severity) {
        query = query.eq('severity', filters.severity);
      }
      if (filters?.isResolved !== undefined) {
        query = query.eq('is_resolved', filters.isResolved);
      }
      if (filters?.startDate) {
        query = query.gte('created_at', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('created_at', filters.endDate);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.warn('Alert search failed:', error);
      return [];
    }
  },

  searchOrders: async (schoolId, filters) => {
    if (!isSupabaseConfigured) return [];
    try {
      let query = supabase
        .from('purchase_orders')
        .select('*')
        .eq('school_id', schoolId);

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.startDate) {
        query = query.gte('order_date', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('order_date', filters.endDate);
      }

      const { data, error } = await query.order('order_date', { ascending: false });
      if (error) throw error;
      return (data || []).map((order) => ({
        id: order.id,
        date: new Date(order.order_date).toLocaleDateString('en-GB'),
        items: 'Rice / Pulses / Oil',
        status: order.status,
      }));
    } catch (error) {
      console.warn('Order search failed:', error);
      return [];
    }
  },
};