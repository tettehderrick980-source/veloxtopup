# Vercel Environment Variables Setup Script
# Run this script to configure environment variables on Vercel

Write-Host "Setting up Vercel Environment Variables..." -ForegroundColor Cyan
Write-Host ""

# Check if Vercel CLI is installed
try {
    $vercelVersion = vercel --version 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Vercel CLI not found"
    }
    Write-Host "✓ Vercel CLI detected: $vercelVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Vercel CLI not found. Install it with: npm i -g vercel" -ForegroundColor Red
    Write-Host ""
    Write-Host "Then run: vercel login" -ForegroundColor Yellow
    exit 1
}

# Check if logged in
Write-Host "`nChecking Vercel login status..." -ForegroundColor Yellow
vercel whoami 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Not logged in to Vercel" -ForegroundColor Red
    Write-Host "Please run: vercel login" -ForegroundColor Yellow
    exit 1
}
Write-Host "✓ Logged in to Vercel" -ForegroundColor Green

# Set environment variables
Write-Host "`nSetting environment variables for all environments..." -ForegroundColor Cyan
Write-Host ""

# Production Environment
Write-Host "Setting PRODUCTION variables..." -ForegroundColor Yellow
vercel env add VITE_SUPABASE_URL production <<< "https://xlsrtcfndfsmcjaoswfq.supabase.co"
vercel env add VITE_SUPABASE_ANON_KEY production <<< "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhsc3J0Y2ZuZGZzbWNqYW9zd2ZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0MDUxNTgsImV4cCI6MjA4Njk4MTE1OH0.kYi8EeswcvtrJ37m_DtmPpk2kv99ClnqEnAYykIOUkM"
vercel env add VITE_PAYSTACK_PUBLIC_KEY production <<< "pk_live_f6937f94bbd7e8f07049a8c74a1354bc4f312bef"
vercel env add VITE_APP_NAME production <<< "VeloxTopUp"
vercel env add VITE_APP_URL production <<< "https://veloxtopup.shop"

# Preview Environment
Write-Host "`nSetting PREVIEW variables..." -ForegroundColor Yellow
vercel env add VITE_SUPABASE_URL preview <<< "https://xlsrtcfndfsmcjaoswfq.supabase.co"
vercel env add VITE_SUPABASE_ANON_KEY preview <<< "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhsc3J0Y2ZuZGZzbWNqYW9zd2ZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0MDUxNTgsImV4cCI6MjA4Njk4MTE1OH0.kYi8EeswcvtrJ37m_DtmPpk2kv99ClnqEnAYykIOUkM"
vercel env add VITE_PAYSTACK_PUBLIC_KEY preview <<< "pk_live_f6937f94bbd7e8f07049a8c74a1354bc4f312bef"
vercel env add VITE_APP_NAME preview <<< "VeloxTopUp"
vercel env add VITE_APP_URL preview <<< "https://veloxtopup.shop"

# Development Environment
Write-Host "`nSetting DEVELOPMENT variables..." -ForegroundColor Yellow
vercel env add VITE_SUPABASE_URL development <<< "https://xlsrtcfndfsmcjaoswfq.supabase.co"
vercel env add VITE_SUPABASE_ANON_KEY preview <<< "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhsc3J0Y2ZuZGZzbWNqYW9zd2ZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0MDUxNTgsImV4cCI6MjA4Njk4MTE1OH0.kYi8EeswcvtrJ37m_DtmPpk2kv99ClnqEnAYykIOUkM"
vercel env add VITE_PAYSTACK_PUBLIC_KEY development <<< "pk_live_f6937f94bbd7e8f07049a8c74a1354bc4f312bef"
vercel env add VITE_APP_NAME development <<< "VeloxTopUp"
vercel env add VITE_APP_URL development <<< "https://veloxtopup.shop"

Write-Host ""
Write-Host "✓ All environment variables set!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Redeploy your app on Vercel" -ForegroundColor White
Write-Host "2. Or run: vercel --prod" -ForegroundColor White
Write-Host ""
