import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { config } from 'dotenv';
import { readFileSync, writeFileSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: join(__dirname, '.env') });

/**
 * Generate a secure webhook token
 * @returns {string} Secure random token
 */
export function generateWebhookToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Generate tokens for all webhook services
 */
export function generateAllTokens() {
  return {
    paystack: generateWebhookToken(),
    ghdataconnect: generateWebhookToken()
  };
}

/**
 * Update .env file with new tokens
 */
export function updateEnvFile(tokens) {
  const envPath = join(__dirname, '.env');
  let envContent = '';
  
  // Read existing content if file exists
  if (existsSync(envPath)) {
    envContent = readFileSync(envPath, 'utf8');
  }
  
  // Add or update tokens
  const lines = envContent.split('\n').filter(line => line.trim() !== '');
  const updatedLines = [];
  let hasPaystackToken = false;
  let hasGhDataConnectToken = false;
  
  for (const line of lines) {
    if (line.startsWith('PAYSTACK_WEBHOOK_TOKEN=')) {
      updatedLines.push(`PAYSTACK_WEBHOOK_TOKEN=${tokens.paystack}`);
      hasPaystackToken = true;
    } else if (line.startsWith('GHDATACONNECT_WEBHOOK_TOKEN=')) {
      updatedLines.push(`GHDATACONNECT_WEBHOOK_TOKEN=${tokens.ghdataconnect}`);
      hasGhDataConnectToken = true;
    } else {
      updatedLines.push(line);
    }
  }
  
  // Add tokens if they didn't exist
  if (!hasPaystackToken) {
    updatedLines.push(`PAYSTACK_WEBHOOK_TOKEN=${tokens.paystack}`);
  }
  if (!hasGhDataConnectToken) {
    updatedLines.push(`GHDATACONNECT_WEBHOOK_TOKEN=${tokens.ghdataconnect}`);
  }
  
  // Write back to file
  writeFileSync(envPath, updatedLines.join('\n') + '\n');
  
  console.log('✅ Environment variables updated in .env');
}

/**
 * Print webhook URLs with tokens
 */
export function printWebhookUrls(tokens) {
  const baseUrl = process.env.API_BASE_URL || 'https://veloxtopup-api.onrender.com';
  
  console.log('\n📡 WEBHOOK URLs\n');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  console.log('🔷 Paystack Webhook URL:');
  console.log(`${baseUrl}/api/v1/webhooks/paystack/${tokens.paystack}\n`);
  
  console.log('🔷 GHDataConnect Webhook URL:');
  console.log(`${baseUrl}/api/v1/webhooks/ghdataconnect/${tokens.ghdataconnect}\n`);
  
  console.log('═══════════════════════════════════════════════════════════\n');
  
  console.log('📋 Environment Variables to add to Render.com:');
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log(`PAYSTACK_WEBHOOK_TOKEN=${tokens.paystack}`);
  console.log(`GHDATACONNECT_WEBHOOK_TOKEN=${tokens.ghdataconnect}\n`);
  
  console.log('═══════════════════════════════════════════════════════════\n');
}

// Run if called directly (works cross-platform)
const isMainModule = process.argv[1] && (
  import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/')) ||
  import.meta.url === `file://${process.argv[1]}`
);

if (isMainModule) {
  console.log('\n🔐 Generating Webhook Tokens...\n');
  
  const tokens = generateAllTokens();
  
  // Update .env file
  updateEnvFile(tokens);
  
  // Print URLs
  printWebhookUrls(tokens);
  
  console.log('✅ Done! Tokens have been saved to your .env file.\n');
  console.log('⚠️  IMPORTANT: Copy these tokens to your Render.com environment variables!\n');
}

export default {
  generateWebhookToken,
  generateAllTokens,
  updateEnvFile,
  printWebhookUrls
};
