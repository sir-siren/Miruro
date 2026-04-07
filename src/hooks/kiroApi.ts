import axios from "axios";

// Utility function to ensure URL ends with a slash
function ensureUrlEndsWithSlash(url: string): string {
    return url.endsWith("/") ? url : `${url}/`;
}

// API Configuration
const KIRO_API_URL = ensureUrlEndsWithSlash(
    import.meta.env.VITE_BACKEND_URL as string,
);
const CORS_PROXY = "https://corsproxy.io/?";

// Axios instance for Kirobox API
const kiroAxios = axios.create({
    baseURL: CORS_PROXY + KIRO_API_URL,
    timeout: 15000,
    headers: {
        "Content-Type": "application/json",
    },
});

// Cache implementation
interface CacheItem {
    value: any;
    timestamp: number;
}

function createCache(maxSize: number, maxAge: number, cacheKey: string) {
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

const CACHE_SIZE = 20;
const CACHE_MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours

const homeCache = createCache(CACHE_SIZE, CACHE_MAX_AGE, "kiro-home");
const animeCache = createCache(CACHE_SIZE, CACHE_MAX_AGE, "kiro-anime");
const searchCache = createCache(CACHE_SIZE, CACHE_MAX_AGE, "kiro-search");

// Authentication token management
export function getAuthToken(): string | null {
    return localStorage.getItem("kiro-auth-token");
}

export function setAuthToken(token: string) {
    localStorage.setItem("kiro-auth-token", token);
}

export function removeAuthToken() {
    localStorage.removeItem("kiro-auth-token");
}

// Add token to request if available
kiroAxios.interceptors.request.use((config) => {
    const token = getAuthToken();
    if (token) {
        config.headers.Authorization = token;
    }
    return config;
});

// --- AUTH FUNCTIONS ---

export async function login(username: string, password: string) {
    try {
        const response = await kiroAxios.post("api/auth/login", {
            username,
            password,
        });
        if (response.data.token) {
            setAuthToken(response.data.token);
        }
        return response.data;
    } catch (error: any) {
        throw new Error(error.response?.data?.error || "Login failed");
    }
}

export async function register(
    username: string,
    password: string,
    gender?: string,
    country?: string,
) {
    try {
        const response = await kiroAxios.post("api/auth/register", {
            username,
            password,
            gender,
            country,
        });
        if (response.data.token) {
            setAuthToken(response.data.token);
        }
        return response.data;
    } catch (error: any) {
        throw new Error(error.response?.data?.error || "Registration failed");
    }
}

export async function verifyToken() {
    try {
        const response = await kiroAxios.get("api/auth/verify");
        return response.data;
    } catch (error) {
        removeAuthToken();
        return { valid: false };
    }
}

// --- HOME DATA ---

export async function fetchHomeData() {
    const cacheKey = "home-data";
    const cached = homeCache.get(cacheKey);
    if (cached) return cached;

    try {
        const response = await kiroAxios.get("api/home");
        homeCache.set(cacheKey, response.data);
        return response.data;
    } catch (error) {
        console.error("Error fetching home data:", error);
        return { spotlight: [], trending: [], topAiring: [], mostPopular: [] };
    }
}

// --- ANIME DATA ---

export async function fetchAnimeById(id: string) {
    const cacheKey = `anime-${id}`;
    const cached = animeCache.get(cacheKey);
    if (cached) return cached;

    try {
        const response = await kiroAxios.get(`api/anime/${id}`);
        animeCache.set(cacheKey, response.data);
        return response.data;
    } catch (error) {
        console.error("Error fetching anime:", error);
        throw error;
    }
}

export async function fetchAnimeEpisodesByAnimeId(
    anilistId: string,
    language: "sub" | "english-dub" | "tagalog-dub" = "sub",
) {
    const cacheKey = `episodes-${anilistId}-${language}`;
    const cached = animeCache.get(cacheKey);
    if (cached) return cached;

    try {
        const anime = await fetchAnimeById(anilistId);
        if (!anime || !anime.episodes) return [];

        // Filter episodes by language
        const filteredEpisodes = anime.episodes.filter(
            (ep: any) => ep.language === language,
        );

        // Transform to match expected format
        const episodes = filteredEpisodes.map((ep: any) => ({
            id: `${anilistId}-episode-${ep.number}`,
            number: ep.number.toString(),
            title: ep.title || `Episode ${ep.number}`,
            url: ep.server1,
            server2: ep.server2,
        }));

        animeCache.set(cacheKey, episodes);
        return episodes;
    } catch (error) {
        console.error("Error fetching episodes:", error);
        return [];
    }
}

// --- SEARCH ---

export async function searchAnime(query: string) {
    if (!query) return [];

    const cacheKey = `search-${query}`;
    const cached = searchCache.get(cacheKey);
    if (cached) return cached;

    try {
        const response = await kiroAxios.get(
            `api/search?q=${encodeURIComponent(query)}`,
        );
        searchCache.set(cacheKey, response.data);
        return response.data;
    } catch (error) {
        console.error("Error searching anime:", error);
        return [];
    }
}

// --- USER FUNCTIONS ---

export async function getUserProfile() {
    try {
        const response = await kiroAxios.get("api/user/profile");
        return response.data;
    } catch (error) {
        console.error("Error fetching user profile:", error);
        throw error;
    }
}

export async function addToMyList(anilistId: number) {
    try {
        const response = await kiroAxios.post("api/user/mylist/add", {
            anilistId,
        });
        return response.data;
    } catch (error) {
        console.error("Error adding to my list:", error);
        throw error;
    }
}

export async function removeFromMyList(anilistId: number) {
    try {
        const response = await kiroAxios.post("api/user/mylist/remove", {
            anilistId,
        });
        return response.data;
    } catch (error) {
        console.error("Error removing from my list:", error);
        throw error;
    }
}

export async function checkInMyList(anilistId: number) {
    try {
        const response = await kiroAxios.get(
            `api/user/mylist/check/${anilistId}`,
        );
        return response.data.inList;
    } catch (error) {
        console.error("Error checking my list:", error);
        return false;
    }
}

export async function addToHistory(anilistId: number, episodeNumber: number) {
    try {
        const response = await kiroAxios.post("api/user/history/add", {
            anilistId,
            episodeNumber,
        });
        return response.data;
    } catch (error) {
        console.error("Error adding to history:", error);
        throw error;
    }
}

export async function clearHistory() {
    try {
        const response = await kiroAxios.delete("api/user/history/clear");
        return response.data;
    } catch (error) {
        console.error("Error clearing history:", error);
        throw error;
    }
}

// --- VIDEO STREAMING ---

export function getStreamUrl(videoUrl: string) {
    // Use the server's stream proxy endpoint
    return `${CORS_PROXY}${KIRO_API_URL}api/stream?url=${encodeURIComponent(videoUrl)}`;
}

// Fallback to AniList API for advanced search and other features
export async function fetchFromAniList(query: string, variables: any = {}) {
    try {
        const response = await axios.post("https://graphql.anilist.co", {
            query,
            variables,
        });
        return response.data.data;
    } catch (error) {
        console.error("Error fetching from AniList:", error);
        throw error;
    }
}

// Fetch anime info from AniList (fallback)
export async function fetchAnimeInfoFromAniList(id: string) {
    const query = `
    query ($id: Int) {
      Media (id: $id, type: ANIME) {
        id
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
          airingAt
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
    }
  `;

    const data = await fetchFromAniList(query, { id: parseInt(id) });
    return data.Media;
}
