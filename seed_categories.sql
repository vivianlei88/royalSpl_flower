INSERT INTO categories (name, slug, sort_order) VALUES
('日式鮮花', 'japanese-fresh-flowers', 1),
('日式永生花', 'japanese-preserved-flowers', 2),
('芍藥花', 'peony', 3),
('荷花', 'lotus', 4),
('情人節花束', 'valentines-day-bouquet', 5),
('母親節花束', 'mothers-day-bouquet', 6),
('畢業花束', 'graduation-bouquet', 7),
('高級定制', 'premium-custom', 8)
ON CONFLICT (slug) DO NOTHING;
