# Deployment Guide

## ⚠️ Why Vercel Doesn't Work

- **Vercel is serverless**: Each deployment is ephemeral - your SQLite database file gets deleted
- **Native modules**: `better-sqlite3` is a native C++ module that requires compilation and Linux build tools which Vercel doesn't fully support
- **File storage**: Vercel only supports read-only `/tmp` for temporary files

## ✅ Recommended: Deploy to Railway

Railway.app supports:
- ✓ Persistent file storage
- ✓ Native Node.js modules
- ✓ Docker deployments
- ✓ Free tier available

### Railway Deployment Steps:

1. **Sign up** at https://railway.app (sign in with GitHub)
2. **Create new project** → Import from GitHub
3. **Select repository**: `usernotfound22a/online-invoice`
4. **Configure**:
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Port: `3000`
5. **Deploy** - Railway automatically detects the Dockerfile
6. **Get your URL** from Railway dashboard

### Alternative Options:

**Render.com** (also supports persistent storage):
- https://render.com
- Similar setup, slightly different UI
- Free tier available

**DigitalOcean App Platform**:
- More powerful, slightly more complex
- Paid tier starts at $12/month
- Better for production apps

## Local Development

Run locally with full functionality:

```bash
npm start
# Open http://localhost:3000
# Network: http://192.168.1.171:3000 (adjust IP as needed)
```

## Database

- **Local**: SQLite with WAL mode (file: `data/app.db`)
- **Production**: Data persists in `/app/data` volume on Railway
- **Backup**: Download `data/app.db` from Railway for backups

## Environment Variables (Optional)

```bash
NODE_ENV=production
PORT=3000
SESSION_SECRET=your-secret-key-here
```

Add these in Railway's Variables tab if needed.
