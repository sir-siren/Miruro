import { Hono } from "hono";
import { cors } from "hono/cors";
import { jwt, sign, verify } from "hono/jwt";
import mongoose, { Schema, type Document } from "mongoose";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const PORT = Number(process.env.PORT) || 5000;
const JWT_SECRET = process.env.JWT_SECRET ?? "super_secret_key_change_this_in_production";
const MONGO_URI =
    process.env.MONGO_URI ??
    "mongodb+srv://kiroanime:XaneKath1@kiroanime.mtrpf8o.mongodb.net/?appName=kiroanime";

const ANILIST_URL = "https://graphql.anilist.co";

// ---------------------------------------------------------------------------
// Mongoose schemas & models
// ---------------------------------------------------------------------------

interface IUser extends Document {
    username: string;
    password: string;
    country?: string;
    gender?: string;
    role: string;
    myList: number[];
    history: { anilistId: number; episodeNumber: number; timestamp: Date }[];
    createdAt: Date;
}

const userSchema = new Schema<IUser>({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    country: String,
    gender: String,
    role: { type: String, default: "user" },
    myList: [Number],
    history: [
        {
            anilistId: Number,
            episodeNumber: Number,
            timestamp: { type: Date, default: Date.now },
        },
    ],
    createdAt: { type: Date, default: Date.now },
});

const episodeSchema = new Schema({
    number: { type: Number, required: true },
    title: { type: String, default: "Episode" },
    language: { type: String, enum: ["english-dub", "tagalog-dub", "sub"], required: true },
    server1: { type: String, required: true },
    server2: String,
});

const animeSchema = new Schema({
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

const siteConfigSchema = new Schema({
    spotlight: [Number],
    trending: [Number],
    topAiring: [Number],
    mostPopular: [Number],
});

const User = mongoose.model<IUser>("User", userSchema);
const Anime = mongoose.model("Anime", animeSchema);
const SiteConfig = mongoose.model("SiteConfig", siteConfigSchema);

// ---------------------------------------------------------------------------
// DB helpers
// ---------------------------------------------------------------------------

async function seedAdmin() {
    const exists = await User.findOne({ username: "kiro" });
    if (!exists) {
        const hashed = await Bun.password.hash("XaneKath1");
        await User.create({ username: "kiro", password: hashed, role: "admin" });
        console.log("🔒 Admin created: kiro");
    }
}

async function seedSiteConfig() {
    const config = await SiteConfig.findOne();
    if (!config) {
        await SiteConfig.create({ spotlight: [], trending: [], topAiring: [], mostPopular: [] });
        console.log("⚙️ Site config initialized");
    }
}

async function fetchAndSyncAniList(id: number) {
    const query = `query ($id: Int) { Media (id: $id, type: ANIME) { id title { romaji english native } description bannerImage coverImage { extraLarge } genres averageScore popularity status seasonYear format studios(isMain: true) { nodes { name } } } }`;
    try {
        const res = await fetch(ANILIST_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query, variables: { id } }),
        });
        const json = (await res.json()) as { data: { Media: any } };
        const media = json.data?.Media;
        if (!media) return null;

        return await Anime.findOneAndUpdate(
            { anilistId: media.id },
            {
                $set: {
                    anilistId: media.id,
                    title: media.title,
                    description: media.description,
                    coverImage: media.coverImage.extraLarge,
                    bannerImage: media.bannerImage ?? media.coverImage.extraLarge,
                    genres: media.genres,
                    averageScore: media.averageScore,
                    popularity: media.popularity,
                    status: media.status,
                    seasonYear: media.seasonYear,
                    format: media.format,
                    studios: media.studios.nodes.map((s: { name: string }) => s.name),
                    lastUpdated: Date.now(),
                },
            },
            { upsert: true, new: true, setDefaultsOnInsert: true },
        );
    } catch (e) {
        console.error("AniList fetch error:", e);
        return null;
    }
}

async function getAnimeDetails(ids: number[]) {
    if (!ids.length) return [];
    const animes = await Anime.find({ anilistId: { $in: ids } }).select("-episodes");
    return ids.map((id) => animes.find((a: any) => a.anilistId === id)).filter(Boolean);
}

