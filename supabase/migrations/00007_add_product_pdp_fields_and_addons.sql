
-- 1. 新增 products 表 PDP 規格欄位
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS style_spectrum_value integer DEFAULT 50 CHECK (style_spectrum_value >= 0 AND style_spectrum_value <= 100),
  ADD COLUMN IF NOT EXISTS variants jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS linked_addons uuid[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS meta_title text,
  ADD COLUMN IF NOT EXISTS meta_description text,
  ADD COLUMN IF NOT EXISTS og_image_url text;

-- 2. 建立獨立配件表 (addons)
CREATE TABLE IF NOT EXISTS addons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  price numeric(10,2) NOT NULL DEFAULT 0,
  images text[] DEFAULT '{}',
  stock_quantity integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. RLS for addons
ALTER TABLE addons ENABLE ROW LEVEL SECURITY;

-- 公開可讀 (前台展示用)
CREATE POLICY "addons_public_select" ON addons
  FOR SELECT USING (is_active = true);

-- Admin 全部操作
CREATE POLICY "addons_admin_all" ON addons
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 4. updated_at trigger for addons
CREATE OR REPLACE FUNCTION update_addons_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS addons_updated_at ON addons;
CREATE TRIGGER addons_updated_at
  BEFORE UPDATE ON addons
  FOR EACH ROW EXECUTE FUNCTION update_addons_updated_at();
