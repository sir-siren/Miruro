const express = require("express");
const mongoose = require("mongoose");
const axios = require("axios");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
const PORT = process.env.PORT || 5000;
const PASSWORD = process.env.DB_PASSWORD || "XaneKath1";
const JWT_SECRET =
    process.env.JWT_SECRET || "super_secret_key_change_this_in_production";
const MONGO_URI =
    process.env.MONGO_URI ||
    `mongodb+srv://kirobox:${PASSWORD}@cluster0.tmcjgmy.mongodb.net/?appName=Cluster0`;

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

mongoose
    .connect(MONGO_URI)
    .then(() => {
        console.log("✅ MongoDB Connected");
        seedAdmin();
        seedSiteConfig();
    })
    .catch((err) => console.error("❌ DB Error:", err));

// --- SCHEMAS ---

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    country: { type: String },
    gender: { type: String },
    role: { type: String, default: "user" },
    myList: [{ type: Number }],
    history: [
        {
            anilistId: Number,
            episodeNumber: Number,
            timestamp: { type: Date, default: Date.now },
        },
    ],
    createdAt: { type: Date, default: Date.now },
});

const episodeSchema = new mongoose.Schema({
    number: { type: Number, required: true },
    title: { type: String, default: "Episode" },
    language: {
        type: String,
        enum: ["english-dub", "tagalog-dub", "sub"],
        required: true,
    },
    server1: { type: String, required: true },
    server2: { type: String },
});

const animeSchema = new mongoose.Schema({
    anilistId: { type: Number, required: true, unique: true },
    title: { romaji: String, english: String, native: String },
    description: String,
    coverImage: String,
    bannerImage: String,
    genres: [String],
    averageScore: Number,
    popularity: Number,
    status: String,
    seasonYear: Number,
    format: String,
    studios: [String],
    episodes: [episodeSchema],
    lastUpdated: { type: Date, default: Date.now },
});

const siteConfigSchema = new mongoose.Schema({
    spotlight: [{ type: Number }],
    trending: [{ type: Number }],
    topAiring: [{ type: Number }],
    mostPopular: [{ type: Number }],
});

const User = mongoose.model("User", userSchema);
const Anime = mongoose.model("Anime", animeSchema);
const SiteConfig = mongoose.model("SiteConfig", siteConfigSchema);

// --- HELPERS ---

async function seedAdmin() {
    const adminExists = await User.findOne({ username: "kiro" });
    if (!adminExists) {
        const hashedPassword = await bcrypt.hash("XaneKath1", 10);
        await User.create({
            username: "kiro",
            password: hashedPassword,
            role: "admin",
        });
        console.log("🔒 Admin Account Created: kiro");
    }
}

async function seedSiteConfig() {
    const config = await SiteConfig.findOne();
    if (!config) {
        await SiteConfig.create({
            spotlight: [],
            trending: [],
            topAiring: [],
            mostPopular: [],
        });
        console.log("⚙️ Site Config Initialized");
    }
}

function verifyToken(req, res, next) {
    const token = req.headers["authorization"];
    if (!token) return res.status(403).json({ error: "No token provided" });
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) return res.status(401).json({ error: "Unauthorized" });
        req.user = decoded;
        next();
    });
}

function optionalToken(req, res, next) {
    const token = req.headers["authorization"];
    if (token) {
        jwt.verify(token, JWT_SECRET, (err, decoded) => {
            if (!err) req.user = decoded;
        });
    }
    next();
}

function verifyAdmin(req, res, next) {
    if (req.user.role !== "admin")
        return res.status(403).json({ error: "Require Admin Role" });
    next();
}

async function fetchAndSyncAniList(id) {
    const query = `query ($id: Int) { Media (id: $id, type: ANIME) { id title { romaji english native } description bannerImage coverImage { extraLarge } genres averageScore popularity status seasonYear format studios(isMain: true) { nodes { name } } } }`;
    try {
        const res = await axios.post("https://graphql.anilist.co", {
            query,
            variables: { id },
        });
        const media = res.data.data.Media;
        if (!media) return null;

        const updateData = {
            anilistId: media.id,
            title: media.title,
            description: media.description,
            coverImage: media.coverImage.extraLarge,
            bannerImage: media.bannerImage || media.coverImage.extraLarge,
            genres: media.genres,
            averageScore: media.averageScore,
            popularity: media.popularity,
            status: media.status,
            seasonYear: media.seasonYear,
            format: media.format,
            studios: media.studios.nodes.map((s) => s.name),
            lastUpdated: Date.now(),
        };

        return await Anime.findOneAndUpdate(
            { anilistId: media.id },
            { $set: updateData },
            { upsert: true, new: true, setDefaultsOnInsert: true },
        );
    } catch (e) {
        console.error("AniList fetch error:", e.message);
        return null;
    }
}

