-- Legacy alerts used the message "Low stock alert for rice. Quantity: ...".
-- Recognise that format as well as the current generated format when resolving
-- alerts after stock has been replenished.
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
          AND (
            lower(message) LIKE lower(stock_row.item_name) || ' stock is%'
            OR lower(message) LIKE 'low stock alert for ' || lower(stock_row.item_name) || '.%'
          )
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
        AND (
          lower(message) LIKE lower(stock_row.item_name) || ' stock is%'
          OR lower(message) LIKE 'low stock alert for ' || lower(stock_row.item_name) || '.%'
        );
    END IF;
  END LOOP;
END;
$$;

-- Re-check every school so legacy false alerts are resolved immediately.
DO $$
DECLARE
  school_row RECORD;
BEGIN
  FOR school_row IN SELECT DISTINCT school_id FROM public.inventory_stock LOOP
    PERFORM public.refresh_low_stock_alerts(school_row.school_id);
  END LOOP;
END;
$$;