// ---------------------------------------------------------------------------
// App & middleware
// ---------------------------------------------------------------------------

const app = new Hono();

app.use("*", cors());

// Auth middleware (attach user to context)
const authMiddleware = async (c: any, next: any) => {
    const token = c.req.header("authorization");
    if (!token) return c.json({ error: "No token provided" }, 403);
    try {
        const payload = await verify(token, JWT_SECRET);
        c.set("user", payload);
        await next();
    } catch {
        return c.json({ error: "Unauthorized" }, 401);
    }
};

const optionalAuth = async (c: any, next: any) => {
    const token = c.req.header("authorization");
    if (token) {
        try {
            const payload = await verify(token, JWT_SECRET);
            c.set("user", payload);
        } catch { }
    }
    await next();
};

const adminMiddleware = async (c: any, next: any) => {
    const user = c.get("user") as { role: string } | undefined;
    if (user?.role !== "admin") return c.json({ error: "Require Admin Role" }, 403);
    await next();
};

// ---------------------------------------------------------------------------
// Streaming proxy
// ---------------------------------------------------------------------------

app.get("/api/stream", async (c) => {
    const videoUrl = c.req.query("url");
    if (!videoUrl) return c.text("URL required", 400);

    const range = c.req.header("range") ?? "bytes=0-";

    const upstream = await fetch(videoUrl, {
        headers: {
            Range: range,
            Referer: "https://www.taganimezone.com/",
            "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36",
            "Accept-Encoding": "identity;q=1, *;q=0",
        },
    });

    // Forward stream directly — Bun handles ReadableStream natively
    return new Response(upstream.body, {
        status: 206,
        headers: {
            "Content-Range": upstream.headers.get("content-range") ?? "",
            "Accept-Ranges": "bytes",
            "Content-Length": upstream.headers.get("content-length") ?? "",
            "Content-Type": upstream.headers.get("content-type") ?? "video/mp4",
        },
    });
});

// ---------------------------------------------------------------------------
// Auth routes
// ---------------------------------------------------------------------------

app.post("/api/auth/login", async (c) => {
    const { username, password } = await c.req.json<{ username: string; password: string }>();
    const user = await User.findOne({ username });
    if (!user) return c.json({ error: "User not found" }, 404);

    const isMatch = await Bun.password.verify(password, user.password);
    if (!isMatch) return c.json({ error: "Invalid Credentials" }, 401);

    const token = await sign({ id: user._id, username: user.username, role: user.role }, JWT_SECRET);
    return c.json({ token, role: user.role, username: user.username });
});

app.post("/api/auth/register", async (c) => {
    const { username, password, gender, country } = await c.req.json<{
        username: string;
        password: string;
        gender?: string;
        country?: string;
    }>();

    if (!username || !password) return c.json({ error: "Username and password required" }, 400);
    if (await User.findOne({ username })) return c.json({ error: "Username already exists" }, 400);

    const hashed = await Bun.password.hash(password);
    const newUser = await User.create({ username, password: hashed, gender, country });
    const token = await sign(
        { id: newUser._id, username: newUser.username, role: newUser.role },
        JWT_SECRET,
    );
    return c.json({ success: true, token, username: newUser.username, role: newUser.role });
});

app.get("/api/auth/verify", authMiddleware, (c) => c.json({ valid: true, user: c.get("user") }));

// ---------------------------------------------------------------------------
// User profile & my list
// ---------------------------------------------------------------------------

app.get("/api/user/profile", authMiddleware, async (c) => {
    const { id } = c.get("user") as { id: string };
    const user = await User.findById(id);
    if (!user) return c.json({ error: "User not found" }, 404);

    const myListAnime = await Anime.find({ anilistId: { $in: user.myList } }).select(
        "anilistId title coverImage",
    );
    const historyIds = [...new Set(user.history.map((h) => h.anilistId))];
    const historyAnime = await Anime.find({ anilistId: { $in: historyIds } }).select(
        "anilistId title coverImage",
    );

    const fullHistory = user.history
        .map((h) => ({ ...h.toObject(), anime: historyAnime.find((a: any) => a.anilistId === h.anilistId) }))
        .reverse();

    return c.json({
        username: user.username,
        country: user.country,
        gender: user.gender,
        joined: user.createdAt,
        myList: myListAnime,
        history: fullHistory,
    });
});

