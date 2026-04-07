# Kirobox Quick Start Guide

## 🚀 Deploy in 15 Minutes

This is a condensed guide to get Kirobox deployed to production quickly. For detailed instructions, see [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md).

---

## Prerequisites

- GitHub account
- Vercel account (sign up at [vercel.com](https://vercel.com))
- Render account (sign up at [render.com](https://render.com))
- MongoDB Atlas account (sign up at [mongodb.com](https://mongodb.com/cloud/atlas))

---

## Step 1: Setup MongoDB (5 min)

1. **Create Cluster**
    - Go to [cloud.mongodb.com](https://cloud.mongodb.com)
    - Create a FREE cluster
    - Choose a region close to you

2. **Create Database User**
    - Database Access → Add New User
    - Username: `kirobox`
    - Auto-generate password (save it!)
    - Role: **Atlas Admin**

3. **Network Access**
    - Network Access → Add IP Address
    - Select: **Allow Access from Anywhere** (0.0.0.0/0)

4. **Get Connection String**
    - Connect → Connect Your Application
    - Copy connection string
    - Replace `<password>` with your saved password
    - Replace `<dbname>` with `kirobox`

    Example:

    ```
    mongodb+srv://kirobox:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/kirobox?retryWrites=true&w=majority
    ```

---

## Step 2: Deploy Backend to Render (5 min)

1. **Create Web Service**
    - Go to [dashboard.render.com](https://dashboard.render.com)
    - New → Web Service
    - Connect your `kiroboxx` GitHub repo
    - Name: `kirobox-backend`
    - Branch: `main`
    - Build Command: `npm install`
    - Start Command: `node server.js`
    - Plan: **Free**

2. **Add Environment Variables**

    Click "Advanced" and add:

    | Variable     | Value                                           |
    | ------------ | ----------------------------------------------- |
    | `MONGO_URI`  | Your MongoDB connection string from Step 1      |
    | `JWT_SECRET` | Run: `openssl rand -base64 32` and paste result |
    | `NODE_ENV`   | `production`                                    |

3. **Deploy**
    - Click "Create Web Service"
    - Wait 5-10 minutes for first deployment
    - Copy your URL: `https://kirobox-backend-xxxx.onrender.com`

4. **Verify**
    - Visit: `https://your-backend-url.onrender.com/api/home`
    - Should see JSON response (even if empty)

---

## Step 3: Deploy Frontend to Vercel (3 min)

1. **Import Project**
    - Go to [vercel.com/new](https://vercel.com/new)
    - Import `kiroboxx` repository
    - Framework: **Vite** (auto-detected)

2. **Environment Variables**

    Add these before deploying:

    | Variable           | Value                                           |
    | ------------------ | ----------------------------------------------- |
    | `VITE_BACKEND_URL` | Your Render URL from Step 2 (must end with `/`) |
    | `VITE_PROXY_URL`   | `https://corsproxy.io/`                         |
    | `VITE_SKIP_TIMES`  | `https://api.aniskip.com/`                      |

3. **Deploy**
    - Click "Deploy"
    - Wait 2-3 minutes
    - Visit your site: `https://your-app.vercel.app`

---

## Step 4: Test Everything (2 min)

### Backend Test

```bash
curl https://your-backend.onrender.com/api/home
```

Should return JSON (even if empty arrays)

### Frontend Test

1. Visit your Vercel URL
2. Homepage should load
3. Try searching for "naruto"
4. Register a new account
5. Try adding anime to your list

### Check Console

- Open browser DevTools (F12)
- Check Console tab for errors
- Network tab should show successful API calls

---

## Step 5: Access Admin Panel

1. **Login**
    - Go to your site
    - Click Login
    - Username: `kiro`
    - Password: `XaneKath1`

2. **Change Password** (Important!)
    - ⚠️ Change this password immediately in production!
    - You'll need to do this via MongoDB or create a password change feature

3. **Add Content**
    - Admin panel lets you:
        - Add anime episodes
        - Manage spotlight/trending sections
        - View users
        - See statistics

---

## Troubleshooting

### "Cannot connect to backend"

- ✅ Check `VITE_BACKEND_URL` is set correctly in Vercel
- ✅ Verify backend URL ends with `/`
- ✅ Test backend URL in browser
- ✅ Redeploy frontend after fixing env vars

### "MongoDB connection failed"

- ✅ Check connection string is correct
- ✅ Password doesn't contain special characters that need escaping
- ✅ IP whitelist includes 0.0.0.0/0
- ✅ Check Render logs for specific error

### "Site loads but no content"

- ✅ Backend needs to be running first
- ✅ Check backend logs in Render
- ✅ Admin needs to add content to spotlight/trending
- ✅ Or add anime via admin panel

### Backend is slow

- ℹ️ Render free tier sleeps after 15 min
- ℹ️ First request takes 15-30 seconds
- ℹ️ Normal behavior for free tier
- ℹ️ Upgrade to paid tier to eliminate cold starts

---

## Production Checklist

Before announcing your site:

- [ ] Changed admin password
- [ ] Added anime to database
- [ ] Configured spotlight/trending sections
- [ ] Tested video playback
- [ ] Tested user registration/login
- [ ] Checked all links work
- [ ] Reviewed MongoDB security
- [ ] Set up custom domain (optional)
- [ ] Enabled analytics (optional)

---

## What's Next?

### Add Content

Use the admin panel to:

1. Search for anime (uses AniList)
2. Add to your library
3. Upload episodes (batch upload supported)
4. Configure homepage sections

### Custom Domain

- **Vercel**: Project Settings → Domains
- **Render**: Settings → Custom Domain
- Update DNS records as instructed

### Monitoring

- **Render**: Check logs and metrics
- **Vercel**: Analytics tab
- **MongoDB**: Monitor tab for database stats

### Scaling

When you outgrow free tier:

- Render: $7/month for always-on server
- Vercel: Auto-scales, pay for usage
- MongoDB: $9/month for dedicated cluster

---

## Important URLs

Save these for reference:

- **Your Frontend**: `https://your-app.vercel.app`
- **Your Backend**: `https://your-backend.onrender.com`
- **MongoDB**: `https://cloud.mongodb.com`
- **Vercel Dashboard**: `https://vercel.com/dashboard`
- **Render Dashboard**: `https://dashboard.render.com`

---

## Get Help

- Full deployment guide: [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
- API reference: [KIROBOX_INTEGRATION.md](./KIROBOX_INTEGRATION.md)
- Check Render logs for backend issues
- Check Vercel deployment logs for frontend issues
- Check browser console for client-side errors

---

## Maintenance

### Update Site

1. Make changes locally
2. Commit and push to main branch
3. Vercel auto-deploys frontend
4. Render auto-deploys backend

Or use the deploy script:

```bash
./deploy.sh
```

### Monitor Free Tier Limits

- **Render**: 750 hours/month
- **Vercel**: 100 GB bandwidth/month
- **MongoDB**: 512 MB storage

You'll get email warnings when approaching limits.

---

**Congratulations! Your Kirobox site should now be live! 🎉**

Visit your site and start adding anime content through the admin panel.
