import { createClient } from "jsr:@supabase/supabase-js@2";
import Stripe from "npm:stripe@19.1.0";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const supabase = createClient(supabaseUrl!, supabaseKey!);

const successUrlPath = '/payment-success?session_id={CHECKOUT_SESSION_ID}';
const cancelUrlPath = '/cart';

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function ok(data: any): Response {
    return new Response(
        JSON.stringify({ code: "SUCCESS", message: "ok", data }),
        {
            status: 200,
            headers: { "Content-Type": "application/json", ...corsHeaders }
        }
    );
}

function fail(msg: string, code = 400): Response {
    return new Response(
        JSON.stringify({ code: "FAIL", message: msg }),
        {
            status: code,
            headers: { "Content-Type": "application/json", ...corsHeaders }
        }
    );
}

Deno.serve(async (req) => {
    try {
        if (req.method === "OPTIONS") {
            return new Response(null, { headers: corsHeaders });
        }
        if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

        const request = await req.json();
        
        const authHeader = req.headers.get("Authorization");
        const token = authHeader?.replace("Bearer ", "");
        const { data: { user } } = token
            ? await supabase.auth.getUser(token)
            : { data: { user: null } };

        const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
        if (!stripeSecretKey) {
            throw new Error("STRIPE_SECRET_KEY is not configured in environment variables.");
        }

        const stripe = new Stripe(stripeSecretKey, {
            apiVersion: "2025-08-27.basil",
        });

        const origin = req.headers.get("origin")
            || Deno.env.get("SITE_URL")
            || "https://royalsplflower.com";
        
        // Create order in database
        const { data: order, error: orderError } = await supabase
            .from("orders")
            .insert({
                user_id: user?.id || null,
                total_amount: request.total_amount || 0,
                customer_name: request.customer_name || '',
                customer_phone: request.customer_phone || '',
                customer_email: request.customer_email || '',
                delivery_date: request.delivery_date || null,
                delivery_time_slot: request.delivery_time_slot || '',
                delivery_area: request.delivery_area || '',
                time_surcharge: request.time_surcharge || 0,
                area_surcharge: request.area_surcharge || 0,
                final_shipping_fee: request.final_shipping_fee || 0,
                card_message: request.card_message || '',
                remarks: request.remarks || '',
                specific_time: request.specific_time || '',
                status: 'pending',
                payment_status: 'pending'
            })
            .select()
            .single();

        if (orderError || !order) {
            throw new Error(`Failed to create order: ${orderError?.message || 'Unknown error'}`);
        }

        // Insert order items
        if (request.items && request.items.length > 0) {
            const orderItems = request.items.map((item: any) => ({
                order_id: order.id,
                product_id: item.product_id || item.id, // Assuming items have product_id or id
                quantity: item.quantity || 1,
                price: item.price || 0,
            }));

            const { error: itemsError } = await supabase
                .from("order_items")
                .insert(orderItems);

            if (itemsError) {
                console.error("Failed to insert order items:", itemsError);
                // We don't fail the checkout here, but we should log it
            }
        }

        // Create Stripe Checkout Session
        const lineItems = request.items.map((item: any) => ({
            price_data: {
                currency: 'hkd',
                product_data: {
                    name: item.product?.name || item.name || '商品',
                },
                unit_amount: Math.round((Number(item.price) || 0) * 100),
            },
            quantity: Number(item.quantity) || 1,
        }));
        
        // Add surcharges if any
        if (Number(request.final_shipping_fee) > 0) {
            lineItems.push({
                price_data: {
                    currency: 'hkd',
                    product_data: {
                        name: '運費與附加費',
                    },
                    unit_amount: Math.round(Number(request.final_shipping_fee) * 100),
                },
                quantity: 1,
            });
        }

        const session = await stripe.checkout.sessions.create({
            line_items: lineItems,
            mode: "payment",
            success_url: `${origin}${successUrlPath}`,
            cancel_url: `${origin}${cancelUrlPath}`,
            client_reference_id: order.id,
            customer_email: request.customer_email || undefined,
            metadata: {
                order_id: order.id,
                user_id: user?.id || "",
            },
        });

        // Update order with session ID
        await supabase
            .from("orders")
            .update({
                stripe_payment_id: session.id,
            })
            .eq("id", order.id);

        return ok({
            url: session.url,
            sessionId: session.id,
            orderId: order.id,
        });
    } catch (error) {
        return fail(error instanceof Error ? error.message : "Payment processing failed", 500);
    }
});