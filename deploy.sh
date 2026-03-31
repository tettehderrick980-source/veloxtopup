#!/bin/bash

echo "🚀 Deploying VeloxTopUp to Vercel..."

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the project
echo "🔨 Building project..."
npm run build

# Deploy to Vercel
echo "🌐 Deploying to Vercel..."
vercel --prod

echo "✅ Deployment complete!"
echo "🌍 Your app should be available at: https://veloxtopup.shop"
