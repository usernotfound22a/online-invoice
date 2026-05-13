#!/bin/bash
# Quick deployment to Railway.app

echo "🚀 Pokhara Invoice - Railway Deployment"
echo "========================================"
echo ""
echo "Prerequisites:"
echo "  1. Install Railway CLI: https://docs.railway.app/guides/cli"
echo "  2. Login: railway login"
echo ""

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Install it first:"
    echo "   npm install -g @railway/cli"
    exit 1
fi

echo "✅ Railway CLI found"
echo ""

# Initialize Railway project
echo "📦 Initializing Railway project..."
railway init --name pokhara-invoice

# Create environment variables
echo ""
echo "🔐 Setting environment variables..."
echo ""
echo "Please enter your MongoDB Atlas connection string:"
read -s MONGODB_URL
railway variables set MONGODB_URL="$MONGODB_URL"

echo ""
echo "Generate a secure SESSION_SECRET:"
echo "  Linux/Mac: openssl rand -hex 32"
echo "  Windows PowerShell: -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 64 | % {[char]$_})"
echo ""
echo "Enter your SESSION_SECRET:"
read -s SESSION_SECRET
railway variables set SESSION_SECRET="$SESSION_SECRET"

# Set standard variables
railway variables set NODE_ENV=production
railway variables set PORT=3000
railway variables set WORKERS=max

echo ""
echo "✅ Environment variables set!"
echo ""

# Deploy
echo "🚀 Deploying to Railway..."
railway up

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Your app is now live!"
echo "View logs: railway logs"
echo "View status: railway status"
