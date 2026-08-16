#!/bin/bash
echo "Deploying to Cloudflare..."
if [ -z "$CF_API_TOKEN" ]; then
  echo "Error: CF_API_TOKEN is not set. Please set the environment variables from the registered secrets."
  echo "You can deploy manually by running:"
  echo "export CLOUDFLARE_API_TOKEN=<your_token>"
  echo "export CLOUDFLARE_ACCOUNT_ID=<your_account_id>"
  echo "npx wrangler r2 bucket create royalspl-images"
  echo "npx wrangler deploy"
  echo "npx wrangler secret put DOUBAO_API_KEY"
  echo "npx wrangler secret put STRIPE_SECRET_KEY"
  echo "npx wrangler secret put CF_API_TOKEN"
  echo "npx wrangler secret put CF_ACCOUNT_ID"
  exit 1
fi
export CLOUDFLARE_API_TOKEN=$CF_API_TOKEN
export CLOUDFLARE_ACCOUNT_ID=$CF_ACCOUNT_ID
npx wrangler r2 bucket create royalspl-images || true
npx wrangler deploy
echo $DOUBAO_API_KEY | npx wrangler secret put DOUBAO_API_KEY
echo $STRIPE_SECRET_KEY | npx wrangler secret put STRIPE_SECRET_KEY
echo $CF_API_TOKEN | npx wrangler secret put CF_API_TOKEN
echo $CF_ACCOUNT_ID | npx wrangler secret put CF_ACCOUNT_ID
echo "Deployment complete!"
