import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { getIndiaDateString } from '../utils/indiaDate';
import { offlineQueue } from './offlineQueue';

function isBrowserOnline() {
  return typeof navigator === 'undefined' ? true : navigator.onLine;
}

export const apiService = {
  // ==========================================
  // AUTHENTICATION & PROFILES
  // ==========================================

  /**
   * Genuine Supabase Auth Login.
   */
  login: async (credentials) => {
    if (!isSupabaseConfigured) {
      return {
        success: false,
        message: 'Supabase is not configured. Please check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
      };
    }

    try {
      const email = credentials.email?.trim();
      const password = credentials.password;

      if (!email || !password) {
        return { success: false, message: 'Email and password are required.' };
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { success: false, message: error.message || 'Login failed. Please check your credentials.' };
      }

      const userId = data?.user?.id;
      let profile = null;
      let schoolData = null;

      if (userId) {
        // Fetch profile
        const { data: profileResult } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();

        profile = profileResult;

        // A login must never create or choose its own role. Accounts are provisioned
        // by an inspector, so a missing profile means the account is not authorised.
        if (!profile) {
          await supabase.auth.signOut();
          return { success: false, message: 'This account has not been assigned by a District Inspector.' };
        }

        if (profile.status !== 'active' || !['teacher', 'headmaster', 'inspector', 'admin'].includes(profile.role)) {
          await supabase.auth.signOut();
          return { success: false, message: 'This account is inactive or does not have a valid system role.' };
        }

        const requestedInspectorPortal = credentials.portal === 'inspector';
        const hasInspectorRole = ['inspector', 'admin'].includes(profile.role);
        if (requestedInspectorPortal !== hasInspectorRole) {
          await supabase.auth.signOut();
          return {
            success: false,
            message: hasInspectorRole
              ? 'This account is a District Inspector. Please use the District Inspector login.'
              : 'This account is a Teacher or Headmaster. Please use the Teacher / Headmaster login.',
          };
        }

        // Fetch school details if assigned
        if (profile?.school_id) {
          const { data: schoolResult } = await supabase
            .from('schools')
            .select('*')
            .eq('id', profile.school_id)
            .maybeSingle();

          schoolData = schoolResult;
        }
      }

      return {
        success: true,
        userId,
        email: data?.user?.email || email,
        role: profile.role,
        schoolId: profile?.school_id || null,
        name: profile?.full_name || email.split('@')[0],
        schoolName: schoolData?.school_name || null,
        schoolCode: schoolData?.school_code || null,
      };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        message: error?.message || 'Login failed unexpectedly. Please try again.',
      };
    }
  },

  createTeacherAccount: async ({ fullName, email, password, schoolId, role = 'teacher' }) => {
    if (!isSupabaseConfigured) return { success: false, message: 'Supabase is not configured.' };
    if (!fullName?.trim() || !email?.trim() || !password || !schoolId) return { success: false, message: 'All teacher and school fields are required.' };
    if (password.length < 8) return { success: false, message: 'Temporary password must contain at least 8 characters.' };
    try {
      const { data, error } = await supabase.functions.invoke('create-teacher', {
        body: { fullName: fullName.trim(), email: email.trim(), password, schoolId, role },
      });
      if (error) throw error;
      return data?.success ? data : { success: false, message: data?.message || 'Unable to create teacher account.' };
    } catch (error) {
      let message = error.message || 'Unable to create teacher account.';
      // Supabase FunctionsHttpError stores the server response in `context`.
      // Read it so inspectors receive the actionable server-side error message.
      if (error.context?.json) {
        try {
          const details = await error.context.json();
          message = details?.message || message;
        } catch {
          // Keep the original error when a response body is unavailable.
        }
      }
      return { success: false, message };
    }
  },

  requestPasswordReset: async (email) => {
    if (!isSupabaseConfigured) return { success: false, message: 'Supabase is not configured.' };
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: window.location.origin,
      });
      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { success: false, message: error.message || 'Unable to send the password reset email.' };
    }
  },

  /**
   * Logout from Supabase.
   */
  logout: async () => {
    try {
      if (isSupabaseConfigured) {
        await supabase.auth.signOut();
      }
    } catch (error) {
      console.warn('Logout error:', error);
    }
    return { success: true };
  },

  /**
   * Retrieves active authenticated session and profile.
   */
  getCurrentUser: async () => {
    if (!isSupabaseConfigured) return null;
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) return null;

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (!profile || profile.status !== 'active' || !['teacher', 'headmaster', 'inspector', 'admin'].includes(profile.role)) {
        return null;
      }

      let schoolData = null;
      if (profile?.school_id) {
        const { data: s } = await supabase
          .from('schools')
          .select('*')
          .eq('id', profile.school_id)
          .maybeSingle();
        schoolData = s;
      }

      return {
        id: user.id,
        email: user.email,
        name: profile.full_name || user.email.split('@')[0],
        role: profile.role,
        schoolId: profile.school_id || null,
        schoolName: schoolData?.school_name || null,
        schoolCode: schoolData?.school_code || null,
      };
    } catch (error) {
      console.warn('Error fetching current user session:', error);
      return null;
    }
  },

  updateUserProfile: async (userId, updates) => {
    if (!isSupabaseConfigured) return { success: false, message: 'Supabase not configured' };
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select();

      if (error) throw error;
      return { success: true, data: data?.[0] };
    } catch (error) {
      console.error('Profile update failed:', error);
      return { success: false, error: error?.message };
    }
  },

  updateUserPassword: async (newPassword) => {
    if (!isSupabaseConfigured) return { success: false, message: 'Supabase not configured' };
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Password update failed:', error);
      return { success: false, error: error?.message };
    }
  },

  // ==========================================
  // SCHOOLS MANAGEMENT
  // ==========================================

  /**
   * Fetch schools for current user role and permissions.
   * Inspectors / Admins get all registered schools.
   * Teachers get their assigned school(s).
   */
  getSchoolsForUser: async (userId, userRole) => {
    if (!isSupabaseConfigured) return [];
    try {
      if (userRole === 'inspector' || userRole === 'admin') {
        const { data, error } = await supabase
          .from('schools')
          .select('*')
          .order('school_name', { ascending: true });

        if (error) throw error;
        return data || [];
      }

      // For teachers / headmasters
      let schoolIds = [];

      // Check school_assignments table
      try {
        const { data: assignments, error: assignmentError } = await supabase
          .from('school_assignments')
          .select('school_id')
          .eq('user_id', userId);

        if (!assignmentError && assignments?.length) {
          schoolIds = assignments.map((s) => s.school_id);
        }
      } catch {
        // Table might not exist or error, continue to profile lookup
      }

      // Check profile.school_id
      if (schoolIds.length === 0 && userId) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('school_id')
          .eq('id', userId)
          .maybeSingle();

        if (profileData?.school_id) {
          schoolIds = [profileData.school_id];
        }
      }

      if (schoolIds.length === 0) {
        // If teacher has no specific school assigned, return all schools so they can select their school
        const { data: allSchools } = await supabase
          .from('schools')
          .select('*')
          .order('school_name', { ascending: true });
        return allSchools || [];
      }

      const { data: schools, error: schoolsError } = await supabase
        .from('schools')
        .select('*')
        .in('id', schoolIds)
        .order('school_name', { ascending: true });

      if (schoolsError) throw schoolsError;
      return schools || [];
    } catch (error) {
      console.error('Failed to fetch user schools:', error);
      return [];
    }
  },

  /**
   * Inspector registers a new school.
   */
  addSchool: async ({ school_name, school_code, district }) => {
    if (!isSupabaseConfigured) {
      return { success: false, message: 'Supabase not configured' };
    }

    try {
      const currentUser = await apiService.getCurrentUser();
      if (!currentUser || !['inspector', 'admin'].includes(currentUser.role)) {
        return { success: false, message: 'Only a District Inspector can register schools.' };
      }
      if (!school_name?.trim() || !school_code?.trim() || !district?.trim()) {
        return { success: false, message: 'All school fields are required.' };
      }

      const { data, error } = await supabase
        .from('schools')
        .insert({
          school_name: school_name.trim(),
          school_code: school_code.trim().toUpperCase(),
          district: district.trim(),
        })
        .select();

      if (error) {
        if (error.code === '23505') {
          return { success: false, message: 'A school with this code already exists.' };
        }
        throw error;
      }

      const newSchool = data?.[0];

      // Initialize default zero inventory stock rows for the new school
      if (newSchool?.id) {
        for (const item of ['rice', 'pulses', 'oil']) {
          await supabase.from('inventory_stock').upsert({
            school_id: newSchool.id,
            item_name: item,
            quantity_kg: 0,
            reorder_level: item === 'rice' ? 10 : item === 'pulses' ? 5 : 2,
            last_updated: new Date().toISOString(),
          }, { onConflict: 'school_id,item_name' });
        }
      }

      return { success: true, school: newSchool };
    } catch (error) {
      console.error('Add school failed:', error);
      return { success: false, message: error.message || 'Failed to add school.' };
    }
  },

  // ==========================================
  // DASHBOARD DATA & INVENTORY
  // ==========================================

  /**
   * Fetches real inventory stock and purchase orders for a school.
   * Returns empty zeros when database has no records. NO FAKE DATA.
   */
  getDashboardData: async (schoolId, _options = {}) => {
    if (!isSupabaseConfigured || !schoolId) {
      return {
        stock: { rice: 0, pulses: 0, oil: 0 },
        history: [],
      };
    }

    try {
      // 1. Fetch real inventory stock
      const { data: stockData, error: stockError } = await supabase
        .from('inventory_stock')
        .select('*')
        .eq('school_id', schoolId);

      if (stockError) throw stockError;

      const stockMap = { rice: 0, pulses: 0, oil: 0 };
      (stockData || []).forEach((item) => {
        const key = item.item_name?.toLowerCase();
        if (key in stockMap) {
          stockMap[key] = Number(item.quantity_kg || 0);
        }
      });

      // 2. Fetch real purchase orders with items
      const { data: orderData, error: orderError } = await supabase
        .from('purchase_orders')
        .select(`
          id,
          order_date,
          status,
          notes,
          purchase_order_items (
            item_name,
            quantity_kg
          )
        `)
        .eq('school_id', schoolId)
        .order('order_date', { ascending: false });

      if (orderError) throw orderError;

      const history = (orderData || []).map((order) => {
        const itemsList = (order.purchase_order_items || [])
          .map((i) => `${i.item_name}: ${i.quantity_kg}kg`)
          .join(', ');

        return {
          id: order.id,
          date: new Date(order.order_date).toLocaleDateString('en-GB'),
          items: itemsList || order.notes || 'Ration Order',
          status: order.status || 'pending',
        };
      });

      return {
        stock: stockMap,
        history,
      };
    } catch (error) {
      console.error('getDashboardData error:', error);
      return {
        stock: { rice: 0, pulses: 0, oil: 0 },
        history: [],
        error: error.message,
      };
    }
  },

  // ==========================================
  // ATTENDANCE MANAGEMENT
  // ==========================================

  /**
   * Records attendance for the current India calendar date.
   * Prevents duplicates by enforcing same-day upsert.
   */
  saveAttendance: async (schoolId, userId, presentStudents) => {
    if (!schoolId) {
      return { success: false, message: 'School ID is required to record attendance.' };
    }

    const studentsCount = Math.max(0, Number(presentStudents) || 0);
    const today = getIndiaDateString();

    const payload = {
      school_id: schoolId,
      attendance_date: today,
      present_students: studentsCount,
      recorded_by: userId || null,
    };

    // Offline handling
    if (!isBrowserOnline()) {
      await offlineQueue.enqueue('attendance', payload);
      return { success: true, queued: true, attendanceDate: today, students: studentsCount };
    }

    if (!isSupabaseConfigured) {
      return { success: false, message: 'Supabase not configured' };
    }

    try {
      // Read the previous value so editing today's attendance only deducts the
      // difference, never the full class twice.
      const { data: previous } = await supabase
        .from('attendance_records')
        .select('present_students')
        .eq('school_id', schoolId)
        .eq('attendance_date', today)
        .maybeSingle();

      const { data, error } = await supabase
        .from('attendance_records')
        .upsert(payload, { onConflict: 'school_id,attendance_date' })
        .select();

      if (error) throw error;

      const delta = studentsCount - Number(previous?.present_students || 0);
      if (delta !== 0) {
        const deductions = { rice: delta * 0.1, pulses: delta * 0.02, oil: delta * 0.005 };
        const { data: currentStock } = await supabase
          .from('inventory_stock')
          .select('*')
          .eq('school_id', schoolId);
        for (const [itemName, amount] of Object.entries(deductions)) {
          const row = (currentStock || []).find((item) => item.item_name?.toLowerCase() === itemName);
          if (!row) continue;
          await supabase.from('inventory_stock').upsert({
            school_id: schoolId,
            item_name: itemName,
            quantity_kg: Math.max(0, Number(row.quantity_kg || 0) - amount),
            reorder_level: Number(row.reorder_level || 0),
            last_updated: new Date().toISOString(),
          }, { onConflict: 'school_id,item_name' });
        }
      }

      return {
        success: true,
        attendanceId: data?.[0]?.id,
        attendanceDate: today,
        students: studentsCount,
      };
    } catch (error) {
      console.error('Supabase attendance save failed:', error);
      // If network failed mid-request, save to offline queue
      await offlineQueue.enqueue('attendance', payload);
      return { success: true, queued: true, error: error.message };
    }
  },

  /**
   * Fetches real attendance history from attendance_records.
   * Returns empty array if no records exist.
   */
  getAttendanceLast7Days: async (schoolId) => {
    if (!isSupabaseConfigured || !schoolId) return [];
    try {
      const { data, error } = await supabase
        .from('attendance_records')
        .select('id, attendance_date, present_students')
        .eq('school_id', schoolId)
        .order('attendance_date', { ascending: false })
        .limit(7);

      if (error) throw error;
      // Return sorted ascending for chronological display
      return (data || []).reverse();
    } catch (error) {
      console.error('Failed to fetch attendance history:', error);
      return [];
    }
  },

  getAttendanceHistory: async (schoolId, limit = 30) => {
    if (!isSupabaseConfigured || !schoolId) return [];
    try {
      const { data, error } = await supabase
        .from('attendance_records')
        .select('id, attendance_date, present_students')
        .eq('school_id', schoolId)
        .order('attendance_date', { ascending: true })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Failed to fetch attendance records:', error);
      return [];
    }
  },

  // ==========================================
  // INVENTORY STOCK
  // ==========================================

  getStockBySchool: async (schoolId) => {
    if (!isSupabaseConfigured || !schoolId) return [];
    try {
      const { data, error } = await supabase
        .from('inventory_stock')
        .select('*')
        .eq('school_id', schoolId);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Failed to fetch stock:', error);
      return [];
    }
  },

  updateInventoryStock: async (schoolId, itemName, quantity, reorderLevel) => {
    if (!schoolId || !itemName) {
      return { success: false, message: 'School ID and item name are required.' };
    }

    const payload = {
      school_id: schoolId,
      item_name: itemName.toLowerCase(),
      quantity_kg: Math.max(0, Number(quantity) || 0),
      reorder_level: Math.max(0, Number(reorderLevel) || 0),
      last_updated: new Date().toISOString(),
    };

    if (!isBrowserOnline()) {
      await offlineQueue.enqueue('stock', payload);
      return { success: true, queued: true };
    }

    if (!isSupabaseConfigured) return { success: false, message: 'Supabase not configured' };

    try {
      const { data, error } = await supabase
        .from('inventory_stock')
        .upsert(payload, { onConflict: 'school_id,item_name' })
        .select();

      if (error) throw error;
      return { success: true, data: data?.[0] };
    } catch (error) {
      console.error('Supabase stock update failed:', error);
      await offlineQueue.enqueue('stock', payload);
      return { success: false, error: error?.message };
    }
  },

  // ==========================================
  // PURCHASE ORDERS (ATOMIC PERSISTENCE)
  // ==========================================

  createPurchaseOrder: async (orderPayload) => {
    const { schoolId, userId, items, notes } = orderPayload;

    if (!schoolId) {
      return { success: false, message: 'School ID is required to create a purchase order.' };
    }

    if (!items || items.length === 0) {
      return { success: false, message: 'Order must contain at least one item.' };
    }

    if (!isBrowserOnline()) {
      await offlineQueue.enqueue('purchase_order', orderPayload);
      return { success: true, queued: true, orderId: `OFFLINE-${Date.now()}` };
    }

    if (!isSupabaseConfigured) {
      return { success: false, message: 'Supabase is not configured.' };
    }

    try {
      // 1. Try atomic RPC if available in database
      const { data: rpcData, error: rpcError } = await supabase.rpc('create_purchase_order_atomic', {
        p_school_id: schoolId,
        p_user_id: userId || null,
        p_notes: notes || 'Standard ration procurement order',
        p_items: items,
      });

      if (!rpcError && rpcData?.success) {
        return { success: true, orderId: rpcData.order_id };
      }

      // 2. Fallback to sequenced inserts with transaction rollback logic
      const today = getIndiaDateString();
      const { data: orderData, error: orderError } = await supabase
        .from('purchase_orders')
        .insert({
          school_id: schoolId,
          generated_by: userId || null,
          status: 'pending',
          notes: notes || 'Standard ration procurement order',
          order_date: today,
        })
        .select();

      if (orderError) throw orderError;

      const orderId = orderData?.[0]?.id;
      if (!orderId) throw new Error('Failed to retrieve created purchase order ID.');

      // 3. Insert line items
      const itemRows = items.map((item) => ({
        purchase_order_id: orderId,
        item_name: item.item_name,
        quantity_kg: Number(item.quantity_kg) || 0,
      }));

      const { error: itemsError } = await supabase
        .from('purchase_order_items')
        .insert(itemRows);

      if (itemsError) {
        // Rollback parent order to avoid orphaned records
        await supabase.from('purchase_orders').delete().eq('id', orderId);
        throw itemsError;
      }

      // 4. Log alert and audit record
      await supabase.from('alerts').insert({
        school_id: schoolId,
        alert_type: 'purchase_order',
        severity: 'medium',
        message: `New purchase order created for ${items.map((i) => `${i.quantity_kg}kg ${i.item_name}`).join(', ')}`,
      });

      return { success: true, orderId };
    } catch (error) {
      console.error('Purchase order creation failed:', error);
      return { success: false, message: error?.message || 'Failed to save purchase order to database.' };
    }
  },

  updatePurchaseOrderStatus: async (orderId, status, userId) => {
    if (!orderId || !['pending', 'approved', 'dispatched', 'delivered', 'rejected'].includes(status)) {
      return { success: false, message: 'A valid order and status are required.' };
    }
    if (!isSupabaseConfigured) return { success: false, message: 'Supabase is not configured.' };
    const { data, error } = await supabase
      .from('purchase_orders')
      .update({ status })
      .eq('id', orderId)
      .select('id, school_id, order_date, status')
      .maybeSingle();
    if (error) return { success: false, message: error.message };
    await apiService.createAuditLog(userId, data?.school_id || null, 'purchase_order_status_update', { orderId, status });
    return { success: true, order: data };
  },

  // ==========================================
  // ALERTS & AUDIT LOGS
  // ==========================================

  getAlerts: async (schoolId) => {
    if (!isSupabaseConfigured) return [];
    try {
      let query = supabase.from('alerts').select('*').eq('is_resolved', false);
      if (schoolId) {
        query = query.eq('school_id', schoolId);
      }
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
      return [];
    }
  },

  createAlert: async (schoolId, alertType, severity, message) => {
    if (!isSupabaseConfigured || !schoolId) return { success: false };
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
      console.error('Supabase alert creation failed:', error);
      return { success: false };
    }
  },

  createAuditLog: async (userId, schoolId, action, details) => {
    if (!isSupabaseConfigured) return { success: true };
    try {
      const { error } = await supabase.from('audit_logs').insert({
        user_id: userId || null,
        school_id: schoolId || null,
        action,
        details,
      });

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.warn('Audit log write error:', error);
      return { success: false };
    }
  },

  getAuditLogs: async (schoolId, limit = 50) => {
    if (!isSupabaseConfigured) return [];
    try {
      let query = supabase.from('audit_logs').select('*');
      if (schoolId) {
        query = query.eq('school_id', schoolId);
      }
      const { data, error } = await query.order('created_at', { ascending: false }).limit(limit);
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
      return [];
    }
  },

  // ==========================================
  // DISTRICT INSPECTOR DASHBOARD AGGREGATIONS
  // ==========================================

  getInspectorDashboard: async () => {
    if (!isSupabaseConfigured) {
      return {
        activeSchools: 0,
        lowStockAlerts: 0,
        discrepancyAlerts: 0,
        schoolsData: [],
        inventoryData: [],
        attendanceData: [],
        ordersData: [],
      };
    }

    try {
      // 1. Schools
      const { data: schools, error: sErr } = await supabase
        .from('schools')
        .select('*')
        .order('school_name', { ascending: true });
      if (sErr) throw sErr;

      // 2. Unresolved Alerts
      const { data: alerts, error: aErr } = await supabase
        .from('alerts')
        .select('*')
        .eq('is_resolved', false);
      if (aErr) console.warn('Inspector alerts unavailable:', aErr.message);

      const lowStockAlerts = (alerts || []).filter((a) => a.alert_type === 'low_stock').length;
      const discrepancyAlerts = (alerts || []).filter((a) => a.alert_type === 'attendance_anomaly').length;

      // 3. Inventory across all schools
      const { data: inventory, error: iErr } = await supabase
        .from('inventory_stock')
        .select('school_id, item_name, quantity_kg, reorder_level');
      if (iErr) throw iErr;

      // 4. Latest attendance across schools
      const { data: attendance, error: attErr } = await supabase
        .from('attendance_records')
        .select('school_id, attendance_date, present_students')
        .order('attendance_date', { ascending: false });
      if (attErr) throw attErr;

      // 5. Purchase orders across district
      const { data: orders, error: oErr } = await supabase
        .from('purchase_orders')
        .select('id, school_id, order_date, status')
      if (oErr) console.warn('Inspector purchase orders unavailable:', oErr.message);

      const orderIds = (orders || []).map((order) => order.id);
      let orderItems = [];
      if (!oErr && orderIds.length > 0) {
        const { data: itemRows, error: itemErr } = await supabase
          .from('purchase_order_items')
          .select('purchase_order_id, item_name, quantity_kg')
          .in('purchase_order_id', orderIds);
        if (itemErr) console.warn('Inspector order items unavailable:', itemErr.message);
        orderItems = itemRows || [];
      }
      const enrichedOrders = (orders || []).map((order) => ({
        ...order,
        school_name: (schools || []).find((school) => String(school.id).trim().toLowerCase() === String(order.school_id).trim().toLowerCase())?.school_name || null,
        purchase_order_items: orderItems.filter((item) => item.purchase_order_id === order.id),
      }));

      return {
        activeSchools: (schools || []).length,
        lowStockAlerts,
        discrepancyAlerts,
        schoolsData: schools || [],
        inventoryData: inventory || [],
        attendanceData: attendance || [],
        ordersData: enrichedOrders,
      };
    } catch (error) {
      console.error('Inspector dashboard aggregation failed:', error);
      return {
        activeSchools: 0,
        lowStockAlerts: 0,
        discrepancyAlerts: 0,
        schoolsData: [],
        inventoryData: [],
        attendanceData: [],
        ordersData: [],
      };
    }
  },

  // ==========================================
  // REAL-TIME SUBSCRIPTIONS
  // ==========================================

  subscribeToStock: (schoolId, callback) => {
    if (!isSupabaseConfigured) return null;
    return supabase
      .channel(`stock-${schoolId || 'all'}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'inventory_stock',
        filter: schoolId ? `school_id=eq.${schoolId}` : undefined,
      }, callback)
      .subscribe();
  },

  subscribeToPurchaseOrders: (schoolId, callback) => {
    if (!isSupabaseConfigured) return null;
    return supabase
      .channel(`orders-${schoolId || 'all'}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'purchase_orders',
        filter: schoolId ? `school_id=eq.${schoolId}` : undefined,
      }, callback)
      .subscribe();
  },

  subscribeToAlerts: (schoolId, callback) => {
    if (!isSupabaseConfigured) return null;
    return supabase
      .channel(`alerts-${schoolId || 'all'}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'alerts',
        filter: schoolId ? `school_id=eq.${schoolId}` : undefined,
      }, callback)
      .subscribe();
  },

  subscribeToSchools: (callback) => {
    if (!isSupabaseConfigured) return null;
    return supabase
      .channel('schools-all')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'schools',
      }, callback)
      .subscribe();
  },

  unsubscribeFromChannel: async (subscription) => {
    if (subscription) {
      try {
        await supabase.removeChannel(subscription);
      } catch (e) {
        console.warn('Error removing subscription channel:', e);
      }
    }
  },

  // ==========================================
  // OFFLINE QUEUE SYNC
  // ==========================================

  syncOfflineQueue: async () => {
    const pendingItems = await offlineQueue.getAllPending();
    if (!pendingItems || pendingItems.length === 0) {
      return { success: true, synced: 0 };
    }

    let syncedCount = 0;
    for (const item of pendingItems) {
      try {
        if (item.action === 'attendance') {
          const res = await apiService.saveAttendance(
            item.payload.school_id,
            item.payload.recorded_by,
            item.payload.present_students
          );
          if (res.success && !res.queued) {
            await offlineQueue.remove(item.id);
            syncedCount++;
          }
        } else if (item.action === 'stock') {
          const res = await apiService.updateInventoryStock(
            item.payload.school_id,
            item.payload.item_name,
            item.payload.quantity_kg,
            item.payload.reorder_level
          );
          if (res.success && !res.queued) {
            await offlineQueue.remove(item.id);
            syncedCount++;
          }
        } else if (item.action === 'purchase_order') {
          const res = await apiService.createPurchaseOrder(item.payload);
          if (res.success && !res.queued) {
            await offlineQueue.remove(item.id);
            syncedCount++;
          }
        }
      } catch (err) {
        console.warn('Sync failed for offline item:', item, err);
      }
    }

    return { success: true, synced: syncedCount };
  },

  // ==========================================
  // SEARCH & FILTERS
  // ==========================================

  searchAlerts: async (schoolId, filters) => {
    if (!isSupabaseConfigured) return [];
    try {
      let query = supabase.from('alerts').select('*');
      if (schoolId) query = query.eq('school_id', schoolId);

      if (filters?.alertType) query = query.eq('alert_type', filters.alertType);
      if (filters?.severity) query = query.eq('severity', filters.severity);
      if (filters?.isResolved !== '' && filters?.isResolved !== undefined) {
        query = query.eq('is_resolved', filters.isResolved);
      }
      if (filters?.startDate) query = query.gte('created_at', filters.startDate);
      if (filters?.endDate) query = query.lte('created_at', filters.endDate);

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Alert search failed:', error);
      return [];
    }
  },

  searchOrders: async (schoolId, filters) => {
    if (!isSupabaseConfigured) return [];
    try {
      let query = supabase
        .from('purchase_orders')
        .select(`
          id,
          order_date,
          status,
          notes,
          purchase_order_items (
            item_name,
            quantity_kg
          )
        `);

      if (schoolId) query = query.eq('school_id', schoolId);
      if (filters?.status) query = query.eq('status', filters.status);
      if (filters?.startDate) query = query.gte('order_date', filters.startDate);
      if (filters?.endDate) query = query.lte('order_date', filters.endDate);

      const { data, error } = await query.order('order_date', { ascending: false });
      if (error) throw error;

      return (data || []).map((order) => ({
        id: order.id,
        date: new Date(order.order_date).toLocaleDateString('en-GB'),
        items: (order.purchase_order_items || []).map((i) => `${i.item_name}: ${i.quantity_kg}kg`).join(', ') || order.notes || 'Ration Order',
        status: order.status,
      }));
    } catch (error) {
      console.error('Order search failed:', error);
      return [];
    }
  },
};
