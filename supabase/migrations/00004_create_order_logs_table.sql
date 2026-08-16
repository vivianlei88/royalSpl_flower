CREATE TABLE IF NOT EXISTS public.order_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    admin_name TEXT,
    changes JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.order_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access to order_logs for authenticated users" 
ON public.order_logs 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);
