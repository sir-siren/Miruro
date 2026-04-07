import { useState, useEffect } from "react";
import styled from "styled-components";
import {
    HomeCarousel,
    CardGrid,
    StyledCardGrid,
    SkeletonSlide,
    SkeletonCard,
    fetchTrendingAnime,
    fetchPopularAnime,
    fetchTopAnime,
    fetchTopAiringAnime,
    fetchUpcomingSeasons,
    fetchHomeData,
    HomeSideBar,
    EpisodeCard,
    getNextSeason,
    time,
    Paging,
    Anime,
    Episode,
} from "../index";

const SimpleLayout = styled.div`
    gap: 1rem;
    margin: 0 auto;
    max-width: 125rem;
    border-radius: var(--global-border-radius);
    display: flex;
    flex-direction: column;
`;

const ContentSidebarLayout = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2rem;
    width: 100%;

    @media (min-width: 1000px) {
        flex-direction: row;
        justify-content: space-between;
    }
`;

const TabContainer = styled.div`
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.5rem;
    border-radius: var(--global-border-radius);
    width: 100%;
`;

const Tab = styled.div<{ $isActive: boolean }>`
    background: ${({ $isActive }) =>
        $isActive ? "var(--primary-accent)" : "transparent"};
    border-radius: var(--global-border-radius);
    border: none;
    cursor: pointer;
    font-weight: bold;
    color: var(--global-text);
    position: relative;
    overflow: hidden;
    margin: 0;
    font-size: 0.8rem;
    padding: 1rem;

    transition: background-color 0.3s ease;

    &:hover,
    &:active,
    &:focus {
        background: var(--primary-accent);
    }

    @media (max-width: 500px) {
        padding: 0.5rem;
    }
`;

const Section = styled.section`
    padding: 0rem;
    border-radius: var(--global-border-radius);
`;

const ErrorMessage = styled.div`
    padding: 1rem;
    margin: 1rem 0;
    background-color: #ffdddd;
    border-left: 4px solid #f44336;
    color: #f44336;
    border-radius: var(--global-border-radius);

    p {
        margin: 0;
        font-weight: bold;
    }
