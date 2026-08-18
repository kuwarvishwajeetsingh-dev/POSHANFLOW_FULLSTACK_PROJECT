-- Allows inspectors to supply factual enrolment for existing schools and then
-- recalculates every three-day reserve threshold in one transaction.
CREATE OR REPLACE FUNCTION public.set_school_enrollment_and_thresholds(
  p_school_id UUID, p_student_count INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_inspector_or_admin() THEN
    RAISE EXCEPTION 'Only an inspector or administrator can update school enrolment';
  END IF;
  IF p_student_count < 1 THEN
    RAISE EXCEPTION 'Enrolled-student count must be at least 1';
  END IF;

  UPDATE schools SET student_count = p_student_count WHERE id = p_school_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'School not found'; END IF;

  UPDATE inventory_stock
  SET reorder_level = CASE item_name
    WHEN 'rice' THEN p_student_count * 0.1 * 3
    WHEN 'pulses' THEN p_student_count * 0.02 * 3
    WHEN 'oil' THEN p_student_count * 0.005 * 3
    ELSE reorder_level
  END,
  last_updated = now()
  WHERE school_id = p_school_id;

  PERFORM public.refresh_low_stock_alerts(p_school_id);
  RETURN jsonb_build_object('success', true, 'school_id', p_school_id, 'student_count', p_student_count);
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_school_enrollment_and_thresholds(UUID, INTEGER) TO authenticated;
