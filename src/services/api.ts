import { supabase } from '@/db/supabase';
import type {
  Category,
  Product,
  Addon,
  Inquiry,
  ContactSubmission,
  SiteContent,
  CartItem,
  Order,
  OrderLog
} from '@/types/types';
// @ts-ignore
import type { Inventory } from '@/types/types';

const WORKER_URL = import.meta.env.VITE_CF_WORKER_URL || 'http://localhost:8787';

export async function uploadImageToWorker(file: File): Promise<string | null> {
  const formData = new FormData();
  formData.append('file', file);
  
  try {
    const response = await fetch(`${WORKER_URL}/api/upload`, {
      method: 'POST',
      body: formData,
    });
    const data = await response.json();
    if (data.success) {
      return `${WORKER_URL}${data.url}`;
    }
    return null;
  } catch (error) {
    console.error('上傳圖片至 Worker 失敗:', error);
    return null;
  }
}
export async function getOrders(): Promise<Order[]> {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      items:order_items (
        id,
        quantity,
        price,
        product:products (name)
      )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching orders:', error);
    return [];
  }
  return data as Order[];
}

export async function getSiteContent(): Promise<Record<string, string>> {
  const { data, error } = await supabase
    .from('site_content')
    .select('key, value')
    .order('key');

  if (error) {
    console.error('讀取網站內容失敗：', error);
    return {};
  }

  return (data || []).reduce((acc: Record<string, string>, item) => {
    acc[item.key] = item.value;
    return acc;
  }, {});
}

export async function getCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('讀取分類失敗：', error);
    return [];
  }

  return Array.isArray(data) ? data : [];
}

export async function createCategory(name: string, slug: string, image_url: string | undefined = undefined, description: string | undefined = undefined): Promise<Category | null> {
  const { data, error } = await supabase
    .from('categories')
    .insert({ name, slug, image_url, description })
    .select()
    .single();

  if (error) {
    console.error('建立分類失敗：', error);
    return null;
  }
  return data;
}

export async function updateCategory(
  id: string,
  name: string,
  slug: string,
  image_url: string | undefined = undefined,
  description: string | undefined = undefined,
  sort_order?: number
): Promise<boolean> {
  const payload: Record<string, unknown> = { name, slug, image_url, description };
  if (sort_order !== undefined) payload.sort_order = sort_order;
  const { error } = await supabase
    .from('categories')
    .update(payload)
    .eq('id', id);

  if (error) {
    console.error('更新分類失敗：', error);
    return false;
  }
  return true;
}

export async function deleteCategory(id: string): Promise<boolean> {
  const { error } = await supabase.from('categories').delete().eq('id', id);
  if (error) {
    console.error('刪除分類失敗：', error);
    return false;
  }
  return true;
}

export async function getInventory(): Promise<Inventory[]> {
  const { data, error } = await supabase
    .from('inventory')
    .select('*, product:products(name, sku_code)')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('讀取庫存失敗：', error);
    return [];
  }
  return Array.isArray(data) ? data : [];
}

export async function updateInventory(product_id: string, stock_quantity: number): Promise<boolean> {
  const { error } = await supabase
    .from('inventory')
    .update({ stock_quantity, updated_at: new Date().toISOString() })
    .eq('product_id', product_id);

  if (error) {
    console.error('更新庫存失敗：', error);
    return false;
  }
  return true;
}

export async function getProducts(options?: {
  categorySlug?: string;
  featured?: boolean;
}): Promise<Product[]> {
  let query = supabase
    .from('products')
    .select('*, category:categories(*)')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (options?.featured) {
    query = query.eq('featured', true);
  }

  if (options?.categorySlug) {
    const { data: category } = await supabase
      .from('categories')
      .select('id, parent_id')
      .eq('slug', options.categorySlug)
      .maybeSingle();

    if (category?.id) {
      if (!category.parent_id) {
        // If it's a parent category, get all subcategories
        const { data: subcategories } = await supabase
          .from('categories')
          .select('id')
          .eq('parent_id', category.id);
          
        if (subcategories && subcategories.length > 0) {
          const categoryIds = [category.id, ...subcategories.map(c => c.id)];
          query = query.in('category_id', categoryIds);
        } else {
          query = query.eq('category_id', category.id);
        }
      } else {
        // If it's a subcategory, just filter by it
        query = query.eq('category_id', category.id);
      }
    }
  }

  const { data, error } = await query;

  if (error) {
    console.error('讀取產品失敗：', error);
    return [];
  }

  return Array.isArray(data) ? data : [];
}

