# Kirobox API Integration Guide

## Overview

This project has been updated to integrate with the **kiroanime.onrender.com** API using **corsproxy.io** for CORS handling. The website has been rebranded from "Miruro" to "Kirobox" while maintaining all original UI designs and functionality.

## Changes Made

### 1. Backend Server (`server.js`)

A new Express.js backend server has been created with the following features:

- **MongoDB Integration**: User authentication, watch history, and anime library management
- **Authentication**: JWT-based auth with login/register endpoints
- **User Features**:
    - My List (add/remove anime)
    - Watch History tracking
    - User Profile management
- **Admin Panel**:
    - Episode management (add/edit/delete episodes)
    - Batch episode upload
    - Site configuration (spotlight, trending, top airing, etc.)
    - User management
- **Streaming Proxy**: Video streaming endpoint with proper headers for bypassing restrictions

### 2. Frontend API Integration (`src/hooks/kiroApi.ts`)

A new API service layer has been created with:

- CORS proxy integration (corsproxy.io)
- Session-based caching for improved performance
- Authentication token management
- Fallback to AniList GraphQL API for additional data

### 3. Branding Updates

Changed from "Miruro" to "Kirobox":

- `index.html` - Page title and meta description
- `public/manifest.json` - App name
- `package.json` - Package name
- All page titles throughout the app
- Footer and other UI elements

### 4. Environment Configuration

Updated `.env.example`:

```
VITE_BACKEND_URL="https://kiroanime.onrender.com/"
VITE_PROXY_URL="https://corsproxy.io/"
```

## API Endpoints

### Authentication

- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/verify` - Verify JWT token

### Home & Discovery

- `GET /api/home` - Get homepage sections (spotlight, trending, etc.)
- `GET /api/search?q={query}` - Search anime
- `GET /api/genres` - List all genres
- `GET /api/genre/:genre` - Get anime by genre
- `GET /api/latest` - Get latest releases

### Anime Details

- `GET /api/anime/:id` - Get anime details and episodes
- `GET /api/anime/search/library` - Search library
- `GET /api/anime/library/all` - Get all anime in library

### User Features

- `GET /api/user/profile` - Get user profile
- `POST /api/user/mylist/add` - Add to my list
- `POST /api/user/mylist/remove` - Remove from my list
- `GET /api/user/mylist/check/:anilistId` - Check if in my list
- `POST /api/user/history/add` - Add to watch history
- `DELETE /api/user/history/clear` - Clear watch history

### Admin (Requires Admin Role)

- `GET /api/admin/search` - Search anime to add
- `GET /api/admin/config` - Get site configuration
- `POST /api/admin/config/section` - Update site sections
- `GET /api/admin/anime/:id/episodes` - Get episodes for editing
- `POST /api/admin/anime/:id/episode` - Add/update single episode
- `POST /api/admin/anime/:id/episodes/batch` - Batch add episodes
- `DELETE /api/admin/anime/:id/episode/:episodeId` - Delete episode
- `GET /api/admin/users` - List all users
- `DELETE /api/admin/user/:id` - Delete user
- `GET /api/admin/stats` - Get site statistics

### Video Streaming

- `GET /api/stream?url={videoUrl}` - Proxied video stream with proper headers

## Episode Format

Episodes are stored with the following structure:

```javascript
{
  number: Number,           // Episode number
  title: String,            // Episode title (default: "Episode X")
  language: String,         // "sub", "english-dub", or "tagalog-dub"
  server1: String,          // Primary video URL
  server2: String           // Secondary video URL (optional)
}
```

### Batch Upload Format

For batch episode uploads, use this format:

```
1. https://video-url-for-episode-1.mp4
2. https://video-url-for-episode-2.mp4
3. https://video-url-for-episode-3.mp4
```

Supported separators: `.`, `-`, `:`

## Running the Backend Server

### Prerequisites

```bash
npm install
```

### Start Server

```bash
node server.js
```

The server will run on `http://localhost:5000`

### Environment Variables

The backend requires these environment variables (already configured in `server.js`):

- `MONGO_URI` - MongoDB connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `PORT` - Server port (default: 5000)

## Frontend Usage

### Using the Kiro API

```typescript
import {
    login,
    register,
    fetchHomeData,
    fetchAnimeById,
    searchAnime,
    addToMyList,
} from "./hooks/kiroApi";

// Login
const result = await login("username", "password");

// Fetch home data
const homeData = await fetchHomeData();

// Search anime
const results = await searchAnime("naruto");

// Get anime details
const anime = await fetchAnimeById("21");

// Add to my list
await addToMyList(21);
```

## Admin Credentials

Default admin account:

- **Username**: `kiro`
- **Password**: `XaneKath1`

⚠️ **IMPORTANT**: Change these credentials in production!

## Video Playback

Videos are streamed through the proxy endpoint with proper headers:

- Referer: `https://www.taganimezone.com/`
- Custom User-Agent and browser headers
- Support for range requests (seeking)

## UI Preserved

All original UI designs have been maintained:

- Homepage layout and carousels
- Watch page player
- Episode lists
- Search interface
- Navigation and footer
- Responsive design
- Dark/Light theme support

## Notes

1. **CORS Handling**: All requests to kiroanime.onrender.com are proxied through corsproxy.io
2. **Caching**: Session storage is used to cache API responses for 24 hours
3. **AniList Fallback**: The app still uses AniList GraphQL API for some metadata
4. **Watch Integration**: The watch page has been modified to work with the kiroanime API episode structure

## Troubleshooting

### API Not Responding

- Check if kiroanime.onrender.com is online
- Verify CORS proxy (corsproxy.io) is working
- Check browser console for errors

### Videos Not Playing

- Ensure video URLs are accessible
- Check if the stream proxy endpoint is working
- Verify proper headers are being sent

### Authentication Issues

- Clear browser localStorage and sessionStorage
- Verify JWT token is being sent in requests
- Check MongoDB connection

## Future Improvements

1. Add your own video sources to the admin panel
2. Implement episode quality selection
3. Add download functionality
4. Expand admin panel features
5. Implement user notifications
6. Add anime recommendations

## Support

For issues or questions:

1. Check the browser console for errors
2. Verify API endpoints are accessible
3. Ensure MongoDB is connected
4. Check network requests in browser DevTools
