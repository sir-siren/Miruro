import axios from "axios";
import { year, getCurrentSeason, getNextSeason } from "../index";

// Utility function to ensure URL ends with a slash
function ensureUrlEndsWithSlash(url: string): string {
    return url.endsWith("/") ? url : `${url}/`;
}

// KIROANIME BACKEND API - Your custom backend
const KIRO_BACKEND = ensureUrlEndsWithSlash(
    (import.meta.env.VITE_BACKEND_URL as string) ||
        "https://kiroanime.onrender.com/",
);

const SKIP_TIMES = ensureUrlEndsWithSlash(
    (import.meta.env.VITE_SKIP_TIMES as string) || "https://api.aniskip.com/",
);

const PROXY_URL =
    (import.meta.env.VITE_PROXY_URL as string) || "https://corsproxy.io/?";

// Use CORS proxy for kiroanime backend
const BASE_URL = PROXY_URL + KIRO_BACKEND;

// Axios instance for kiroanime backend (with CORS proxy)
const axiosInstance = axios.create({
    baseURL: BASE_URL,
    timeout: 20000,
    headers: {
        "Content-Type": "application/json",
    },
});

// Axios for AniList (direct, no proxy needed)
const anilistAxios = axios.create({
    baseURL: "https://graphql.anilist.co",
    timeout: 10000,
});

// Error handling function
function handleError(error: any, context: string) {
    let errorMessage = "An error occurred";

    if (
        error.message &&
        error.message.includes("Access-Control-Allow-Origin")
    ) {
        errorMessage = "A CORS error occurred";
    }

    switch (context) {
        case "data":
            errorMessage = "Error fetching data";
            break;
        case "anime episodes":
            errorMessage = "Error fetching anime episodes";
            break;
    }

    if (error.response) {
        const status = error.response.status;
        if (status >= 500) {
            errorMessage += ": Server error";
        } else if (status >= 400) {
            errorMessage += ": Client error";
        }
        const responseError =
            error.response.data?.message ||
            error.response.data?.error ||
            "Unknown error";
        errorMessage += `: ${responseError}`;
    } else if (error.message) {
        errorMessage += `: ${error.message}`;
    }

    console.error(`${errorMessage}`, error);
    throw new Error(errorMessage);
}

// Cache key generator
function generateCacheKey(...args: string[]) {
    return args.join("-");
}

interface CacheItem {
    value: any;
    timestamp: number;
}

// Session storage cache creation
function createOptimizedSessionStorageCache(
    maxSize: number,
    maxAge: number,
    cacheKey: string,
) {
    const cache = new Map<string, CacheItem>(
        JSON.parse(sessionStorage.getItem(cacheKey) || "[]"),
    );
    const keys = new Set<string>(cache.keys());

    function isItemExpired(item: CacheItem) {
        return Date.now() - item.timestamp > maxAge;
    }

    function updateSessionStorage() {
        sessionStorage.setItem(
            cacheKey,
            JSON.stringify(Array.from(cache.entries())),
        );
    }

    return {
        get(key: string) {
            if (cache.has(key)) {
                const item = cache.get(key);
                if (!isItemExpired(item!)) {
                    keys.delete(key);
                    keys.add(key);
                    return item!.value;
                }
                cache.delete(key);
                keys.delete(key);
            }
            return undefined;
        },
        set(key: string, value: any) {
            if (cache.size >= maxSize) {
                const oldestKey = keys.values().next().value;
                cache.delete(oldestKey);
                keys.delete(oldestKey);
            }
            keys.add(key);
            cache.set(key, { value, timestamp: Date.now() });
            updateSessionStorage();
        },
    };
}

// Constants for cache configuration
const CACHE_SIZE = 20;
const CACHE_MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours

// Factory function for cache creation
function createCache(cacheKey: string) {
    return createOptimizedSessionStorageCache(
        CACHE_SIZE,
        CACHE_MAX_AGE,
        cacheKey,
    );
}

interface FetchOptions {
    type?: string;
    season?: string;
    format?: string;
    sort?: string[];
    genres?: string[];
    id?: string;
    year?: string;
    status?: string;
}

