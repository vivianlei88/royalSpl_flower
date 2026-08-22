export type UserRole = 'user' | 'admin';

export interface Profile {
  id: string;
  email: string | null;
  phone: string | null;
  role: UserRole;
  points_balance: number;
  auth_provider: string | null;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
  description: string | null;
  sort_order: number;
  parent_id: string | null;
  is_active: boolean;
  created_at: string;
}

export interface ProductVariant {
  id: string;           // e.g. 'standard' | 'deluxe' | 'premium'
  label_zh: string;     // 標準款 / 加價款 / 頂級款
  label_en: string;     // Standard / Deluxe / Premium
  price_delta: number;  // 相對基礎售價的加價金額 (0=base)
  description: string;
}

export interface Addon {
  id: string;
  name: string;
  description: string | null;
  price: number;
  images: string[];
  stock_quantity: number;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  sku_code: string | null;
  english_name: string | null;
  category_id: string | null;
  price: number;
  original_price: number | null;
  description: string | null;
  style_tags: string[] | null;
  scent_notes: string[] | null;
  flower_materials: string | null;
  origin: string | null;
  specification: string | null;
  images: string[];
  featured: boolean;
  is_active: boolean;
  inventory_type: 'in_stock' | 'pre_order';
  pre_order_days: number | null;
  // PDP 專屬欄位
  style_spectrum_value: number | null;
  variants: ProductVariant[] | null;
  linked_addons: string[] | null;
  // SEO
  meta_title: string | null;
  meta_description: string | null;
  og_image_url: string | null;
  created_at: string;
  updated_at: string;
  category?: Category;
}

export interface CartItem {
  id?: string;
  user_id?: string;
  product_id?: string;
  quantity: number;
  created_at?: string;
  product: Product;
}

export interface Coupon {
  id: string;
  code: string;
  name: string;
  discount_amount: number;
  min_purchase_amount: number;
  valid_from: string | null;
  valid_until: string | null;
  usage_limit: number | null;
  used_count: number;
  is_active: boolean;
  created_at: string;
}

export interface Order {
  id: string;
  user_id: string | null;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  total_amount: number;
  status: string;
  delivery_date: string | null;
  delivery_time_slot: string | null;
  delivery_area: string | null;
  time_surcharge: number;
  area_surcharge: number;
  final_shipping_fee: number;
  coupon_id: string | null;
  points_used: number;
  discount_amount: number;
  stripe_payment_id: string | null;
  payment_status: string;
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  price: number;
  created_at: string;
  product?: Product;
}

export interface PointTransaction {
  id: string;
  user_id: string;
  amount: number;
  transaction_type: 'earn' | 'spend';
  order_id: string | null;
  created_at: string;
}

export interface ProductReview {
  id: string;
  product_id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  is_approved: boolean;
  show_on_home?: boolean;
  created_at: string;
  profile?: Profile;
  product?: Product;
}

export interface DeliveryRule {
  id: string;
  rule_type: 'time_slot' | 'area';
  name: string;
  fee_amount: number;
  condition_min_amount: number | null;
  created_at: string;
}

export interface InquiryItem {
  id: string;
  inquiry_id: string;
  product_id: string;
  quantity: number;
  price: number;
  created_at: string;
  product?: Product;
}

export interface Inquiry {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  message: string | null;
  status: string;
  total_amount: number;
  created_at: string;
  items?: InquiryItem[];
}

export interface ContactSubmission {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  message: string;
  created_at: string;
}

export interface SiteContent {
  id: string;
  key: string;
  value: string;
  created_at: string;
  updated_at: string;
}

export interface OrderLog {
  id: string;
  order_id: string;
  admin_name: string | null;
  changes: Record<string, any>;
  created_at: string;
}