export async function getAllProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*, category:categories(*)')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('讀取所有產品失敗：', error);
    return [];
  }
  return Array.isArray(data) ? data : [];
}

export async function getProductsByCategory(categoryId: string): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('category_id', categoryId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('讀取類別產品失敗：', error);
    return [];
  }
  return Array.isArray(data) ? data : [];
}

export async function updateProductCategory(productId: string, categoryId: string | null): Promise<boolean> {
  const { error } = await supabase
    .from('products')
    .update({ category_id: categoryId, updated_at: new Date().toISOString() })
    .eq('id', productId);

  if (error) {
    console.error('更新產品類別失敗：', error);
    return false;
  }
  return true;
}

export async function updateProductsFeatured(ids: string[], featured: boolean): Promise<boolean> {
  const { error } = await supabase
    .from('products')
    .update({ featured, updated_at: new Date().toISOString() })
    .in('id', ids);

  if (error) {
    console.error('更新產品精選狀態失敗：', error);
    return false;
  }
  return true;
}

// 批量更新前台展示狀態 (is_active)
export async function updateProductsActive(ids: string[], is_active: boolean): Promise<boolean> {
  const { error } = await supabase
    .from('products')
    .update({ is_active, updated_at: new Date().toISOString() })
    .in('id', ids);

  if (error) {
    console.error('更新產品展示狀態失敗：', error);
    return false;
  }
  return true;
}

// ── 模板內容 API ──
export async function getTemplateContent(templateId: string): Promise<Record<string, string>> {
  const { data, error } = await supabase
    .from('template_content')
    .select('key, value')
    .eq('template_id', templateId)
    .order('key');

  if (error) {
    console.error('讀取模板內容失敗：', error);
    return {};
  }

  const result: Record<string, string> = {};
  (data || []).forEach((row: { key: string; value: string }) => {
    result[row.key] = row.value;
  });
  return result;
}

export async function upsertTemplateContent(
  templateId: string,
  key: string,
  value: string
): Promise<boolean> {
  const { error } = await supabase
    .from('template_content')
    .upsert(
      { template_id: templateId, key, value, updated_at: new Date().toISOString() },
      { onConflict: 'template_id,key' }
    );

  if (error) {
    console.error('更新模板內容失敗：', error);
    return false;
  }
  return true;
}

