
-- 模板獨立內容表：每套模板可儲存任意 key/value 設定
CREATE TABLE IF NOT EXISTS template_content (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id text NOT NULL,
  key         text NOT NULL,
  value       text NOT NULL DEFAULT '',
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (template_id, key)
);

-- RLS
ALTER TABLE template_content ENABLE ROW LEVEL SECURITY;

-- 公開可讀（前台讀取模板設定）
CREATE POLICY "template_content_select_all"
  ON template_content FOR SELECT
  USING (true);

-- 已認證管理員可寫
CREATE POLICY "template_content_insert_auth"
  ON template_content FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "template_content_update_auth"
  ON template_content FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "template_content_delete_auth"
  ON template_content FOR DELETE
  USING (auth.role() = 'authenticated');

-- site_content 確保 active_template key 存在（upsert 預設值）
INSERT INTO site_content (key, value)
VALUES ('active_template', 'minimal')
ON CONFLICT (key) DO NOTHING;
