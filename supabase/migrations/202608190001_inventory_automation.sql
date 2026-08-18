-- Inventory automation: thresholds are three days of each school's enrolled-student requirement.
ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS student_count INTEGER NOT NULL DEFAULT 0
  CHECK (student_count >= 0);

-- Existing schools must be updated by an inspector with their real enrolment before
-- their threshold can be calculated. New schools are required to provide it.

CREATE OR REPLACE FUNCTION public.refresh_low_stock_alerts(p_school_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  stock_row RECORD;
BEGIN
  FOR stock_row IN
    SELECT item_name, quantity_kg, reorder_level
    FROM inventory_stock
    WHERE school_id = p_school_id
  LOOP
    IF stock_row.reorder_level > 0 AND stock_row.quantity_kg <= stock_row.reorder_level THEN
      IF NOT EXISTS (
        SELECT 1 FROM alerts
        WHERE school_id = p_school_id
          AND alert_type = 'low_stock'
          AND is_resolved = false
          AND lower(message) LIKE lower(stock_row.item_name) || ' stock is%'
      ) THEN
        INSERT INTO alerts (school_id, alert_type, severity, message)
        VALUES (
          p_school_id,
          'low_stock',
          CASE WHEN stock_row.quantity_kg = 0 THEN 'critical' ELSE 'high' END,
          format('%s stock is at %s kg; the three-day threshold is %s kg.', initcap(stock_row.item_name), stock_row.quantity_kg, stock_row.reorder_level)
        );
      END IF;
    ELSE
      UPDATE alerts
      SET is_resolved = true
      WHERE school_id = p_school_id
        AND alert_type = 'low_stock'
        AND is_resolved = false
        AND lower(message) LIKE lower(stock_row.item_name) || ' stock is%';
    END IF;
  END LOOP;
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
    VALUES (
      order_row.school_id,
      lower(line_item.item_name),
      line_item.quantity_kg,
      CASE lower(line_item.item_name)
        WHEN 'rice' THEN enrolled_students * 0.1 * 3
        WHEN 'pulses' THEN enrolled_students * 0.02 * 3
        WHEN 'oil' THEN enrolled_students * 0.005 * 3
        ELSE 0
      END,
      now()
    )
    ON CONFLICT (school_id, item_name) DO UPDATE
    SET quantity_kg = inventory_stock.quantity_kg + EXCLUDED.quantity_kg,
        last_updated = now();
  END LOOP;

  UPDATE purchase_orders SET status = 'delivered' WHERE id = p_order_id;
  PERFORM public.refresh_low_stock_alerts(order_row.school_id);
  INSERT INTO audit_logs (user_id, school_id, action, details)
  VALUES (p_actor_id, order_row.school_id, 'purchase_order_delivered', jsonb_build_object('purchase_order_id', p_order_id));
  RETURN jsonb_build_object('success', true, 'school_id', order_row.school_id);
END;
$$;

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
  SELECT present_students INTO previous_students
  FROM attendance_records WHERE school_id = p_school_id AND attendance_date = p_attendance_date FOR UPDATE;
  delta_students := p_present_students - COALESCE(previous_students, 0);

  INSERT INTO attendance_records (school_id, attendance_date, present_students, recorded_by)
  VALUES (p_school_id, p_attendance_date, p_present_students, p_user_id)
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

GRANT EXECUTE ON FUNCTION public.deliver_purchase_order_atomic(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_attendance_and_consume_stock(UUID, UUID, DATE, INTEGER) TO authenticated;
