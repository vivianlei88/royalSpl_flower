
-- 全域標籤池
create table if not exists tag_pool (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  dimension text not null check (dimension in ('場景用途','核心花材','設計風格','價格區間','附加服務')),
  created_at timestamptz not null default now(),
  unique (name, dimension)
);

-- 預設標籤種子資料
insert into tag_pool (name, dimension) values
  ('戀愛','場景用途'),('生日','場景用途'),('母親節','場景用途'),
  ('情人節','場景用途'),('清明','場景用途'),('開張','場景用途'),
  ('探病','場景用途'),('商務','場景用途'),('婚禮','場景用途'),
  ('週年','場景用途'),('帛事','場景用途'),('中秋節','場景用途'),
  ('玫瑰','核心花材'),('郁金香','核心花材'),('芍藥','核心花材'),
  ('進口鮮花','核心花材'),('荷花','核心花材'),('鬱金香','核心花材'),
  ('經典風','設計風格'),('韓式','設計風格'),('日式極簡','設計風格'),
  ('永生花','設計風格'),('法式田園風','設計風格'),('高級定制','設計風格'),
  ('HK$300內','價格區間'),('HK$300–600','價格區間'),
  ('HK$800+','價格區間'),('HK$1200+','價格區間'),
  ('即日配送','附加服務'),('可加賀卡','附加服務'),('香港全境配送','附加服務')
on conflict (name, dimension) do nothing;

-- RLS
alter table tag_pool enable row level security;
create policy "public read tag_pool" on tag_pool for select using (true);
create policy "admin manage tag_pool" on tag_pool for all
  using (exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  ));
