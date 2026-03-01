import { useState, useEffect, useRef, useCallback } from "react";
import { TMDB_KEY, LAST_FM_KEY, GOOGLE_BOOKS_KEY, TMDB_GENRES, API_TYPES } from "../utils/constants.js";

export const useApiSearch = (searchQuery, mediaType) => {
  const [searchResults, setSearchResults] = useState([]);
  const searchAbortRef = useRef(null);  // abort controller for search requests
  const detailAbortRef = useRef(null);  // FIX: separate abort controller for detail fetches

  // FIX: wrap runSearch in useCallback so it's stable across renders
  const runSearch = useCallback(async q => {
    if (q.length < 3) { setSearchResults([]); return; }
    const at = API_TYPES[mediaType];
    if (!at) return;

    // Cancel previous in-flight search request
    searchAbortRef.current?.abort();
    searchAbortRef.current = new AbortController();
    const { signal } = searchAbortRef.current;

    try {
      if (at === "tmdb_movie") {
        const r = await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${TMDB_KEY}&query=${encodeURIComponent(q)}`, { signal });
        if (!r.ok) throw new Error(`TMDB error ${r.status}`);
        setSearchResults((await r.json()).results?.slice(0, 6) || []);

      } else if (at === "tmdb_tv") {
        const r = await fetch(`https://api.themoviedb.org/3/search/tv?api_key=${TMDB_KEY}&query=${encodeURIComponent(q)}`, { signal });
        if (!r.ok) throw new Error(`TMDB error ${r.status}`);
        setSearchResults((await r.json()).results?.slice(0, 6).map(x => ({ ...x, _tv: true })) || []);

      } else if (at === "books") {
        // FIX: check response ok and parse JSON safely
        const [r1, r2] = await Promise.all([
          fetch(`https://www.googleapis.com/books/v1/volumes?q=intitle:${encodeURIComponent(q)}&orderBy=relevance&printType=books&maxResults=10&langRestrict=en&key=${GOOGLE_BOOKS_KEY}`, { signal }),
          fetch(`https://www.googleapis.com/books/v1/volumes?q=inauthor:${encodeURIComponent(q)}&orderBy=relevance&printType=books&maxResults=10&langRestrict=en&key=${GOOGLE_BOOKS_KEY}`, { signal }),
        ]);
        const [d1, d2] = await Promise.all([
          r1.ok ? r1.json() : Promise.resolve({}),
          r2.ok ? r2.json() : Promise.resolve({}),
        ]);
        const seen = new Set();
        setSearchResults([...(d1.items || []), ...(d2.items || [])].filter(i => {
          if (seen.has(i.id)) return false;
          seen.add(i.id);
          return true;
        }).slice(0, 12));

      } else if (at === "lastfm") {
        const r = await fetch(`https://ws.audioscrobbler.com/2.0/?method=album.search&album=${encodeURIComponent(q)}&api_key=${LAST_FM_KEY}&format=json`, { signal });
        if (!r.ok) throw new Error(`Last.fm error ${r.status}`);
        setSearchResults((await r.json()).results?.albummatches?.album?.slice(0, 6) || []);
      }
    } catch (e) {
      if (e.name === "AbortError") return; // Ignore intentional cancellations
      console.error("API search failed:", e);
      setSearchResults([]);
    }
  }, [mediaType]);

  useEffect(() => {
    const d = setTimeout(() => {
      if (searchQuery.length >= 3) runSearch(searchQuery);
      else setSearchResults([]);
    }, 250);
    return () => clearTimeout(d);
  }, [searchQuery, mediaType, runSearch]);

  // Cancel any in-flight requests on unmount
  useEffect(() => {
    return () => {
      searchAbortRef.current?.abort();
      detailAbortRef.current?.abort();
    };
  }, []);

  const selectResult = async (item, mediaType, callbacks) => {
    setSearchResults([]);
    const at = API_TYPES[mediaType];
    const { setTitle, setCreator, setYear, setGenre, setArtwork } = callbacks;

    // FIX: cancel any previous detail fetch so stale data can't overwrite a newer selection
    detailAbortRef.current?.abort();
    detailAbortRef.current = new AbortController();
    const { signal } = detailAbortRef.current;

    if (at === "tmdb_movie") {
      setTitle(item.title);
      setYear(item.release_date?.split("-")[0] || "");
      setGenre(TMDB_GENRES[item.genre_ids?.[0]] || "");
      setArtwork(item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : "");
      try {
        const r = await fetch(`https://api.themoviedb.org/3/movie/${item.id}/credits?api_key=${TMDB_KEY}`, { signal });
        const d = await r.json();
        setCreator(d.crew?.find(p => p.job === "Director")?.name || "");
      } catch (e) {
        if (e.name !== "AbortError") setCreator("");
      }

    } else if (at === "tmdb_tv") {
      setTitle(item.name);
      setYear(item.first_air_date?.split("-")[0] || "");
      setGenre(TMDB_GENRES[item.genre_ids?.[0]] || "");
      setArtwork(item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : "");
      try {
        const r = await fetch(`https://api.themoviedb.org/3/tv/${item.id}/credits?api_key=${TMDB_KEY}`, { signal });
        const d = await r.json();
        setCreator(d.crew?.find(p => p.job === "Executive Producer")?.name || "");
      } catch (e) {
        if (e.name !== "AbortError") setCreator("");
      }

    } else if (at === "books") {
      setTitle(item.volumeInfo.title);
      setCreator(item.volumeInfo.authors?.join(", ") || "");
      const il = item.volumeInfo?.imageLinks;
      const raw = il?.thumbnail || il?.smallThumbnail || "";
      setArtwork(raw ? raw.replace("zoom=1", "zoom=0").replace("http://", "https://") : "");
      setYear(item.volumeInfo.publishedDate?.split("-")[0] || "");
      setGenre(item.volumeInfo?.categories?.[0] || "");

    } else if (at === "lastfm") {
      setTitle(item.name);
      setCreator(item.artist);
      // FIX: use consistent image index (extralarge = index 3) matching the search results list
      setArtwork(item.image ? (item.image[3]?.["#text"] || item.image[2]?.["#text"] || "") : "");
      try {
        const r = await fetch(`https://ws.audioscrobbler.com/2.0/?method=album.getInfo&api_key=${LAST_FM_KEY}&artist=${encodeURIComponent(item.artist)}&album=${encodeURIComponent(item.name)}&format=json`, { signal });
        const d = await r.json();
        const rd = d.album?.releasedate?.trim();
        if (rd) { const m = rd.match(/\d{4}/); setYear(m ? m[0] : ""); } else setYear("");
        setGenre(d.album?.tags?.tag?.[0]?.name || "");
      } catch (e) {
        if (e.name !== "AbortError") setYear("");
      }
    }
  };

  return { searchResults, setSearchResults, selectResult };
};
