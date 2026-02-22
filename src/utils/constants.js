// ─── API KEYS ─────────────────────────────────────────────────────────────────
// These are set via .env file — see .env.example
export const TMDB_KEY = import.meta.env.VITE_TMDB_KEY || "";
export const LAST_FM_KEY = import.meta.env.VITE_LAST_FM_KEY || "";
export const GOOGLE_BOOKS_KEY = import.meta.env.VITE_GOOGLE_BOOKS_KEY || "";

export const TMDB_GENRES = {
  28:"Action", 12:"Adventure", 16:"Animation", 35:"Comedy", 80:"Crime",
  99:"Documentary", 18:"Drama", 10751:"Family", 14:"Fantasy", 36:"History",
  27:"Horror", 10402:"Music", 9648:"Mystery", 10749:"Romance", 878:"Sci-Fi",
  10770:"TV Movie", 53:"Thriller", 10752:"War", 37:"Western",
};

// ─── CATEGORIES & SUBTYPES ────────────────────────────────────────────────────
export const CATEGORIES = {
  Read:        { icon:"📖", color:"#3498db", subtypes:["Book","Comic / Graphic Novel","Short Story / Essay"] },
  Watched:     { icon:"🎬", color:"#9b59b6", subtypes:["Movie","TV Series","Documentary","YouTube / Online Series","Short Film","Sport"] },
  Listened:    { icon:"🎵", color:"#1abc9c", subtypes:["Album","Podcast","Audiobook"] },
  Experienced: { icon:"✨", color:"#e67e22", subtypes:["Gig / Concert","Play / Theatre","Gallery / Museum","Landmark / Place","Restaurant / Food","Sports Event","Festival"] },
};

export const SUBTYPE_ICONS = {
  "Book":"📖","Comic / Graphic Novel":"📚","Short Story / Essay":"📝",
  "Movie":"🎬","TV Series":"📺","Documentary":"🎥","YouTube / Online Series":"▶️","Short Film":"🎞","Sport":"🏆",
  "Album":"💿","Podcast":"🎙","Audiobook":"🔊",
  "Gig / Concert":"🎸","Play / Theatre":"🎭","Gallery / Museum":"🖼",
  "Landmark / Place":"📍","Restaurant / Food":"🍽","Sports Event":"🏅","Festival":"🎪",
};

export const CREATOR_LABELS = {
  "Book":"Author","Comic / Graphic Novel":"Author","Short Story / Essay":"Author",
  "Movie":"Director","TV Series":"Creator","Documentary":"Director",
  "YouTube / Online Series":"Creator","Short Film":"Director","Sport":"Teams / Players",
  "Album":"Artist / Band","Podcast":"Host","Audiobook":"Author",
  "Gig / Concert":"Artist","Play / Theatre":"Company / Writer",
  "Gallery / Museum":"Artist / Curator","Landmark / Place":"","Restaurant / Food":"",
  "Sports Event":"Teams","Festival":"",
};

export const API_TYPES = {
  "Movie":"tmdb_movie","TV Series":"tmdb_tv","Documentary":"tmdb_movie",
  "Book":"books","Comic / Graphic Novel":"books","Short Story / Essay":"books","Audiobook":"books",
  "Album":"lastfm",
};

// Derived lookup: subtype -> category name
export const SUBTYPE_TO_CAT = {};
Object.entries(CATEGORIES).forEach(([cat, def]) =>
  def.subtypes.forEach(s => { SUBTYPE_TO_CAT[s] = cat; })
);

// ─── COLLECTIONS ──────────────────────────────────────────────────────────────
export const COLL_EMOJIS = ["🗂","✈️","🎬","📚","🎵","🏖","🎭","🏔","🍷","🎮","⚽","🎪","🌍","🏛","🎸","📺","🍜","🎯","🌟","🔖"];
export const COLL_COLORS = ["#3498db","#9b59b6","#e67e22","#1abc9c","#e74c3c","#f39c12","#2ecc71","#e91e63","#00bcd4","#8bc34a"];
