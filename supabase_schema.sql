-- ==============================================================================
-- POSHANFLOW - COMPLETE DATABASE SCHEMA & MIGRATION SCRIPT
-- Mid-Day Meal Inventory & Attendance Tracking System
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. TABLES DEFINITIONS
-- ==============================================================================

-- Schools Table
CREATE TABLE IF NOT EXISTS public.schools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_name TEXT NOT NULL,
    school_code TEXT NOT NULL UNIQUE,
    district TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Profiles Table (Extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('teacher', 'headmaster', 'inspector', 'admin')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- School Assignments Table (Multi-school mapping for Headmasters/Inspectors)
CREATE TABLE IF NOT EXISTS public.school_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT unique_user_school UNIQUE (user_id, school_id)
);

-- Attendance Records Table
CREATE TABLE IF NOT EXISTS public.attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL,
    present_students INTEGER NOT NULL CHECK (present_students >= 0),
    recorded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT unique_school_attendance_date UNIQUE (school_id, attendance_date)
);

-- Inventory Stock Table
CREATE TABLE IF NOT EXISTS public.inventory_stock (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    item_name TEXT NOT NULL,
    quantity_kg NUMERIC NOT NULL CHECK (quantity_kg >= 0),
    reorder_level NUMERIC NOT NULL DEFAULT 10 CHECK (reorder_level >= 0),
    last_updated TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT unique_school_item_stock UNIQUE (school_id, item_name)
);

-- Purchase Orders Table
CREATE TABLE IF NOT EXISTS public.purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    generated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'dispatched', 'delivered', 'rejected')),
    notes TEXT,
    order_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Purchase Order Items Table
CREATE TABLE IF NOT EXISTS public.purchase_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
    item_name TEXT NOT NULL,
    quantity_kg NUMERIC NOT NULL CHECK (quantity_kg > 0),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Alerts Table
CREATE TABLE IF NOT EXISTS public.alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    alert_type TEXT NOT NULL CHECK (alert_type IN ('low_stock', 'attendance_anomaly', 'purchase_order', 'general')),
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    message TEXT NOT NULL,
    is_resolved BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ==============================================================================
-- 3. INDEXES FOR PERFORMANCE
-- ==============================================================================

CREATE INDEX IF NOT EXISTS idx_profiles_school_id ON public.profiles(school_id);
CREATE INDEX IF NOT EXISTS idx_school_assignments_user_id ON public.school_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_school_assignments_school_id ON public.school_assignments(school_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_school_date ON public.attendance_records(school_id, attendance_date);
CREATE INDEX IF NOT EXISTS idx_inventory_stock_school ON public.inventory_stock(school_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_school ON public.purchase_orders(school_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_date ON public.purchase_orders(order_date);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_order ON public.purchase_order_items(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_alerts_school_unresolved ON public.alerts(school_id) WHERE is_resolved = false;
CREATE INDEX IF NOT EXISTS idx_audit_logs_school ON public.audit_logs(school_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs(created_at DESC);

-- ==============================================================================
-- 4. ATOMIC DATABASE RPC FUNCTIONS
-- ==============================================================================

-- Atomic Purchase Order Creation Function
CREATE OR REPLACE FUNCTION public.create_purchase_order_atomic(
    p_school_id UUID,
    p_user_id UUID,
    p_notes TEXT,
    p_items JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order_id UUID;
    v_item JSONB;
    v_item_name TEXT;
    v_quantity NUMERIC;
BEGIN
    -- Validate school
    IF NOT EXISTS (SELECT 1 FROM public.schools WHERE id = p_school_id) THEN
        RAISE EXCEPTION 'Invalid school ID %', p_school_id;
    END IF;

    -- Insert parent purchase order
    INSERT INTO public.purchase_orders (
        school_id,
        generated_by,
        status,
        notes,
        order_date
    ) VALUES (
        p_school_id,
        p_user_id,
        'pending',
        COALESCE(p_notes, 'Standard ration procurement order'),
        CURRENT_DATE
    )
    RETURNING id INTO v_order_id;

    -- Insert line items
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_item_name := v_item->>'item_name';
        v_quantity := (v_item->>'quantity_kg')::NUMERIC;

        IF v_item_name IS NOT NULL AND v_quantity > 0 THEN
            INSERT INTO public.purchase_order_items (
                purchase_order_id,
                item_name,
                quantity_kg
            ) VALUES (
                v_order_id,
                v_item_name,
                v_quantity
            );
        END IF;
    END LOOP;

    -- Create audit log entry
    INSERT INTO public.audit_logs (
        user_id,
        school_id,
        action,
        details
    ) VALUES (
        p_user_id,
        p_school_id,
        'purchase_order_created',
        jsonb_build_object('purchase_order_id', v_order_id, 'items', p_items)
    );

    RETURN jsonb_build_object(
        'success', true,
        'order_id', v_order_id,
        'message', 'Purchase order created successfully with all items'
    );
EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to create purchase order: %', SQLERRM;
END;
$$;

-- Automatic Profile Creation Trigger on Auth Signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (
        id,
        email,
        full_name,
        role,
        school_id
    ) VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'role', 'teacher'),
        (NEW.raw_user_meta_data->>'school_id')::UUID
    )
    ON CONFLICT (id) DO UPDATE
    SET
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
        role = COALESCE(EXCLUDED.role, public.profiles.role),
        school_id = COALESCE(EXCLUDED.school_id, public.profiles.school_id);

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================================
-- 4A. ACCESS CONTROL FOR INSPECTOR-ONLY PROVISIONING
-- =====================================================================
-- Never trust a role supplied by a browser. New public Auth signups (if the
-- provider is accidentally enabled) are inactive teachers without a school;
-- the create-teacher Edge Function assigns the final role and school.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role, school_id, status)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        'teacher',
        NULL,
        'inactive'
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_inspector_or_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND status = 'active' AND role IN ('inspector', 'admin')
    );
$$;

DROP POLICY IF EXISTS "Schools can be created by authenticated users" ON public.schools;
CREATE POLICY "Schools can be created only by inspectors" ON public.schools
    FOR INSERT WITH CHECK (public.is_inspector_or_admin());

DROP POLICY IF EXISTS "Schools can be updated by authenticated users" ON public.schools;
CREATE POLICY "Schools can be updated only by inspectors" ON public.schools
    FOR UPDATE USING (public.is_inspector_or_admin());

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert only their own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Profiles updated by owner or inspector" ON public.profiles
    FOR UPDATE USING (auth.uid() = id OR public.is_inspector_or_admin());

DROP POLICY IF EXISTS "Assignments manageable by authenticated" ON public.school_assignments;
CREATE POLICY "Assignments managed only by inspectors" ON public.school_assignments
    FOR ALL USING (public.is_inspector_or_admin()) WITH CHECK (public.is_inspector_or_admin());

-- ==============================================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS on all tables
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Schools Policies (Public / Authenticated read, Authenticated insert/update)
DROP POLICY IF EXISTS "Schools are viewable by all users" ON public.schools;
CREATE POLICY "Schools are viewable by all users" ON public.schools
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Schools can be created by authenticated users" ON public.schools;
CREATE POLICY "Schools can be created by authenticated users" ON public.schools
    FOR INSERT WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'anon');

DROP POLICY IF EXISTS "Schools can be updated by authenticated users" ON public.schools;
CREATE POLICY "Schools can be updated by authenticated users" ON public.schools
    FOR UPDATE USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

-- Profiles Policies
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
CREATE POLICY "Profiles are viewable by authenticated users" ON public.profiles
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id OR auth.role() = 'authenticated' OR auth.role() = 'anon');

