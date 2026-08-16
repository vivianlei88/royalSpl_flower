-- Modify profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS points_balance integer DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS auth_provider text;

-- Modify products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS inventory_type text DEFAULT 'in_stock';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS pre_order_days integer;

-- Create coupons FIRST so orders can reference it
CREATE TABLE IF NOT EXISTS public.coupons (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    code text UNIQUE NOT NULL,
    name text NOT NULL,
    discount_amount numeric NOT NULL,
    min_purchase_amount numeric DEFAULT 0,
    valid_from timestamptz,
    valid_until timestamptz,
    usage_limit integer,
    used_count integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

-- Create orders table
CREATE TABLE IF NOT EXISTS public.orders (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    customer_name text NOT NULL,
    customer_phone text NOT NULL,
    customer_email text,
    total_amount numeric NOT NULL,
    status text DEFAULT 'pending',
    
    -- Delivery Extension
    delivery_date date,
    delivery_time_slot text,
    delivery_area text,
    time_surcharge numeric DEFAULT 0,
    area_surcharge numeric DEFAULT 0,
    final_shipping_fee numeric DEFAULT 0,
    
    -- Discount & Points
    coupon_id uuid REFERENCES public.coupons(id) ON DELETE SET NULL,
    points_used integer DEFAULT 0,
    discount_amount numeric DEFAULT 0,
    
    -- Payment
    stripe_payment_id text,
    payment_status text DEFAULT 'pending',
    
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Create order_items
CREATE TABLE IF NOT EXISTS public.order_items (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id uuid REFERENCES public.products(id) ON DELETE RESTRICT,
    quantity integer NOT NULL,
    price numeric NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- Create cart_items
CREATE TABLE IF NOT EXISTS public.cart_items (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
    quantity integer NOT NULL DEFAULT 1,
    created_at timestamptz DEFAULT now()
);

-- Create user_coupons
CREATE TABLE IF NOT EXISTS public.user_coupons (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    coupon_id uuid REFERENCES public.coupons(id) ON DELETE CASCADE,
    status text DEFAULT 'unused',
    created_at timestamptz DEFAULT now(),
    UNIQUE(user_id, coupon_id)
);

-- Create point_transactions
CREATE TABLE IF NOT EXISTS public.point_transactions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount integer NOT NULL,
    transaction_type text NOT NULL,
    order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now()
);

-- Create product_reviews
CREATE TABLE IF NOT EXISTS public.product_reviews (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    rating integer CHECK (rating >= 1 AND rating <= 5),
    comment text,
    is_approved boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
);

-- Create delivery_holidays
CREATE TABLE IF NOT EXISTS public.delivery_holidays (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    holiday_date date UNIQUE NOT NULL,
    description text,
    created_at timestamptz DEFAULT now()
);

-- Create delivery_rules
CREATE TABLE IF NOT EXISTS public.delivery_rules (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    rule_type text NOT NULL,
    name text NOT NULL,
    fee_amount numeric NOT NULL,
    condition_min_amount numeric,
    created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.point_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_rules ENABLE ROW LEVEL SECURITY;

-- Basic RLS Policies
-- orders & order_items
CREATE POLICY "Users can manage their own orders" ON public.orders FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all orders" ON public.orders FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);
CREATE POLICY "Users can view their order items" ON public.order_items FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid())
);
CREATE POLICY "Admins can manage order items" ON public.order_items FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

-- cart_items
CREATE POLICY "Users can manage their own cart" ON public.cart_items FOR ALL USING (auth.uid() = user_id);

-- coupons
CREATE POLICY "Coupons are viewable by everyone" ON public.coupons FOR SELECT USING (true);
CREATE POLICY "Only admins can manage coupons" ON public.coupons FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

-- user_coupons
CREATE POLICY "Users can view their own coupons" ON public.user_coupons FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Only admins can manage user coupons" ON public.user_coupons FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

-- point_transactions
CREATE POLICY "Users can view their own points" ON public.point_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Only admins can manage points" ON public.point_transactions FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

-- product_reviews
CREATE POLICY "Approved reviews are viewable by everyone" ON public.product_reviews FOR SELECT USING (is_approved = true);
CREATE POLICY "Users can insert their own reviews" ON public.product_reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Only admins can manage all reviews" ON public.product_reviews FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

-- delivery_holidays
CREATE POLICY "Delivery holidays are viewable by everyone" ON public.delivery_holidays FOR SELECT USING (true);
CREATE POLICY "Only admins can manage delivery holidays" ON public.delivery_holidays FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

-- delivery_rules
CREATE POLICY "Delivery rules are viewable by everyone" ON public.delivery_rules FOR SELECT USING (true);
CREATE POLICY "Only admins can manage delivery rules" ON public.delivery_rules FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

-- Seed delivery_rules default values
INSERT INTO public.delivery_rules (rule_type, name, fee_amount, condition_min_amount) VALUES
('time_slot', '全日派送 (10:00-18:00)', 90, 500),
('time_slot', '指定單一小時', 150, NULL),
('time_slot', '夜晚派送 (20:00-24:00)', 250, NULL),
('time_slot', '即日加急', 200, NULL),
('area', '市區屋苑/商廈/港九龍鐵路沿線', 0, 500),
('area', '屯門近郊', 100, NULL),
('area', '西貢市中心/港島半山/南區', 150, NULL),
('area', '山頂/大潭/紅山半島/陽明山莊/西貢清水灣/科大', 200, NULL),
('area', '離島/大嶼山/機場/偏遠鄉村', 300, NULL);