app.post("/api/user/mylist/add", authMiddleware, async (c) => {
    const { id } = c.get("user") as { id: string };
    const { anilistId } = await c.req.json<{ anilistId: number }>();
    const user = await User.findById(id);
    if (!user) return c.json({ error: "User not found" }, 404);
    if (!user.myList.includes(anilistId)) { user.myList.push(anilistId); await user.save(); }
    return c.json({ success: true, myList: user.myList });
});

app.post("/api/user/mylist/remove", authMiddleware, async (c) => {
    const { id } = c.get("user") as { id: string };
    const { anilistId } = await c.req.json<{ anilistId: number }>();
    const user = await User.findById(id);
    if (!user) return c.json({ error: "User not found" }, 404);
    user.myList = user.myList.filter((listId) => listId !== anilistId);
    await user.save();
    return c.json({ success: true, myList: user.myList });
});

app.get("/api/user/mylist/check/:anilistId", authMiddleware, async (c) => {
    const { id } = c.get("user") as { id: string };
    const anilistId = Number(c.req.param("anilistId"));
    const user = await User.findById(id);
    return c.json({ inList: user?.myList.includes(anilistId) ?? false });
});

app.post("/api/user/history/add", authMiddleware, async (c) => {
    const { id } = c.get("user") as { id: string };
    const { anilistId, episodeNumber } = await c.req.json<{ anilistId: number; episodeNumber: number }>();
    const user = await User.findById(id);
    if (!user) return c.json({ error: "User not found" }, 404);
    user.history = user.history.filter(
        (h) => !(h.anilistId === anilistId && h.episodeNumber === episodeNumber),
    );
    user.history.push({ anilistId, episodeNumber, timestamp: new Date() });
    if (user.history.length > 100) user.history = user.history.slice(-100);
    await user.save();
    return c.json({ success: true });
});

app.delete("/api/user/history/clear", authMiddleware, async (c) => {
    const { id } = c.get("user") as { id: string };
    const user = await User.findById(id);
    if (!user) return c.json({ error: "User not found" }, 404);
    user.history = [];
    await user.save();
    return c.json({ success: true });
});

// ---------------------------------------------------------------------------
// Home & discovery
// ---------------------------------------------------------------------------

app.get("/api/home", async (c) => {
    const config = await SiteConfig.findOne();
    if (!config) return c.json({ spotlight: [], trending: [], topAiring: [], mostPopular: [] });

    const [spotlight, trending, topAiring, mostPopular] = await Promise.all([
        getAnimeDetails(config.spotlight),
        getAnimeDetails(config.trending),
        getAnimeDetails(config.topAiring),
        getAnimeDetails(config.mostPopular),
    ]);

    return c.json({ spotlight, trending, topAiring, mostPopular });
});

app.get("/api/search", async (c) => {
    const q = c.req.query("q");
    if (!q) return c.json([]);
    const query = `query ($search: String) { Page(page: 1, perPage: 20) { media(search: $search, type: ANIME, sort: POPULARITY_DESC) { id title { romaji english } coverImage { large } seasonYear format status genres averageScore } } }`;
    const res = await fetch(ANILIST_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, variables: { search: q } }),
    });
    const json = (await res.json()) as any;
    return c.json(json.data?.Page?.media ?? []);
});

app.get("/api/anime/search/library", async (c) => {
    const q = c.req.query("q");
    if (!q) return c.json([]);
    const regex = new RegExp(q, "i");
    const results = await Anime.find({
        $or: [{ "title.english": regex }, { "title.romaji": regex }, { "title.native": regex }],
    })
        .select("-description")
        .limit(20);
    return c.json(results);
});

app.get("/api/anime/library/all", async (c) => {
    const animes = await Anime.find().select("-description").sort({ lastUpdated: -1 }).limit(50);
    return c.json(animes);
});