// Individual caches for different types of data
const advancedSearchCache = createCache("Advanced Search");
const animeDataCache = createCache("Data");
const animeInfoCache = createCache("Info");
const animeEpisodesCache = createCache("Episodes");
const fetchAnimeEmbeddedEpisodesCache = createCache("Video Embedded Sources");
const videoSourcesCache = createCache("Video Sources");

// Fetch from AniList GraphQL (used by your backend too)
async function fetchFromAniList(query: string, variables: any = {}) {
    try {
        const response = await anilistAxios.post("", { query, variables });
        return response.data.data;
    } catch (error) {
        console.error("Error fetching from AniList:", error);
        throw error;
    }
}

// Advanced Search - uses AniList like your backend does
export async function fetchAdvancedSearch(
    searchQuery: string = "",
    page: number = 1,
    perPage: number = 20,
    options: FetchOptions = {},
) {
    const query = `query ($search: String, $page: Int, $perPage: Int, $type: MediaType, $season: MediaSeason, $format: MediaFormat, $status: MediaStatus, $year: Int, $sort: [MediaSort], $genre_in: [String]) {
    Page(page: $page, perPage: $perPage) {
      pageInfo {
        total
        currentPage
        lastPage
        hasNextPage
        perPage
      }
      media(search: $search, type: $type, season: $season, format: $format, status: $status, seasonYear: $year, sort: $sort, genre_in: $genre_in) {
        id
        title {
          romaji
          english
          native
        }
        coverImage {
          large
          extraLarge
        }
        bannerImage
        seasonYear
        format
        status
        genres
        averageScore
        popularity
        description
        episodes
      }
    }
  }`;

    const variables: any = {
        search: searchQuery || undefined,
        page,
        perPage,
        type: options.type || "ANIME",
        season: options.season,
        format: options.format,
        status: options.status,
        year: options.year ? parseInt(options.year) : undefined,
        sort: options.sort ? JSON.parse(options.sort[0]) : undefined,
        genre_in: options.genres,
    };

    const cacheKey = generateCacheKey(
        "advancedSearch",
        JSON.stringify(variables),
    );
    const cached = advancedSearchCache.get(cacheKey);
    if (cached) return cached;

    try {
        const data = await fetchFromAniList(query, variables);
        advancedSearchCache.set(cacheKey, data.Page);
        return data.Page;
    } catch (error) {
        console.error("Error in advanced search:", error);
        return { media: [], pageInfo: {} };
    }
}

// Fetch Anime Data - uses YOUR kiroanime backend
export async function fetchAnimeData(
    animeId: string,
    provider: string = "gogoanime",
) {
    const cacheKey = generateCacheKey("animeData", animeId);
    const cached = animeDataCache.get(cacheKey);
    if (cached) return cached;

    try {
        const response = await axiosInstance.get(`api/anime/${animeId}`);
        const anime = response.data;

        // Transform to expected format
        const transformed = {
            id: anime.anilistId,
            malId: anime.malId,
            title: anime.title,
            description: anime.description,
            cover: anime.bannerImage || anime.coverImage,
            image: anime.coverImage,
            bannerImage: anime.bannerImage,
            artwork: [
                { img: anime.coverImage, type: "cover" },
                { img: anime.bannerImage || anime.coverImage, type: "banner" },
            ],
            genres: anime.genres || [],
            averageScore: anime.averageScore,
            popularity: anime.popularity,
            status: anime.status,
            seasonYear: anime.seasonYear,
            format: anime.format,
            studios: anime.studios || [],
            episodes: anime.episodes || [],
            trailer: anime.trailer,
            nextAiringEpisode: anime.nextAiringEpisode,
            relations: anime.relations,
        };

        animeDataCache.set(cacheKey, transformed);
        return transformed;
    } catch (error) {
        console.error(
            "Error fetching from kiroanime backend, using AniList fallback:",
            error,
        );
        return fetchAnimeInfoFromAniList(animeId);
    }
}

// Fetch Anime Info - same as data
export async function fetchAnimeInfo(
    animeId: string,
    provider: string = "gogoanime",
) {
    return fetchAnimeData(animeId, provider);
}

