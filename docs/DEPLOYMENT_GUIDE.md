# Kirobox Deployment Guide

This guide covers deploying the Kirobox application to Vercel (frontend) and Render (backend).

## Architecture Overview

- **Frontend**: React/Vite app deployed on Vercel
- **Backend**: Express.js server deployed on Render
- **Database**: MongoDB Atlas
- **API**: kiroanime.onrender.com with corsproxy.io

---

## Part 1: Deploy Backend to Render

### Step 1: Prepare Your Repository

1. Make sure all changes are committed and pushed to your main branch:
    ```bash
    git checkout main
    git merge claude/integrate-kirobox-api-zAwPI
    git push origin main
    ```

### Step 2: Create Render Account

1. Go to [render.com](https://render.com)
2. Sign up with GitHub
3. Authorize Render to access your repositories

### Step 3: Create New Web Service

1. Click **"New +"** → **"Web Service"**
2. Connect your `kiroboxx` repository
3. Configure the service:

    **Basic Settings:**
    - Name: `kirobox-backend`
    - Region: `Oregon (US West)` or closest to you
    - Branch: `main`
    - Root Directory: Leave blank
    - Runtime: `Node`
    - Build Command: `npm install`
    - Start Command: `node server.js`

    **Advanced Settings:**
    - Auto-Deploy: `Yes`
    - Health Check Path: `/api/home`

### Step 4: Set Environment Variables

In the Render dashboard, add these environment variables:

| Key          | Value                                                            |
| ------------ | ---------------------------------------------------------------- |
| `NODE_ENV`   | `production`                                                     |
| `PORT`       | `5000`                                                           |
| `MONGO_URI`  | Your MongoDB connection string                                   |
| `JWT_SECRET` | Generate a secure random string (use: `openssl rand -base64 32`) |

**MongoDB Connection String Example:**

```
mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority
```

### Step 5: Deploy

1. Click **"Create Web Service"**
2. Wait for the deployment (5-10 minutes first time)
3. Note your backend URL: `https://your-app-name.onrender.com`

### Step 6: Test Backend

Visit these URLs to verify deployment:

- `https://your-backend-url.onrender.com/api/home`
- `https://your-backend-url.onrender.com/api/genres`

---

## Part 2: Deploy Frontend to Vercel

### Step 1: Create Vercel Account

1. Go to [vercel.com](https://vercel.com)
2. Sign up with GitHub
3. Authorize Vercel to access your repositories

### Step 2: Import Project

1. Click **"Add New..."** → **"Project"**
2. Import your `kiroboxx` repository
3. Configure project:

    **Framework Preset:** `Vite`
    **Root Directory:** `./`
    **Build Command:** `npm run build`
    **Output Directory:** `dist`

### Step 3: Environment Variables

⚠️ **IMPORTANT:** Even though `vercel.json` has default env vars, you should set these in Vercel dashboard for flexibility:

| Key                    | Value                                                                   |
| ---------------------- | ----------------------------------------------------------------------- |
| `VITE_BACKEND_URL`     | Your Render backend URL (e.g., `https://kirobox-backend.onrender.com/`) |
| `VITE_PROXY_URL`       | `https://corsproxy.io/`                                                 |
| `VITE_SKIP_TIMES`      | `https://api.aniskip.com/`                                              |
| `VITE_DEPLOY_PLATFORM` | `VERCEL`                                                                |

**Optional (if using AniList auth):**
| Key | Value |
|-----|-------|
| `VITE_CLIENT_ID` | Your AniList Client ID |
| `VITE_CLIENT_SECRET` | Your AniList Client Secret |
| `VITE_REDIRECT_URI` | `https://your-domain.vercel.app/callback` |

### Step 4: Deploy

1. Click **"Deploy"**
2. Wait for build to complete (2-5 minutes)
3. Note your frontend URL: `https://your-app.vercel.app`

### Step 5: Update Backend URL

If you didn't set `VITE_BACKEND_URL` before deployment:

1. Go to **Project Settings** → **Environment Variables**
2. Add/Update `VITE_BACKEND_URL` with your Render backend URL
3. **Redeploy** from the Deployments tab

---

## Part 3: Configure MongoDB Atlas

### Step 1: Create MongoDB Cluster

1. Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free cluster
3. Choose a region close to your Render deployment

### Step 2: Database Access

1. **Database Access** → **Add New Database User**
    - Username: Choose a username
    - Password: Generate a strong password
    - Built-in Role: **Read and write to any database**
    - Add User

### Step 3: Network Access

1. **Network Access** → **Add IP Address**
2. Click **"Allow Access from Anywhere"** (0.0.0.0/0)
    - ⚠️ This is required for Render's dynamic IPs
3. Confirm

### Step 4: Get Connection String

1. **Database** → **Connect** → **Connect Your Application**
2. Driver: `Node.js`
3. Copy the connection string
4. Replace `<password>` with your database password
5. Replace `<dbname>` with `kirobox` or your preferred database name

Example:

```
mongodb+srv://myuser:mypassword@cluster0.xxxxx.mongodb.net/kirobox?retryWrites=true&w=majority
```

### Step 5: Update Render Environment

1. Go back to Render dashboard
2. Environment → Edit `MONGO_URI`
3. Paste your connection string
4. Save changes (this will trigger a redeploy)

---

## Part 4: Verify Full Deployment

### Backend Tests

Test these endpoints in your browser:

1. `https://your-backend.onrender.com/api/home`
2. `https://your-backend.onrender.com/api/genres`
3. `https://your-backend.onrender.com/api/search?q=naruto`

Expected: JSON responses

### Frontend Tests

1. Visit `https://your-app.vercel.app`
2. Check that the homepage loads
3. Try searching for an anime
4. Try logging in/registering
5. Check browser console for errors

### CORS Test

Open browser console on your frontend and run:

```javascript
fetch("https://your-backend.onrender.com/api/home")
    .then((r) => r.json())
    .then(console.log);
```

Expected: No CORS errors, JSON response logged

---

## Part 5: Custom Domain (Optional)

### For Vercel (Frontend)

1. **Project Settings** → **Domains**
2. Add your domain (e.g., `kirobox.com`)
3. Follow DNS configuration instructions
4. Wait for SSL certificate (automatic)

### For Render (Backend)

1. **Settings** → **Custom Domain**
2. Add your domain (e.g., `api.kirobox.com`)
3. Update DNS records as instructed
4. Wait for SSL certificate (automatic)

### Update Environment Variables

After setting up custom domains:

1. Update `VITE_BACKEND_URL` in Vercel to use your custom API domain
2. Redeploy frontend

---

## Troubleshooting

### Backend Issues

#### "Application Error" on Render

1. Check logs: **Logs** tab in Render dashboard
2. Common issues:
    - MongoDB connection failed → Check `MONGO_URI`
    - Missing dependencies → Check `package.json`
    - Port binding → Make sure using `process.env.PORT`

#### MongoDB Connection Failed

```
Error: Could not connect to MongoDB
```

**Fix:**

1. Verify MongoDB connection string is correct
2. Check database user credentials
3. Ensure IP whitelist includes `0.0.0.0/0`
4. Test connection string locally:
    ```bash
    node -e "require('mongoose').connect('YOUR_MONGO_URI').then(() => console.log('Connected!'))"
    ```

### Frontend Issues

#### "Failed to fetch" errors

**Problem:** Frontend can't reach backend

**Fix:**

1. Check `VITE_BACKEND_URL` is set correctly
2. Ensure backend is deployed and running
3. Test backend URL directly in browser
4. Check CORS configuration in `server.js`

#### Environment variables not working

**Problem:** `import.meta.env.VITE_*` is undefined

**Fix:**

1. Environment variables **must** start with `VITE_`
2. Set in Vercel dashboard, not just `vercel.json`
3. Redeploy after adding env vars
4. Clear browser cache

#### Build fails on Vercel

```
Error: Cannot find module 'xyz'
```

**Fix:**

1. Make sure all dependencies are in `package.json`
2. Run `npm install` locally to verify
3. Check for missing `@types/*` packages
4. Try adding `legacy-peer-deps=true` to `.npmrc`

### Database Issues

#### Admin can't login

**Problem:** Default admin account not created

**Fix:**

1. Check Render logs for "Admin Account Created" message
2. If not seen, restart the service
3. Or manually create admin via MongoDB Atlas UI

#### Slow API responses

**Problem:** Cold starts on Render free tier

**Solution:**

- Render free tier sleeps after 15 min of inactivity
- First request will be slow (15-30 seconds)
- Consider upgrading to paid tier for production
- Or use a service to ping your backend every 10 minutes

---

## Production Checklist

Before going live, ensure:

- [ ] MongoDB connection string uses strong password
- [ ] `JWT_SECRET` is a secure random string (not default)
- [ ] Default admin password has been changed
- [ ] Backend URL uses HTTPS
- [ ] Frontend environment variables are set
- [ ] CORS is properly configured
- [ ] Error logging is set up
- [ ] Database backups are enabled (MongoDB Atlas)
- [ ] Custom domain is configured (optional)
- [ ] SSL certificates are active
- [ ] Monitor Render usage (free tier limits)

---

## Environment Variables Reference

### Frontend (Vercel)

| Variable             | Required | Example                               | Description             |
| -------------------- | -------- | ------------------------------------- | ----------------------- |
| `VITE_BACKEND_URL`   | Yes      | `https://kirobox-api.onrender.com/`   | Your Render backend URL |
| `VITE_PROXY_URL`     | No       | `https://corsproxy.io/`               | CORS proxy              |
| `VITE_SKIP_TIMES`    | No       | `https://api.aniskip.com/`            | Anime skip times API    |
| `VITE_CLIENT_ID`     | No       | `12345`                               | AniList OAuth client ID |
| `VITE_CLIENT_SECRET` | No       | `secret`                              | AniList OAuth secret    |
| `VITE_REDIRECT_URI`  | No       | `https://yourapp.vercel.app/callback` | OAuth redirect          |

### Backend (Render)

| Variable     | Required | Example             | Description                      |
| ------------ | -------- | ------------------- | -------------------------------- |
| `PORT`       | Yes      | `5000`              | Server port (auto-set by Render) |
| `MONGO_URI`  | Yes      | `mongodb+srv://...` | MongoDB connection string        |
| `JWT_SECRET` | Yes      | Random string       | JWT signing secret               |
| `NODE_ENV`   | No       | `production`        | Node environment                 |

---

## Useful Commands

### Local Development

```bash
# Frontend
npm run dev

# Backend (in separate terminal)
node server.js

# Build frontend
npm run build

# Preview production build
npm run preview
```

### Deployment

```bash
# Deploy to Vercel (if using CLI)
vercel --prod

# Check logs on Render
# Use the web dashboard

# Force redeploy on Render
# Manual Deploy → Deploy Latest Commit
```

### Database

```bash
# Test MongoDB connection
node -e "require('mongoose').connect('YOUR_MONGO_URI').then(() => console.log('✅ Connected')).catch(e => console.error('❌ Error:', e.message))"

# Generate secure JWT secret
openssl rand -base64 32
```

---

## Monitoring & Maintenance

### Render Monitoring

- **Logs**: Real-time application logs
- **Metrics**: CPU, memory, response times
- **Events**: Deploy history, crashes

### Vercel Analytics

- Enable in project settings
- View traffic, performance metrics
- Real User Monitoring (RUM)

### MongoDB Atlas Monitoring

- Database size and growth
- Connection statistics
- Query performance

---

## Scaling Considerations

### Free Tier Limitations

**Render:**

- 750 hours/month free compute
- Sleeps after 15 min inactivity
- 512 MB RAM
- Shared CPU

**Vercel:**

- 100 GB bandwidth/month
- 6000 minutes build time/month
- Unlimited projects

**MongoDB Atlas:**

- 512 MB storage
- Shared cluster
- No backups on free tier

### When to Upgrade

Consider upgrading when:

- Traffic exceeds free tier limits
- Need better performance (no cold starts)
- Require automated backups
- Need more storage
- Want custom domains without limitations

---

## Support & Resources

- **Render Docs**: [render.com/docs](https://render.com/docs)
- **Vercel Docs**: [vercel.com/docs](https://vercel.com/docs)
- **MongoDB Docs**: [docs.mongodb.com](https://docs.mongodb.com)
- **Kirobox Integration Guide**: See `KIROBOX_INTEGRATION.md`

---

## Quick Deploy Summary

1. **Backend (Render)**:
    - Create Web Service from GitHub repo
    - Set environment variables (MONGO_URI, JWT_SECRET)
    - Deploy from main branch
    - Note the backend URL

2. **Frontend (Vercel)**:
    - Import GitHub repo
    - Set VITE_BACKEND_URL to Render URL
    - Set other VITE\_\* variables
    - Deploy

3. **Database (MongoDB)**:
    - Create free cluster
    - Add database user
    - Whitelist all IPs (0.0.0.0/0)
    - Copy connection string to Render

4. **Test**:
    - Visit frontend URL
    - Try features
    - Check console for errors

Done! 🎉