`;

const Home = () => {
    const [itemsCount, setItemsCount] = useState(
        window.innerWidth > 500 ? 24 : 15,
    );

    // Reduced active time to 5mins
    const [activeTab, setActiveTab] = useState(() => {
        const time = Date.now();
        const savedData = localStorage.getItem("home tab");
        if (savedData) {
            const { tab, timestamp } = JSON.parse(savedData);
            if (time - timestamp < 300000) {
                return tab;
            } else {
                localStorage.removeItem("home tab");
            }
        }
        return "trending";
    });

    const [state, setState] = useState({
        watchedEpisodes: [] as Episode[],
        spotlightAnime: [] as Anime[],
        trendingAnime: [] as Anime[],
        popularAnime: [] as Anime[],
        topAnime: [] as Anime[],
        topAiring: [] as Anime[],
        Upcoming: [] as Anime[],
        error: null as string | null,
        loading: {
            spotlight: true,
            trending: true,
            popular: true,
            topRated: true,
            topAiring: true,
            Upcoming: true,
        },
    });

    useEffect(() => {
        const handleResize = () => {
            setItemsCount(window.innerWidth > 500 ? 24 : 15);
        };

        window.addEventListener("resize", handleResize);
        handleResize();

        return () => {
            window.removeEventListener("resize", handleResize);
        };
    }, []);

    useEffect(() => {
        const fetchWatchedEpisodes = () => {
            const watchedEpisodesData =
                localStorage.getItem("watched-episodes");
            if (watchedEpisodesData) {
                const allEpisodes = JSON.parse(watchedEpisodesData);
                const latestEpisodes: Episode[] = [];
                Object.keys(allEpisodes).forEach((animeId) => {
                    const episodes = allEpisodes[animeId];
                    const latestEpisode = episodes[episodes.length - 1];
                    latestEpisodes.push(latestEpisode);
                });
                setState((prevState) => ({
                    ...prevState,
                    watchedEpisodes: latestEpisodes,
                }));
            }
        };

        fetchWatchedEpisodes();
    }, []);

    useEffect(() => {
        const fetchCount = Math.ceil(itemsCount * 1.4);
        const fetchData = async () => {
            try {
                setState((prevState) => ({ ...prevState, error: null }));

                // Try to fetch from kiroanime backend first
                const homeData = await fetchHomeData();

                // If backend has data, use it; otherwise fall back to AniList
                let spotlight = homeData.spotlight || [];
                let trending = homeData.trending || [];
                let mostPopular = homeData.mostPopular || [];
                let topAiring = homeData.topAiring || [];

                // Fall back to AniList if backend is empty
                if (
                    trending.length === 0 ||
                    mostPopular.length === 0 ||
                    topAiring.length === 0
                ) {
                    const [
                        trendingAnilist,
                        popularAnilist,
                        topRatedAnilist,
                        topAiringAnilist,
                        Upcoming,
                    ] = await Promise.all([
                        fetchTrendingAnime(1, fetchCount),
                        fetchPopularAnime(1, fetchCount),
                        fetchTopAnime(1, fetchCount),
                        fetchTopAiringAnime(1, 6),
                        fetchUpcomingSeasons(1, 6),
                    ]);

                    // Use backend data if available, otherwise use AniList
                    if (trending.length === 0) trending = trendingAnilist;
                    if (mostPopular.length === 0) mostPopular = popularAnilist;
                    if (topAiring.length === 0) topAiring = topAiringAnilist;

                    setState((prevState) => ({
                        ...prevState,
                        spotlightAnime:
                            spotlight.length > 0
                                ? spotlight
                                : filterAndTrimAnime(trendingAnilist),
                        trendingAnime: filterAndTrimAnime(trending),
                        popularAnime: filterAndTrimAnime(mostPopular),
                        topAnime: filterAndTrimAnime(topRatedAnilist),
                        topAiring: filterAndTrimAnime(topAiring),
                        Upcoming: filterAndTrimAnime(Upcoming),
                    }));
                } else {
                    // Backend has all data
                    const Upcoming = await fetchUpcomingSeasons(1, 6);
                    setState((prevState) => ({
                        ...prevState,
                        spotlightAnime:
                            spotlight.length > 0 ? spotlight : trending,
                        trendingAnime: trending.slice(0, itemsCount),
                        popularAnime: mostPopular.slice(0, itemsCount),
                        topAnime: trending.slice(0, itemsCount), // Use trending as top rated since backend doesn't have it
                        topAiring: topAiring.slice(0, 6),
                        Upcoming: filterAndTrimAnime(Upcoming),
                    }));
                }
            } catch (fetchError) {
                console.error("Error fetching data:", fetchError);
                setState((prevState) => ({
                    ...prevState,
                    error: "An unexpected error occurred",
                }));
            } finally {
                setState((prevState) => ({
                    ...prevState,
                    loading: {
                        spotlight: false,
                        trending: false,
                        popular: false,
                        topRated: false,
                        topAiring: false,
                        Upcoming: false,
                    },
                }));
            }
        };

        fetchData();
    }, [itemsCount]);

    useEffect(() => {
        document.title = `Kirobox | Watch Anime Online, Free Anime Streaming`;
    }, [activeTab]);

    useEffect(() => {
        const tabData = JSON.stringify({ tab: activeTab, timestamp: time });
        localStorage.setItem("home tab", tabData);
    }, [activeTab]);

    const filterAndTrimAnime = (animeList: Paging) =>
        animeList.results
            /*       .filter(
              (anime: Anime) =>
                anime.totalEpisodes !== null &&
                anime.duration !== null &&
                anime.releaseDate !== null,
            ) */
            .slice(0, itemsCount);

    const renderCardGrid = (
        animeData: Anime[],
        isLoading: boolean,
        hasError: boolean,
    ) => (
        <Section>
            {isLoading || hasError ? (
                <StyledCardGrid>
                    {Array.from({ length: itemsCount }, (_, index) => (
                        <SkeletonCard key={index} />
                    ))}
                </StyledCardGrid>
            ) : (
                <CardGrid
                    animeData={animeData}
                    hasNextPage={false}
                    onLoadMore={() => {}}
                />
            )}
        </Section>
    );

    const handleTabClick = (tabName: string) => {
        setActiveTab(tabName);
    };

    const SEASON = getNextSeason();

    return (
        <SimpleLayout>
            {state.error && (
                <ErrorMessage title="Error Message">
                    <p>ERROR: {state.error}</p>
                </ErrorMessage>
            )}
            {state.loading.spotlight || state.error ? (
                <SkeletonSlide />
            ) : (
                <HomeCarousel
                    data={
                        state.spotlightAnime.length > 0
                            ? state.spotlightAnime
                            : state.trendingAnime
                    }
                    loading={state.loading.spotlight}
                    error={state.error}
                />
            )}
            <EpisodeCard />
            <ContentSidebarLayout>
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        flexGrow: 1,
                        gap: "1rem",
                    }}
                >
                    <TabContainer>
                        <Tab
                            title="Trending Tab"
                            $isActive={activeTab === "trending"}
                            onClick={() => handleTabClick("trending")}
                        >
                            TRENDING
                        </Tab>
                        <Tab
                            title="Popular Tab"
                            $isActive={activeTab === "popular"}
                            onClick={() => handleTabClick("popular")}
                        >
                            POPULAR
                        </Tab>
                        <Tab
                            title="Top Rated Tab"
                            $isActive={activeTab === "topRated"}
                            onClick={() => handleTabClick("topRated")}
                        >
                            TOP RATED
                        </Tab>
                    </TabContainer>
                    <div>
                        {activeTab === "trending" &&
                            renderCardGrid(
                                state.trendingAnime,
                                state.loading.trending,
                                !!state.error,
                            )}
                        {activeTab === "popular" &&
                            renderCardGrid(
                                state.popularAnime,
                                state.loading.popular,
                                !!state.error,
                            )}
                        {activeTab === "topRated" &&
                            renderCardGrid(
                                state.topAnime,
                                state.loading.topRated,
                                !!state.error,
                            )}
                    </div>
                </div>
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "1rem",
                    }}
                >
                    <div
                        style={{
                            fontSize: "1.25rem",
                            fontWeight: "bold",
                            padding: "0.75rem 0",
                        }}
                    >
                        TOP AIRING
                    </div>
                    <HomeSideBar animeData={state.topAiring} />
                    <div
                        style={{
                            fontSize: "1.25rem",
                            fontWeight: "bold",
                            padding: "0.75rem 0",
                        }}
                    >
                        UPCOMING {SEASON}
                    </div>
                    <HomeSideBar animeData={state.Upcoming} />
                </div>
            </ContentSidebarLayout>
        </SimpleLayout>
    );
};

export default Home;