// --- NEW STREAMING PROXY ROUTE (Adds Headers) ---

app.get("/api/stream", async (req, res) => {
    const videoUrl = req.query.url;
    if (!videoUrl) return res.status(400).send("URL required");

    // Get the range header from the client request (important for seeking)
    const range = req.headers.range || "bytes=0-";

    try {
        // Request the video from the source with the specific headers you provided
        const response = await axios({
            method: "GET",
            url: videoUrl,
            responseType: "stream",
            headers: {
                Range: range,
                Referer: "https://www.taganimezone.com/",
                "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36",
                "Sec-CH-UA":
                    '"Google Chrome";v="143", "Chromium";v="143", "Not A(Brand";v="24"',
                "Sec-CH-UA-Mobile": "?0",
                "Sec-CH-UA-Platform": '"Windows"',
                "Accept-Encoding": "identity;q=1, *;q=0", // Prevent compression for video
            },
            validateStatus: (status) => status >= 200 && status < 300, // Accept 206 Partial Content
        });

        // Forward the relevant response headers back to the client
        const headers = {
            "Content-Range": response.headers["content-range"],
            "Accept-Ranges": "bytes",
            "Content-Length": response.headers["content-length"],
            "Content-Type": response.headers["content-type"] || "video/mp4",
        };

        // Write the partial content header (206)
        res.writeHead(206, headers);

        // Pipe the video stream to the client
        response.data.pipe(res);
    } catch (error) {
        console.error("Stream Error:", error.message);
        // If the upstream fails, try to redirect as a fallback
        res.redirect(videoUrl);
    }
});

// --- AUTH ROUTES ---

app.post("/api/auth/login", async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });
        if (!user) return res.status(404).json({ error: "User not found" });
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch)
            return res.status(401).json({ error: "Invalid Credentials" });
        const token = jwt.sign(
            { id: user._id, username: user.username, role: user.role },
            JWT_SECRET,
            { expiresIn: "7d" },
        );
        res.json({ token, role: user.role, username: user.username });
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

app.post("/api/auth/register", async (req, res) => {
    try {
        const { username, password, gender, country } = req.body;
        if (!username || !password) {
            return res
                .status(400)
                .json({ error: "Username and password are required" });
        }
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ error: "Username already exists" });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await User.create({
            username,
            password: hashedPassword,
            gender,
            country,
        });
        const token = jwt.sign(
            { id: newUser._id, username: newUser.username, role: newUser.role },
            JWT_SECRET,
            { expiresIn: "7d" },
        );
        res.json({
            success: true,
            message: "Registered successfully",
            token,
            username: newUser.username,
            role: newUser.role,
        });
    } catch (err) {
        res.status(500).json({ error: "Registration failed" });
    }
});

app.get("/api/auth/verify", verifyToken, (req, res) => {
    res.json({ valid: true, user: req.user });
});

// --- USER PROFILE ---