// Helper to fetch from AniList (fallback)
async function fetchAnimeInfoFromAniList(animeId: string) {
    const query = `query ($id: Int) {
    Media (id: $id, type: ANIME) {
      id
      idMal
      title {
        romaji
        english
        native
      }
      description
      coverImage {
        extraLarge
        large
      }
      bannerImage
      genres
      averageScore
      popularity
      status
      seasonYear
      format
      episodes
      duration
      studios {
        nodes {
          name
        }
      }
      trailer {
        id
        site
      }
      nextAiringEpisode {
        episode
        airingTime
      }
      relations {
        edges {
          relationType
          node {
            id
            title {
              romaji
              english
            }
            coverImage {
              large
            }
            type
            format
          }
        }
      }
    }
  }`;

    try {
        const data = await fetchFromAniList(query, { id: parseInt(animeId) });
        const media = data.Media;

        const artwork = [];
        if (media.coverImage?.large)
            artwork.push({ img: media.coverImage.large, type: "cover" });
        if (media.coverImage?.extraLarge)
            artwork.push({ img: media.coverImage.extraLarge, type: "cover" });
        if (media.bannerImage)
            artwork.push({ img: media.bannerImage, type: "banner" });

        return {
            id: media.id,
            malId: media.idMal,
            title: media.title,
            description: media.description,
            cover: media.bannerImage || media.coverImage.extraLarge,
            image: media.coverImage.extraLarge,
            bannerImage: media.bannerImage,
            artwork: artwork,
            genres: media.genres,
            averageScore: media.averageScore,
            popularity: media.popularity,
            status: media.status,
            seasonYear: media.seasonYear,
            format: media.format,
            episodes: media.episodes,
            duration: media.duration,
            studios: media.studios.nodes.map((s: any) => s.name),
            trailer: media.trailer,
            nextAiringEpisode: media.nextAiringEpisode,
            relations: media.relations,
        };
    } catch (error) {
        console.error("AniList fallback failed:", error);
        throw error;
    }
}

// Fetch lists - uses AniList (same as your backend)
async function fetchList(
    type: string,
    page: number = 1,
    perPage: number = 16,
    options: FetchOptions = {},
) {
    const cacheKey = generateCacheKey(
        type,
        page.toString(),
        perPage.toString(),
    );
    const listCache = createCache(type);

    const cached = listCache.get(cacheKey);
    if (cached) return cached;

    let anilistOptions: any = { type: "ANIME" };

    if (type === "TopRated") {
        anilistOptions.sort = ['["SCORE_DESC"]'];
    } else if (type === "Popular") {
        anilistOptions.sort = ['["POPULARITY_DESC"]'];
    } else if (type === "Trending") {
        anilistOptions.sort = ['["TRENDING_DESC"]'];
    } else if (type === "TopAiring") {
        anilistOptions = {
            ...anilistOptions,
            season: getCurrentSeason(),
            year: year.toString(),
            status: "RELEASING",
            sort: ['["POPULARITY_DESC"]'],
        };
    } else if (type === "Upcoming") {
        anilistOptions = {
            ...anilistOptions,
            season: getNextSeason(),
            year: year.toString(),
            status: "NOT_YET_RELEASED",
            sort: ['["POPULARITY_DESC"]'],
        };
    }

    const result = await fetchAdvancedSearch("", page, perPage, anilistOptions);
    listCache.set(cacheKey, result);
    return result;
}

export const fetchTopAnime = (page: number, perPage: number) =>
    fetchList("TopRated", page, perPage);
export const fetchTrendingAnime = (page: number, perPage: number) =>
    fetchList("Trending", page, perPage);
export const fetchPopularAnime = (page: number, perPage: number) =>
    fetchList("Popular", page, perPage);
export const fetchTopAiringAnime = (page: number, perPage: number) =>
    fetchList("TopAiring", page, perPage);
export const fetchUpcomingSeasons = (page: number, perPage: number) =>
    fetchList("Upcoming", page, perPage);

