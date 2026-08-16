export interface Env {
  BUCKET: R2Bucket;
  AI_API_URL: string;
  DOUBAO_API_KEY: string;
  STRIPE_SECRET_KEY: string;
  CF_API_TOKEN: string;
  CF_ACCOUNT_ID: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }
    
    const url = new URL(request.url);
    
    try {
      // 1. AI API Proxy (Bypass Geo-restrictions)
      if (url.pathname === '/api/ai' && request.method === 'POST') {
        return await handleAIProxy(request, env);
      }
      
      // 2. R2 Image Upload
      if (url.pathname === '/api/upload' && request.method === 'POST') {
        return await handleImageUpload(request, env);
      }
      
      // 3. R2 Image Serve (Cache Accelerated for HK)
      if (url.pathname.startsWith('/images/')) {
        return await handleImageServe(request, env, ctx);
      }
      
      // 4. Cloudflare Analytics (Traffic & WAF Data)
      if (url.pathname === '/api/analytics' && request.method === 'GET') {
        return await handleAnalytics(request, env);
      }

      return new Response(JSON.stringify({ error: 'Endpoint Not Found' }), { 
        status: 404, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    } catch (error: any) {
      return new Response(JSON.stringify({ error: error.message }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }
  }
};

async function handleAIProxy(request: Request, env: Env) {
  const body = await request.text();
  const response = await fetch(env.AI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${env.DOUBAO_API_KEY}`
    },
    body
  });
  
  const data = await response.text();
  return new Response(data, {
    status: response.status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function handleImageUpload(request: Request, env: Env) {
  // Expected body: formData with 'file' field
  const formData = await request.formData();
  const file = formData.get('file');

  if (!file || !(file instanceof File)) {
    return new Response(JSON.stringify({ error: 'No file uploaded' }), { 
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }

  // Generate unique filename
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 8);
  const extension = file.name.split('.').pop() || 'png';
  const fileName = `${timestamp}-${randomStr}.${extension}`;

  // Upload to R2 Bucket
  await env.BUCKET.put(fileName, file.stream(), {
    httpMetadata: { contentType: file.type }
  });

  const publicUrl = `/images/${fileName}`;

  return new Response(JSON.stringify({ success: true, url: publicUrl }), { 
    headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
  });
}

async function handleImageServe(request: Request, env: Env, ctx: ExecutionContext) {
  const key = new URL(request.url).pathname.replace('/images/', '');
  const object = await env.BUCKET.get(key);

  if (!object) {
    return new Response('Image Not Found', { status: 404, headers: corsHeaders });
  }

  const headers = new Headers(corsHeaders);
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  
  // Cache for 30 days to heavily optimize HK load times
  headers.set('Cache-Control', 'public, max-age=2592000, immutable');

  return new Response(object.body, { headers });
}

async function handleAnalytics(request: Request, env: Env) {
  const query = `
    query {
      viewer {
        accounts(filter: { accountTag: "${env.CF_ACCOUNT_ID}" }) {
          workersInvocationsAdaptive(limit: 7, filter: { scriptName: "royalspl-worker" }) {
            dimensions { date }
            sum { requests, errors }
          }
        }
      }
    }
  `;

  const response = await fetch('https://api.cloudflare.com/client/v4/graphql', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.CF_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query })
  });

  const data = await response.json();
  return new Response(JSON.stringify(data), { 
    headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
  });
}