-- School Assignments Policies
DROP POLICY IF EXISTS "Assignments viewable by all" ON public.school_assignments;
CREATE POLICY "Assignments viewable by all" ON public.school_assignments
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Assignments manageable by authenticated" ON public.school_assignments;
CREATE POLICY "Assignments manageable by authenticated" ON public.school_assignments
    FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

-- Attendance Records Policies
DROP POLICY IF EXISTS "Attendance records viewable by all" ON public.attendance_records;
CREATE POLICY "Attendance records viewable by all" ON public.attendance_records
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Attendance records insertable" ON public.attendance_records;
CREATE POLICY "Attendance records insertable" ON public.attendance_records
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Attendance records updatable" ON public.attendance_records;
CREATE POLICY "Attendance records updatable" ON public.attendance_records
    FOR UPDATE USING (true);

-- Inventory Stock Policies
DROP POLICY IF EXISTS "Inventory viewable by all" ON public.inventory_stock;
CREATE POLICY "Inventory viewable by all" ON public.inventory_stock
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Inventory insertable" ON public.inventory_stock;
CREATE POLICY "Inventory insertable" ON public.inventory_stock
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Inventory updatable" ON public.inventory_stock;
CREATE POLICY "Inventory updatable" ON public.inventory_stock
    FOR UPDATE USING (true);

-- Purchase Orders Policies
DROP POLICY IF EXISTS "Purchase orders viewable by all" ON public.purchase_orders;
CREATE POLICY "Purchase orders viewable by all" ON public.purchase_orders
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Purchase orders insertable" ON public.purchase_orders;
CREATE POLICY "Purchase orders insertable" ON public.purchase_orders
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Purchase orders updatable" ON public.purchase_orders;
CREATE POLICY "Purchase orders updatable" ON public.purchase_orders
    FOR UPDATE USING (true);

-- Purchase Order Items Policies
DROP POLICY IF EXISTS "Order items viewable by all" ON public.purchase_order_items;
CREATE POLICY "Order items viewable by all" ON public.purchase_order_items
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Order items insertable" ON public.purchase_order_items;
CREATE POLICY "Order items insertable" ON public.purchase_order_items
    FOR INSERT WITH CHECK (true);

-- Alerts Policies
DROP POLICY IF EXISTS "Alerts viewable by all" ON public.alerts;
CREATE POLICY "Alerts viewable by all" ON public.alerts
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Alerts insertable" ON public.alerts;
CREATE POLICY "Alerts insertable" ON public.alerts
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Alerts updatable" ON public.alerts;
CREATE POLICY "Alerts updatable" ON public.alerts
    FOR UPDATE USING (true);

-- Audit Logs Policies
DROP POLICY IF EXISTS "Audit logs viewable by all" ON public.audit_logs;
CREATE POLICY "Audit logs viewable by all" ON public.audit_logs
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Audit logs insertable" ON public.audit_logs;
CREATE POLICY "Audit logs insertable" ON public.audit_logs
    FOR INSERT WITH CHECK (true);

-- ==============================================================================
-- END OF SCHEMA MIGRATION SCRIPT
-- ==============================================================================