// Fetch Episodes - from YOUR kiroanime backend
export async function fetchAnimeEpisodes(
    animeId: string,
    provider: string = "gogoanime",
    dub: boolean = false,
) {
    const language = dub ? "english-dub" : "sub";
    const cacheKey = generateCacheKey("animeEpisodes", animeId, language);

    const cached = animeEpisodesCache.get(cacheKey);
    if (cached) return cached;

    try {
        const anime = await fetchAnimeData(animeId);

        if (!anime.episodes || anime.episodes.length === 0) {
            console.log("No episodes in backend for anime:", animeId);
            animeEpisodesCache.set(cacheKey, []);
            return [];
        }

        // Filter by language
        let filteredEpisodes = anime.episodes.filter(
            (ep: any) => ep.language === language,
        );

        // Fallback to sub if no episodes in requested language
        if (filteredEpisodes.length === 0 && language !== "sub") {
            console.log(`No ${language} episodes, trying sub`);
            filteredEpisodes = anime.episodes.filter(
                (ep: any) => ep.language === "sub",
            );
        }

        const episodes = filteredEpisodes.map((ep: any) => {
            const episodeName =
                anime.title?.english ||
                anime.title?.romaji ||
                animeId.toString();
            return {
                id: `${episodeName}-episode-${ep.number}`
                    .toLowerCase()
                    .replace(/[^a-z0-9-]/g, "-"),
                number: ep.number.toString(),
                title: ep.title || `Episode ${ep.number}`,
                url: ep.server1,
                server2: ep.server2,
                image: anime.coverImage || anime.image || "",
            };
        });

        animeEpisodesCache.set(cacheKey, episodes);
        return episodes;
    } catch (error) {
        console.error("Error fetching episodes:", error);
        animeEpisodesCache.set(cacheKey, []);
        return [];
    }
}

// Embedded episodes - not needed with your backend
export async function fetchAnimeEmbeddedEpisodes(episodeId: string) {
    const cacheKey = generateCacheKey("embeddedEpisodes", episodeId);
    const cached = fetchAnimeEmbeddedEpisodesCache.get(cacheKey);
    if (cached) return cached;

    // Your backend provides direct URLs, so return empty
    const servers: any[] = [];
    fetchAnimeEmbeddedEpisodesCache.set(cacheKey, servers);
    return servers;
}

// Streaming links - use YOUR backend's stream proxy
export async function fetchAnimeStreamingLinks(episodeId: string) {
    const cacheKey = generateCacheKey("streamingLinks", episodeId);
    const cached = videoSourcesCache.get(cacheKey);
    if (cached) return cached;

    // Episodes have direct URLs from your backend
    // Player will use episode.url which goes through your /api/stream proxy
    const result = {
        sources: [],
        download: "",
    };

    videoSourcesCache.set(cacheKey, result);
    return result;
}

// Skip times
interface FetchSkipTimesParams {
    malId: string;
    episodeNumber: string;
    episodeLength?: string;
}

export async function fetchSkipTimes({
    malId,
    episodeNumber,
    episodeLength = "0",
}: FetchSkipTimesParams) {
    const types = ["ed", "mixed-ed", "mixed-op", "op", "recap"];
    const url = new URL(`${SKIP_TIMES}v2/skip-times/${malId}/${episodeNumber}`);
    url.searchParams.append("episodeLength", episodeLength.toString());
    types.forEach((type) => url.searchParams.append("types[]", type));

    const cacheKey = generateCacheKey(
        "skipTimes",
        malId,
        episodeNumber,
        episodeLength || "",
    );

    try {
        const response = await axios.get(url.toString());
        return response.data;
    } catch (error) {
        console.error("Error fetching skip times:", error);
        return { results: [] };
    }
}

// Recent episodes
export async function fetchRecentEpisodes(
    page: number = 1,
    perPage: number = 18,
    provider: string = "gogoanime",
) {
    const cacheKey = generateCacheKey(
        "recentEpisodes",
        page.toString(),
        perPage.toString(),
    );
    const recentCache = createCache("RecentEpisodes");

    const cached = recentCache.get(cacheKey);
    if (cached) return cached;

    try {
        const result = await fetchTopAiringAnime(page, perPage);
        recentCache.set(cacheKey, result.media || []);
        return result.media || [];
    } catch (error) {
        console.error("Error fetching recent episodes:", error);
        return [];
    }
}

