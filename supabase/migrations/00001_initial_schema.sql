CREATE TYPE public.user_role AS ENUM ('user', 'admin');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE,
  phone text,
  role public.user_role NOT NULL DEFAULT 'user'::public.user_role,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, phone, role)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.phone,
    'user'::public.user_role
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

CREATE FUNCTION public.get_user_role(uid uuid)
RETURNS public.user_role
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = uid;
$$;

-- Profiles RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins have full access to profiles" ON public.profiles
  FOR ALL TO authenticated USING (public.get_user_role(auth.uid()) = 'admin'::public.user_role);

CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id)
  WITH CHECK (role IS NOT DISTINCT FROM public.get_user_role(auth.uid()));

-- Categories
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon read categories" ON public.categories
  FOR SELECT TO anon USING (true);

CREATE POLICY "Allow authenticated read categories" ON public.categories
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow admin write categories" ON public.categories
  FOR ALL TO authenticated USING (public.get_user_role(auth.uid()) = 'admin'::public.user_role)
  WITH CHECK (public.get_user_role(auth.uid()) = 'admin'::public.user_role);

-- Products
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  price numeric(10, 2) NOT NULL,
  description text,
  images text[] NOT NULL DEFAULT '{}',
  featured boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon read active products" ON public.products
  FOR SELECT TO anon USING (is_active = true);

CREATE POLICY "Allow authenticated read products" ON public.products
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow admin write products" ON public.products
  FOR ALL TO authenticated USING (public.get_user_role(auth.uid()) = 'admin'::public.user_role)
  WITH CHECK (public.get_user_role(auth.uid()) = 'admin'::public.user_role);

-- Inquiries / Orders
CREATE TABLE public.inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  name text NOT NULL,
  phone text NOT NULL,
  email text,
  quantity int NOT NULL DEFAULT 1,
  message text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon insert inquiries" ON public.inquiries
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow admin read inquiries" ON public.inquiries
  FOR SELECT TO authenticated USING (public.get_user_role(auth.uid()) = 'admin'::public.user_role);

CREATE POLICY "Allow admin update inquiries" ON public.inquiries
  FOR UPDATE TO authenticated USING (public.get_user_role(auth.uid()) = 'admin'::public.user_role)
  WITH CHECK (public.get_user_role(auth.uid()) = 'admin'::public.user_role);

CREATE POLICY "Allow admin delete inquiries" ON public.inquiries
  FOR DELETE TO authenticated USING (public.get_user_role(auth.uid()) = 'admin'::public.user_role);

-- Contact submissions
CREATE TABLE public.contact_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text,
  email text,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon insert contact submissions" ON public.contact_submissions
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow admin read contact submissions" ON public.contact_submissions
  FOR SELECT TO authenticated USING (public.get_user_role(auth.uid()) = 'admin'::public.user_role);

CREATE POLICY "Allow admin delete contact submissions" ON public.contact_submissions
  FOR DELETE TO authenticated USING (public.get_user_role(auth.uid()) = 'admin'::public.user_role);

-- Site content
CREATE TABLE public.site_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon read site content" ON public.site_content
  FOR SELECT TO anon USING (true);

CREATE POLICY "Allow authenticated read site content" ON public.site_content
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow admin write site content" ON public.site_content
  FOR ALL TO authenticated USING (public.get_user_role(auth.uid()) = 'admin'::public.user_role)
  WITH CHECK (public.get_user_role(auth.uid()) = 'admin'::public.user_role);

-- Storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('products', 'products', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies for products bucket
CREATE POLICY "Allow public read products bucket" ON storage.objects
  FOR SELECT TO anon USING (bucket_id = 'products');

CREATE POLICY "Allow public read products bucket auth" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'products');

CREATE POLICY "Allow admin upload products bucket" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'products' AND
    public.get_user_role(auth.uid()) = 'admin'::public.user_role
  );

CREATE POLICY "Allow admin update products bucket" ON storage.objects
  FOR UPDATE TO authenticated USING (
    bucket_id = 'products' AND
    public.get_user_role(auth.uid()) = 'admin'::public.user_role
  )
  WITH CHECK (
    bucket_id = 'products' AND
    public.get_user_role(auth.uid()) = 'admin'::public.user_role
  );

CREATE POLICY "Allow admin delete products bucket" ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'products' AND
    public.get_user_role(auth.uid()) = 'admin'::public.user_role
  );

-- Seed categories
INSERT INTO public.categories (name, slug, sort_order) VALUES
  ('Fresh Flowers', 'fresh-flowers', 10),
  ('Bouquets', 'bouquets', 20),
  ('Dried Flowers', 'dried-flowers', 30),
  ('Potted Plants', 'potted-plants', 40);

