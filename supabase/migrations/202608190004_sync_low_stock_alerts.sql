-- Keep low-stock alerts accurate after any direct inventory edit.
-- This also resolves stale alerts that were created before this trigger existed.
CREATE OR REPLACE FUNCTION public.sync_low_stock_alerts_on_inventory_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.refresh_low_stock_alerts(NEW.school_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_low_stock_alerts_on_inventory_change ON public.inventory_stock;
CREATE TRIGGER sync_low_stock_alerts_on_inventory_change
  AFTER INSERT OR UPDATE OF quantity_kg, reorder_level ON public.inventory_stock
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_low_stock_alerts_on_inventory_change();

-- Reconcile the existing alert rows, including alerts left open after stock was replenished.
DO $$
DECLARE
  school_row RECORD;
BEGIN
  FOR school_row IN SELECT DISTINCT school_id FROM public.inventory_stock LOOP
    PERFORM public.refresh_low_stock_alerts(school_row.school_id);
  END LOOP;
END;
$$;
