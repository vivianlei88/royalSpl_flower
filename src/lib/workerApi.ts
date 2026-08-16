/**
 * Cloudflare Worker API 統一入口
 *
 * 所有 Stripe 密鑰、Webhook Secret 均存放於 Cloudflare Worker 環境變數，
 * 前端僅持有 Worker URL，不接觸任何私密憑證。
 *
 * 環境變數設定（.env）：
 *   VITE_CF_WORKER_URL=https://royalspl-worker.<account>.workers.dev
 */

const WORKER_BASE = import.meta.env.VITE_CF_WORKER_URL || 'http://localhost:8787';

type JsonResponse<T = unknown> = {
  code: 'SUCCESS' | 'FAIL';
  message: string;
  data?: T;
};

async function workerPost<T = unknown>(
  path: string,
  body: Record<string, unknown>,
  authToken?: string
): Promise<JsonResponse<T>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

  const res = await fetch(`${WORKER_BASE}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Worker ${path} 回應 ${res.status}: ${text}`);
  }
  return res.json() as Promise<JsonResponse<T>>;
}

/** 建立 Stripe Checkout Session，密鑰由 Cloudflare Worker 持有 */
export async function createStripeCheckout(params: {
  items: {
    name: string;
    price: number;
    quantity: number;
    product_id?: string;
    product?: { name?: string };
  }[];
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  delivery_date?: string;
  delivery_time_slot?: string;
  delivery_area?: string;
  time_surcharge?: number;
  area_surcharge?: number;
  final_shipping_fee: number;
  total_amount: number;
  card_message?: string;
  remarks?: string;
  specific_time?: string;
}) {
  return workerPost<{ url: string; sessionId: string; orderId: string }>(
    '/stripe/checkout',
    params as unknown as Record<string, unknown>
  );
}

/** 驗證 Stripe 付款結果，密鑰由 Cloudflare Worker 持有 */
export async function verifyStripePayment(sessionId: string) {
  return workerPost<{
    verified: boolean;
    status: string;
    sessionId: string;
    orderId: string;
    amountTotal: number;
    currency: string;
  }>('/stripe/verify', { sessionId });
}