export async function upsertTemplateContentBatch(
  templateId: string,
  entries: Record<string, string>
): Promise<boolean> {
  const rows = Object.entries(entries).map(([key, value]) => ({
    template_id: templateId,
    key,
    value,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from('template_content')
    .upsert(rows, { onConflict: 'template_id,key' });

  if (error) {
    console.error('批量更新模板內容失敗：', error);
    return false;
  }
  return true;
}

export async function getActiveTemplate(): Promise<string> {
  const content = await getSiteContent();
  return content.active_template || 'minimal';
}

export async function setActiveTemplate(templateId: string): Promise<boolean> {
  return updateSiteContent('active_template', templateId);
}

// ── 訂單模板/收據/郵件模板設定 API ──
export async function getShopProfile(): Promise<Record<string, string>> {
  const { data, error } = await supabase
    .from('site_content')
    .select('key, value')
    .in('key', [
      'shop_logo', 'shop_name', 'shop_address',
      'shop_phone', 'shop_email', 'shop_website',
      'order_template_note', 'receipt_template_note',
      'email_template_subject', 'email_template_body',
    ])
    .order('key');

  if (error) {
    console.error('讀取店鋪資料失敗：', error);
    return {};
  }

  const result: Record<string, string> = {};
  (data || []).forEach((row: { key: string; value: string }) => {
    result[row.key] = row.value;
  });
  return result;
}

export async function updateShopProfileBatch(entries: Record<string, string>): Promise<boolean> {
  const ops = Object.entries(entries).map(([key, value]) =>
    supabase.from('site_content').upsert(
      { key, value, updated_at: new Date().toISOString() },
      { onConflict: 'key' }
    )
  );
  const results = await Promise.all(ops);
  const failed = results.filter(r => r.error);
  if (failed.length > 0) {
    console.error('部分店鋪資料更新失敗', failed);
    return false;
  }
  return true;
}

export async function getCloudflareAnalytics(): Promise<any> {
  const WORKER_URL = import.meta.env.VITE_CF_WORKER_URL || 'http://localhost:8787';
  try {
    const response = await fetch(`${WORKER_URL}/api/analytics`, {
      method: 'GET',
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('讀取 Cloudflare 數據失敗:', error);
    return null;
  }
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const { data, error } = await supabase
    .from('products')
    .select('*, category:categories(*)')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle();

  if (error) {
    console.error('讀取產品詳情失敗：', error);
    return null;
  }

  return data || null;
}

export async function createProduct(
  product: Omit<Product, 'id' | 'created_at' | 'updated_at' | 'category'>
): Promise<Product | null> {
  const { data, error } = await supabase
    .from('products')
    .insert({
      name: product.name,
      slug: product.slug,
      sku_code: product.sku_code,
      english_name: product.english_name,
      category_id: product.category_id,
      price: product.price,
      original_price: product.original_price,
      description: product.description,
      style_tags: product.style_tags,
      scent_notes: product.scent_notes,
      flower_materials: product.flower_materials,
      origin: product.origin,
      specification: product.specification,
      images: product.images,
      featured: product.featured,
      is_active: product.is_active,
      inventory_type: product.inventory_type ?? 'in_stock',
      pre_order_days: product.pre_order_days ?? null,
      style_spectrum_value: product.style_spectrum_value ?? 50,
      variants: product.variants ?? [],
      linked_addons: product.linked_addons ?? [],
      meta_title: product.meta_title ?? null,
      meta_description: product.meta_description ?? null,
      og_image_url: product.og_image_url ?? null,
    })
    .select()
    .single();

  if (error) {
    console.error('建立產品失敗：', error);
    return null;
  }

  // Create initial inventory
  await supabase.from('inventory').insert({
    product_id: data.id,
    stock_quantity: 0
  });

  return data;
}

export async function updateProduct(
  id: string,
  product: Partial<Omit<Product, 'id' | 'created_at' | 'updated_at' | 'category'>>
): Promise<Product | null> {
  const { data, error } = await supabase
    .from('products')
    .update({
      ...product,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('更新產品失敗：', error);
    return null;
  }

  return data;
}

export async function deleteProduct(id: string): Promise<boolean> {
  const { error } = await supabase.from('products').delete().eq('id', id);

  if (error) {
    console.error('刪除產品失敗：', error);
    return false;
  }

  return true;
}

// ── Addon CRUD ─────────────────────────────────────────────────────────────
export async function getAddons(): Promise<Addon[]> {
  const { data, error } = await supabase
    .from('addons')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) { console.error('取得配件失敗：', error); return []; }
  return data ?? [];
}

export async function createAddon(
  addon: Omit<Addon, 'id' | 'created_at' | 'updated_at'>
): Promise<Addon | null> {
  const { data, error } = await supabase
    .from('addons')
    .insert({
      name: addon.name,
      description: addon.description,
      price: addon.price,
      images: addon.images,
      stock_quantity: addon.stock_quantity,
      is_active: addon.is_active,
      sort_order: addon.sort_order,
    })
    .select()
    .single();
  if (error) { console.error('建立配件失敗：', error); return null; }
  return data;
}

export async function updateAddon(
  id: string,
  addon: Partial<Omit<Addon, 'id' | 'created_at' | 'updated_at'>>
): Promise<Addon | null> {
  const { data, error } = await supabase
    .from('addons')
    .update({ ...addon, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) { console.error('更新配件失敗：', error); return null; }
  return data;
}

export async function deleteAddon(id: string): Promise<boolean> {
  const { error } = await supabase.from('addons').delete().eq('id', id);
  if (error) { console.error('刪除配件失敗：', error); return false; }
  return true;
}

export async function createInquiry(
  inquiry: Omit<Inquiry, 'id' | 'status' | 'created_at' | 'items'>,
  cartItems: CartItem[]
): Promise<Inquiry | null> {
  const { data, error } = await supabase
    .from('inquiries')
    .insert({
      name: inquiry.name,
      phone: inquiry.phone,
      email: inquiry.email,
      message: inquiry.message,
      total_amount: inquiry.total_amount,
    })
    .select()
    .single();

  if (error) {
    console.error('建立詢價失敗：', error);
    return null;
  }

  if (cartItems.length > 0) {
    const items = cartItems.map(item => ({
      inquiry_id: data.id,
      product_id: item.product.id,
      quantity: item.quantity,
      price: item.product.price
    }));

    const { error: itemsError } = await supabase.from('inquiry_items').insert(items);
    if (itemsError) {
      console.error('建立詢價項目失敗：', itemsError);
    }
  }

  return data;
}

export async function getHomeReviews() {
  const { data, error } = await supabase
    .from('product_reviews')
    .select('*, profile:profiles(email), product:products(name)')
    .eq('is_approved', true)
    .eq('show_on_home', true)
    .order('created_at', { ascending: false })
    .limit(3);

  if (error) {
    console.error('讀取首頁評價失敗：', error);
    return [];
  }
  return data || [];
}

export async function getInquiries(): Promise<Inquiry[]> {
  const { data, error } = await supabase
    .from('inquiries')
    .select('*, items:inquiry_items(*, product:products(name, sku_code))')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('讀取詢價失敗：', error);
    return [];
  }

  return Array.isArray(data) ? data : [];
}

export async function updateInquiryStatus(
  id: string,
  status: string
): Promise<boolean> {
  const { error } = await supabase
    .from('inquiries')
    .update({ status })
    .eq('id', id);

  if (error) {
    console.error('更新詢價狀態失敗：', error);
    return false;
  }

  return true;
}

export async function createContactSubmission(
  submission: Omit<ContactSubmission, 'id' | 'created_at'>
): Promise<ContactSubmission | null> {
  const { data, error } = await supabase
    .from('contact_submissions')
    .insert({
      name: submission.name,
      phone: submission.phone,
      email: submission.email,
      message: submission.message,
    })
    .select()
    .single();

  if (error) {
    console.error('建立聯絡訊息失敗：', error);
    return null;
  }

  return data;
}

export async function getContactSubmissions(): Promise<ContactSubmission[]> {
  const { data, error } = await supabase
    .from('contact_submissions')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('讀取聯絡訊息失敗：', error);
    return [];
  }

  return Array.isArray(data) ? data : [];
}

export async function updateSiteContent(
  key: string,
  value: string
): Promise<boolean> {
  const { error } = await supabase
    .from('site_content')
    .update({ value, updated_at: new Date().toISOString() })
    .eq('key', key);

  if (error) {
    console.error('更新網站內容失敗：', error);
    return false;
  }

  return true;
}

const PRODUCTS_BUCKET = 'products';

export async function uploadProductImage(
  file: File,
  filename: string
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(PRODUCTS_BUCKET)
    .upload(filename, file, { contentType: file.type });

  if (error || !data?.path) {
    console.error('上傳圖片失敗：', error);
    return null;
  }

  const { data: urlData } = supabase.storage
    .from(PRODUCTS_BUCKET)
    .getPublicUrl(data.path);

  return urlData.publicUrl;
}

export async function deleteProductImage(path: string): Promise<boolean> {
  const { error } = await supabase.storage.from(PRODUCTS_BUCKET).remove([path]);

  if (error) {
    console.error('刪除圖片失敗：', error);
    return false;
  }

  return true;
}
export async function updateOrderStatus(id: string, status: string): Promise<boolean> {
  const { error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', id);
  if (error) {
    console.error('Error updating order status:', error);
    return false;
  }
  
  // Create an order log for status change
  await addOrderLog(id, { '訂單狀態': status });
  
  return true;
}

export async function updateOrderDetails(id: string, updates: Partial<Order>, oldOrder: Order) {
  const { error } = await supabase
    .from('orders')
    .update(updates)
    .eq('id', id);
  if (error) {
    console.error('Error updating order:', error);
    return false;
  }
  
  // Compute changes for the log
  const changes: Record<string, any> = {};
  Object.keys(updates).forEach(key => {
    if (updates[key as keyof Order] !== oldOrder[key as keyof Order]) {
      changes[key] = {
        old: oldOrder[key as keyof Order],
        new: updates[key as keyof Order]
      };
    }
  });
  
  if (Object.keys(changes).length > 0) {
    await addOrderLog(id, changes);
  }
  
  return true;
}

export async function getOrderLogs(orderId: string): Promise<OrderLog[]> {
  const { data, error } = await supabase
    .from('order_logs')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: false });
    
  if (error) {
    console.error('Error fetching order logs:', error);
    return [];
  }
  return data || [];
}

export async function addOrderLog(orderId: string, changes: Record<string, any>) {
  const { data: userData } = await supabase.auth.getUser();
  const adminName = userData?.user?.email || 'Admin';

  const { error } = await supabase
    .from('order_logs')
    .insert([{
      order_id: orderId,
      admin_name: adminName,
      changes
    }]);
    
  if (error) {
    console.error('Error adding order log:', error);
  }
}


export async function deleteOrder(id: string): Promise<boolean> {
  const { error } = await supabase.from('orders').delete().eq('id', id);
  if (error) {
    console.error('Error deleting order:', error);
    return false;
  }
  return true;
}

export async function deleteOrders(ids: string[]): Promise<boolean> {
  const { error } = await supabase.from('orders').delete().in('id', ids);
  if (error) {
    console.error('Error deleting orders:', error);
    return false;
  }
  return true;
}

/* ─── 交叉標籤池 API ─── */

/** 取得全域標籤池（按維度分組） */
export async function getTagPool(): Promise<{ id: string; name: string; dimension: string }[]> {
  const { data, error } = await supabase
    .from('tag_pool')
    .select('*')
    .order('dimension', { ascending: true })
    .order('name', { ascending: true });
  if (error) { console.error('讀取標籤池失敗：', error); return []; }
  return data || [];
}

/** 新增標籤至標籤池 */
export async function createTag(name: string, dimension: string): Promise<boolean> {
  const { error } = await supabase.from('tag_pool').insert({ name, dimension });
  if (error) { console.error('新增標籤失敗：', error); return false; }
  return true;
}

/** 刪除標籤（同時從所有產品的 style_tags 中移除） */
export async function deleteTag(id: string, name: string): Promise<boolean> {
  const { error } = await supabase.from('tag_pool').delete().eq('id', id);
  if (error) { console.error('刪除標籤失敗：', error); return false; }
  // 從所有產品 style_tags 移除
  const { data: affected } = await supabase
    .from('products')
    .select('id, style_tags')
    .contains('style_tags', [name]);
  if (affected && affected.length > 0) {
    for (const p of affected) {
      await supabase
        .from('products')
        .update({ style_tags: (p.style_tags || []).filter((t: string) => t !== name) })
        .eq('id', p.id);
    }
  }
  return true;
}

/** 批量為多個商品綁定指定標籤（追加，不覆蓋） */
export async function batchBindTags(productIds: string[], tags: string[]): Promise<boolean> {
  for (const pid of productIds) {
    const { data: p } = await supabase
      .from('products')
      .select('style_tags')
      .eq('id', pid)
      .single();
    const existing: string[] = p?.style_tags || [];
    const merged = Array.from(new Set([...existing, ...tags]));
    await supabase.from('products').update({ style_tags: merged }).eq('id', pid);
  }
  return true;
}

/** 批量為多個商品解綁指定標籤 */
export async function batchUnbindTags(productIds: string[], tags: string[]): Promise<boolean> {
  for (const pid of productIds) {
    const { data: p } = await supabase
      .from('products')
      .select('style_tags')
      .eq('id', pid)
      .single();
    const existing: string[] = p?.style_tags || [];
    const updated = existing.filter(t => !tags.includes(t));
    await supabase.from('products').update({ style_tags: updated }).eq('id', pid);
  }
  return true;
}
