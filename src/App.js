import React, { useState, useEffect } from "react";
import animeListData from "./animeList.json";

// Set browser tab title
document.title = "Anime Tracker";

// Back to Top Button
function BackToTopButton() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 300);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return show ? (
    <button
      className="fixed bottom-6 right-6 z-50 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg p-3 text-xl"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Back to top"
    >
      ↑
    </button>
  ) : null;
}

// Fetch streaming links from AniList GraphQL API
async function fetchStreamingLinks(animeTitle) {
  const query = `
    query ($search: String) {
      Media(search: $search, type: ANIME) {
        externalLinks {
          site
          url
        }
      }
    }
  `;
  const variables = { search: animeTitle };
  try {
    const response = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables }),
    });
    const result = await response.json();
    return result?.data?.Media?.externalLinks || [];
  } catch {
    return [];
  }
}

// Only hyperlink Crunchyroll, Hulu, Amazon, Netflix
function StreamingOptions({ links }) {
  // Lowercase for matching
  const allowedHyperlinks = ["crunchyroll", "hulu", "amazon", "netflix"];
  return (
    <div className="mt-4 pt-4 border-t border-gray-700">
      <span className="font-semibold text-gray-300">Streaming Options:</span>
      {links.length > 0 ? (
        <ul className="list-disc ml-6">
          {links.map(link => {
            const site = link.site || "";
            const normalized = site.trim().toLowerCase();
            const shouldLink = allowedHyperlinks.some(allowed =>
              normalized.includes(allowed)
            );
            return (
              <li key={site + link.url}>
                {shouldLink ? (
                  <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">
                    {site}
                  </a>
                ) : (
                  <span>{site}</span>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <span className="ml-2 text-gray-400">None found.</span>
      )}
    </div>
  );
}

// Divider bar
const DividerBar = () => (
  <div className="w-full my-4 border-t border-gray-700" />
);

function App() {
  const [animeList, setAnimeList] = useState([]);
  const [selectedAnime, setSelectedAnime] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("title");
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [selectedAniListLinks, setSelectedAniListLinks] = useState([]);
  const [viewType, setViewType] = useState("tiles");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchDetails = async () => {
      const requests = animeListData.map(async (entry) => {
        try {
          const res = await fetch(
            `https://kitsu.io/api/edge/anime?filter[text]=${encodeURIComponent(entry.title)}`
          );
          const apiData = await res.json();
          let extra = {};
          if (apiData.data && apiData.data.length > 0) {
            const anime = apiData.data[0];
            extra = {
              kitsu_id: anime.id,
              synopsis: anime.attributes.synopsis || "No synopsis available.",
              year: anime.attributes.startDate ? anime.attributes.startDate.slice(0, 4) : "N/A",
              episodeCount: anime.attributes.episodeCount || "N/A",
              kitsuStatus: anime.attributes.status || "N/A",
              poster: anime.attributes.posterImage?.large || "https://via.placeholder.com/300?text=No+Image",
              posterThumb: anime.attributes.posterImage?.tiny || anime.attributes.posterImage?.small || anime.attributes.posterImage?.original || "https://via.placeholder.com/64?text=No+Image",
              genreLink: anime.relationships.genres.links.related,
              popularityRank: anime.attributes.popularityRank ?? "N/A",
              ratingRank: anime.attributes.ratingRank ?? "N/A",
            };
          } else {
            extra = {
              kitsu_id: `fallback-${entry.title.replace(/\s/g, "-")}`,
              synopsis: "No synopsis available.",
              year: "N/A",
              episodeCount: "N/A",
              kitsuStatus: "N/A",
              poster: "https://via.placeholder.com/300?text=No+Image",
              posterThumb: "https://via.placeholder.com/64?text=No+Image",
              genreLink: null,
              popularityRank: "N/A",
              ratingRank: "N/A",
            };
          }
          return {
            ...entry,
            ...extra,
            watchStatus: entry.watchStatus || "Unwatched",
          };
        } catch (err) {
          return {
            ...entry,
            kitsu_id: `error-${entry.title.replace(/\s/g, "-")}`,
            synopsis: "No synopsis available.",
            year: "N/A",
            episodeCount: "N/A",
            kitsuStatus: "N/A",
            poster: "https://via.placeholder.com/300?text=No+Image",
            posterThumb: "https://via.placeholder.com/64?text=No+Image",
            genreLink: null,
            popularityRank: "N/A",
            ratingRank: "N/A",
            watchStatus: entry.watchStatus || "Unwatched",
          };
        }
      });
      const enriched = await Promise.all(requests);
      setAnimeList(enriched);
      setLoading(false);
    };
    fetchDetails();
  }, []);

  // Sorting logic
  const sortedAnimeList = [...animeList].sort((a, b) => {
    if (sortBy === "title") {
      return (a.title || "").localeCompare(b.title || "");
    } else if (sortBy === "overallRating") {
      const aRating = Number(a.overallRating) || 0;
      const bRating = Number(b.overallRating) || 0;
      return bRating - aRating;
    } else if (sortBy === "watched") {
      if ((a.watchStatus || "") === (b.watchStatus || "")) {
        return (a.title || "").localeCompare(b.title || "");
      }
      return (a.watchStatus === "Watched" ? -1 : 1);
    } else if (sortBy === "watchOrder") {
      const aOrder = a.watchOrder !== undefined ? Number(a.watchOrder) : Infinity;
      const bOrder = b.watchOrder !== undefined ? Number(b.watchOrder) : Infinity;
      return aOrder - bOrder;
    }
    return 0;
  });

  // Filter logic
  const filteredAnimeList = sortedAnimeList.filter(anime => {
    const s = search.trim().toLowerCase();
    if (!s) return true;
    return (
      (anime.title || "").toLowerCase().includes(s) ||
      (anime.year || "").toLowerCase().includes(s) ||
      (anime.watchStatus || "").toLowerCase().includes(s) ||
      (anime.synopsis || "").toLowerCase().includes(s) ||
      (anime.favoriteCharacter || "").toLowerCase().includes(s) ||
      (anime.notes || "").toLowerCase().includes(s)
    );
  });

  // When a card is clicked, fetch genres and AniList streaming links
  const handleCardClick = async (anime) => {
    setSelectedAnime(anime);
    setSelectedGenres([]);
    setSelectedAniListLinks([]);

    // Fetch genres
    if (anime.genreLink) {
      try {
        const res = await fetch(anime.genreLink);
        const data = await res.json();
        const genres = data.data.map((g) => g.attributes.name);
        setSelectedGenres(genres);
      } catch {
        setSelectedGenres([]);
      }
    }

    // AniList streaming links
    const aniListLinks = await fetchStreamingLinks(anime.title || "");
    setSelectedAniListLinks(aniListLinks);
  };

  const getCardClasses = (watchStatus) => {
    if (watchStatus === "Watching") {
      return "bg-green-800 border-4 border-green-400";
    }
    if (watchStatus === "Watched") {
      return "bg-blue-800 border-4 border-yellow-400";
    }
    if (watchStatus === "Unwatched") {
      return "bg-gray-800 border-4 border-gray-700";
    }
    return "bg-gray-700 border-4 border-gray-700";
  };

  const getWatchStatusTextClass = (watchStatus) => {
    if (watchStatus === "Watching") {
      return "text-green-300 font-bold";
    }
    if (watchStatus === "Watched") {
      return "text-yellow-300 font-bold";
    }
    if (watchStatus === "Unwatched") {
      return "text-gray-300 font-bold";
    }
    return "text-gray-300";
  };

  return (
    <div className="bg-gray-900 min-h-screen text-white" style={{ overflowX: "hidden" }}>
      <div className="container mx-auto py-8 px-2" style={{ maxWidth: "100vw" }}>
        {/* Centered site title and controls */}
        <div className="flex flex-col items-center justify-center mb-6">
          <h1 className="text-4xl font-bold mb-4 text-center">Anime Tracker</h1>
          {/* Search bar above controls */}
          <div className="w-full flex items-center justify-center mb-3">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search anime, year, character, notes..."
              className="bg-gray-800 text-white rounded px-4 py-2 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 w-72"
              style={{ minWidth: "180px" }}
            />
          </div>
          <div className="flex flex-wrap gap-4 items-center justify-center w-full mb-2">
            <div>
              <label className="mr-2">Sort by:</label>
              <select
                className="bg-gray-700 text-white rounded"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="title">Title</option>
                <option value="overallRating">Overall Rating</option>
                <option value="watched">Watched Status</option>
                <option value="watchOrder">Watch Order</option>
              </select>
            </div>
            <div>
              <label className="mr-2">View:</label>
              <button
                className={`mr-1 px-3 py-1 rounded ${viewType === "tiles" ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-300"}`}
                onClick={() => setViewType("tiles")}
              >
                Tiles
              </button>
              <button
                className={`px-3 py-1 rounded ${viewType === "list" ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-300"}`}
                onClick={() => setViewType("list")}
              >
                List
              </button>
            </div>
          </div>
        </div>
        {loading ? (
          <div className="text-center text-gray-300">Loading anime list...</div>
        ) : viewType === "tiles" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8" style={{ maxWidth: "100vw", overflowX: "hidden" }}>
            {filteredAnimeList.map((anime) => (
              <div
                key={anime.kitsu_id}
                className={`${getCardClasses(anime.watchStatus)} rounded-lg shadow-lg overflow-hidden cursor-pointer hover:scale-105 transform transition`}
                onClick={() => handleCardClick(anime)}
              >
                <img src={anime.poster} alt={anime.title} className="w-full h-64 object-cover" />
                <div className="p-4">
                  <h2 className="text-xl font-semibold mb-2">{anime.title || "Unknown Title"}</h2>
                  <p className={`${getWatchStatusTextClass(anime.watchStatus)} text-sm mb-1`}>
                    <span className="font-semibold">Status:</span> {anime.watchStatus}
                  </p>
                  <p className="text-gray-400 text-sm mb-1">
                    <span className="font-semibold">Popularity Rank:</span> {anime.popularityRank}
                  </p>
                  <p className="text-gray-400 text-sm mb-1">
                    <span className="font-semibold">Rating Rank:</span> {anime.ratingRank}
                  </p>
                  <p className="text-gray-400 text-sm mb-1">
                    <span className="font-semibold">Overall Rating:</span> {anime.overallRating}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto" style={{ borderRadius: "0.5rem", background: "#23272A", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
            <table className="min-w-full text-sm">
              <thead>
                <tr>
                  <th className="p-2 text-left text-gray-400">Cover</th>
                  <th className="p-2 text-left text-gray-400">Title</th>
                  <th className="p-2 text-left text-gray-400">Status</th>
                  <th className="p-2 text-left text-gray-400">Year</th>
                  <th className="p-2 text-left text-gray-400">Episodes</th>
                  <th className="p-2 text-left text-gray-400">Rating</th>
                  <th className="p-2 text-left text-gray-400">Popularity</th>
                  <th className="p-2 text-left text-gray-400">Watch Order</th>
                </tr>
              </thead>
              <tbody>
                {filteredAnimeList.map((anime) => (
                  <tr key={anime.kitsu_id} className="cursor-pointer hover:bg-gray-800" onClick={() => handleCardClick(anime)}>
                    <td className="p-2">
                      <img src={anime.posterThumb} alt={anime.title} width={48} height={64} style={{ borderRadius: "0.25rem", objectFit: "cover", background: "#222" }} />
                    </td>
                    <td className="p-2">{anime.title || "Unknown Title"}</td>
                    <td className="p-2">{anime.watchStatus}</td>
                    <td className="p-2">{anime.year}</td>
                    <td className="p-2">{anime.episodeCount}</td>
                    <td className="p-2">{anime.overallRating}</td>
                    <td className="p-2">{anime.popularityRank}</td>
                    <td className="p-2">{anime.watchOrder}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <BackToTopButton />

        {/* Modal for selected anime details */}
        {selectedAnime && (
          <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(30,30,30,0.75)", backdropFilter: "blur(3px)" }}>
            <div className="bg-gray-900 text-white rounded-xl shadow-2xl relative flex flex-col"
              style={{ width: "95vw", height: "90vh", maxWidth: "1200px", margin: "2vw", overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.45)" }}>
              <button
                className="absolute top-6 right-6 z-20 flex items-center justify-center bg-red-600 hover:bg-red-700 text-white font-bold rounded-full shadow-xl border-4 border-gray-800"
                style={{ width: "56px", height: "56px", fontSize: "2rem", boxShadow: "0 0 0 4px rgba(255,255,255,0.2)" }}
                title="Close"
                onClick={() => setSelectedAnime(null)}
              >
                &#10005;
              </button>
              <div className="p-8 pt-20 overflow-y-auto flex-1" style={{ maxHeight: "100%", minHeight: 0 }}>
                <div className="flex flex-col md:flex-row items-center md:items-start">
                  <img src={selectedAnime.poster} alt={selectedAnime.title} className="h-64 w-auto rounded mb-4 md:mb-0 md:mr-8 object-cover" />
                  <div className="flex-1">
                    <h2 className="text-3xl font-bold mb-2 text-center">{selectedAnime.title || "Unknown Title"}</h2>
                    <div className="mb-2 text-gray-300">
                      <span className="font-semibold">Summary:</span> {selectedAnime.synopsis}
                    </div>
                    <DividerBar />
                    <p className={`${getWatchStatusTextClass(selectedAnime.watchStatus)} text-sm mb-1`}>
                      <span className="font-semibold">Status:</span> {selectedAnime.watchStatus}
                    </p>
                    <p className="text-gray-400 text-sm mb-1">
                      <span className="font-semibold">Kitsu Status:</span> {selectedAnime.kitsuStatus}
                    </p>
                    <p className="text-gray-400 text-sm mb-1">
                      <span className="font-semibold">Popularity Rank:</span> {selectedAnime.popularityRank}
                    </p>
                    <p className="text-gray-400 text-sm mb-1">
                      <span className="font-semibold">Rating Rank:</span> {selectedAnime.ratingRank}
                    </p>
                    <p className="text-gray-400 text-sm mb-1">
                      <span className="font-semibold">Watch Order:</span> {selectedAnime.watchOrder}
                    </p>
                    <p className="text-gray-400 text-sm mb-1">
                      <span className="font-semibold">Overall Rating:</span> {selectedAnime.overallRating}
                    </p>
                    <p className="text-gray-400 text-sm mb-1">
                      <span className="font-semibold">Story Rating:</span> {selectedAnime.storyRating}
                    </p>
                    <p className="text-gray-400 text-sm mb-1">
                      <span className="font-semibold">Animation/Visuals Rating:</span> {selectedAnime.animationVisualsRating}
                    </p>
                    <p className="text-gray-400 text-sm mb-1">
                      <span className="font-semibold">Pacing:</span> {selectedAnime.pacing}
                    </p>
                    <p className="text-gray-400 text-sm mb-1">
                      <span className="font-semibold">Favorite Character:</span> {selectedAnime.favoriteCharacter}
                    </p>
                    <p className="text-gray-400 text-sm mb-1">
                      <span className="font-semibold">Favorite Part:</span> {selectedAnime.favoritePart}
                    </p>
                    <p className="text-gray-400 text-sm mb-1">
                      <span className="font-semibold">Notes:</span> {selectedAnime.notes}
                    </p>
                    <p className="text-gray-400 text-sm mb-1">
                      <span className="font-semibold">Year:</span> {selectedAnime.year}
                    </p>
                    <p className="text-gray-400 text-sm mb-1">
                      <span className="font-semibold">Episodes:</span> {selectedAnime.episodeCount}
                    </p>
                    <p className="text-gray-400 text-sm mb-1">
                      <span className="font-semibold">Genres:</span> {selectedGenres.length > 0 ? selectedGenres.join(", ") : "Loading..."}
                    </p>
                    {/* Streaming Options at the bottom */}
                    <StreamingOptions links={selectedAniListLinks} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      {/* Custom scrollbar for mobile/desktop */}
      <style>
        {`
          body, html {
            overscroll-behavior-x: none;
          }
          ::-webkit-scrollbar {
            width: 8px;
            background: #222;
          }
          ::-webkit-scrollbar-thumb {
            background: #444;
            border-radius: 6px;
          }
        `}
      </style>
    </div>
  );
}

export default App;