app.get("/api/user/profile", verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ error: "User not found" });

        const myListAnime = await Anime.find({
            anilistId: { $in: user.myList },
        }).select("anilistId title coverImage");

        const historyIds = [...new Set(user.history.map((h) => h.anilistId))];
        const historyAnime = await Anime.find({
            anilistId: { $in: historyIds },
        }).select("anilistId title coverImage");

        const fullHistory = user.history
            .map((h) => {
                const anime = historyAnime.find(
                    (a) => a.anilistId === h.anilistId,
                );
                return { ...h.toObject(), anime };
            })
            .reverse();

        res.json({
            username: user.username,
            country: user.country,
            gender: user.gender,
            joined: user.createdAt || user._id.getTimestamp(),
            myList: myListAnime,
            history: fullHistory,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- MY LIST ---

app.post("/api/user/mylist/add", verifyToken, async (req, res) => {
    try {
        const { anilistId } = req.body;
        const user = await User.findById(req.user.id);
        if (!user.myList.includes(anilistId)) {
            user.myList.push(anilistId);
            await user.save();
        }
        res.json({ success: true, myList: user.myList });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post("/api/user/mylist/remove", verifyToken, async (req, res) => {
    try {
        const { anilistId } = req.body;
        const user = await User.findById(req.user.id);
        user.myList = user.myList.filter((id) => id !== anilistId);
        await user.save();
        res.json({ success: true, myList: user.myList });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get("/api/user/mylist/check/:anilistId", verifyToken, async (req, res) => {
    try {
        const anilistId = parseInt(req.params.anilistId);
        const user = await User.findById(req.user.id);
        res.json({ inList: user.myList.includes(anilistId) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- WATCH HISTORY ---

app.post("/api/user/history/add", verifyToken, async (req, res) => {
    try {
        const { anilistId, episodeNumber } = req.body;
        const user = await User.findById(req.user.id);

        // Remove existing entry for same anime/episode
        user.history = user.history.filter(
            (h) =>
                !(
                    h.anilistId === anilistId &&
                    h.episodeNumber === episodeNumber
                ),
        );

        // Add new entry
        user.history.push({ anilistId, episodeNumber, timestamp: new Date() });

        // Keep only last 100 entries
        if (user.history.length > 100) {
            user.history = user.history.slice(-100);
        }

        await user.save();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete("/api/user/history/clear", verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        user.history = [];
        await user.save();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- HOME DATA ---

app.get("/api/home", async (req, res) => {
    try {
        const config = await SiteConfig.findOne();
        if (!config)
            return res.json({
                spotlight: [],
                trending: [],
                topAiring: [],
                mostPopular: [],
            });

        const getDetails = async (ids) => {
            if (!ids.length) return [];
            const animes = await Anime.find({ anilistId: { $in: ids } }).select(
                "-episodes",
            );
            // Maintain order
            return ids
                .map((id) => animes.find((a) => a.anilistId === id))
                .filter(Boolean);
        };

        const [spotlight, trending, topAiring, mostPopular] = await Promise.all(
            [
                getDetails(config.spotlight),
                getDetails(config.trending),
                getDetails(config.topAiring),
                getDetails(config.mostPopular),
            ],
        );

        res.json({ spotlight, trending, topAiring, mostPopular });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- ANIME DETAILS ---

app.get("/api/anime/:id", optionalToken, async (req, res) => {
    try {
        const anilistId = parseInt(req.params.id);
        let anime = await Anime.findOne({ anilistId });

        if (!anime) {
            anime = await fetchAndSyncAniList(anilistId);
            if (!anime)
                return res.status(404).json({ error: "Anime not found" });
        }

        let inMyList = false;
        if (req.user) {
            const user = await User.findById(req.user.id);
            if (user) inMyList = user.myList.includes(anilistId);
        }

        res.json({ ...anime.toObject(), inMyList });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- SEARCH ---

app.get("/api/search", async (req, res) => {
    const { q } = req.query;
    if (!q) return res.json([]);

    const query = `query ($search: String) { Page(page: 1, perPage: 20) { media(search: $search, type: ANIME, sort: POPULARITY_DESC) { id title { romaji english } coverImage { large } seasonYear format status genres averageScore } } }`;
    try {
        const r = await axios.post("https://graphql.anilist.co", {
            query,
            variables: { search: q },
        });
        res.json(r.data.data.Page.media);
    } catch (e) {
        res.json([]);
    }
});

// Library search (only anime in our database)
app.get("/api/anime/search/library", async (req, res) => {
    const { q } = req.query;
    if (!q) return res.json([]);

    try {
        const regex = new RegExp(q, "i");
        const results = await Anime.find({
            $or: [
                { "title.english": regex },
                { "title.romaji": regex },
                { "title.native": regex },
            ],
        })
            .select("-description")
            .limit(20);
        res.json(results);
    } catch (err) {
        res.json([]);
    }
});

// Get all anime in library
app.get("/api/anime/library/all", async (req, res) => {
    try {
        const animes = await Anime.find()
            .select("-description")
            .sort({ lastUpdated: -1 })
            .limit(50);
        res.json(animes);
    } catch (err) {
        res.json([]);
    }
});

// --- GENRES ---

app.get("/api/genres", async (req, res) => {
    const genres = [
        "Action",
        "Adventure",
        "Comedy",
        "Drama",
        "Ecchi",
        "Fantasy",
        "Horror",
        "Mahou Shoujo",
        "Mecha",
        "Music",
        "Mystery",
        "Psychological",
        "Romance",
        "Sci-Fi",
        "Slice of Life",
        "Sports",
        "Supernatural",
        "Thriller",
    ];
    res.json(genres);
});

app.get("/api/genre/:genre", async (req, res) => {
    const { genre } = req.params;
    const page = parseInt(req.query.page) || 1;

    const query = `query ($genre: String, $page: Int) { Page(page: $page, perPage: 20) { media(genre: $genre, type: ANIME, sort: POPULARITY_DESC) { id title { romaji english } coverImage { large } seasonYear format status genres averageScore } } }`;
    try {
        const r = await axios.post("https://graphql.anilist.co", {
            query,
            variables: { genre, page },
        });
        res.json(r.data.data.Page.media);
    } catch (e) {
        res.json([]);
    }
});

// --- LATEST ---

app.get("/api/latest", async (req, res) => {
    const query = `query { Page(page: 1, perPage: 30) { media(type: ANIME, status: RELEASING, sort: UPDATED_AT_DESC) { id title { romaji english } coverImage { large } seasonYear format status genres averageScore } } }`;
    try {
        const r = await axios.post("https://graphql.anilist.co", { query });
        res.json(r.data.data.Page.media);
    } catch (e) {
        res.json([]);
    }
});

// --- ADMIN ROUTES ---

app.get("/api/admin/search", verifyToken, verifyAdmin, async (req, res) => {
    const { q } = req.query;
    const query = `query ($search: String) { Page(page: 1, perPage: 15) { media(search: $search, type: ANIME, sort: POPULARITY_DESC) { id title { romaji english } coverImage { medium } seasonYear format } } }`;
    try {
        const r = await axios.post("https://graphql.anilist.co", {
            query,
            variables: { search: q },
        });
        res.json(r.data.data.Page.media);
    } catch (e) {
        res.json([]);
    }
});

app.get("/api/admin/config", verifyToken, verifyAdmin, async (req, res) => {
    try {
        const config = await SiteConfig.findOne();

        const getDetails = async (ids) => {
            if (!ids.length) return [];
            const animes = await Anime.find({ anilistId: { $in: ids } }).select(
                "anilistId title coverImage",
            );
            return ids
                .map((id) => animes.find((a) => a.anilistId === id))
                .filter(Boolean);
        };

        const [spotlight, trending, topAiring, mostPopular] = await Promise.all(
            [
                getDetails(config.spotlight),
                getDetails(config.trending),
                getDetails(config.topAiring),
                getDetails(config.mostPopular),
            ],
        );

        res.json({ spotlight, trending, topAiring, mostPopular });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post(
    "/api/admin/config/section",
    verifyToken,
    verifyAdmin,
    async (req, res) => {
        try {
            const { section, anilistId, action } = req.body;

            if (action === "add") {
                await fetchAndSyncAniList(anilistId);
            }

            const config = await SiteConfig.findOne();
            let list = config[section] || [];

            if (action === "add" && !list.includes(anilistId)) {
                list.push(anilistId);
            } else if (action === "remove") {
                list = list.filter((id) => id !== anilistId);
            }

            config[section] = list;
            await config.save();

            res.json({ success: true });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
);

// Admin - Manage Episodes
app.get(
    "/api/admin/anime/:id/episodes",
    verifyToken,
    verifyAdmin,
    async (req, res) => {
        try {
            const anilistId = parseInt(req.params.id);
            let anime = await Anime.findOne({ anilistId });

            if (!anime) {
                anime = await fetchAndSyncAniList(anilistId);
            }

            if (!anime)
                return res.status(404).json({ error: "Anime not found" });

            res.json({
                anime: {
                    anilistId: anime.anilistId,
                    title: anime.title,
                    coverImage: anime.coverImage,
                },
                episodes: anime.episodes || [],
            });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
);

app.post(
    "/api/admin/anime/:id/episode",
    verifyToken,
    verifyAdmin,
    async (req, res) => {
        try {
            const anilistId = parseInt(req.params.id);
            const { number, title, language, server1, server2 } = req.body;

            let anime = await Anime.findOne({ anilistId });
            if (!anime) {
                anime = await fetchAndSyncAniList(anilistId);
            }

            if (!anime)
                return res.status(404).json({ error: "Anime not found" });

            // Check if episode already exists
            const existingIndex = anime.episodes.findIndex(
                (e) => e.number === number && e.language === language,
            );

            if (existingIndex >= 0) {
                // Update existing
                anime.episodes[existingIndex] = {
                    number,
                    title,
                    language,
                    server1,
                    server2,
                };
            } else {
                // Add new
                anime.episodes.push({
                    number,
                    title,
                    language,
                    server1,
                    server2,
                });
            }

            // Sort episodes
            anime.episodes.sort((a, b) => a.number - b.number);

            await anime.save();
            res.json({ success: true, episodes: anime.episodes });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
);

// --- NEW BATCH ADD ENDPOINT ---
app.post(
    "/api/admin/anime/:id/episodes/batch",
    verifyToken,
    verifyAdmin,
    async (req, res) => {
        try {
            const anilistId = parseInt(req.params.id);
            const { episodes, language } = req.body;

            if (!episodes)
                return res.status(400).json({ error: "No episodes provided" });

            let anime = await Anime.findOne({ anilistId });
            if (!anime) {
                anime = await fetchAndSyncAniList(anilistId);
            }

            if (!anime)
                return res.status(404).json({ error: "Anime not found" });

            const lines = episodes.split("\n");
            let addedCount = 0;
            let updatedCount = 0;

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed) continue;

                // Match format "1. https://..." or "1 https://..." or "1: https://..."
                const match = trimmed.match(/^(\d+)\s*[.\-:]\s*(.+)$/);

                if (match) {
                    const number = parseInt(match[1]);
                    const server1 = match[2].trim();

                    const existingIndex = anime.episodes.findIndex(
                        (e) => e.number === number && e.language === language,
                    );

                    if (existingIndex >= 0) {
                        // Update existing
                        anime.episodes[existingIndex].server1 = server1;
                        updatedCount++;
                    } else {
                        // Add new
                        anime.episodes.push({
                            number,
                            title: `Episode ${number}`,
                            language,
                            server1,
                        });
                        addedCount++;
                    }
                }
            }

            // Sort episodes
            anime.episodes.sort((a, b) => a.number - b.number);

            await anime.save();
            res.json({
                success: true,
                added: addedCount,
                updated: updatedCount,
            });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
);
// ------------------------------

app.delete(
    "/api/admin/anime/:id/episode/:episodeId",
    verifyToken,
    verifyAdmin,
    async (req, res) => {
        try {
            const anilistId = parseInt(req.params.id);
            const episodeId = req.params.episodeId;

            const anime = await Anime.findOne({ anilistId });
            if (!anime)
                return res.status(404).json({ error: "Anime not found" });

            anime.episodes = anime.episodes.filter(
                (e) => e._id.toString() !== episodeId,
            );
            await anime.save();

            res.json({ success: true, episodes: anime.episodes });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
);

// Admin - User Management
app.get("/api/admin/users", verifyToken, verifyAdmin, async (req, res) => {
    try {
        const users = await User.find().select("-password");
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete(
    "/api/admin/user/:id",
    verifyToken,
    verifyAdmin,
    async (req, res) => {
        try {
            const user = await User.findById(req.params.id);
            if (user.role === "admin") {
                return res.status(400).json({ error: "Cannot delete admin" });
            }
            await User.findByIdAndDelete(req.params.id);
            res.json({ success: true });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
);

// Admin - Stats
app.get("/api/admin/stats", verifyToken, verifyAdmin, async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const totalAnime = await Anime.countDocuments();
        const config = await SiteConfig.findOne();

        res.json({
            totalUsers,
            totalAnime,
            spotlightCount: config?.spotlight?.length || 0,
            trendingCount: config?.trending?.length || 0,
            topAiringCount: config?.topAiring?.length || 0,
            mostPopularCount: config?.mostPopular?.length || 0,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () =>
    console.log(`🚀 Server running on http://localhost:${PORT}`),
);