app.get("/api/anime/:id", optionalAuth, async (c) => {
    const anilistId = Number(c.req.param("id"));
    let anime = await Anime.findOne({ anilistId });
    if (!anime) { anime = await fetchAndSyncAniList(anilistId); }
    if (!anime) return c.json({ error: "Anime not found" }, 404);

    let inMyList = false;
    const user = c.get("user") as { id: string } | undefined;
    if (user) {
        const dbUser = await User.findById(user.id);
        if (dbUser) inMyList = dbUser.myList.includes(anilistId);
    }

    return c.json({ ...(anime as any).toObject(), inMyList });
});

app.get("/api/genres", (c) =>
    c.json([
        "Action", "Adventure", "Comedy", "Drama", "Ecchi", "Fantasy", "Horror",
        "Mahou Shoujo", "Mecha", "Music", "Mystery", "Psychological", "Romance",
        "Sci-Fi", "Slice of Life", "Sports", "Supernatural", "Thriller",
    ]),
);

app.get("/api/genre/:genre", async (c) => {
    const genre = c.req.param("genre");
    const page = Number(c.req.query("page")) || 1;
    const query = `query ($genre: String, $page: Int) { Page(page: $page, perPage: 20) { media(genre: $genre, type: ANIME, sort: POPULARITY_DESC) { id title { romaji english } coverImage { large } seasonYear format status genres averageScore } } }`;
    const res = await fetch(ANILIST_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, variables: { genre, page } }),
    });
    const json = (await res.json()) as any;
    return c.json(json.data?.Page?.media ?? []);
});

app.get("/api/latest", async (c) => {
    const query = `query { Page(page: 1, perPage: 30) { media(type: ANIME, status: RELEASING, sort: UPDATED_AT_DESC) { id title { romaji english } coverImage { large } seasonYear format status genres averageScore } } }`;
    const res = await fetch(ANILIST_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
    });
    const json = (await res.json()) as any;
    return c.json(json.data?.Page?.media ?? []);
});

// ---------------------------------------------------------------------------
// Admin routes
// ---------------------------------------------------------------------------

app.get("/api/admin/search", authMiddleware, adminMiddleware, async (c) => {
    const q = c.req.query("q");
    const query = `query ($search: String) { Page(page: 1, perPage: 15) { media(search: $search, type: ANIME, sort: POPULARITY_DESC) { id title { romaji english } coverImage { medium } seasonYear format } } }`;
    const res = await fetch(ANILIST_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, variables: { search: q } }),
    });
    const json = (await res.json()) as any;
    return c.json(json.data?.Page?.media ?? []);
});

app.get("/api/admin/config", authMiddleware, adminMiddleware, async (c) => {
    const config = await SiteConfig.findOne();
    if (!config) return c.json({ spotlight: [], trending: [], topAiring: [], mostPopular: [] });

    const [spotlight, trending, topAiring, mostPopular] = await Promise.all([
        getAnimeDetails(config.spotlight),
        getAnimeDetails(config.trending),
        getAnimeDetails(config.topAiring),
        getAnimeDetails(config.mostPopular),
    ]);

    return c.json({ spotlight, trending, topAiring, mostPopular });
});

app.post("/api/admin/config/section", authMiddleware, adminMiddleware, async (c) => {
    const { section, anilistId, action } = await c.req.json<{
        section: string;
        anilistId: number;
        action: "add" | "remove";
    }>();

    if (action === "add") await fetchAndSyncAniList(anilistId);

    const config = await SiteConfig.findOne();
    if (!config) return c.json({ error: "Config not found" }, 404);

    let list: number[] = (config as any)[section] ?? [];
    if (action === "add" && !list.includes(anilistId)) list.push(anilistId);
    else if (action === "remove") list = list.filter((id) => id !== anilistId);
    (config as any)[section] = list;
    await config.save();

    return c.json({ success: true });
});

app.get("/api/admin/anime/:id/episodes", authMiddleware, adminMiddleware, async (c) => {
    const anilistId = Number(c.req.param("id"));
    let anime = await Anime.findOne({ anilistId });
    if (!anime) anime = await fetchAndSyncAniList(anilistId);
    if (!anime) return c.json({ error: "Anime not found" }, 404);

    return c.json({
        anime: { anilistId: (anime as any).anilistId, title: (anime as any).title, coverImage: (anime as any).coverImage },
        episodes: (anime as any).episodes ?? [],
    });
});

