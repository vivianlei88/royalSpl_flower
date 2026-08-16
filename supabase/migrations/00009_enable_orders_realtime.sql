-- 啟用 orders 表 Realtime 發布（INSERT + UPDATE 均推送到前端）
ALTER PUBLICATION supabase_realtime ADD TABLE orders;