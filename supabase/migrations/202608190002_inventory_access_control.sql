-- Only inspectors/admins may write inventory directly. Delivery and attendance
-- use SECURITY DEFINER functions below so stock changes remain server-side.
DROP POLICY IF EXISTS "Inventory insertable" ON public.inventory_stock;
DROP POLICY IF EXISTS "Inventory updatable" ON public.inventory_stock;
CREATE POLICY "Inventory insertable by inspectors" ON public.inventory_stock
  FOR INSERT WITH CHECK (public.is_inspector_or_admin());
CREATE POLICY "Inventory updatable by inspectors" ON public.inventory_stock
  FOR UPDATE USING (public.is_inspector_or_admin()) WITH CHECK (public.is_inspector_or_admin());

CREATE OR REPLACE FUNCTION public.save_attendance_and_consume_stock(
  p_school_id UUID, p_user_id UUID, p_attendance_date DATE, p_present_students INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  previous_students INTEGER := 0;
  delta_students INTEGER;
  deduction RECORD;
BEGIN
  IF p_present_students < 0 THEN RAISE EXCEPTION 'Attendance cannot be negative'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND (p.role IN ('inspector', 'admin') OR p.school_id = p_school_id OR EXISTS (
        SELECT 1 FROM school_assignments sa WHERE sa.user_id = auth.uid() AND sa.school_id = p_school_id
      ))
  ) THEN
    RAISE EXCEPTION 'You are not authorised to record attendance for this school';
  END IF;

  SELECT present_students INTO previous_students
  FROM attendance_records WHERE school_id = p_school_id AND attendance_date = p_attendance_date FOR UPDATE;
  delta_students := p_present_students - COALESCE(previous_students, 0);

  INSERT INTO attendance_records (school_id, attendance_date, present_students, recorded_by)
  VALUES (p_school_id, p_attendance_date, p_present_students, auth.uid())
  ON CONFLICT (school_id, attendance_date) DO UPDATE
  SET present_students = EXCLUDED.present_students, recorded_by = EXCLUDED.recorded_by;

  FOR deduction IN SELECT * FROM (VALUES
    ('rice'::TEXT, delta_students * 0.1::NUMERIC),
    ('pulses'::TEXT, delta_students * 0.02::NUMERIC),
    ('oil'::TEXT, delta_students * 0.005::NUMERIC)
  ) AS r(item_name, quantity) LOOP
    UPDATE inventory_stock
    SET quantity_kg = GREATEST(0, quantity_kg - deduction.quantity), last_updated = now()
    WHERE school_id = p_school_id AND item_name = deduction.item_name;
  END LOOP;

  PERFORM public.refresh_low_stock_alerts(p_school_id);
  RETURN jsonb_build_object('success', true, 'students', p_present_students, 'attendance_date', p_attendance_date);
END;
$$;

CREATE OR REPLACE FUNCTION public.deliver_purchase_order_atomic(p_order_id UUID, p_actor_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  order_row purchase_orders%ROWTYPE;
  line_item RECORD;
  enrolled_students INTEGER;
BEGIN
  IF NOT public.is_inspector_or_admin() THEN
    RAISE EXCEPTION 'Only an inspector or administrator can mark an order delivered';
  END IF;

  SELECT * INTO order_row FROM purchase_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Purchase order not found'; END IF;
  IF order_row.status = 'delivered' THEN
    RETURN jsonb_build_object('success', true, 'already_delivered', true, 'school_id', order_row.school_id);
  END IF;
  SELECT student_count INTO enrolled_students FROM schools WHERE id = order_row.school_id;

  FOR line_item IN SELECT item_name, quantity_kg FROM purchase_order_items WHERE purchase_order_id = p_order_id LOOP
    INSERT INTO inventory_stock (school_id, item_name, quantity_kg, reorder_level, last_updated)
    VALUES (order_row.school_id, lower(line_item.item_name), line_item.quantity_kg,
      CASE lower(line_item.item_name) WHEN 'rice' THEN enrolled_students * 0.1 * 3 WHEN 'pulses' THEN enrolled_students * 0.02 * 3 WHEN 'oil' THEN enrolled_students * 0.005 * 3 ELSE 0 END, now())
    ON CONFLICT (school_id, item_name) DO UPDATE
    SET quantity_kg = inventory_stock.quantity_kg + EXCLUDED.quantity_kg, last_updated = now();
  END LOOP;

  UPDATE purchase_orders SET status = 'delivered' WHERE id = p_order_id;
  PERFORM public.refresh_low_stock_alerts(order_row.school_id);
  INSERT INTO audit_logs (user_id, school_id, action, details)
  VALUES (auth.uid(), order_row.school_id, 'purchase_order_delivered', jsonb_build_object('purchase_order_id', p_order_id));
  RETURN jsonb_build_object('success', true, 'school_id', order_row.school_id);
END;
$$;
