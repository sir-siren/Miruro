import { useState, useEffect } from "react";
import styled from "styled-components";
import { useKiroAuth } from "../client/useKiroAuth";
import { useNavigate } from "react-router-dom";
import {
    getAdminConfig,
    updateSection,
    adminSearchAnime,
    getAnimeEpisodes,
    addEpisode,
    batchAddEpisodes,
    deleteEpisode,
    getAdminStats,
    getAllUsers,
    deleteUser,
} from "../hooks/useApi";
import {
    FiSearch,
    FiPlus,
    FiTrash2,
    FiUsers,
    FiHome,
    FiFilm,
    FiBarChart2,
} from "react-icons/fi";

const AdminContainer = styled.div`
    max-width: 1400px;
    margin: 0 auto;
    padding: 2rem;

    @media (max-width: 768px) {
        padding: 1rem;
    }
`;

const Header = styled.div`
    margin-bottom: 2rem;

    h1 {
        font-size: 2rem;
        margin-bottom: 0.5rem;
        color: var(--global-text);
    }

    p {
        color: var(--global-text);
        opacity: 0.8;
    }
`;

const TabContainer = styled.div`
    display: flex;
    gap: 0.5rem;
    margin-bottom: 2rem;
    border-bottom: 2px solid var(--global-div);
    flex-wrap: wrap;
`;

const Tab = styled.button<{ $active: boolean }>`
    background: ${({ $active }) =>
        $active ? "var(--primary-accent)" : "transparent"};
    color: var(--global-text);
    border: none;
    padding: 1rem 1.5rem;
    cursor: pointer;
    font-weight: ${({ $active }) => ($active ? "bold" : "normal")};
    border-radius: var(--global-border-radius) var(--global-border-radius) 0 0;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    gap: 0.5rem;

    &:hover {
        background: ${({ $active }) =>
            $active ? "var(--primary-accent)" : "var(--global-div)"};
    }

    @media (max-width: 768px) {
        padding: 0.75rem 1rem;
        font-size: 0.9rem;
    }
`;

const Card = styled.div`
    background: var(--global-div);
    border-radius: var(--global-border-radius);
    padding: 1.5rem;
    margin-bottom: 1.5rem;
`;

const CardTitle = styled.h3`
    font-size: 1.25rem;
    margin-bottom: 1rem;
    color: var(--global-text);
`;

const StatsGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin-bottom: 2rem;
`;

const StatCard = styled.div`
    background: var(--global-div);
    border-radius: var(--global-border-radius);
    padding: 1.5rem;
    text-align: center;

    h4 {
        font-size: 0.9rem;
        color: var(--global-text);
        opacity: 0.8;
        margin-bottom: 0.5rem;
    }

    p {
        font-size: 2rem;
        font-weight: bold;
        color: var(--primary-accent);
    }
`;

const SearchInput = styled.input`
    width: 100%;
    padding: 0.75rem;
    background: var(--global-primary-bg);
    border: 1px solid var(--global-div);
    border-radius: var(--global-border-radius);
    color: var(--global-text);
    font-size: 1rem;
    margin-bottom: 1rem;

    &:focus {
        outline: none;
        border-color: var(--primary-accent);
    }
`;

const Button = styled.button<{ $variant?: "primary" | "danger" }>`
    background: ${({ $variant }) =>
        $variant === "danger" ? "#dc3545" : "var(--primary-accent)"};
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: var(--global-border-radius);
    cursor: pointer;
    font-weight: bold;
    transition: all 0.3s ease;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;

    &:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    }

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        transform: none;
    }

    @media (max-width: 768px) {
        padding: 0.6rem 1rem;
        font-size: 0.9rem;
    }
`;

const AnimeGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 1rem;
    margin-top: 1rem;

    @media (max-width: 768px) {
        grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    }
`;

