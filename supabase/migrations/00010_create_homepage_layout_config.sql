-- 首頁版面配置表（草稿 + 已發布）
CREATE TABLE IF NOT EXISTS homepage_configs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version      integer NOT NULL DEFAULT 1,
  status       text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  config       jsonb NOT NULL DEFAULT '{}',
  published_at timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- 每次 update 自動刷新 updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_homepage_configs_updated_at ON homepage_configs;
CREATE TRIGGER trg_homepage_configs_updated_at
  BEFORE UPDATE ON homepage_configs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS
ALTER TABLE homepage_configs ENABLE ROW LEVEL SECURITY;

-- 所有人可讀已發布版本（前台使用）
CREATE POLICY "public read published" ON homepage_configs
  FOR SELECT USING (status = 'published');

-- 只有 admin 可讀草稿與寫入
CREATE POLICY "admin full access" ON homepage_configs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 插入初始草稿（含 Hero 區塊預設值）
INSERT INTO homepage_configs (status, config) VALUES (
  'draft',
  '{
    "sections": [
      {
        "id": "hero-1",
        "type": "hero",
        "sort": 0,
        "data": {
          "images": [
            {
              "id": "img-hero-1",
              "url": "https://miaoda-site-img.s3cdn.medo.dev/images/KLing_313dfd45-39ef-478c-b334-13e4b564d227.jpg",
              "alt": "Hero Banner",
              "link": "/products"
            }
          ],
          "title": "Royalspl Florist Hong Kong",
          "subtitle": "每一束花皆為一件會呼吸的雕塑。",
          "ctaText": "探索花藝",
          "ctaLink": "/products",
          "titleAlign": "left",
          "overlayOpacity": 0.35,
          "titleColor": "#ffffff",
          "subtitleColor": "#ffffffcc",
          "ctaColor": "#ffffff",
          "ctaBg": "#000000"
        }
      }
    ],
    "version": 1
  }'
);