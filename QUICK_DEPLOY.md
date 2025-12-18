# 🚀 Quick Deployment Guide (100% FREE)

## One-Command Setup

```bash
python setup_production.py
```

This will generate:
- ✅ Secure SECRET_KEY
- ✅ All environment variables for Vercel
- ✅ Step-by-step instructions

## Environment Variables Explained

### How Vercel Handles Multiple .env Files:

**You DON'T upload .env files to Vercel!**

Instead, you add variables in Vercel Dashboard:
1. Go to: Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add each variable with its value
3. Vercel automatically separates:
   - `VITE_*` variables → Available to frontend build
   - Other variables → Backend only (secure)

### Your Two Environments:

**Backend (.env):**
- `FLASK_SECRET_KEY`
- `DATABASE_URL`  
- `NVIDIA_*` keys
- All non-VITE variables

**Frontend (frontend/.env):**
- `VITE_API_BASE_URL` → Points to your backend URL

Both go in the SAME Vercel environment variable settings, but Vercel separates them automatically!

## Free Services Setup

### 1. Database: Neon PostgreSQL (FREE)
```
Visit: https://neon.tech
1. Sign up (free)
2. Create new project
3. Copy connection string
4. Set as DATABASE_URL in Vercel
```

### 2. Optional - Redis: Upstash (FREE)
```
Visit: https://upstash.com
1. Sign up (free)  
2. Create Redis database
3. Copy connection string
4. Set as REDIS_URL in Vercel
```

## Deployment Steps

### Step 1: Generate Environment Variables
```bash
python setup_production.py
```

### Step 2: Get Neon Database (1 minute)
1. Go to https://console.neon.tech
2. Create project → Copy connection string
3. Replace `DATABASE_URL` in your list

### Step 3: Add to Vercel
1. Push code to GitHub
2. Import to Vercel
3. Go to Settings → Environment Variables
4. Paste all variables from setup_production.py output
5. Deploy!

### Step 4: Update Google OAuth
1. Go to https://console.cloud.google.com/apis/credentials
2. Add redirect URI: `https://YOUR-BACKEND-URL.vercel.app/auth/callback/google`

## What's Free?

| Service | Free Tier | Enough for? |
|---------|-----------|-------------|
| **Neon PostgreSQL** | 512 MB | ✅ Thousands of chats |
| **Upstash Redis** | 10K commands/day | ✅ ~300 users/day |
| **Vercel Hosting** | 100 GB bandwidth | ✅ Most projects |
| **Cloudflare R2** | 10 GB storage | ✅ 10,000+ images |

## Limitations with Free Tier

With the free setup:
- ✅ Unlimited chat conversations
- ✅ Session history
- ✅ Google OAuth login
- ✅ Vision model for images (base64)
- ❌ File uploads (disabled for stateless)
- ❌ Document RAG (requires file storage)

**To enable file uploads:** Add Cloudflare R2 (also FREE)

## Troubleshooting

### "Database connection failed"
→ Check your DATABASE_URL in Vercel env vars

### "CORS error"
→ Verify PRODUCTION_URL and FRONTEND_URL match your actual Vercel URLs

### "OAuth redirect mismatch"
→ Add your Vercel backend URL to Google Console redirect URIs

## Need Help?

Run the setup script to see your configuration:
```bash
python setup_production.py
```

This will show all variables and next steps!