// ============ KIROANIME BACKEND ENDPOINTS ============

// Fetch Home Data from kiroanime backend
export async function fetchHomeData() {
    const cacheKey = "homeData";
    const homeCache = createCache("HomeData");

    const cached = homeCache.get(cacheKey);
    if (cached) return cached;

    try {
        const response = await axiosInstance.get("api/home");
        const data = response.data;

        // Transform to expected format
        const transformed = {
            spotlight: data.spotlight || [],
            trending: data.trending || [],
            topAiring: data.topAiring || [],
            mostPopular: data.mostPopular || [],
        };

        homeCache.set(cacheKey, transformed);
        return transformed;
    } catch (error) {
        console.error("Error fetching home data from backend:", error);
        // Fallback to AniList
        return {
            spotlight: [],
            trending: [],
            topAiring: [],
            mostPopular: [],
        };
    }
}

// Search anime (uses backend which queries AniList)
export async function fetchSearchFromBackend(query: string) {
    if (!query) return [];

    try {
        const response = await axiosInstance.get(
            `api/search?q=${encodeURIComponent(query)}`,
        );
        return response.data || [];
    } catch (error) {
        console.error("Error searching:", error);
        return [];
    }
}

// ============ USER ENDPOINTS ============

// Get user profile
export async function fetchUserProfile(token: string) {
    try {
        const response = await axiosInstance.get("api/user/profile", {
            headers: { Authorization: token },
        });
        return response.data;
    } catch (error) {
        console.error("Error fetching user profile:", error);
        throw error;
    }
}

// Add to My List
export async function addToMyList(anilistId: number, token: string) {
    try {
        const response = await axiosInstance.post(
            "api/user/mylist/add",
            { anilistId },
            { headers: { Authorization: token } },
        );
        return response.data;
    } catch (error) {
        console.error("Error adding to my list:", error);
        throw error;
    }
}

// Remove from My List
export async function removeFromMyList(anilistId: number, token: string) {
    try {
        const response = await axiosInstance.post(
            "api/user/mylist/remove",
            { anilistId },
            { headers: { Authorization: token } },
        );
        return response.data;
    } catch (error) {
        console.error("Error removing from my list:", error);
        throw error;
    }
}

// Check if anime is in My List
export async function checkInMyList(anilistId: number, token: string) {
    try {
        const response = await axiosInstance.get(
            `api/user/mylist/check/${anilistId}`,
            { headers: { Authorization: token } },
        );
        return response.data.inList;
    } catch (error) {
        console.error("Error checking my list:", error);
        return false;
    }
}

// Add to watch history
export async function addToHistory(
    anilistId: number,
    episodeNumber: number,
    token: string,
) {
    try {
        const response = await axiosInstance.post(
            "api/user/history/add",
            { anilistId, episodeNumber },
            { headers: { Authorization: token } },
        );
        return response.data;
    } catch (error) {
        console.error("Error adding to history:", error);
        throw error;
    }
}

// Clear watch history
export async function clearHistory(token: string) {
    try {
        const response = await axiosInstance.delete("api/user/history/clear", {
            headers: { Authorization: token },
        });
        return response.data;
    } catch (error) {
        console.error("Error clearing history:", error);
        throw error;
    }
}

// ============ AUTH ENDPOINTS ============

// Login
export async function login(username: string, password: string) {
    try {
        const response = await axiosInstance.post("api/auth/login", {
            username,
            password,
        });
        return response.data;
    } catch (error: any) {
        console.error("Login error:", error);
        throw new Error(error.response?.data?.error || "Login failed");
    }
}

// Register
export async function register(
    username: string,
    password: string,
    gender?: string,
    country?: string,
) {
    try {
        const response = await axiosInstance.post("api/auth/register", {
            username,
            password,
            gender,
            country,
        });
        return response.data;
    } catch (error: any) {
        console.error("Register error:", error);
        throw new Error(error.response?.data?.error || "Registration failed");
    }
}

