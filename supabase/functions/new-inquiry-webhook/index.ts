import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

serve(async (req) => {
  try {
    const payload = await req.json();
    console.log('Webhook triggered for new inquiry:', payload.record.id);
    
    // Here you would add logic to send email, Slack, or LINE notifications
    // using the data from payload.record
    
    return new Response(JSON.stringify({ success: true, message: 'Webhook processed' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Webhook error:', err.message);
    return new Response(JSON.stringify({ error: err.message }), { status: 400 });
  }
});
