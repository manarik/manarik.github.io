import React, { useState, useEffect } from "react";
import animeListData from "./animeList.json";

function App() {
  const [animeList, setAnimeList] = useState([]);
  const [selectedAnime, setSelectedAnime] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("title");

  useEffect(() => {
    const fetchDetails = async () => {
      const enriched = [];
      for (const entry of animeListData) {
        try {
          const res = await fetch(
            `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(entry.title)}&limit=1`
          );
          const apiData = await res.json();
          let extra = {};
          if (apiData.data && apiData.data.length > 0) {
            const anime = apiData.data[0];
            extra = {
              mal_id: anime.mal_id || `fallback-${entry.title.replace(/\s/g, "-")}`,
              genres: anime.genres?.map(g => g.name) || [],
              synopsis: anime.synopsis || "No synopsis available.",
              year: anime.aired?.from?.slice(0, 4) || "N/A",
              studio: anime.studios && anime.studios.length > 0 ? anime.studios[0].name : "N/A",
              streaming: anime.streaming || [],
              episodes: anime.episodes || "N/A",
              isFinished: anime.status === "Finished Airing",
              image: anime.images?.webp?.large_image_url ||
                     "https://via.placeholder.com/300?text=No+Image"
            };
          } else {
            extra = {
              mal_id: `fallback-${entry.title.replace(/\s/g, "-")}`,
              genres: [],
              synopsis: "No synopsis available.",
              year: "N/A",
              studio: "N/A",
              streaming: [],
              episodes: "N/A",
              isFinished: false,
              image: "https://via.placeholder.com/300?text=No+Image"
            };
          }
          enriched.push({ ...entry, ...extra });
        } catch (err) {
          enriched.push({
            ...entry,
            mal_id: `error-${entry.title.replace(/\s/g, "-")}`,
            genres: [],
            synopsis: "No synopsis available.",
            year: "N/A",
            studio: "N/A",
            streaming: [],
            episodes: "N/A",
            isFinished: false,
            image: "https://via.placeholder.com/300?text=No+Image"
          });
        }
        await new Promise((r) => setTimeout(r, 1200));
      }
      setAnimeList(enriched);
      setLoading(false);
    };
    fetchDetails();
  }, []);

  const sortedAnimeList = [...animeList].sort((a, b) => {
    if (sortBy === "title") {
      return (a.title || "").localeCompare(b.title || "");
    } else if (sortBy === "overallRating") {
      const aRating = Number(a.overallRating) || 0;
      const bRating = Number(b.overallRating) || 0;
      return bRating - aRating;
    }
    return 0;
  });

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
          </select>
        </div>
        {loading ? (
          <div className="text-center text-gray-300">Loading anime list...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
            {sortedAnimeList.map((anime) => (
              <div
                key={anime.mal_id}
                className="bg-gray-800 rounded-lg shadow-lg overflow-hidden cursor-pointer hover:scale-105 transform transition"
                onClick={() => setSelectedAnime(anime)}
              >
                <img
                  src={anime.image}
                  alt={anime.title}
                  className="w-full h-64 object-cover"
                />
                <div className="p-4">
                  <h2 className="text-xl font-semibold mb-2">{anime.title || "Unknown Title"}</h2>
                  <p className="text-gray-400 text-sm mb-1">
                    <span className="font-semibold">Status:</span> {anime.status}
                  </p>
                  <p className="text-gray-400 text-sm mb-1">
                    <span className="font-semibold">Watch Order:</span> {anime.watchOrder}
                  </p>
                  <p className="text-gray-400 text-sm mb-1">
                    <span className="font-semibold">Genres:</span>{" "}
                    {anime.genres.length > 0 ? anime.genres.join(", ") : "N/A"}
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
          <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
            <div className="bg-gray-900 rounded-lg w-full max-w-lg p-8 relative shadow-2xl">
              <button
                className="absolute top-4 right-4 text-gray-400 hover:text-white text-xl"
                onClick={() => setSelectedAnime(null)}
              >
                &times;
              </button>
              <img
                src={selectedAnime.image}
                alt={selectedAnime.title}
                className="w-full h-64 object-cover rounded mb-4"
              />
              <h2 className="text-2xl font-bold mb-2">
                {selectedAnime.title || "Unknown Title"}
              </h2>
              <div className="mb-2 text-gray-300">
                <span className="font-semibold">Summary:</span> {selectedAnime.synopsis}
              </div>
              <p className="text-gray-400 text-sm mb-1">
                <span className="font-semibold">Status:</span> {selectedAnime.status}
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
                <span className="font-semibold">Episodes:</span> {selectedAnime.episodes}
              </p>
              <p className="text-gray-400 text-sm mb-1">
                <span className="font-semibold">Studio:</span> {selectedAnime.studio}
              </p>
              <p className="text-gray-400 text-sm mb-1">
                <span className="font-semibold">Finished:</span>{" "}
                {selectedAnime.isFinished ? "Yes" : "No"}
              </p>
              {selectedAnime.streaming && selectedAnime.streaming.length > 0 && (
                <div className="mt-2">
                  <span className="font-semibold">Streaming on:</span>{" "}
                  {selectedAnime.streaming.map((stream) => (
                    <a
                      key={stream.name}
                      href={stream.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline text-blue-400 mx-1"
                    >
                      {stream.name}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;