// Verify token
export async function verifyToken(token: string) {
    try {
        const response = await axiosInstance.get("api/auth/verify", {
            headers: { Authorization: token },
        });
        return response.data;
    } catch (error) {
        console.error("Token verification failed:", error);
        throw error;
    }
}

// ============ ADMIN ENDPOINTS ============

// Get admin config
export async function getAdminConfig(token: string) {
    try {
        const response = await axiosInstance.get("api/admin/config", {
            headers: { Authorization: token },
        });
        return response.data;
    } catch (error) {
        console.error("Error fetching admin config:", error);
        throw error;
    }
}

// Update section (add/remove anime)
export async function updateSection(
    section: "spotlight" | "trending" | "topAiring" | "mostPopular",
    anilistId: number,
    action: "add" | "remove",
    token: string,
) {
    try {
        const response = await axiosInstance.post(
            "api/admin/config/section",
            { section, anilistId, action },
            { headers: { Authorization: token } },
        );
        return response.data;
    } catch (error) {
        console.error("Error updating section:", error);
        throw error;
    }
}

// Search anime for admin
export async function adminSearchAnime(query: string, token: string) {
    try {
        const response = await axiosInstance.get(
            `api/admin/search?q=${encodeURIComponent(query)}`,
            {
                headers: { Authorization: token },
            },
        );
        return response.data;
    } catch (error) {
        console.error("Error searching anime:", error);
        return [];
    }
}

// Get anime episodes for admin
export async function getAnimeEpisodes(anilistId: number, token: string) {
    try {
        const response = await axiosInstance.get(
            `api/admin/anime/${anilistId}/episodes`,
            {
                headers: { Authorization: token },
            },
        );
        return response.data;
    } catch (error) {
        console.error("Error fetching episodes:", error);
        throw error;
    }
}

// Add/update episode
export async function addEpisode(
    anilistId: number,
    episodeData: {
        number: number;
        title: string;
        language: "sub" | "english-dub" | "tagalog-dub";
        server1: string;
        server2?: string;
    },
    token: string,
) {
    try {
        const response = await axiosInstance.post(
            `api/admin/anime/${anilistId}/episode`,
            episodeData,
            { headers: { Authorization: token } },
        );
        return response.data;
    } catch (error) {
        console.error("Error adding episode:", error);
        throw error;
    }
}

// Batch add episodes
export async function batchAddEpisodes(
    anilistId: number,
    episodes: string,
    language: "sub" | "english-dub" | "tagalog-dub",
    token: string,
) {
    try {
        const response = await axiosInstance.post(
            `api/admin/anime/${anilistId}/episodes/batch`,
            { episodes, language },
            { headers: { Authorization: token } },
        );
        return response.data;
    } catch (error) {
        console.error("Error batch adding episodes:", error);
        throw error;
    }
}

// Delete episode
export async function deleteEpisode(
    anilistId: number,
    episodeId: string,
    token: string,
) {
    try {
        const response = await axiosInstance.delete(
            `api/admin/anime/${anilistId}/episode/${episodeId}`,
            { headers: { Authorization: token } },
        );
        return response.data;
    } catch (error) {
        console.error("Error deleting episode:", error);
        throw error;
    }
}

// Get admin stats
export async function getAdminStats(token: string) {
    try {
        const response = await axiosInstance.get("api/admin/stats", {
            headers: { Authorization: token },
        });
        return response.data;
    } catch (error) {
        console.error("Error fetching stats:", error);
        throw error;
    }
}

// Get all users (admin)
export async function getAllUsers(token: string) {
    try {
        const response = await axiosInstance.get("api/admin/users", {
            headers: { Authorization: token },
        });
        return response.data;
    } catch (error) {
        console.error("Error fetching users:", error);
        throw error;
    }
}

// Delete user (admin)
export async function deleteUser(userId: string, token: string) {
    try {
        const response = await axiosInstance.delete(
            `api/admin/user/${userId}`,
            {
                headers: { Authorization: token },
            },
        );
        return response.data;
    } catch (error) {
        console.error("Error deleting user:", error);
        throw error;
    }
}
