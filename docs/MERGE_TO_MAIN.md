# How to Merge to Main and Deploy

Since you mentioned you can't change the deployment branch and will use `main`, here's how to merge your changes and deploy.

## Quick Merge & Deploy

Run these commands to merge everything to main:

```bash
# Make sure you're in the project directory
cd /home/user/kiroboxx

# Switch to main branch
git checkout main

# Merge your feature branch
git merge claude/integrate-kirobox-api-zAwPI

# Push to GitHub
git push origin main
```

That's it! Once pushed to main:

- **Vercel** will automatically deploy your frontend
- **Render** will automatically deploy your backend

## Alternative: Use the Deploy Script

```bash
# Run the deployment helper
./deploy.sh
```

This script will:

1. Check for uncommitted changes
2. Offer to merge your branch into main
3. Push to GitHub
4. Show next steps

## First Time Deployment

If this is your first deployment, you need to set up the services first:

### 1. Setup MongoDB Atlas

See [QUICK_START.md](./QUICK_START.md#step-1-setup-mongodb-5-min)

### 2. Setup Render (Backend)

1. Go to [dashboard.render.com](https://dashboard.render.com)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure:
    - **Name**: `kirobox-backend`
    - **Branch**: `main` ⚠️
    - **Build Command**: `npm install`
    - **Start Command**: `node server.js`
    - **Plan**: Free

5. Add Environment Variables:
    - `MONGO_URI`: Your MongoDB connection string
    - `JWT_SECRET`: Generate with `openssl rand -base64 32`
    - `NODE_ENV`: `production`

6. Click "Create Web Service"
7. Wait for deployment (5-10 minutes)
8. Copy your backend URL: `https://kirobox-backend-xxxx.onrender.com`

### 3. Setup Vercel (Frontend)

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository
3. Add Environment Variables:
    - `VITE_BACKEND_URL`: Your Render URL (must end with `/`)
    - `VITE_PROXY_URL`: `https://corsproxy.io/`
    - `VITE_SKIP_TIMES`: `https://api.aniskip.com/`

4. Click "Deploy"
5. Wait 2-3 minutes
6. Visit your site!

## Subsequent Deployments

After the initial setup, deployments are automatic:

1. Make your changes
2. Commit to your branch
3. Merge to main:
    ```bash
    git checkout main
    git merge your-branch-name
    git push origin main
    ```
4. Vercel and Render automatically deploy

## Verify Deployment

### Check Backend (Render)

```bash
curl https://your-backend.onrender.com/api/home
```

Should return JSON

### Check Frontend (Vercel)

1. Visit your Vercel URL
2. Open browser console (F12)
3. Look for any errors
4. Try searching for anime
5. Try registering/logging in

## Deployment Branches

Current setup:

- **Development Branch**: `claude/integrate-kirobox-api-zAwPI`
- **Production Branch**: `main` ⚠️
- **Vercel deploys from**: `main`
- **Render deploys from**: `main`

Both services watch the `main` branch for changes.

## Troubleshooting

### Merge Conflicts

If you get merge conflicts:

```bash
git checkout main
git merge claude/integrate-kirobox-api-zAwPI

# If conflicts occur:
# 1. Open conflicted files in your editor
# 2. Resolve conflicts (look for <<<<<<, ======, >>>>>>)
# 3. Save files
git add .
git commit -m "Merge feature branch"
git push origin main
```

### Deployment Fails on Vercel

1. Go to Vercel dashboard
2. Check deployment logs
3. Common issues:
    - Missing environment variables
    - Build errors (check package.json)
    - Node version mismatch

### Deployment Fails on Render

1. Go to Render dashboard
2. Check logs tab
3. Common issues:
    - MongoDB connection failed
    - Missing environment variables
    - npm install errors

## Environment Variables Checklist

### Vercel (Frontend)

- [ ] `VITE_BACKEND_URL` - Your Render backend URL
- [ ] `VITE_PROXY_URL` - `https://corsproxy.io/`
- [ ] `VITE_SKIP_TIMES` - `https://api.aniskip.com/`

### Render (Backend)

- [ ] `MONGO_URI` - MongoDB connection string
- [ ] `JWT_SECRET` - Random secure string
- [ ] `NODE_ENV` - `production`
- [ ] `PORT` - Auto-set by Render

## Production Checklist

Before going live:

- [ ] Merged to main branch
- [ ] Vercel environment variables set
- [ ] Render environment variables set
- [ ] MongoDB connection working
- [ ] Changed admin password from default
- [ ] Tested video playback
- [ ] Tested user registration
- [ ] Added content via admin panel
- [ ] Checked all links work
- [ ] Reviewed security settings

## Quick Commands Reference

```bash
# Merge to main and deploy
git checkout main
git merge claude/integrate-kirobox-api-zAwPI
git push origin main

# Check deployment status
# Vercel: https://vercel.com/dashboard
# Render: https://dashboard.render.com

# View logs
# Vercel: Click on deployment → View Function Logs
# Render: Click on service → Logs tab

# Test backend
curl https://your-backend.onrender.com/api/home

# Generate JWT secret
openssl rand -base64 32
```

## Support

- **Full Guide**: [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
- **Quick Start**: [QUICK_START.md](./QUICK_START.md)
- **API Docs**: [KIROBOX_INTEGRATION.md](./KIROBOX_INTEGRATION.md)

---

**Ready to deploy? Run `git checkout main && git merge claude/integrate-kirobox-api-zAwPI && git push origin main`**