-- Seed products
INSERT INTO public.products (name, slug, category_id, price, description, images, featured) VALUES
  (
    'White Overture',
    'white-overture',
    (SELECT id FROM public.categories WHERE slug = 'bouquets'),
    88.00,
    'A graceful arrangement of pure white blooms, perfect for weddings, anniversaries, or a thoughtful expression of love.',
    ARRAY['https://miaoda-site-img.s3cdn.medo.dev/images/KLing_9713772a-350b-4a77-ad04-c5d05f383526.jpg'],
    true
  ),
  (
    'Red Romance',
    'red-romance',
    (SELECT id FROM public.categories WHERE slug = 'fresh-flowers'),
    72.00,
    'Classic red roses hand-tied with seasonal greenery, a timeless gift for someone special.',
    ARRAY['https://miaoda-site-img.s3cdn.medo.dev/images/KLing_426e23bb-44e2-422a-a7f0-10bc20c94606.jpg'],
    true
  ),
  (
    'Pink Peony Dream',
    'pink-peony-dream',
    (SELECT id FROM public.categories WHERE slug = 'bouquets'),
    95.00,
    'Lush pink peonies arranged with delicate accents, evoking elegance and soft romance.',
    ARRAY['https://miaoda-site-img.s3cdn.medo.dev/images/KLing_d6529988-f430-49b6-8a00-53df3883c61f.jpg'],
    true
  ),
  (
    'Pastel Seasonal',
    'pastel-seasonal',
    (SELECT id FROM public.categories WHERE slug = 'fresh-flowers'),
    65.00,
    'A joyful blend of seasonal blooms in soft pastel tones, bringing a breath of spring to any space.',
    ARRAY['https://miaoda-site-img.s3cdn.medo.dev/images/KLing_0974a0a0-57f1-40ff-81af-dc777b2fedde.jpg'],
    false
  ),
  (
    'Minimal Dried Bouquet',
    'minimal-dried-bouquet',
    (SELECT id FROM public.categories WHERE slug = 'dried-flowers'),
    58.00,
    'Naturally preserved flowers in muted tones, designed for long-lasting beauty and modern interiors.',
    ARRAY['https://miaoda-site-img.s3cdn.medo.dev/images/KLing_3cfb3bf2-c6a4-4586-874e-47e2cd34b8af.jpg'],
    true
  ),
  (
    'Elegant White Orchid',
    'elegant-white-orchid',
    (SELECT id FROM public.categories WHERE slug = 'potted-plants'),
    120.00,
    'A pristine white orchid plant presented in a minimalist pot, an enduring symbol of grace.',
    ARRAY['https://miaoda-site-img.s3cdn.medo.dev/images/KLing_cd05e77b-87c2-41b3-a306-48486e35600a.jpg'],
    false
  ),
  (
    'Sunshine Sunflowers',
    'sunshine-sunflowers',
    (SELECT id FROM public.categories WHERE slug = 'fresh-flowers'),
    60.00,
    'Bright sunflowers paired with greenery to lift spirits and celebrate every occasion.',
    ARRAY['https://miaoda-site-img.s3cdn.medo.dev/images/KLing_f037c9c2-629a-45ad-a612-cddd977dcc70.jpg'],
    false
  ),
  (
    'Rustic Lavender',
    'rustic-lavender',
    (SELECT id FROM public.categories WHERE slug = 'dried-flowers'),
    52.00,
    'Fragrant lavender bundled in rustic style, ideal for home fragrance and natural decor.',
    ARRAY['https://miaoda-site-img.s3cdn.medo.dev/images/KLing_d3216237-2dc6-4329-b59e-13a36b6d2be4.jpg'],
    false
  );

-- Seed site content
INSERT INTO public.site_content (key, value) VALUES
  ('hero_title', 'Royalspl Flower'),
  ('hero_subtitle', 'Elegant floral arrangements crafted for every moment'),
  ('hero_image', 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_9713772a-350b-4a77-ad04-c5d05f383526.jpg'),
  ('about_title', 'About Royalspl Flower'),
  ('about_text', 'We are a local flower studio dedicated to creating thoughtful, elegant arrangements. From everyday bouquets to wedding florals, we bring nature''s beauty into your most important moments.'),
  ('contact_address', '123 Bloom Street, Garden District'),
  ('contact_hours', 'Mon - Sat: 9:00 AM - 7:00 PM'),
  ('contact_phone', '+1 (555) 123-4567'),
  ('contact_email', 'hello@royalsplflower.com'),
  ('footer_text', '© 2026 Royalspl Flower. All rights reserved.');