const AnimeCard = styled.div`
    position: relative;
    cursor: pointer;
    border-radius: var(--global-border-radius);
    overflow: hidden;
    transition: transform 0.3s ease;

    &:hover {
        transform: scale(1.05);
    }

    img {
        width: 100%;
        height: 200px;
        object-fit: cover;
    }

    .title {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        background: linear-gradient(transparent, rgba(0, 0, 0, 0.9));
        padding: 1rem 0.5rem 0.5rem;
        font-size: 0.85rem;
        font-weight: bold;
        text-align: center;
    }

    .remove-btn {
        position: absolute;
        top: 0.5rem;
        right: 0.5rem;
        background: rgba(220, 53, 69, 0.9);
        border: none;
        border-radius: 50%;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        color: white;
        opacity: 0;
        transition: opacity 0.3s ease;
    }

    &:hover .remove-btn {
        opacity: 1;
    }
`;

const LoginContainer = styled.div`
    max-width: 400px;
    margin: 4rem auto;
    padding: 2rem;
    background: var(--global-div);
    border-radius: var(--global-border-radius);
    text-align: center;

    h2 {
        margin-bottom: 1.5rem;
    }

    form {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    input {
        padding: 0.75rem;
        background: var(--global-primary-bg);
        border: 1px solid var(--global-div);
        border-radius: var(--global-border-radius);
        color: var(--global-text);
        font-size: 1rem;

        &:focus {
            outline: none;
            border-color: var(--primary-accent);
        }
    }
`;

const TextArea = styled.textarea`
    width: 100%;
    min-height: 200px;
    padding: 0.75rem;
    background: var(--global-primary-bg);
    border: 1px solid var(--global-div);
    border-radius: var(--global-border-radius);
    color: var(--global-text);
    font-size: 1rem;
    font-family: monospace;
    resize: vertical;

    &:focus {
        outline: none;
        border-color: var(--primary-accent);
    }
`;

const Select = styled.select`
    padding: 0.75rem;
    background: var(--global-primary-bg);
    border: 1px solid var(--global-div);
    border-radius: var(--global-border-radius);
    color: var(--global-text);
    font-size: 1rem;

    &:focus {
        outline: none;
        border-color: var(--primary-accent);
    }
`;

const EpisodeList = styled.div`
    max-height: 400px;
    overflow-y: auto;
    margin-top: 1rem;
`;

const EpisodeItem = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem;
    background: var(--global-primary-bg);
    border-radius: var(--global-border-radius);
    margin-bottom: 0.5rem;

    .episode-info {
        flex: 1;

        .episode-number {
            font-weight: bold;
            margin-right: 0.5rem;
        }

        .episode-language {
            background: var(--primary-accent);
            padding: 0.2rem 0.5rem;
            border-radius: 0.25rem;
            font-size: 0.75rem;
            margin-right: 0.5rem;
        }
    }
