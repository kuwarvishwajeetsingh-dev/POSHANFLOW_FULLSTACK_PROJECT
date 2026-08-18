-- Record the India calendar date whenever an inspector marks an order delivered.
ALTER TABLE public.purchase_orders
  ADD COLUMN IF NOT EXISTS delivered_at DATE;

CREATE OR REPLACE FUNCTION public.set_purchase_order_delivered_date()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'delivered' AND OLD.status IS DISTINCT FROM 'delivered' THEN
    NEW.delivered_at := CURRENT_DATE;
  ELSIF NEW.status <> 'delivered' THEN
    NEW.delivered_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_purchase_order_delivered_date ON public.purchase_orders;
CREATE TRIGGER set_purchase_order_delivered_date
  BEFORE UPDATE OF status ON public.purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.set_purchase_order_delivered_date();
