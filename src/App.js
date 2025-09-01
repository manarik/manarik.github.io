import React, { useState, useEffect } from "react";
import animeListData from "./animeList.json";

function App() {
  const [animeList, setAnimeList] = useState([]);
  const [selectedAnime, setSelectedAnime] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("title");
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [selectedStreamers, setSelectedStreamers] = useState("Loading...");

  useEffect(() => {
    // Fetch all anime details in parallel
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
              genreLink: anime.relationships.genres.links.related,
              popularityRank: anime.attributes.popularityRank ?? "N/A",
              ratingRank: anime.attributes.ratingRank ?? "N/A",
              // Do not fetch streamers here; will fetch when tile is selected
            };
          } else {
            extra = {
              kitsu_id: `fallback-${entry.title.replace(/\s/g, "-")}`,
              synopsis: "No synopsis available.",
              year: "N/A",
              episodeCount: "N/A",
              kitsuStatus: "N/A",
              poster: "https://via.placeholder.com/300?text=No+Image",
              genreLink: null,
              popularityRank: "N/A",
              ratingRank: "N/A",
              // No streamers here
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

  // When a card is clicked, fetch genres and streamers for that anime only
  const handleCardClick = async (anime) => {
    setSelectedAnime(anime);
    setSelectedGenres([]);
    setSelectedStreamers("Loading...");
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
    // Fetch streamers from /anime/{id}/streamers
    if (anime.kitsu_id && !anime.kitsu_id.startsWith("fallback-") && !anime.kitsu_id.startsWith("error-")) {
      try {
        const res = await fetch(`https://kitsu.io/api/edge/anime/${anime.kitsu_id}/streamers`);
        const data = await res.json();
        if (Array.isArray(data.data) && data.data.length > 0) {
          const streamerSites = data.data
            .map(s => s.attributes?.siteName)
            .filter(Boolean)
            .join(", ");
          setSelectedStreamers(streamerSites || "N/A");
        } else {
          setSelectedStreamers("N/A");
        }
      } catch {
        setSelectedStreamers("N/A");
      }
    } else {
      setSelectedStreamers("N/A");
    }
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
    <div className="bg-gray-900 min-h-screen text-white">
      <div className="container mx-auto py-8">
        <h1 className="text-4xl font-bold mb-6 text-white">Anime Tracker</h1>
        <div className="mb-4">
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
        {loading ? (
          <div className="text-center text-gray-300">Loading anime list...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
            {sortedAnimeList.map((anime) => (
              <div
                key={anime.kitsu_id}
                className={`${getCardClasses(anime.watchStatus)} rounded-lg shadow-lg overflow-hidden cursor-pointer hover:scale-105 transform transition`}
                onClick={() => handleCardClick(anime)}
              >
                <img
                  src={anime.poster}
                  alt={anime.title}
                  className="w-full h-64 object-cover"
                />
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
        )}

        {/* Modal for selected anime details */}
        {selectedAnime && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{
              background: "rgba(30,30,30,0.75)",
              backdropFilter: "blur(3px)",
            }}
          >
            <div
              className="bg-gray-900 rounded-xl shadow-2xl relative flex flex-col"
              style={{
                width: "95vw",
                height: "90vh",
                maxWidth: "1200px",
                margin: "2vw",
                overflow: "hidden",
                boxShadow: "0 8px 32px rgba(0,0,0,0.45)",
              }}
            >
              <button
                className="absolute top-6 right-6 z-20 flex items-center justify-center bg-red-600 hover:bg-red-700 text-white font-bold rounded-full shadow-xl"
                style={{
                  width: "56px",
                  height: "56px",
                  fontSize: "2rem",
                  border: "4px solid white",
                  boxShadow: "0 0 0 4px rgba(255,255,255,0.2)",
                }}
                title="Close"
                onClick={() => setSelectedAnime(null)}
              >
                &#10005;
              </button>
              <div
                className="p-8 pt-20 overflow-y-auto flex-1"
                style={{ maxHeight: "100%", minHeight: 0 }}
              >
                <div className="flex flex-col md:flex-row items-center md:items-start">
                  <img
                    src={selectedAnime.poster}
                    alt={selectedAnime.title}
                    className="h-64 w-auto rounded mb-4 md:mb-0 md:mr-8 object-cover"
                  />
                  <div className="flex-1">
                    <h2 className="text-3xl font-bold mb-2">
                      {selectedAnime.title || "Unknown Title"}
                    </h2>
                    <div className="mb-2 text-gray-300">
                      <span className="font-semibold">Summary:</span> {selectedAnime.synopsis}
                    </div>
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
                      <span className="font-semibold">Streamers:</span> {selectedStreamers}
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
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;