`;

type TabType = "dashboard" | "sections" | "episodes" | "users";
type SectionType = "spotlight" | "trending" | "topAiring" | "mostPopular";

export const Admin = () => {
    const { isLoggedIn, isAdmin, user, login, logout, token } = useKiroAuth();
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState<TabType>("dashboard");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Login state
    const [loginForm, setLoginForm] = useState({ username: "", password: "" });

    // Dashboard state
    const [stats, setStats] = useState<any>(null);

    // Sections state
    const [sections, setSections] = useState<any>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [selectedSection, setSelectedSection] =
        useState<SectionType>("spotlight");

    // Episodes state
    const [episodeAnimeId, setEpisodeAnimeId] = useState("");
    const [episodeData, setEpisodeData] = useState<any>(null);
    const [batchEpisodes, setBatchEpisodes] = useState("");
    const [episodeLanguage, setEpisodeLanguage] = useState<
        "sub" | "english-dub" | "tagalog-dub"
    >("sub");

    // Users state
    const [users, setUsers] = useState<any[]>([]);

    useEffect(() => {
        if (!isLoggedIn) {
            return;
        }

        if (!isAdmin) {
            navigate("/");
            return;
        }

        if (activeTab === "dashboard") {
            loadStats();
        } else if (activeTab === "sections") {
            loadSections();
        } else if (activeTab === "users") {
            loadUsers();
        }
    }, [activeTab, isLoggedIn, isAdmin]);

    const loadStats = async () => {
        if (!token) return;
        try {
            const data = await getAdminStats(token);
            setStats(data);
        } catch (err) {
            console.error("Error loading stats:", err);
        }
    };

    const loadSections = async () => {
        if (!token) return;
        try {
            const data = await getAdminConfig(token);
            setSections(data);
        } catch (err) {
            console.error("Error loading sections:", err);
        }
    };

    const loadUsers = async () => {
        if (!token) return;
        try {
            const data = await getAllUsers(token);
            setUsers(data);
        } catch (err) {
            console.error("Error loading users:", err);
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        try {
            await login(loginForm.username, loginForm.password);
        } catch (err: any) {
            setError(err.message || "Login failed");
        }
    };

    const handleSearch = async () => {
        if (!token || !searchQuery.trim()) return;
        setLoading(true);
        try {
            const results = await adminSearchAnime(searchQuery, token);
            setSearchResults(results);
        } catch (err) {
            console.error("Search error:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddToSection = async (anilistId: number) => {
        if (!token) return;
        setLoading(true);
        try {
            await updateSection(selectedSection, anilistId, "add", token);
            await loadSections();
            setSearchQuery("");
            setSearchResults([]);
        } catch (err) {
            console.error("Error adding to section:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveFromSection = async (
        section: SectionType,
        anilistId: number,
    ) => {
        if (!token) return;
        setLoading(true);
        try {
            await updateSection(section, anilistId, "remove", token);
            await loadSections();
        } catch (err) {
            console.error("Error removing from section:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleLoadEpisodes = async () => {
        if (!token || !episodeAnimeId) return;
        setLoading(true);
        try {
            const data = await getAnimeEpisodes(
                parseInt(episodeAnimeId),
                token,
            );
            setEpisodeData(data);
        } catch (err) {
            console.error("Error loading episodes:", err);
            setError("Failed to load episodes");
        } finally {
            setLoading(false);
        }
    };

    const handleBatchAdd = async () => {
        if (!token || !episodeAnimeId || !batchEpisodes.trim()) return;
        setLoading(true);
        try {
            const result = await batchAddEpisodes(
                parseInt(episodeAnimeId),
                batchEpisodes,
                episodeLanguage,
                token,
            );
            alert(
                `Added ${result.added} episodes, updated ${result.updated} episodes`,
            );
            setBatchEpisodes("");
            await handleLoadEpisodes();
        } catch (err) {
            console.error("Error batch adding episodes:", err);
            setError("Failed to add episodes");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteEpisode = async (episodeId: string) => {
        if (!token || !episodeAnimeId) return;
        if (!confirm("Are you sure you want to delete this episode?")) return;

        setLoading(true);
        try {
            await deleteEpisode(parseInt(episodeAnimeId), episodeId, token);
            await handleLoadEpisodes();
        } catch (err) {
            console.error("Error deleting episode:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteUser = async (userId: string) => {
        if (!token) return;
        if (!confirm("Are you sure you want to delete this user?")) return;

        setLoading(true);
        try {
            await deleteUser(userId, token);
            await loadUsers();
        } catch (err) {
            console.error("Error deleting user:", err);
        } finally {
            setLoading(false);
        }
    };

    if (!isLoggedIn) {
        return (
            <LoginContainer>
                <h2>Admin Login</h2>
                {error && <p style={{ color: "#dc3545" }}>{error}</p>}
                <form onSubmit={handleLogin}>
                    <input
                        type="text"
                        placeholder="Username"
                        value={loginForm.username}
                        onChange={(e) =>
                            setLoginForm({
                                ...loginForm,
                                username: e.target.value,
                            })
                        }
                        required
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        value={loginForm.password}
                        onChange={(e) =>
                            setLoginForm({
                                ...loginForm,
                                password: e.target.value,
                            })
                        }
                        required
                    />
                    <Button type="submit">Login</Button>
                </form>
            </LoginContainer>
        );
    }

    if (!isAdmin) {
        return (
            <AdminContainer>
                <Card>
                    <h2>Access Denied</h2>
                    <p>You do not have admin privileges.</p>
                </Card>
            </AdminContainer>
        );
    }

    return (
        <AdminContainer>
            <Header>
                <h1>Kirobox Admin Panel</h1>
                <p>Welcome, {user?.username}</p>
            </Header>

            <TabContainer>
                <Tab
                    $active={activeTab === "dashboard"}
                    onClick={() => setActiveTab("dashboard")}
                >
                    <FiBarChart2 /> Dashboard
                </Tab>
                <Tab
                    $active={activeTab === "sections"}
                    onClick={() => setActiveTab("sections")}
                >
                    <FiHome /> Sections
                </Tab>
                <Tab
                    $active={activeTab === "episodes"}
                    onClick={() => setActiveTab("episodes")}
                >
                    <FiFilm /> Episodes
                </Tab>
                <Tab
                    $active={activeTab === "users"}
                    onClick={() => setActiveTab("users")}
                >
                    <FiUsers /> Users
                </Tab>
            </TabContainer>

            {activeTab === "dashboard" && stats && (
                <>
                    <StatsGrid>
                        <StatCard>
                            <h4>Total Users</h4>
                            <p>{stats.totalUsers}</p>
                        </StatCard>
                        <StatCard>
                            <h4>Total Anime</h4>
                            <p>{stats.totalAnime}</p>
                        </StatCard>
                        <StatCard>
                            <h4>Spotlight Anime</h4>
                            <p>{stats.spotlightCount}</p>
                        </StatCard>
                        <StatCard>
                            <h4>Trending Anime</h4>
                            <p>{stats.trendingCount}</p>
                        </StatCard>
                    </StatsGrid>
                </>
            )}

            {activeTab === "sections" && sections && (
                <>
                    <Card>
                        <CardTitle>Search & Add Anime</CardTitle>
                        <div
                            style={{
                                display: "flex",
                                gap: "0.5rem",
                                marginBottom: "1rem",
                            }}
                        >
                            <SearchInput
                                type="text"
                                placeholder="Search anime..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyPress={(e) =>
                                    e.key === "Enter" && handleSearch()
                                }
                            />
                            <Button onClick={handleSearch} disabled={loading}>
                                <FiSearch /> Search
                            </Button>
                        </div>

                        <Select
                            value={selectedSection}
                            onChange={(e) =>
                                setSelectedSection(
                                    e.target.value as SectionType,
                                )
                            }
                        >
                            <option value="spotlight">Spotlight</option>
                            <option value="trending">Trending</option>
                            <option value="topAiring">Top Airing</option>
                            <option value="mostPopular">Most Popular</option>
                        </Select>

                        {searchResults.length > 0 && (
                            <AnimeGrid>
                                {searchResults.map((anime) => (
                                    <AnimeCard
                                        key={anime.id}
                                        onClick={() =>
                                            handleAddToSection(anime.id)
                                        }
                                    >
                                        <img
                                            src={
                                                anime.coverImage?.medium ||
                                                anime.coverImage
                                            }
                                            alt={
                                                anime.title?.english ||
                                                anime.title?.romaji
                                            }
                                        />
                                        <div className="title">
                                            {anime.title?.english ||
                                                anime.title?.romaji}
                                        </div>
                                    </AnimeCard>
                                ))}
                            </AnimeGrid>
                        )}
                    </Card>

                    {["spotlight", "trending", "topAiring", "mostPopular"].map(
                        (section) => (
                            <Card key={section}>
                                <CardTitle>
                                    {section.charAt(0).toUpperCase() +
                                        section.slice(1)}{" "}
                                    ({sections[section]?.length || 0})
                                </CardTitle>
                                <AnimeGrid>
                                    {sections[section]?.map((anime: any) => (
                                        <AnimeCard key={anime.anilistId}>
                                            <img
                                                src={anime.coverImage}
                                                alt={
                                                    anime.title?.english ||
                                                    anime.title?.romaji
                                                }
                                            />
                                            <div className="title">
                                                {anime.title?.english ||
                                                    anime.title?.romaji}
                                            </div>
                                            <button
                                                className="remove-btn"
                                                onClick={() =>
                                                    handleRemoveFromSection(
                                                        section as SectionType,
                                                        anime.anilistId,
                                                    )
                                                }
                                            >
                                                <FiTrash2 />
                                            </button>
                                        </AnimeCard>
                                    ))}
                                </AnimeGrid>
                            </Card>
                        ),
                    )}
                </>
            )}

            {activeTab === "episodes" && (
                <>
                    <Card>
                        <CardTitle>Manage Episodes</CardTitle>
                        <div
                            style={{
                                display: "flex",
                                gap: "0.5rem",
                                marginBottom: "1rem",
                            }}
                        >
                            <SearchInput
                                type="number"
                                placeholder="Enter AniList ID"
                                value={episodeAnimeId}
                                onChange={(e) =>
                                    setEpisodeAnimeId(e.target.value)
                                }
                            />
                            <Button
                                onClick={handleLoadEpisodes}
                                disabled={loading}
                            >
                                Load Episodes
                            </Button>
                        </div>

                        {episodeData && (
                            <>
                                <h4>
                                    {episodeData.anime.title?.english ||
                                        episodeData.anime.title?.romaji}
                                </h4>

                                <CardTitle style={{ marginTop: "2rem" }}>
                                    Batch Add Episodes
                                </CardTitle>
                                <p
                                    style={{
                                        fontSize: "0.9rem",
                                        marginBottom: "1rem",
                                        opacity: 0.8,
                                    }}
                                >
                                    Format: One episode per line as "1. URL" or
                                    "1: URL" or "1 URL"
                                </p>

                                <Select
                                    value={episodeLanguage}
                                    onChange={(e) =>
                                        setEpisodeLanguage(
                                            e.target.value as
                                                | "sub"
                                                | "english-dub"
                                                | "tagalog-dub",
                                        )
                                    }
                                    style={{ marginBottom: "1rem" }}
                                >
                                    <option value="sub">Sub</option>
                                    <option value="english-dub">
                                        English Dub
                                    </option>
                                    <option value="tagalog-dub">
                                        Tagalog Dub
                                    </option>
                                </Select>

                                <TextArea
                                    placeholder="1. https://example.com/video1.mp4&#10;2. https://example.com/video2.mp4"
                                    value={batchEpisodes}
                                    onChange={(e) =>
                                        setBatchEpisodes(e.target.value)
                                    }
                                />
                                <Button
                                    onClick={handleBatchAdd}
                                    disabled={loading || !batchEpisodes.trim()}
                                    style={{ marginTop: "1rem" }}
                                >
                                    <FiPlus /> Batch Add Episodes
                                </Button>

                                <CardTitle style={{ marginTop: "2rem" }}>
                                    Current Episodes (
                                    {episodeData.episodes?.length || 0})
                                </CardTitle>
                                <EpisodeList>
                                    {episodeData.episodes?.map((ep: any) => (
                                        <EpisodeItem key={ep._id}>
                                            <div className="episode-info">
                                                <span className="episode-number">
                                                    Episode {ep.number}
                                                </span>
                                                <span className="episode-language">
                                                    {ep.language}
                                                </span>
                                                <span
                                                    style={{
                                                        fontSize: "0.85rem",
                                                    }}
                                                >
                                                    {ep.title}
                                                </span>
                                            </div>
                                            <Button
                                                $variant="danger"
                                                onClick={() =>
                                                    handleDeleteEpisode(ep._id)
                                                }
                                            >
                                                <FiTrash2 />
                                            </Button>
                                        </EpisodeItem>
                                    ))}
                                </EpisodeList>
                            </>
                        )}
                    </Card>
                </>
            )}

            {activeTab === "users" && (
                <Card>
                    <CardTitle>Users ({users.length})</CardTitle>
                    <EpisodeList>
                        {users.map((user) => (
                            <EpisodeItem key={user._id}>
                                <div className="episode-info">
                                    <span className="episode-number">
                                        {user.username}
                                    </span>
                                    <span
                                        style={{
                                            fontSize: "0.85rem",
                                            marginLeft: "1rem",
                                        }}
                                    >
                                        Role: {user.role}
                                    </span>
                                    <span
                                        style={{
                                            fontSize: "0.85rem",
                                            marginLeft: "1rem",
                                        }}
                                    >
                                        Joined:{" "}
                                        {new Date(
                                            user.createdAt,
                                        ).toLocaleDateString()}
                                    </span>
                                </div>
                                {user.role !== "admin" && (
                                    <Button
                                        $variant="danger"
                                        onClick={() =>
                                            handleDeleteUser(user._id)
                                        }
                                    >
                                        <FiTrash2 />
                                    </Button>
                                )}
                            </EpisodeItem>
                        ))}
                    </EpisodeList>
                </Card>
            )}
        </AdminContainer>
    );
};

export default Admin;