app.post("/api/admin/anime/:id/episode", authMiddleware, adminMiddleware, async (c) => {
    const anilistId = Number(c.req.param("id"));
    const { number, title, language, server1, server2 } = await c.req.json<{
        number: number; title: string; language: string; server1: string; server2?: string;
    }>();

    let anime = await Anime.findOne({ anilistId });
    if (!anime) anime = await fetchAndSyncAniList(anilistId);
    if (!anime) return c.json({ error: "Anime not found" }, 404);

    const episodes: any[] = (anime as any).episodes;
    const idx = episodes.findIndex((e) => e.number === number && e.language === language);
    if (idx >= 0) episodes[idx] = { number, title, language, server1, server2 };
    else episodes.push({ number, title, language, server1, server2 });

    episodes.sort((a, b) => a.number - b.number);
    await (anime as any).save();
    return c.json({ success: true, episodes });
});

app.post("/api/admin/anime/:id/episodes/batch", authMiddleware, adminMiddleware, async (c) => {
    const anilistId = Number(c.req.param("id"));
    const { episodes, language } = await c.req.json<{ episodes: string; language: string }>();
    if (!episodes) return c.json({ error: "No episodes provided" }, 400);

    let anime = await Anime.findOne({ anilistId });
    if (!anime) anime = await fetchAndSyncAniList(anilistId);
    if (!anime) return c.json({ error: "Anime not found" }, 404);

    const animeEpisodes: any[] = (anime as any).episodes;
    let added = 0, updated = 0;

    for (const line of episodes.split("\n")) {
        const match = line.trim().match(/^(\d+)\s*[.\-:]\s*(.+)$/);
        if (!match) continue;
        const number = parseInt(match[1]);
        const server1 = match[2].trim();
        const idx = animeEpisodes.findIndex((e) => e.number === number && e.language === language);
        if (idx >= 0) { animeEpisodes[idx].server1 = server1; updated++; }
        else { animeEpisodes.push({ number, title: `Episode ${number}`, language, server1 }); added++; }
    }

    animeEpisodes.sort((a, b) => a.number - b.number);
    await (anime as any).save();
    return c.json({ success: true, added, updated });
});

app.delete("/api/admin/anime/:id/episode/:episodeId", authMiddleware, adminMiddleware, async (c) => {
    const anilistId = Number(c.req.param("id"));
    const episodeId = c.req.param("episodeId");
    const anime = await Anime.findOne({ anilistId });
    if (!anime) return c.json({ error: "Anime not found" }, 404);
    (anime as any).episodes = (anime as any).episodes.filter((e: any) => e._id.toString() !== episodeId);
    await (anime as any).save();
    return c.json({ success: true, episodes: (anime as any).episodes });
});

app.get("/api/admin/users", authMiddleware, adminMiddleware, async (c) => {
    const users = await User.find().select("-password");
    return c.json(users);
});

app.delete("/api/admin/user/:id", authMiddleware, adminMiddleware, async (c) => {
    const user = await User.findById(c.req.param("id"));
    if (!user) return c.json({ error: "User not found" }, 404);
    if (user.role === "admin") return c.json({ error: "Cannot delete admin" }, 400);
    await User.findByIdAndDelete(c.req.param("id"));
    return c.json({ success: true });
});

app.get("/api/admin/stats", authMiddleware, adminMiddleware, async (c) => {
    const [totalUsers, totalAnime, config] = await Promise.all([
        User.countDocuments(),
        Anime.countDocuments(),
        SiteConfig.findOne(),
    ]);
    return c.json({
        totalUsers,
        totalAnime,
        spotlightCount: config?.spotlight?.length ?? 0,
        trendingCount: config?.trending?.length ?? 0,
        topAiringCount: config?.topAiring?.length ?? 0,
        mostPopularCount: config?.mostPopular?.length ?? 0,
    });
});

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

mongoose
    .connect(MONGO_URI)
    .then(async () => {
        console.log("✅ MongoDB Connected");
        await seedAdmin();
        await seedSiteConfig();

        Bun.serve({ fetch: app.fetch, port: PORT });
        console.log(`🚀 Server running on http://localhost:${PORT}`);
    })
    .catch((err) => console.error("❌ DB Error:", err));