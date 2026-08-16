
-- ── AI 全域設定表 ─────────────────────────────────────────────────
CREATE TABLE ai_settings (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  global_enabled boolean NOT NULL DEFAULT true,
  daily_limit_global  integer NOT NULL DEFAULT 5000,
  daily_limit_per_user integer NOT NULL DEFAULT 500,
  throttle_ms   integer NOT NULL DEFAULT 1000,
  max_concurrent integer NOT NULL DEFAULT 5,
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- 預設一筆全域設定
INSERT INTO ai_settings (global_enabled, daily_limit_global, daily_limit_per_user)
VALUES (true, 5000, 500);

ALTER TABLE ai_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_full_ai_settings" ON ai_settings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND email LIKE '%@%')
  );

-- ── AI 調用日誌表 ─────────────────────────────────────────────────
CREATE TABLE ai_logs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email   text,
  page         text NOT NULL DEFAULT '',
  instruction  text NOT NULL DEFAULT '',
  prompt_text  text,
  result_text  text,
  tokens_used  integer NOT NULL DEFAULT 0,
  duration_ms  integer NOT NULL DEFAULT 0,
  status       text NOT NULL DEFAULT 'success' CHECK (status IN ('success','error','throttled')),
  error_msg    text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ai_logs_user_id_idx    ON ai_logs (user_id);
CREATE INDEX ai_logs_created_at_idx ON ai_logs (created_at DESC);

ALTER TABLE ai_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_full_ai_logs" ON ai_logs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND email LIKE '%@%')
  );

-- ── AI 預設提示詞模板表 ──────────────────────────────────────────
CREATE TABLE ai_presets (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  category    text NOT NULL CHECK (category IN ('product','service','marketing','custom')),
  prompt      text NOT NULL,
  description text,
  is_active   boolean NOT NULL DEFAULT true,
  sort_order  integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ai_presets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_full_ai_presets" ON ai_presets
  FOR ALL USING (
    EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND email LIKE '%@%')
  );

-- 觸發器：auto-update updated_at
CREATE OR REPLACE FUNCTION update_ai_presets_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER ai_presets_updated_at
  BEFORE UPDATE ON ai_presets
  FOR EACH ROW EXECUTE FUNCTION update_ai_presets_updated_at();

-- ── 預設 3 套業務提示詞模板 ───────────────────────────────────────
INSERT INTO ai_presets (name, category, description, prompt, sort_order) VALUES
(
  '商品文案專用',
  'product',
  '適用於商品名稱、描述、SEO標題、標籤生成，強制繁體中文香港用語',
  '你是 Royalspl Flower 香港高端花藝品牌的專業文案撰稿師。請以繁體中文（香港用語）輸出，風格優雅精煉。

輸出規範：
- 商品名稱：10字以內，優雅詩意，可中英雙語
- 商品描述：80-120字，突出花材特色、情感氛圍、送禮場景
- SEO標題：60字以內，含核心關鍵詞
- 標籤：5-8個，格式為逗號分隔
- 圖片URL分隔符統一用「|」（非「;」）
- 禁止使用簡體字或大陸用語',
  0
),
(
  '客服話術專用',
  'service',
  '適用於訂單回覆、售後安撫、配送說明，語氣溫暖專業',
  '你是 Royalspl Flower 的專業客服代表，服務香港顧客。請以繁體中文（香港用語）輸出，語氣溫暖、專業、解決問題為先。

回覆規範：
- 首句稱謂「尊貴的顧客您好」
- 表達關切與歉意（如適用）
- 清晰說明處理方案
- 結尾提供進一步聯絡方式（WhatsApp：+852 9876 5432）
- 長度：100-150字為宜
- 語氣：親切但不過度熱情，保持品牌調性',
  1
),
(
  '行銷推文專用',
  'marketing',
  '適用於活動推文、Banner文案、節慶推廣、社交媒體帖文',
  '你是 Royalspl Flower 的品牌行銷文案師，專注香港花藝禮品市場。請以繁體中文（香港用語）輸出，風格時尚、有話題感、適合 Instagram / Facebook。

文案規範：
- 開頭有吸引眼球的短句（5-10字）
- 節慶場合強調情感共鳴
- 適當使用 emoji（1-3個）
- 加入 CTA：「立即選購」「限時訂購」等
- Hashtag（繁中+英文）：3-5個
- 長度：Instagram caption 150字以內
- 禁止使用過度促銷、低俗語言',
  2
);
