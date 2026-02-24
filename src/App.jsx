import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { supabase } from "./utils/supabase.js";
import { CATEGORIES, COLL_EMOJIS, API_TYPES, CREATOR_LABELS, PROGRESS_CONFIG } from "./utils/constants.js";
import { buildTheme, getVerdictStyle } from "./utils/theme.js";
import { getCat, getSubtypeStyle, collAccent, compressImage, geocodeVenue, filterLogs, exportCSV, getGreeting, getInsight } from "./utils/helpers.js";
import { useLogs } from "./hooks/useLogs.js";
import { useApiSearch } from "./hooks/useApiSearch.js";
import { EditorialFeed } from "./components/EditorialCard.jsx";
import { GridFeed, ViewToggle } from "./components/GridFeed.jsx";
import { TasteGenome, TasteRadar, TasteOracle } from "./components/TasteIntelligence.jsx";
import { BedsideQueue } from "./components/BedsideQueue.jsx";
import { QueueCard } from "./components/QueueCard.jsx";
import { ActivityCalendar } from "./components/ActivityCalendar.jsx";
import { GenreDNA } from "./components/GenreDNA.jsx";
import { MapTab } from "./components/MapTab.jsx";
import { QuickLog } from "./components/QuickLog.jsx";
import { ThreadsTab } from "./components/ThreadsTab.jsx";
import { JournalTab } from "./components/JournalTab.jsx";

export default function App() {
  // ── Auth ──
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [authMsg, setAuthMsg] = useState("");

  // ── Data ──
  const { logs, fetchLogs, mergeGuestLogs, saveLog, deleteLog, updateNotes, links, addLink, removeLink } = useLogs();
  const [showQuickLog, setShowQuickLog] = useState(false);
  const [lastQuickLogEntry, setLastQuickLogEntry] = useState(null);
  const [collections, setCollections] = useState(() => {
    try { return JSON.parse(localStorage.getItem("dili_collections") || "[]"); } catch { return []; }
  });

  // ── UI State ──
  const [activeTab, setActiveTab] = useState("home");
  const [darkMode, setDarkMode] = useState(() => {
    const s = localStorage.getItem("dark_mode");
    return s !== null ? s === "true" : true;
  });
  const [historyView, setHistoryView] = useState("grid");
  const [historyDisplay, setHistoryDisplay] = useState("compact"); // "editorial" | "compact"
  const [queueDisplay, setQueueDisplay] = useState("compact");     // "editorial" | "compact"
  const [mapHighlightId, setMapHighlightId] = useState(null);

  // ── Global search ──
  const [globalSearch, setGlobalSearch] = useState("");
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const globalSearchRef = useRef(null);

  // ── Form state ──
  const [title, setTitle] = useState("");
  const [creator, setCreator] = useState("");
  const [notes, setNotes] = useState("");
  const [mediaType, setMediaType] = useState("Movie");
  const [activeCat, setActiveCat] = useState("Watched");
  const [verdict, setVerdict] = useState("");
  const [year, setYear] = useState("");
  const [manualDate, setManualDate] = useState("");
  const [currentPage, setCurrentPage] = useState("");
  const [totalPages, setTotalPages] = useState("");
  const [currentEpisode, setCurrentEpisode] = useState("");
  const [totalEpisodes, setTotalEpisodes] = useState("");
  const [currentSeason, setCurrentSeason] = useState("");
  const [artwork, setArtwork] = useState("");
  const [genre, setGenre] = useState("");
  const [locationVenue, setLocationVenue] = useState("");
  const [locationCity, setLocationCity] = useState("");
  const [locationLat, setLocationLat] = useState(null);
  const [locationLng, setLocationLng] = useState(null);
  const [collectionId, setCollectionId] = useState("");
  const [inspiredBy, setInspiredBy] = useState(""); // id of the entry that led to this one
  const [editingId, setEditingId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const textareaRef = useRef(null);

  // ── Geocoding ──
  const [geoResults, setGeoResults] = useState([]);
  const [geoQuery, setGeoQuery] = useState("");
  const [geoLoading, setGeoLoading] = useState(false);

  // ── API search ──
  const [searchQuery, setSearchQuery] = useState("");
  const { searchResults, setSearchResults, selectResult } = useApiSearch(searchQuery, mediaType);

  // ── History filters ──
  const [historySearch, setHistorySearch] = useState("");
  const [filterCat, setFilterCat] = useState("All");
  const [verdictFilter, setVerdictFilter] = useState("");
  const [sortBy, setSortBy] = useState("Date");
  const [filterMonth, setFilterMonth] = useState("All");
  const [showCollEntries, setShowCollEntries] = useState(false);
  const [hiddenCollIds, setHiddenCollIds] = useState(new Set()); // ids of collections to hide

  // ── Queue filter ──
  const [queueFilter, setQueueFilter] = useState("All");

  // ── Stats ──
  const [statYearFilter, setStatYearFilter] = useState(new Date().getFullYear().toString());
  const [customName, setCustomName] = useState(localStorage.getItem("user_custom_name") || "");
  const [isEditingName, setIsEditingName] = useState(false);

  // ── Undo ──
  const [undoItem, setUndoItem] = useState(null);
  const undoTimerRef = useRef(null);
  const [savedEntryId, setSavedEntryId] = useState(null);
  const savedEntryRef = useRef(null);
  const [preEditTab, setPreEditTab] = useState(null);   // tab to return to on cancel
  const [preEditLogId, setPreEditLogId] = useState(null); // entry to re-open on cancel

  // ── Collection modal ──
  const [showCollModal, setShowCollModal] = useState(false);
  const [editingColl, setEditingColl] = useState(null);
  const [collName, setCollName] = useState("");
  const [collEmoji, setCollEmoji] = useState("🗂");
  const [collDesc, setCollDesc] = useState("");
  const [openCollId, setOpenCollId] = useState(null);
  const [collDisplayMap, setCollDisplayMap] = useState({}); // collId → "editorial"|"compact"
  const getCollDisplay = id => collDisplayMap[id] || "editorial";
  const setCollDisplay = (id, v) => setCollDisplayMap(prev => ({ ...prev, [id]: v }));

  // ── Settings / About ──
  const [showAbout, setShowAbout] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // ── Theme ──
  const theme = useMemo(() => buildTheme(darkMode), [darkMode]);
  const gvs = useCallback(v => getVerdictStyle(v, darkMode), [darkMode]);

  // ── Pull to Refresh ──
  const scrollRef = useRef(null);
  const [pulling, setPulling]     = useState(false);
  const [pullDist, setPullDist]   = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const touchStartY = useRef(0);
  const PULL_THRESHOLD = 72;

  const handleTouchStart = e => {
    if (scrollRef.current?.scrollTop === 0) touchStartY.current = e.touches[0].clientY;
    else touchStartY.current = 0;
  };
  const handleTouchMove = e => {
    if (!touchStartY.current || refreshing) return;
    const dy = e.touches[0].clientY - touchStartY.current;
    if (dy > 0 && scrollRef.current?.scrollTop === 0) {
      setPulling(true);
      setPullDist(Math.min(dy * 0.45, PULL_THRESHOLD + 20));
    }
  };
  const handleTouchEnd = async () => {
    if (pulling && pullDist >= PULL_THRESHOLD) {
      setRefreshing(true);
      setPullDist(PULL_THRESHOLD);
      try {
        await fetchLogs(user);
        // Reset all filters and searches back to defaults
        setHistorySearch("");
        setFilterCat("All");
        setVerdictFilter("");
        setSortBy("Date");
        setFilterMonth("All");
        setShowCollEntries(false);
        setHiddenCollIds(new Set());
        setQueueFilter("All");
        setGlobalSearch("");
        setGlobalSearchOpen(false);
        setHistoryView("grid");
        setHistoryDisplay("compact");
        setQueueDisplay("compact");
      } finally {
        setTimeout(() => { setRefreshing(false); setPulling(false); setPullDist(0); }, 400);
      }
    } else {
      setPulling(false); setPullDist(0);
    }
    touchStartY.current = 0;
  };

  // Persist settings
  useEffect(() => { document.body.style.backgroundColor = theme.bg; }, [theme.bg]);
  useEffect(() => { localStorage.setItem("dark_mode", darkMode); }, [darkMode]);
  useEffect(() => { localStorage.setItem("dili_collections", JSON.stringify(collections)); }, [collections]);

  // Auto-grow textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (ta) { ta.style.height = "60px"; ta.style.height = ta.scrollHeight + "px"; }
  }, [notes]);

  // Scroll to saved entry
  useEffect(() => {
    if (savedEntryId) {
      const t = setTimeout(() => {
        savedEntryRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        setSavedEntryId(null);
      }, 150);
      return () => clearTimeout(t);
    }
  }, [savedEntryId, logs]);

  // Geocoding debounce
  useEffect(() => {
    if (!geoQuery || geoQuery.length < 3) { setGeoResults([]); return; }
    const t = setTimeout(async () => {
      setGeoLoading(true);
      const r = await geocodeVenue(geoQuery);
      setGeoResults(r);
      setGeoLoading(false);
    }, 600);
    return () => clearTimeout(t);
  }, [geoQuery]);

  // Close global search on outside click
  useEffect(() => {
    const handler = e => { if (globalSearchRef.current && !globalSearchRef.current.contains(e.target)) setGlobalSearchOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Auth init ──
  useEffect(() => {
    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const u = session?.user ?? null;
        setUser(u);
        await fetchLogs(u);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    init();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (event === "PASSWORD_RECOVERY") {
        const pw = prompt("Enter your new password:");
        if (pw) {
          const { error } = await supabase.auth.updateUser({ password: pw });
          if (error) alert(error.message); else alert("Password updated!");
        }
      }
      if (u) { setShowAuthModal(false); setAuthMsg(""); await mergeGuestLogs(u.id); }
      else fetchLogs(null);
    });
    return () => subscription.unsubscribe();
  }, [fetchLogs, mergeGuestLogs]);

  // ── Derived data ──
  const globalResults = useMemo(() => {
    const q = globalSearch.trim().toLowerCase();
    if (!q || q.length < 2) return [];

    const getNotesSnippet = (notes, term) => {
      if (!notes) return null;
      const nl = notes.toLowerCase();
      const idx = nl.indexOf(term);
      if (idx === -1) return null;
      const words = notes.split(/\s+/);
      const upToIdx = notes.slice(0, idx).trim();
      const wb = upToIdx === "" ? 0 : upToIdx.split(/\s+/).length;
      const s = Math.max(0, wb - 5);
      const e = Math.min(words.length, wb + 12);
      return (s > 0 ? "…" : "") + words.slice(s, e).join(" ") + (e < words.length ? "…" : "");
    };

    return logs.filter(log => {
      const coll = collections.find(c => c.id === log.collection_id);
      const src = [log.title, log.creator, log.notes, log.verdict, log.genre, log.media_type, log.location_venue, log.location_city, coll?.name, coll?.desc].filter(Boolean).join(" ").toLowerCase();
      return src.includes(q);
    }).map(log => {
      const notesSnippet = getNotesSnippet(log.notes, q);
      const matchesNotes = !!notesSnippet;
      const matchesMeta = [log.title, log.creator, log.verdict, log.genre, log.media_type, log.location_venue, log.location_city].filter(Boolean).join(" ").toLowerCase().includes(q);
      return { ...log, _notesSnippet: notesSnippet, _matchesNotes: matchesNotes, _matchesMeta: matchesMeta };
    }).slice(0, 12);
  }, [logs, globalSearch, collections]);

  const availableYears = useMemo(() => {
    const years = logs.map(l => l.logged_at ? new Date(l.logged_at).getFullYear().toString() : null).filter(y => y && y !== "NaN");
    return ["All", ...new Set(years)].sort((a, b) => b - a);
  }, [logs]);

  const stats = useMemo(() => {
    const cats = {};
    Object.keys(CATEGORIES).forEach(c => { cats[c] = { total: 0, loved: 0, liked: 0, meh: 0, no: 0 }; });
    cats.active = 0; cats.queue = 0;
    logs.forEach(log => {
      if (statYearFilter !== "All" && new Date(log.logged_at).getFullYear().toString() !== statYearFilter) return;
      const v = log.verdict, cat = getCat(log.media_type);
      if (v?.startsWith("Currently")) cats.active++;
      else if (v?.startsWith("Want to") || v === "Want to go") cats.queue++;
      else if (cats[cat]) {
        cats[cat].total++;
        if (v === "I loved it") cats[cat].loved++;
        else if (v === "I liked it") cats[cat].liked++;
        else if (v === "Meh") cats[cat].meh++;
        else if (v === "I didn't like it") cats[cat].no++;
      }
    });
    return cats;
  }, [logs, statYearFilter]);

  const dateOptions = useMemo(() =>
    ["All", ...new Set(logs.map(l => new Date(l.logged_at).toLocaleString("default", { month: "long", year: "numeric" })))],
    [logs]
  );

  const filteredHistory = useMemo(() => {
    const base = filterLogs(logs, historySearch, filterCat, verdictFilter, filterMonth, sortBy, "history");
    return base.filter(l => {
      if (!showCollEntries && l.collection_id) return false;
      if (l.collection_id && hiddenCollIds.has(l.collection_id)) return false;
      return true;
    });
  }, [logs, historySearch, filterCat, verdictFilter, filterMonth, sortBy, showCollEntries, hiddenCollIds]);

  const filteredQueue = useMemo(() =>
    filterLogs(logs, "", queueFilter, "", "All", "Date", "queue"),
    [logs, queueFilter]
  );

  const collEntriesCount = useMemo(() => logs.filter(l => l.collection_id).length, [logs]);

  // ── Actions ──
  const [deepLinkNotes, setDeepLinkNotes] = useState(null); // id of entry to open notes for
  const [deepLinkOpenId, setDeepLinkOpenId] = useState(null); // id of entry to pop the card open

  const handleGlobalResultClick = log => {
    setGlobalSearch(""); setGlobalSearchOpen(false);
    const isQ = log.verdict?.startsWith("Want to") || log.verdict === "Want to go" || log.verdict?.startsWith("Currently");
    setActiveTab(isQ ? "queue" : "history");
    setSavedEntryId(log.id);
    // If match was in notes, signal that the notes should open
    if (log._matchesNotes && !log._matchesMeta) {
      setDeepLinkNotes(log.id);
    } else {
      setDeepLinkNotes(null);
    }
  };

  const handleAuth = async e => {
    e.preventDefault(); setAuthMsg("");
    const email = e.target.email.value, password = e.target.password.value;
    if (isSignUp) {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) alert(error.message);
      else if (data?.user && !data?.session) setAuthMsg("Check your email to verify!");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) alert(error.message);
    }
  };

  const handleForgotPassword = async () => {
    const email = prompt("Enter your email:");
    if (!email) return;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
    if (error) alert(error.message); else alert("Reset email sent!");
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm("WARNING: This permanently deletes your account and ALL logs. Proceed?")) return;
    if (user) {
      const { error } = await supabase.rpc("delete_user_account");
      if (error) alert("Error: " + error.message);
      else { await supabase.auth.signOut(); alert("Account deleted."); window.location.reload(); }
    } else {
      localStorage.removeItem("guest_logs");
      fetchLogs(null);
      alert("Guest data cleared.");
    }
  };

  const handleSave = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle || !verdict) return alert("Title and Verdict are required.");
    const yearStr = year ? year.toString() : "";
    if (yearStr && (yearStr.length !== 4 || isNaN(yearStr))) return alert("Please enter a valid 4-digit year.");
    setIsSaving(true);
    const logData = {
      title: trimmedTitle, creator: creator.trim(), notes: notes.trim(),
      media_type: mediaType, verdict,
      year_released: year || null, artwork: artwork || null,
      current_page: currentPage || null, total_pages: totalPages || null,
      current_episode: currentEpisode || null, total_episodes: totalEpisodes || null,
      current_season: currentSeason || null,
      genre: genre || null,
      location_venue: locationVenue.trim() || null, location_city: locationCity.trim() || null,
      lat: locationLat || null, lng: locationLng || null,
      collection_id: collectionId || null,
      manualDate: manualDate || null,
    };
    try {
      await saveLog({ logData, editingId, user, verdict });
      const sid = editingId;
      // Handle inspired-by link
      if (!editingId) {
        // New entry: create link if inspired by something
        if (inspiredBy) {
          const sourceId = inspiredBy;
          setTimeout(() => {
            const newEntry = logs[0];
            if (newEntry && sourceId) addLink(sourceId, newEntry.id);
          }, 300);
        }
      } else {
        // Editing: remove old incoming link and add new one if changed
        const oldLink = links.find(lk => lk.b === editingId);
        if (oldLink) removeLink(oldLink.a, editingId);
        if (inspiredBy) addLink(inspiredBy, editingId);
      }
      resetForm();
      const isQ = verdict === "Want to go" || verdict?.startsWith("Want to") || verdict?.startsWith("Currently");
      setActiveTab(isQ ? "queue" : "history");
      setSavedEntryId(sid || "latest");
    } catch (err) { alert(err.message); }
    finally { setIsSaving(false); }
  };

  const resetForm = () => {
    setTitle(""); setCreator(""); setNotes(""); setYear(""); setVerdict("");
    setManualDate(""); setCurrentPage(""); setTotalPages(""); setCurrentEpisode(""); setTotalEpisodes(""); setCurrentSeason(""); setArtwork(""); setGenre("");
    setLocationVenue(""); setLocationCity(""); setLocationLat(null); setLocationLng(null);
    setCollectionId(""); setInspiredBy(""); setEditingId(null);
    setSearchResults([]); setSearchQuery(""); setGeoResults([]); setGeoQuery("");
  };

  const handleCancelEdit = () => {
    const returnTab = preEditTab || "history";
    const returnId  = preEditLogId;
    resetForm();
    setActiveTab(returnTab);
    // Re-open the card by treating it like a deep-link (reuse savedEntryId mechanism)
    if (returnId) setSavedEntryId(returnId);
    setPreEditTab(null);
    setPreEditLogId(null);
  };

  const handleDelete = id => {
    const item = logs.find(l => l.id === id);
    if (!item) return;
    // Optimistic UI — remove immediately, allow undo
    deleteLog(id, user);
    setUndoItem(item);
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    undoTimerRef.current = setTimeout(() => setUndoItem(null), 5000);
  };

  const undoDelete = () => {
    if (!undoItem) return;
    clearTimeout(undoTimerRef.current);
    // Re-insert locally — next fetch will sync properly
    fetchLogs(user);
    setUndoItem(null);
  };

  const startEdit = log => {
    setPreEditTab(activeTab);
    setPreEditLogId(log.id);
    setEditingId(log.id); setTitle(log.title); setCreator(log.creator || "");
    setNotes(log.notes || ""); setYear(log.year_released || "");
    setMediaType(log.media_type); setActiveCat(getCat(log.media_type));
    setVerdict(log.verdict); setArtwork(log.artwork || ""); setGenre(log.genre || "");
    setCurrentPage(log.current_page || ""); setTotalPages(log.total_pages || "");
    setCurrentEpisode(log.current_episode || ""); setTotalEpisodes(log.total_episodes || "");
    setCurrentSeason(log.current_season || "");
    setLocationVenue(log.location_venue || "");
    setLocationCity(log.location_city || ""); setLocationLat(log.lat || null);
    setLocationLng(log.lng || null); setCollectionId(log.collection_id || "");
    // Pre-fill inspired-by from existing links (find what this entry was inspired by)
    const existingLink = links.find(lk => lk.b === log.id);
    setInspiredBy(existingLink ? existingLink.a : "");
    setActiveTab("log");
  };

  const handleUpdateNotes = useCallback((id, text) => updateNotes(id, text, user), [updateNotes, user]);
  const handleMapClick = log => { setMapHighlightId(log.id); setActiveTab("threads"); };

  const handleQuickSave = async (logData) => {
    const entry = {
      ...logData,
      logged_at: new Date().toISOString(),
      notes: null, genre: logData.genre || null,
      current_page: null, total_pages: null,
      current_episode: null, total_episodes: null, current_season: null,
      location_venue: null, location_city: null, lat: null, lng: null,
      collection_id: null,
      year_released: logData.year_released || null,
    };
    await saveLog({ logData: entry, editingId: null, user, verdict: logData.verdict });
    // Find the newly created entry so "Add more detail" can jump to it
    setLastQuickLogEntry({ ...entry, id: "latest" });
  };

  // Collection actions
  const saveCollection = () => {
    if (!collName.trim()) return;
    if (editingColl) setCollections(prev => prev.map(c => c.id === editingColl ? { ...c, name: collName.trim(), emoji: collEmoji, desc: collDesc.trim() } : c));
    else setCollections(prev => [...prev, { id: Date.now().toString(), name: collName.trim(), emoji: collEmoji, desc: collDesc.trim(), createdAt: new Date().toISOString() }]);
    setShowCollModal(false); setCollName(""); setCollEmoji("🗂"); setCollDesc(""); setEditingColl(null);
  };
  const deleteCollection = id => {
    if (!window.confirm("Delete this collection? Entries stay but lose their collection tag.")) return;
    setCollections(prev => prev.filter(c => c.id !== id));
    const cur = JSON.parse(localStorage.getItem("guest_logs") || "[]");
    localStorage.setItem("guest_logs", JSON.stringify(cur.map(l => l.collection_id === id ? { ...l, collection_id: null } : l)));
    fetchLogs(user);
  };
  const openEditColl = c => { setEditingColl(c.id); setCollName(c.name); setCollEmoji(c.emoji || "🗂"); setCollDesc(c.desc || ""); setShowCollModal(true); };
  const saveName = () => { localStorage.setItem("user_custom_name", customName.trim()); setIsEditingName(false); };

  // ── Styles ──
  const inputStyle = {
    width: "100%", padding: "12px", borderRadius: "10px",
    border: `1px solid ${theme.border2}`, boxSizing: "border-box",
    fontSize: "14px", outline: "none", background: theme.input,
    color: theme.text, marginBottom: "12px", transition: "border-color 0.2s",
  };
  const vBtn = (active, color) => ({
    padding: "11px 10px", borderRadius: "10px",
    border: `1px solid ${active ? color : theme.border2}`,
    background: active ? color : "none",
    color: active ? (color === "#f1c40f" ? "#000" : "#fff") : theme.text,
    fontWeight: "600", fontSize: "12px", cursor: "pointer", transition: "all 0.15s",
  });

  // ── API search dropdown ──
  const renderApiDropdown = () => searchResults.length > 0 && (
    <div style={{ position:"absolute", top:"100%", left:0, right:0, zIndex:50, background:theme.card, borderRadius:"12px", boxShadow:"0 8px 30px rgba(0,0,0,0.4)", border:`1px solid ${theme.border2}`, maxHeight:"280px", overflowY:"auto", marginTop:"4px" }}>
      {searchResults.map((item, i) => {
        let t="", sub="", thumb=null;
        const at = API_TYPES[mediaType];
        const ss = getSubtypeStyle(mediaType);
        if (at === "tmdb_movie")  { t = item.title; sub = item.release_date?.split("-")[0]||""; thumb = item.poster_path ? `https://image.tmdb.org/t/p/w92${item.poster_path}` : null; }
        else if (at === "tmdb_tv") { t = item.name;  sub = item.first_air_date?.split("-")[0]||""; thumb = item.poster_path ? `https://image.tmdb.org/t/p/w92${item.poster_path}` : null; }
        else if (at === "books")   { t = item.volumeInfo?.title||""; sub = `${item.volumeInfo?.authors?.join(", ")||""} (${item.volumeInfo?.publishedDate?.split("-")[0]||""})`; const il = item.volumeInfo?.imageLinks; thumb = (il?.thumbnail||il?.smallThumbnail||"").replace("http://","https://")||null; }
        else                       { t = item.name; sub = item.artist; thumb = item.image ? (item.image[4]?.["#text"]||item.image[3]?.["#text"]||null) : null; }
        return (
          <div key={item.id||i} onClick={() => selectResult(item, mediaType, { setTitle, setCreator, setYear, setGenre, setArtwork })}
            style={{ display:"flex", alignItems:"center", padding:"10px 12px", cursor:"pointer", borderBottom:`1px solid ${theme.border}`, gap:"10px" }}>
            <div style={{ width:"36px", height:"50px", backgroundColor:darkMode?"#1a1a1a":"#eee", borderRadius:"6px", overflow:"hidden", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
              {thumb ? <img src={thumb} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/> : <span style={{ fontSize:"16px" }}>{ss.icon}</span>}
            </div>
            <div style={{ flex:1, overflow:"hidden" }}>
              <div style={{ fontWeight:"600", color:theme.text, fontSize:"13px", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{t}</div>
              <div style={{ fontSize:"11px", color:theme.subtext, marginTop:"2px" }}>{sub}</div>
            </div>
          </div>
        );
      })}
      <div onClick={() => setSearchResults([])} style={{ padding:"12px", textAlign:"center", color:"#3498db", fontWeight:"600", cursor:"pointer", fontSize:"12px" }}>✕ Close</div>
    </div>
  );

  // ────────────────────────────────────────────
  // TAB: HOME + STATS
  // ────────────────────────────────────────────
  const renderHome = () => {
    const finishedLogs = logs.filter(l => {
      if (statYearFilter !== "All" && new Date(l.logged_at).getFullYear().toString() !== statYearFilter) return false;
      return ["I loved it","I liked it","Meh","I didn't like it"].includes(l.verdict);
    });
    const total = finishedLogs.length || 1;
    const hitCount = finishedLogs.filter(l => l.verdict === "I loved it" || l.verdict === "I liked it").length;
    const hitRate = Math.round((hitCount / total) * 100);
    const creatorCount = {};
    finishedLogs.forEach(l => { if (!l.creator) return; const k = `${l.creator}|||${l.media_type}`; creatorCount[k] = (creatorCount[k] || 0) + 1; });
    const topCreatorEntry = Object.entries(creatorCount).sort((a,b)=>b[1]-a[1])[0];
    const topCreator = topCreatorEntry ? { name: topCreatorEntry[0].split("|||")[0], count: topCreatorEntry[1] } : null;
    const monthCount = {};
    logs.forEach(l => {
      if (!l.logged_at) return;
      if (statYearFilter !== "All" && new Date(l.logged_at).getFullYear().toString() !== statYearFilter) return;
      const k = new Date(l.logged_at).toLocaleString("default", { month:"long", year:"numeric" });
      monthCount[k] = (monthCount[k] || 0) + 1;
    });
    const topMonth = Object.entries(monthCount).sort((a,b)=>b[1]-a[1])[0];
    const maxMonth = topMonth?.[1] || 1;
    const last12 = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(); d.setMonth(d.getMonth() - (11 - i));
      const k = d.toLocaleString("default", { month:"long", year:"numeric" });
      return { key: k, label: d.toLocaleString("default", { month:"short" })[0], count: monthCount[k] || 0 };
    });
    const card = { background:theme.card, border:`1px solid ${theme.border}`, borderRadius:"16px", padding:"16px" };
    const greeting = getGreeting();
    const firstName = customName ? customName.split(" ")[0] : null;
    const insight = getInsight(logs, customName);
    const recentLogs = logs.filter(l => ["I loved it","I liked it","Meh","I didn't like it"].includes(l.verdict)).slice(0, 3);

    return (
      <div style={{ padding:"0 0 100px" }}>
        {/* ── HERO ── */}
        <div style={{ padding:"20px 16px 0", marginBottom:"16px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"16px" }}>
            <div style={{ flex:1 }}>
              {isEditingName ? (
                <form onSubmit={e => { e.preventDefault(); saveName(); }} style={{ display:"flex", gap:"6px", alignItems:"center" }}>
                  <input value={customName} onChange={e => setCustomName(e.target.value)} placeholder="Your name…" autoFocus style={{ ...inputStyle, width:"140px", padding:"7px 10px", fontSize:"14px", marginBottom:0 }}/>
                  <button type="submit" style={{ background:"none", border:"none", color:"#27ae60", fontSize:"18px", cursor:"pointer" }}>✅</button>
                </form>
              ) : (
                <div>
                  <div style={{ fontSize:"13px", color:theme.subtext, marginBottom:"2px" }}>{greeting}{firstName ? `, ${firstName}` : ""}</div>
                  <div style={{ fontSize:"22px", fontWeight:"800", letterSpacing:"-0.5px", color:theme.text, lineHeight:"1.2" }}>
                    Did I Like It<span style={{ color:"#3498db" }}>?</span>
                    <button onClick={() => setIsEditingName(true)} style={{ background:"none", border:"none", cursor:"pointer", marginLeft:"6px", fontSize:"12px", opacity:0.4 }}>✏️</button>
                  </div>
                </div>
              )}
            </div>
            <div style={{ display:"flex", gap:"5px", flexShrink:0 }}>
              <button onClick={() => setActiveTab("queue")} style={{ display:"flex", alignItems:"center", gap:"4px", fontSize:"10px", fontWeight:"600", padding:"5px 9px", borderRadius:"20px", border:`1px solid ${theme.border2}`, background:"none", color:theme.subtext2, cursor:"pointer" }}>
                <span style={{ width:"5px", height:"5px", borderRadius:"50%", background:"#4fc3f7", flexShrink:0 }}/>{stats.active}
              </button>
              <button onClick={() => setActiveTab("queue")} style={{ display:"flex", alignItems:"center", gap:"4px", fontSize:"10px", fontWeight:"600", padding:"5px 9px", borderRadius:"20px", border:`1px solid ${theme.border2}`, background:"none", color:theme.subtext2, cursor:"pointer" }}>
                <span style={{ width:"5px", height:"5px", borderRadius:"50%", background:"#ce93d8", flexShrink:0 }}/>{stats.queue}
              </button>
            </div>
          </div>

          <div style={{ background:theme.card, border:`1px solid ${theme.border}`, borderRadius:"12px", padding:"12px 14px", marginBottom:"14px", display:"flex", alignItems:"flex-start", gap:"10px" }}>
            <span style={{ fontSize:"18px", flexShrink:0, marginTop:"1px" }}>💡</span>
            <div style={{ fontSize:"13px", color:theme.subtext2, lineHeight:"1.5", flex:1 }}>{insight}</div>
          </div>

          <div style={{ display:"flex", gap:"8px" }}>
            <button onClick={() => setShowQuickLog(true)} style={{ flex:1, padding:"15px 10px", borderRadius:"14px", border:"none", background:"linear-gradient(135deg,#f1c40f,#e67e22)", color:"#000", fontWeight:"700", fontSize:"14px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:"6px", letterSpacing:"-0.2px", boxShadow:"0 4px 20px rgba(241,196,15,0.25)" }}>
              <span style={{ fontSize:"18px" }}>⚡</span> Quick log
            </button>
            <button onClick={() => setActiveTab("log")} style={{ flex:1, padding:"15px 10px", borderRadius:"14px", border:"none", background:"linear-gradient(135deg,#3498db,#9b59b6)", color:"#fff", fontWeight:"700", fontSize:"14px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:"6px", letterSpacing:"-0.2px", boxShadow:"0 4px 20px rgba(52,152,219,0.3)" }}>
              <span style={{ fontSize:"18px" }}>＋</span> Full log
            </button>
          </div>
        </div>

        {/* ── RECENTLY LOGGED ── */}
        {recentLogs.length > 0 && (
          <div style={{ padding:"0 16px", marginBottom:"16px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"10px" }}>
              <div style={{ fontSize:"11px", fontWeight:"700", color:theme.subtext, letterSpacing:"0.1em", textTransform:"uppercase" }}>Recently logged</div>
              <button onClick={() => setActiveTab("history")} style={{ background:"none", border:"none", color:"#3498db", fontSize:"11px", fontWeight:"600", cursor:"pointer" }}>See all →</button>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
              {recentLogs.map(log => {
                const vs2 = gvs(log.verdict);
                const ss2 = getSubtypeStyle(log.media_type);
                return (
                  <div key={log.id} onClick={() => { setHistoryDisplay("compact"); setActiveTab("history"); setDeepLinkOpenId(log.id); }}
                    style={{ background:theme.card, border:`1px solid ${theme.border}`, borderRadius:"12px", padding:"10px 12px", display:"flex", alignItems:"center", gap:"10px", cursor:"pointer" }}>
                    <div style={{ width:"36px", height:"50px", borderRadius:"7px", overflow:"hidden", flexShrink:0, background:darkMode?"#1a1a1a":"#eee", display:"flex", alignItems:"center", justifyContent:"center" }}>
                      {log.artwork ? <img src={log.artwork} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} onError={e => e.target.style.display="none"}/> : <span style={{ fontSize:"18px" }}>{ss2.icon}</span>}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:"700", fontSize:"13px", color:theme.text, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{log.title}</div>
                      <div style={{ fontSize:"10px", color:theme.subtext, marginTop:"2px" }}>{ss2.icon} {log.media_type}{log.creator ? ` · ${log.creator}` : ""}</div>
                    </div>
                    <span style={{ fontSize:"9px", fontWeight:"700", padding:"2px 7px", borderRadius:"20px", border:`1px solid ${vs2.border}`, background:vs2.bg, color:vs2.color, flexShrink:0, whiteSpace:"nowrap" }}>{vs2.emoji} {log.verdict}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── STATS DIVIDER ── */}
        <div style={{ padding:"0 16px", marginBottom:"14px", display:"flex", alignItems:"center", gap:"10px" }}>
          <div style={{ height:"1px", flex:1, background:theme.border }}/>
          <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
            <span style={{ fontSize:"10px", fontWeight:"700", color:theme.subtext, letterSpacing:"0.12em", textTransform:"uppercase" }}>Stats</span>
            <select value={statYearFilter} onChange={e => setStatYearFilter(e.target.value)}
              style={{ background:"none", border:`1px solid ${theme.border}`, borderRadius:"20px", color:"#3498db", fontWeight:"600", fontSize:"10px", cursor:"pointer", outline:"none", padding:"3px 8px" }}>
              {availableYears.map(y => <option key={y} value={y}>{y === "All" ? "All time" : y}</option>)}
            </select>
          </div>
          <div style={{ height:"1px", flex:1, background:theme.border }}/>
        </div>

        <div style={{ padding:"0 16px" }}>
          {/* TOTAL COUNT */}
          <div style={{ ...card, marginBottom:"10px", position:"relative", overflow:"hidden" }}>
            <div style={{ position:"absolute", top:0, left:0, right:0, height:"1px", background:`linear-gradient(90deg,${CATEGORIES.Watched.color},${CATEGORIES.Read.color},${CATEGORIES.Listened.color},${CATEGORIES.Experienced.color})` }}/>
            <div style={{ display:"flex", alignItems:"flex-end", gap:"10px", marginBottom:"6px" }}>
              <div style={{ fontSize:"56px", fontWeight:"800", lineHeight:1, letterSpacing:"-3px", color:theme.text }}>{Object.keys(CATEGORIES).reduce((s,k) => s+(stats[k]?.total||0), 0)}</div>
              <div style={{ paddingBottom:"8px", color:theme.subtext, fontSize:"14px", lineHeight:"1.3" }}>things<br/>logged</div>
            </div>
            <div style={{ display:"flex", height:"3px", borderRadius:"3px", overflow:"hidden", gap:"2px", marginBottom:"10px" }}>
              {Object.entries(CATEGORIES).map(([cat,def]) => { const t = stats[cat]?.total||0; return t > 0 ? <div key={cat} style={{ flex:t, background:def.color, borderRadius:"3px" }}/> : null; })}
            </div>
            <div style={{ display:"flex", gap:"10px", flexWrap:"wrap" }}>
              {Object.entries(CATEGORIES).map(([cat,def]) => (
                <div key={cat} onClick={() => { setFilterCat(cat); setVerdictFilter(""); setActiveTab("history"); }} style={{ display:"flex", alignItems:"center", gap:"4px", cursor:"pointer" }}>
                  <div style={{ width:"6px", height:"6px", borderRadius:"50%", background:def.color }}/>
                  <span style={{ fontSize:"10px", color:theme.subtext2 }}>{def.icon} {stats[cat]?.total||0}</span>
                </div>
              ))}
            </div>
          </div>

          {/* HIT RATE + TOP CREATOR */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px", marginBottom:"10px" }}>
            <div style={{ ...card, position:"relative", overflow:"hidden" }}>
              <div style={{ position:"absolute", bottom:0, left:0, right:0, height:`${hitRate}%`, background:`linear-gradient(to top,rgba(241,196,15,0.06),transparent)`, borderRadius:"0 0 16px 16px" }}/>
              <div style={{ fontSize:"9px", letterSpacing:"0.15em", textTransform:"uppercase", color:theme.subtext, fontWeight:"700", marginBottom:"6px" }}>Hit rate</div>
              <div style={{ fontSize:"40px", fontWeight:"800", lineHeight:1, letterSpacing:"-2px", color:"#f1c40f" }}>{hitRate}%</div>
              <div style={{ height:"2px", background:theme.border, borderRadius:"2px", overflow:"hidden", margin:"10px 0 6px" }}>
                <div style={{ height:"100%", width:`${hitRate}%`, background:"linear-gradient(90deg,#4caf50,#f1c40f)", borderRadius:"2px" }}/>
              </div>
              <div style={{ fontSize:"10px", color:theme.subtext }}>loved or liked</div>
            </div>
            <div style={{ ...card }}>
              <div style={{ fontSize:"9px", letterSpacing:"0.15em", textTransform:"uppercase", color:theme.subtext, fontWeight:"700", marginBottom:"6px" }}>Top creator</div>
              {topCreator ? (
                <><div style={{ fontSize:"14px", fontWeight:"700", color:theme.text, lineHeight:"1.4", marginBottom:"4px" }}>{topCreator.name}</div><div style={{ fontSize:"10px", color:theme.subtext }}>{topCreator.count} logged</div></>
              ) : <div style={{ fontSize:"11px", color:theme.subtext, marginTop:"8px" }}>Log more to see</div>}
            </div>
          </div>

          {/* GENOME */}
          <TasteGenome logs={logs} theme={theme} darkMode={darkMode} statYearFilter={statYearFilter}/>

          {/* CATEGORY BREAKDOWN */}
          <div style={{ marginBottom:"10px" }}>
            <div style={{ fontSize:"9px", letterSpacing:"0.15em", textTransform:"uppercase", color:theme.subtext, fontWeight:"700", marginBottom:"8px", paddingLeft:"2px" }}>By category</div>
            <div style={{ display:"flex", flexDirection:"column", gap:"6px" }}>
              {Object.entries(CATEGORIES).map(([cat, def]) => {
                const s = stats[cat] || { total:0, loved:0, liked:0, meh:0, no:0 };
                return (
                  <div key={cat} onClick={() => { setFilterCat(cat); setVerdictFilter(""); setActiveTab("history"); }} style={{ ...card, cursor:"pointer", padding:"12px 14px" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"8px" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:"7px" }}><span style={{ fontSize:"15px" }}>{def.icon}</span><span style={{ fontSize:"13px", fontWeight:"600", color:theme.text }}>{cat}</span></div>
                      <span style={{ fontSize:"22px", fontWeight:"800", color:def.color, letterSpacing:"-1px" }}>{s.total}</span>
                    </div>
                    <div style={{ display:"flex", height:"3px", borderRadius:"3px", overflow:"hidden", gap:"1px", marginBottom:"8px" }}>
                      {s.loved>0&&<div style={{ flex:s.loved, background:"#f1c40f" }}/>}
                      {s.liked>0&&<div style={{ flex:s.liked, background:"#4caf50" }}/>}
                      {s.meh>0&&<div style={{ flex:s.meh, background:"#ff9800" }}/>}
                      {s.no>0&&<div style={{ flex:s.no, background:"#e74c3c" }}/>}
                    </div>
                    <div style={{ display:"flex", gap:"10px" }}>
                      {[{val:s.loved,c:"#f1c40f",l:"I loved it"},{val:s.liked,c:"#4caf50",l:"I liked it"},{val:s.meh,c:"#ff9800",l:"Meh"},{val:s.no,c:"#e74c3c",l:"I didn't like it"}].map((item,idx) => (
                        <div key={idx} onClick={e => { e.stopPropagation(); setFilterCat(cat); setVerdictFilter(item.l); setActiveTab("history"); }} style={{ display:"flex", alignItems:"center", gap:"3px", fontSize:"10px", color:theme.subtext2, cursor:"pointer" }}>
                          <span style={{ width:"5px", height:"5px", borderRadius:"50%", background:item.c, flexShrink:0 }}/>{item.val}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RADAR */}
          <TasteRadar logs={logs} theme={theme} darkMode={darkMode} statYearFilter={statYearFilter}/>

          {/* ACTIVITY BAR CHART */}
          <div style={{ ...card, marginBottom:"10px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"16px" }}>
              <div>
                <div style={{ fontSize:"9px", letterSpacing:"0.15em", textTransform:"uppercase", color:theme.subtext, fontWeight:"700", marginBottom:"4px" }}>Activity</div>
                {topMonth && <div style={{ fontSize:"14px", fontWeight:"600", color:theme.text }}>{topMonth[0]} was your peak</div>}
              </div>
              {topMonth && <div style={{ fontSize:"28px", fontWeight:"800", color:darkMode?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.05)", letterSpacing:"-1px", lineHeight:1 }}>{topMonth[1]}</div>}
            </div>
            <div style={{ display:"flex", alignItems:"flex-end", gap:"3px", height:"44px" }}>
              {last12.map((m, i) => (
                <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:"3px", height:"100%" }}>
                  <div style={{ flex:1, width:"100%", display:"flex", alignItems:"flex-end" }}>
                    <div style={{ width:"100%", height:`${Math.max(4,(m.count/maxMonth)*100)}%`, minHeight:"3px", borderRadius:"3px 3px 0 0", background: topMonth && m.key === topMonth[0] ? "#fff" : (darkMode?"rgba(255,255,255,0.15)":"rgba(0,0,0,0.12)") }}/>
                  </div>
                  <div style={{ fontSize:"7px", color: topMonth && m.key === topMonth[0] ? theme.text : theme.subtext }}>{m.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginBottom:"10px" }}><ActivityCalendar logs={logs} theme={theme} darkMode={darkMode}/></div>
          <GenreDNA logs={logs} theme={theme} darkMode={darkMode} statYearFilter={statYearFilter}/>
          
          {/* ORACLE */}
          <div style={{ marginTop:"10px" }}>
            <TasteOracle logs={logs} theme={theme} darkMode={darkMode} statYearFilter={statYearFilter}/>
          </div>
        </div>
      </div>
    );
  };

  // ────────────────────────────────────────────
  // TAB: LOG
  // ────────────────────────────────────────────
  const renderLog = () => {
    const catDef = CATEGORIES[activeCat];
    const isExp = activeCat === "Experienced";
    const hasApi = !!API_TYPES[mediaType];
    const creatorLabel = CREATOR_LABELS[mediaType];
    const queueVal = activeCat==="Read" ? "Currently reading" : activeCat==="Watched" ? "Currently watching" : "Currently listening";
    const wantVal  = activeCat==="Read" ? "Want to read"      : activeCat==="Watched" ? "Want to watch"      : "Want to listen";

    return (
      <div style={{ padding:"20px 16px 100px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"20px" }}>
          <div>
            <h1 style={{ fontSize:"22px", fontWeight:"700", letterSpacing:"-0.5px", margin:0, color:theme.text }}>{editingId ? "Edit entry" : "Log something"}</h1>
            <p style={{ fontSize:"12px", color:theme.subtext, margin:"3px 0 0" }}>{editingId ? "Make your changes below" : "What did you experience?"}</p>
          </div>
          {editingId && <button onClick={handleCancelEdit} style={{ background:"none", border:`1px solid ${theme.border2}`, color:theme.subtext, fontSize:"11px", padding:"6px 12px", borderRadius:"20px", cursor:"pointer" }}>Cancel</button>}
        </div>

        {/* Category selector */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:"6px", marginBottom:"14px" }}>
          {Object.entries(CATEGORIES).map(([cat, def]) => {
            const active = activeCat === cat;
            return (
              <button key={cat} onClick={() => { setActiveCat(cat); setMediaType(def.subtypes[0]); setVerdict(""); setSearchResults([]); setSearchQuery(""); }}
                style={{ padding:"8px 4px", borderRadius:"10px", border:`1px solid ${active ? def.color : theme.border}`, background: active ? `${def.color}18` : "none", color: active ? def.color : theme.subtext2, fontWeight:"600", fontSize:"11px", cursor:"pointer", textAlign:"center", transition:"all 0.15s" }}>
                <div style={{ fontSize:"16px", marginBottom:"2px" }}>{def.icon}</div>
                <div>{cat}</div>
              </button>
            );
          })}
        </div>

        {/* Subtype pills */}
        <div style={{ display:"flex", gap:"5px", marginBottom:"16px", overflowX:"auto", paddingBottom:"4px" }}>
          {catDef.subtypes.map(sub => {
            const active = mediaType === sub;
            const ss = getSubtypeStyle(sub);
            return (
              <button key={sub} onClick={() => { setMediaType(sub); setVerdict(""); setSearchResults([]); setSearchQuery(""); }}
                style={{ flexShrink:0, padding:"5px 10px", borderRadius:"20px", border:`1px solid ${active ? ss.color : theme.border}`, background: active ? `${ss.color}18` : "none", color: active ? ss.color : theme.subtext, fontSize:"11px", fontWeight:"600", cursor:"pointer", whiteSpace:"nowrap", transition:"all 0.15s" }}>
                {ss.icon} {sub}
              </button>
            );
          })}
        </div>

        {/* Title / API search */}
        <div style={{ position:"relative" }}>
          <input type="text" placeholder={hasApi ? `Search for a ${mediaType.toLowerCase()}…` : `${mediaType} title…`}
            value={title} onChange={e => { setTitle(e.target.value); if (hasApi) setSearchQuery(e.target.value); }} style={inputStyle}/>
          {renderApiDropdown()}
        </div>

        {creatorLabel && <input placeholder={creatorLabel} value={creator} onChange={e => setCreator(e.target.value)} style={inputStyle}/>}

        <div style={{ display:"flex", gap:"10px" }}>
          {!isExp && <input placeholder="Year" value={year} type="number" onChange={e => setYear(e.target.value)} style={{ ...inputStyle, flex:1 }}/>}
          <input placeholder="Genre / Category" value={genre} onChange={e => setGenre(e.target.value)} style={{ ...inputStyle, flex:2 }}/>
        </div>

        {/* Location (Experienced only) */}
        {isExp && (
          <div style={{ marginBottom:"12px" }}>
            <label style={{ fontSize:"10px", fontWeight:"700", color:theme.subtext, letterSpacing:"0.08em", textTransform:"uppercase", display:"block", marginBottom:"6px" }}>Location</label>
            <div style={{ position:"relative" }}>
              <input placeholder="Search venue or place…" value={geoQuery}
                onChange={e => { setGeoQuery(e.target.value); if (!e.target.value) { setLocationLat(null); setLocationLng(null); setLocationVenue(""); setLocationCity(""); } }}
                style={{ ...inputStyle, marginBottom:"6px", paddingRight: geoLoading ? "40px" : "12px" }}/>
              {geoLoading && <div style={{ position:"absolute", right:"12px", top:"12px", fontSize:"12px", color:theme.subtext }}>…</div>}
              {geoResults.length > 0 && (
                <div style={{ position:"absolute", top:"100%", left:0, right:0, zIndex:50, background:theme.card, borderRadius:"12px", boxShadow:"0 8px 30px rgba(0,0,0,0.4)", border:`1px solid ${theme.border2}`, maxHeight:"200px", overflowY:"auto", marginTop:"2px" }}>
                  {geoResults.map((r, i) => (
                    <div key={i} onClick={() => { setLocationVenue(r.venue||r.short.split(",")[0]); setLocationCity(r.city); setLocationLat(r.lat); setLocationLng(r.lng); setGeoQuery(r.short); setGeoResults([]); }}
                      style={{ padding:"10px 12px", cursor:"pointer", borderBottom:`1px solid ${theme.border}`, display:"flex", flexDirection:"column", gap:"2px" }}>
                      <div style={{ fontSize:"12px", fontWeight:"600", color:theme.text }}>{r.short}</div>
                      <div style={{ fontSize:"10px", color:theme.subtext, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{r.display}</div>
                    </div>
                  ))}
                  <div onClick={() => setGeoResults([])} style={{ padding:"8px", textAlign:"center", color:"#3498db", fontWeight:"600", cursor:"pointer", fontSize:"11px" }}>✕ Close</div>
                </div>
              )}
            </div>
            {locationLat && locationLng && <div style={{ fontSize:"10px", color:"#27ae60", marginTop:"-4px", marginBottom:"6px" }}>✅ Location pinned ({locationLat.toFixed(4)}, {locationLng.toFixed(4)})</div>}
            <div style={{ display:"flex", gap:"8px" }}>
              <input placeholder="Venue name" value={locationVenue} onChange={e => setLocationVenue(e.target.value)} style={{ ...inputStyle, flex:2, marginBottom:0 }}/>
              <input placeholder="City" value={locationCity} onChange={e => setLocationCity(e.target.value)} style={{ ...inputStyle, flex:1, marginBottom:0 }}/>
            </div>
          </div>
        )}

        {/* Photo (Experienced only) */}
        {isExp && (
          <div style={{ marginBottom:"12px", marginTop:"12px" }}>
            <label style={{ fontSize:"10px", fontWeight:"700", color:theme.subtext, letterSpacing:"0.08em", textTransform:"uppercase", display:"block", marginBottom:"6px" }}>Photo (optional)</label>
            <div style={{ display:"flex", gap:"8px" }}>
              <input placeholder="Paste image URL…" value={artwork} onChange={e => setArtwork(e.target.value)} style={{ ...inputStyle, flex:1, marginBottom:0 }}/>
              <label style={{ flexShrink:0, padding:"0 14px", height:"44px", borderRadius:"10px", border:`1px solid ${theme.border2}`, background:"none", color:theme.subtext, fontSize:"18px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                📷<input type="file" accept="image/*" style={{ display:"none" }} onChange={async e => { const f = e.target.files?.[0]; if (!f) return; const c = await compressImage(f); setArtwork(c); }}/>
              </label>
            </div>
            {artwork && (
              <div style={{ marginTop:"8px", position:"relative", display:"inline-block" }}>
                <img src={artwork} alt="" style={{ height:"70px", borderRadius:"8px", objectFit:"cover" }} onError={e => e.target.style.display="none"}/>
                <button onClick={() => setArtwork("")} style={{ position:"absolute", top:"-6px", right:"-6px", background:"#e74c3c", border:"none", color:"#fff", borderRadius:"50%", width:"18px", height:"18px", fontSize:"11px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
              </div>
            )}
          </div>
        )}

        {/* ── PROGRESS TRACKING ── */}
        {verdict?.startsWith("Currently") && PROGRESS_CONFIG[mediaType] && (() => {
          const pc = PROGRESS_CONFIG[mediaType];
          const numOnly = v => v.replace(/\D/g,"");
          if (pc.type === "pages") return (
            <div style={{ marginBottom:"12px" }}>
              <label style={{ fontSize:"10px", fontWeight:"700", color:theme.subtext, letterSpacing:"0.08em", textTransform:"uppercase", display:"block", marginBottom:"6px" }}>Progress</label>
              <div style={{ display:"flex", gap:"8px" }}>
                <input placeholder="Current page" type="text" inputMode="numeric" value={currentPage} onChange={e => setCurrentPage(numOnly(e.target.value))} style={{ ...inputStyle, flex:1, marginBottom:0 }}/>
                <input placeholder="Total pages" type="text" inputMode="numeric" value={totalPages} onChange={e => setTotalPages(numOnly(e.target.value))} style={{ ...inputStyle, flex:1, marginBottom:0 }}/>
              </div>
              {currentPage && totalPages && Number(totalPages) > 0 && (
                <div style={{ marginTop:"8px" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", fontSize:"10px", color:theme.subtext, marginBottom:"4px" }}>
                    <span>Page {currentPage} of {totalPages}</span>
                    <span>{Math.round((Number(currentPage)/Number(totalPages))*100)}%</span>
                  </div>
                  <div style={{ height:"3px", background:theme.border, borderRadius:"2px", overflow:"hidden" }}>
                    <div style={{ height:"100%", width:`${Math.min(100,Math.round((Number(currentPage)/Number(totalPages))*100))}%`, background:"linear-gradient(90deg,#3498db,#9b59b6)", borderRadius:"2px", transition:"width 0.3s" }}/>
                  </div>
                </div>
              )}
            </div>
          );
          if (pc.type === "episodes") return (
            <div style={{ marginBottom:"12px" }}>
              <label style={{ fontSize:"10px", fontWeight:"700", color:theme.subtext, letterSpacing:"0.08em", textTransform:"uppercase", display:"block", marginBottom:"6px" }}>Progress</label>
              {pc.fields.includes("current_season") && (
                <div style={{ display:"flex", gap:"8px", marginBottom:"8px" }}>
                  <input placeholder="Season" type="text" inputMode="numeric" value={currentSeason} onChange={e => setCurrentSeason(numOnly(e.target.value))} style={{ ...inputStyle, flex:1, marginBottom:0 }}/>
                  <div style={{ flex:2 }}/>
                </div>
              )}
              <div style={{ display:"flex", gap:"8px" }}>
                <input placeholder="Current episode" type="text" inputMode="numeric" value={currentEpisode} onChange={e => setCurrentEpisode(numOnly(e.target.value))} style={{ ...inputStyle, flex:1, marginBottom:0 }}/>
                <input placeholder="Total episodes" type="text" inputMode="numeric" value={totalEpisodes} onChange={e => setTotalEpisodes(numOnly(e.target.value))} style={{ ...inputStyle, flex:1, marginBottom:0 }}/>
              </div>
              {currentEpisode && totalEpisodes && Number(totalEpisodes) > 0 && (
                <div style={{ marginTop:"8px" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", fontSize:"10px", color:theme.subtext, marginBottom:"4px" }}>
                    <span>{currentSeason ? `S${currentSeason} · ` : ""}Ep {currentEpisode} of {totalEpisodes}</span>
                    <span>{Math.round((Number(currentEpisode)/Number(totalEpisodes))*100)}%</span>
                  </div>
                  <div style={{ height:"3px", background:theme.border, borderRadius:"2px", overflow:"hidden" }}>
                    <div style={{ height:"100%", width:`${Math.min(100,Math.round((Number(currentEpisode)/Number(totalEpisodes))*100))}%`, background:"linear-gradient(90deg,#9b59b6,#e74c3c)", borderRadius:"2px", transition:"width 0.3s" }}/>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {collections.length > 0 && (
          <div style={{ marginBottom:"12px" }}>
            <label style={{ fontSize:"10px", fontWeight:"700", color:theme.subtext, letterSpacing:"0.08em", textTransform:"uppercase", display:"block", marginBottom:"6px" }}>Collection (optional)</label>
            <select value={collectionId} onChange={e => setCollectionId(e.target.value)} style={{ ...inputStyle, marginBottom:0 }}>
              <option value="">No collection</option>
              {collections.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
            </select>
          </div>
        )}

        {/* ── INSPIRED BY ── */}
        {(() => {
          const finishedLogs = logs.filter(l => ["I loved it","I liked it","Meh","I didn't like it"].includes(l.verdict));
          if (finishedLogs.length === 0) return null;
          const picked = inspiredBy ? logs.find(l => l.id === inspiredBy) : null;
          return (
            <div style={{ marginBottom:"12px" }}>
              <label style={{ fontSize:"10px", fontWeight:"700", color:theme.subtext, letterSpacing:"0.08em", textTransform:"uppercase", display:"block", marginBottom:"6px" }}>
                🧠 Inspired by… <span style={{ fontWeight:400, textTransform:"none", letterSpacing:0, color:theme.subtext }}>(links this in the mind map)</span>
              </label>
              {picked ? (
                <div style={{ display:"flex", alignItems:"center", gap:"10px", padding:"10px 12px", borderRadius:"10px", border:`1px solid rgba(52,152,219,0.4)`, background:`rgba(52,152,219,0.08)` }}>
                  {picked.artwork && <img src={picked.artwork} alt="" style={{ width:28, height:38, borderRadius:4, objectFit:"cover", flexShrink:0 }} onError={e => e.target.style.display="none"}/>}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:"700", fontSize:"13px", color:theme.text, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{picked.title}</div>
                    <div style={{ fontSize:"10px", color:theme.subtext }}>{picked.media_type}{picked.creator ? ` · ${picked.creator}` : ""}</div>
                  </div>
                  <button onClick={() => setInspiredBy("")} style={{ background:"none", border:"none", color:theme.subtext, fontSize:"16px", cursor:"pointer", padding:"2px 4px", flexShrink:0 }}>✕</button>
                </div>
              ) : (
                <select
                  value={inspiredBy}
                  onChange={e => setInspiredBy(e.target.value)}
                  style={{ ...inputStyle, marginBottom:0, color: inspiredBy ? theme.text : theme.subtext }}
                >
                  <option value="">Not inspired by anything specific</option>
                  {finishedLogs.slice(0, 60).map(l => (
                    <option key={l.id} value={l.id}>{l.title}{l.creator ? ` — ${l.creator}` : ""}</option>
                  ))}
                </select>
              )}
            </div>
          );
        })()}

        {/* Notes */}
        <div style={{ marginBottom:"8px" }}>
          <label style={{ fontSize:"10px", fontWeight:"700", color:theme.subtext, letterSpacing:"0.08em", textTransform:"uppercase", display:"block", marginBottom:"6px" }}>Thoughts (optional)</label>
          {!notes && (
            <div style={{ display:"flex", gap:"5px", flexWrap:"wrap", marginBottom:"8px" }}>
              {[
                "What would you tell a friend?",
                "What image stays with you?",
                "Did it change how you see something?",
                "What feeling did it leave?",
              ].map(prompt => (
                <button key={prompt} onClick={() => { setNotes(prompt + " "); setTimeout(() => textareaRef.current?.focus(), 50); }}
                  style={{ fontSize:"10px", padding:"4px 10px", borderRadius:"20px",
                    border:`1px solid ${theme.border2}`, background:"none",
                    color:theme.subtext, cursor:"pointer", whiteSpace:"nowrap" }}>
                  {prompt}
                </button>
              ))}
            </div>
          )}
          <textarea ref={textareaRef} placeholder="How did it make you feel? What stuck with you?…"
            value={notes} onChange={e => setNotes(e.target.value)}
            style={{ ...inputStyle, height:"60px", overflow:"hidden", resize:"none", marginBottom:0,
              fontSize:"15px", lineHeight:"1.7", fontStyle: notes ? "italic" : "normal",
              transition:"font-style 0.2s" }}/>
        </div>

        <div style={{ marginBottom:"16px" }}>
          <label style={{ fontSize:"10px", fontWeight:"700", color:theme.subtext, letterSpacing:"0.08em", textTransform:"uppercase", display:"block", marginBottom:"6px" }}>Log date (optional)</label>
          <input type="date" value={manualDate} onChange={e => setManualDate(e.target.value)} style={inputStyle}/>
        </div>

        {/* Verdict */}
        <div style={{ marginBottom:"20px" }}>
          <label style={{ fontSize:"10px", fontWeight:"700", color:theme.subtext, letterSpacing:"0.08em", textTransform:"uppercase", display:"block", marginBottom:"8px" }}>Your verdict</label>
          {!isExp ? (
            <div style={{ display:"flex", gap:"6px", marginBottom:"8px" }}>
              <button onClick={() => setVerdict(queueVal)} style={{ ...vBtn(verdict===queueVal,"#3498db"), flex:1 }}>▶️ {queueVal}</button>
              <button onClick={() => setVerdict(wantVal)}  style={{ ...vBtn(verdict===wantVal,"#9c27b0"),  flex:1 }}>⏳ {wantVal}</button>
            </div>
          ) : (
            <div style={{ marginBottom:"8px" }}>
              <button onClick={() => setVerdict("Want to go")} style={{ ...vBtn(verdict==="Want to go","#9b59b6"), width:"100%", marginBottom:"8px" }}>📍 Want to go</button>
            </div>
          )}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px" }}>
            <button onClick={() => setVerdict("I loved it")}      style={vBtn(verdict==="I loved it","#f1c40f")}>⭐ Loved it</button>
            <button onClick={() => setVerdict("I liked it")}      style={vBtn(verdict==="I liked it","#4caf50")}>🟢 Liked it</button>
            <button onClick={() => setVerdict("Meh")}             style={vBtn(verdict==="Meh","#ff9800")}>🟡 Meh</button>
            <button onClick={() => setVerdict("I didn't like it")}style={vBtn(verdict==="I didn't like it","#e74c3c")}>🔴 Didn't like it</button>
          </div>
        </div>

        <button onClick={handleSave} disabled={isSaving} style={{ width:"100%", padding:"14px", borderRadius:"12px", border:"none", background:darkMode?"#fff":"#111", color:darkMode?"#000":"#fff", fontWeight:"700", fontSize:"15px", cursor:"pointer", opacity:isSaving?0.6:1 }}>
          {isSaving ? "Saving…" : (editingId ? "Update entry" : "Save entry")}
        </button>
      </div>
    );
  };

  // ────────────────────────────────────────────
  // TAB: HISTORY
  // ────────────────────────────────────────────
  const renderHistory = () => (
    <div style={{ paddingBottom:"100px" }}>
      <div style={{ padding:"20px 16px 0" }}>
      {historyView === "collections" && (
        <button onClick={() => setHistoryView("grid")} style={{ display:"flex", alignItems:"center", gap:"8px", width:"100%", padding:"12px 16px", marginBottom:"16px", borderRadius:"12px", border:`1px solid ${theme.border2}`, background:darkMode?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.04)", color:theme.text, fontSize:"14px", fontWeight:"600", cursor:"pointer" }}>
          <span style={{ fontSize:"18px" }}>←</span><span>Back to History</span>
        </button>
      )}
      <div style={{ marginBottom:"20px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"16px" }}>
          <h1 style={{ fontSize:"22px", fontWeight:"700", letterSpacing:"-0.5px", margin:0, color:theme.text }}>{historyView === "collections" ? "Collections" : "History"}</h1>
          <div style={{ display:"flex", gap:"6px", alignItems:"center" }}>
            {historyView === "grid" && <span style={{ fontSize:"12px", color:theme.subtext }}>{filteredHistory.length}</span>}
            {historyView === "grid" && <ViewToggle view={historyDisplay} onChange={setHistoryDisplay} theme={theme}/>}
            {historyView === "grid" && <button onClick={() => setHistoryView("collections")} style={{ padding:"5px 10px", borderRadius:"20px", border:`1px solid ${theme.border}`, background:"none", color:theme.subtext, fontSize:"11px", fontWeight:"600", cursor:"pointer" }}>🗂 Collections</button>}
          </div>
        </div>

        {historyView === "grid" && (
          <>
            <div style={{ position:"relative", marginBottom:"12px" }}>
              <span style={{ position:"absolute", left:"14px", top:"50%", transform:"translateY(-50%)", fontSize:"14px", color:theme.subtext, pointerEvents:"none" }}>🔍</span>
              <input placeholder="Search history…" value={historySearch} onChange={e => setHistorySearch(e.target.value)}
                style={{ ...inputStyle, paddingLeft:"40px", paddingRight: historySearch ? "40px" : "14px", borderRadius:"12px", marginBottom:0 }}/>
              {historySearch && <button onClick={() => setHistorySearch("")} style={{ position:"absolute", right:"12px", top:"50%", transform:"translateY(-50%)", background:"none", border:"none", color:theme.subtext, cursor:"pointer", fontSize:"16px" }}>✕</button>}
            </div>
            <div style={{ display:"flex", gap:"6px", overflowX:"auto", paddingBottom:"4px", marginBottom:"8px" }}>
              {["All",...Object.keys(CATEGORIES)].map(cat => {
                const def = CATEGORIES[cat];
                const active = filterCat === cat;
                return <button key={cat} onClick={() => setFilterCat(cat)} style={{ flexShrink:0, padding:"5px 11px", borderRadius:"20px", border:`1px solid ${active?(def?.color||theme.border2):theme.border}`, background:active?(darkMode?`${def?.color||"#fff"}18`:`${def?.color||"#000"}10`):"none", color:active?(def?.color||theme.text):theme.subtext, fontSize:"11px", fontWeight:"600", cursor:"pointer", whiteSpace:"nowrap" }}>{def?`${def.icon} ${cat}`:"All"}</button>;
              })}
            </div>
            <div style={{ display:"flex", gap:"6px", marginBottom:"8px" }}>
              <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ flex:1, padding:"7px 10px", borderRadius:"20px", border:`1px solid ${theme.border}`, background:theme.input, color:theme.subtext, fontSize:"11px", cursor:"pointer", outline:"none" }}>
                <option value="Date">Recent</option><option value="Title">A–Z</option><option value="Verdict">Ranked</option>
              </select>
              <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} style={{ flex:1.5, padding:"7px 10px", borderRadius:"20px", border:`1px solid ${theme.border}`, background:theme.input, color:theme.subtext, fontSize:"11px", cursor:"pointer", outline:"none" }}>
                {dateOptions.map(m => <option key={m} value={m}>{m === "All" ? "All months" : m}</option>)}
              </select>
            </div>
            {collections.length > 0 && (
              <div style={{ marginBottom:"8px" }}>
                <div style={{ display:"flex", gap:"6px", flexWrap:"wrap", alignItems:"center" }}>
                  <button onClick={() => setShowCollEntries(v => !v)}
                    style={{ flexShrink:0, display:"flex", alignItems:"center", gap:"4px", fontSize:"10px", fontWeight:"700", color: showCollEntries ? theme.text : theme.subtext, background:"none", border:`1px solid ${showCollEntries ? theme.border2 : theme.border}`, borderRadius:"20px", padding:"4px 10px", cursor:"pointer" }}>
                    {showCollEntries ? "👁" : "👁‍🗨"} Collections
                  </button>
                  {showCollEntries && collections.map(c => {
                    const hidden = hiddenCollIds.has(c.id);
                    return (
                      <button key={c.id}
                        onClick={() => setHiddenCollIds(prev => {
                          const next = new Set(prev);
                          if (hidden) next.delete(c.id); else next.add(c.id);
                          return next;
                        })}
                        style={{ flexShrink:0, fontSize:"10px", fontWeight:"600", padding:"4px 10px", borderRadius:"20px", border:`1px solid ${hidden ? theme.border : (c.color || "#3498db") + "55"}`, background: hidden ? "none" : `${c.color || "#3498db"}11`, color: hidden ? theme.subtext : (c.color || theme.text), cursor:"pointer", opacity: hidden ? 0.45 : 1, textDecoration: hidden ? "line-through" : "none" }}>
                        {c.emoji} {c.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {verdictFilter && (
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"8px" }}>
                <span style={{ fontSize:"12px", color:theme.subtext }}>Filtered: <b style={{ color:theme.text }}>{verdictFilter}</b></span>
                <button onClick={() => setVerdictFilter("")} style={{ background:"none", border:"none", color:"#3498db", cursor:"pointer", fontSize:"12px", fontWeight:"600" }}>Clear ✕</button>
              </div>
            )}
          </>
        )}
      </div>
      </div>{/* end padding wrapper */}

      {historyView === "collections" ? (
        <div style={{ padding:"0 16px" }}>
          <button onClick={() => { setEditingColl(null); setCollName(""); setCollEmoji("🗂"); setCollDesc(""); setShowCollModal(true); }} style={{ width:"100%", padding:"12px", borderRadius:"12px", border:`1px dashed ${theme.border2}`, background:"none", color:"#3498db", fontSize:"13px", fontWeight:"600", cursor:"pointer", marginBottom:"16px" }}>+ New Collection</button>
          {collections.length === 0 ? (
            <div style={{ textAlign:"center", padding:"40px 20px", color:theme.subtext }}><div style={{ fontSize:"40px", marginBottom:"12px" }}>🗂</div><div style={{ fontSize:"16px", fontWeight:"600", color:theme.text, marginBottom:"6px" }}>No collections yet</div></div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
              {collections.map(coll => {
                const collLogs = logs.filter(l => l.collection_id === coll.id);
                const isOpen = openCollId === coll.id;
                const accent = collAccent(coll.name);
                return (
                  <div key={coll.id} style={{ background:theme.card, border:`1px solid ${theme.border}`, borderRadius:"14px", overflow:"hidden" }}>
                    <div onClick={() => setOpenCollId(isOpen ? null : coll.id)} style={{ padding:"16px", cursor:"pointer", display:"flex", alignItems:"center", gap:"12px", position:"relative" }}>
                      <div style={{ position:"absolute", top:0, left:0, right:0, height:"2px", background:`linear-gradient(90deg,transparent,${accent},transparent)`, opacity:0.6 }}/>
                      <div style={{ width:"40px", height:"40px", borderRadius:"10px", background:`${accent}22`, border:`1px solid ${accent}44`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"20px", flexShrink:0 }}>{coll.emoji}</div>
                      <div style={{ flex:1, overflow:"hidden" }}>
                        <div style={{ fontWeight:"700", fontSize:"15px", color:theme.text }}>{coll.name}</div>
                        {coll.desc && <div style={{ fontSize:"11px", color:theme.subtext, marginTop:"2px", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{coll.desc}</div>}
                        <div style={{ fontSize:"10px", color:theme.subtext2, marginTop:"3px" }}>{collLogs.length} {collLogs.length === 1 ? "entry" : "entries"}</div>
                      </div>
                      <div style={{ display:"flex", gap:"6px", alignItems:"center" }}>
                        <button onClick={e => { e.stopPropagation(); openEditColl(coll); }} style={{ background:"none", border:`1px solid ${theme.border}`, color:theme.subtext, fontSize:"11px", padding:"4px 8px", borderRadius:"8px", cursor:"pointer" }}>Edit</button>
                        <button onClick={e => { e.stopPropagation(); deleteCollection(coll.id); }} style={{ background:"none", border:"none", color:"#e74c3c", fontSize:"16px", cursor:"pointer", padding:"4px" }}>🗑</button>
                        <span style={{ fontSize:"12px", color:theme.subtext, display:"inline-block", transition:"transform 0.2s", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}>⌄</span>
                      </div>
                    </div>
                    {isOpen && (
                      <div style={{ borderTop:`1px solid ${theme.border}` }}>
                        {collLogs.length === 0
                          ? <div style={{ textAlign:"center", padding:"20px", color:theme.subtext, fontSize:"12px" }}>No entries yet.</div>
                          : <>
                              <div style={{ padding:"8px 12px 0", display:"flex", justifyContent:"flex-end" }}>
                                <ViewToggle view={getCollDisplay(coll.id)} onChange={v => setCollDisplay(coll.id, v)} theme={theme}/>
                              </div>
                              {getCollDisplay(coll.id) === "compact"
                                ? <GridFeed
                                    logs={collLogs}
                                    darkMode={darkMode}
                                    onEdit={log => startEdit(log)}
                                    onDelete={id => handleDelete(id)}
                                    onNotesUpdate={handleUpdateNotes}
                                    searchTerm=""
                                  />
                                : <div style={{ padding:"12px" }}>
                                    <EditorialFeed
                                      logs={collLogs}
                                      theme={theme} darkMode={darkMode} getVerdictStyle={gvs}
                                      searchTerm="" collections={collections}
                                      onMapClick={handleMapClick} onNotesUpdate={handleUpdateNotes}
                                      onEdit={log => startEdit(log)} onDelete={id => handleDelete(id)}
                                    />
                                  </div>
                              }
                            </>
                        }
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        filteredHistory.length === 0 ? (
          <div style={{ textAlign:"center", padding:"60px 20px", color:theme.subtext }}>
            <div style={{ fontSize:"40px", marginBottom:"12px" }}>{historySearch ? "🔍" : logs.length === 0 ? "📚" : "🎯"}</div>
            <div style={{ fontSize:"16px", fontWeight:"600", color:theme.text, marginBottom:"6px" }}>{historySearch ? "No results found" : logs.length === 0 ? "Nothing logged yet" : "No matches"}</div>
            {logs.length === 0 && <button onClick={() => setActiveTab("log")} style={{ marginTop:"20px", padding:"12px 24px", borderRadius:"12px", border:"none", background:darkMode?"#fff":"#111", color:darkMode?"#000":"#fff", fontWeight:"600", cursor:"pointer" }}>Log something →</button>}
          </div>
        ) : historyDisplay === "compact" ? (
          <GridFeed
            logs={filteredHistory}
            darkMode={darkMode}
            onEdit={log => startEdit(log)}
            onDelete={id => handleDelete(id)}
            onNotesUpdate={handleUpdateNotes}
            searchTerm={historySearch}
            deepLinkNotesId={deepLinkNotes}
            onDeepLinkConsumed={() => setDeepLinkNotes(null)}
            deepLinkOpenId={deepLinkOpenId}
            onDeepLinkOpenConsumed={() => setDeepLinkOpenId(null)}
          />
        ) : (
          <EditorialFeed
            logs={filteredHistory}
            theme={theme} darkMode={darkMode} getVerdictStyle={gvs}
            searchTerm={historySearch} collections={collections}
            onMapClick={handleMapClick} onNotesUpdate={handleUpdateNotes}
            onEdit={log => startEdit(log)} onDelete={id => handleDelete(id)}
            deepLinkNotesId={deepLinkNotes}
            onDeepLinkConsumed={() => setDeepLinkNotes(null)}
          />
        )
      )}
    </div>
  );

  // ────────────────────────────────────────────
  // TAB: QUEUE
  // ────────────────────────────────────────────
  const renderQueue = () => {
    const active   = filteredQueue.filter(l => l.verdict?.startsWith("Currently"));
    const wishlist = filteredQueue.filter(l => l.verdict?.startsWith("Want to") || l.verdict === "Want to go");
    const isEmpty  = filteredQueue.length === 0;

    const SectionLabel = ({ icon, title, count }) => (
      <div style={{ display:"flex", alignItems:"center", gap:8, padding:"16px 16px 8px" }}>
        <span style={{ fontSize:16 }}>{icon}</span>
        <span style={{ fontSize:14, fontWeight:700, color:theme.text }}>{title}</span>
        <span style={{ fontSize:11, color:theme.subtext, marginLeft:2 }}>{count}</span>
      </div>
    );

    return (
      <div style={{ paddingBottom:100 }}>
        {/* Header */}
        <div style={{ padding:"20px 16px 0" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
            <div>
              <h1 style={{ fontFamily:"'Instrument Serif','Georgia',serif", fontSize:28, fontWeight:400, letterSpacing:"-0.3px", margin:0, color:darkMode?"#f5e8c8":theme.text, lineHeight:1.0 }}>
                Queue <em style={{ color:darkMode?"rgba(255,180,60,0.5)":theme.subtext, fontStyle:"italic" }}>&amp; what's next</em>
              </h1>
              <p style={{ fontSize:12, color:theme.subtext, margin:"4px 0 0" }}>
                {active.length} in progress · {wishlist.length} waiting
              </p>
            </div>
            <ViewToggle view={queueDisplay} onChange={setQueueDisplay} theme={theme}/>
          </div>
          {/* Category filter pills */}
          <div style={{ display:"flex", gap:"6px", marginBottom:16, overflowX:"auto", paddingBottom:4 }}>
            {["All","Read","Watched","Listened","Experienced"].map(f => {
              const def    = CATEGORIES[f];
              const isActive = queueFilter === f;
              return (
                <button key={f} onClick={() => setQueueFilter(f)}
                  style={{ flexShrink:0, padding:"5px 12px", borderRadius:20, border:`1px solid ${isActive?(def?.color||theme.border2):theme.border}`, background:isActive?(darkMode?`${def?.color||"#fff"}18`:`${def?.color||"#000"}10`):"none", color:isActive?(def?.color||theme.text):theme.subtext, fontSize:11, fontWeight:600, cursor:"pointer" }}>
                  {def ? `${def.icon} ${f}` : "All"}
                </button>
              );
            })}
          </div>
        </div>

        {isEmpty ? (
          <div style={{ textAlign:"center", padding:"60px 20px", color:theme.subtext }}>
            <div style={{ fontSize:40, marginBottom:12 }}>🕯️</div>
            <div style={{ fontFamily:"'Instrument Serif','Georgia',serif", fontSize:22, color:darkMode?"#f5e8c8":theme.text, marginBottom:6 }}>Your bedside table is empty</div>
            <div style={{ fontSize:13, color:theme.subtext, marginBottom:20 }}>Add something you're reading, watching, or want to next</div>
            <button onClick={() => setActiveTab("log")} style={{ padding:"12px 24px", borderRadius:12, border:"none", background:darkMode?"rgba(255,180,60,0.15)":"#111", color:darkMode?"#f1c40f":"#fff", fontWeight:700, cursor:"pointer", fontSize:14 }}>Log something →</button>
          </div>
        ) : queueDisplay === "compact" ? (
          <>
            {/* ── IN PROGRESS ── */}
            {active.length > 0 && (
              <>
                <SectionLabel icon="▶️" title="In Progress" count={active.length}/>
                <GridFeed
                  logs={active}
                  darkMode={darkMode}
                  onEdit={log => startEdit(log)}
                  onDelete={id => handleDelete(id)}
                  onNotesUpdate={handleUpdateNotes}
                  deepLinkNotesId={deepLinkNotes}
                  onDeepLinkConsumed={() => setDeepLinkNotes(null)}
                />
              </>
            )}

            {/* ── UP NEXT ── */}
            {wishlist.length > 0 && (
              <>
                <SectionLabel icon="⏳" title="Up Next" count={wishlist.length}/>
                <GridFeed
                  logs={wishlist}
                  darkMode={darkMode}
                  onEdit={log => startEdit(log)}
                  onDelete={id => handleDelete(id)}
                  onNotesUpdate={handleUpdateNotes}
                  deepLinkNotesId={deepLinkNotes}
                  onDeepLinkConsumed={() => setDeepLinkNotes(null)}
                />
              </>
            )}
          </>
        ) : (
          <BedsideQueue
            logs={filteredQueue}
            theme={theme}
            darkMode={darkMode}
            onEdit={log => startEdit(log)}
            onDelete={id => handleDelete(id)}
            onNotesUpdate={handleUpdateNotes}
            filter={queueFilter}
          />
        )}
      </div>
    );
  };

  // ────────────────────────────────────────────
  // RENDER
  // ────────────────────────────────────────────
  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"100vh", background:theme.bg, color:theme.subtext, fontSize:"14px" }}>Loading…</div>
  );

  const tabs = [
    { id:"home",    icon:"🏠", label:"Home" },
    { id:"log",     icon:"✚", label:"Log" },
    { id:"history", icon:"📚", label:"History" },
    { id:"queue",   icon:"⏳", label:"Queue" },
    { id:"journal", icon:"📅", label:"Journal" },
  ];

  return (
    <div style={{ maxWidth:"500px", margin:"0 auto", backgroundColor:theme.bg, color:theme.text, minHeight:"100vh", fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", position:"relative" }}>

      {/* ── HEADER ── */}
      <div style={{ padding:"10px 14px", display:"flex", gap:"8px", alignItems:"center", borderBottom:`1px solid ${theme.border}`, position:"sticky", top:0, background:theme.bg, zIndex:90, paddingTop:"calc(10px + env(safe-area-inset-top, 0px))" }}>
        <div style={{ fontSize:"15px", fontWeight:"800", letterSpacing:"-0.5px", color:theme.text, flexShrink:0 }}>🤔</div>
        <div ref={globalSearchRef} style={{ flex:1, position:"relative" }}>
          <div style={{ display:"flex", alignItems:"center", gap:"6px", background:theme.card, border:`1px solid ${globalSearchOpen ? theme.border2 : theme.border}`, borderRadius:"10px", padding:"7px 10px", transition:"border-color 0.2s" }}>
            <span style={{ fontSize:"12px", color:theme.subtext, flexShrink:0 }}>🔍</span>
            <input placeholder="Search everything…" value={globalSearch} onChange={e => setGlobalSearch(e.target.value)} onFocus={() => setGlobalSearchOpen(true)}
              style={{ flex:1, background:"none", border:"none", outline:"none", fontSize:"13px", color:theme.text, minWidth:0 }}/>
            {globalSearch && <button onClick={() => { setGlobalSearch(""); setGlobalSearchOpen(false); }} style={{ background:"none", border:"none", color:theme.subtext, cursor:"pointer", fontSize:"14px", lineHeight:1, padding:0, flexShrink:0 }}>✕</button>}
          </div>
          {globalSearchOpen && globalSearch.length >= 2 && (
            <div style={{ position:"absolute", top:"calc(100% + 4px)", left:0, right:0, background:theme.card, borderRadius:"14px", boxShadow:"0 8px 40px rgba(0,0,0,0.5)", border:`1px solid ${theme.border2}`, zIndex:200, maxHeight:"380px", overflowY:"auto" }}>
              {globalResults.length === 0 ? (
                <div style={{ padding:"20px", textAlign:"center", color:theme.subtext, fontSize:"12px" }}>No results for "{globalSearch}"</div>
              ) : (
                <>
                  <div style={{ padding:"8px 14px 4px", fontSize:"9px", fontWeight:"700", color:theme.subtext, letterSpacing:"0.12em", textTransform:"uppercase" }}>Results</div>
                  {globalResults.map(log => {
                    const vs2 = gvs(log.verdict);
                    const ss2 = getSubtypeStyle(log.media_type);
                    const coll = collections.find(c => c.id === log.collection_id);
                    const isQueue = log.verdict?.startsWith("Want to") || log.verdict === "Want to go" || log.verdict?.startsWith("Currently");
                    // Highlight matching text in snippet
                    const renderSnippet = (text) => {
                      if (!text || globalSearch.length < 2) return text;
                      const q = globalSearch.trim();
                      const re = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")})`, "gi");
                      const parts = text.split(re);
                      return parts.map((p, i) =>
                        re.test(p) ? <mark key={i} style={{ background:"rgba(241,196,15,0.3)", color:"#f1c40f", borderRadius:2, padding:"0 1px" }}>{p}</mark> : p
                      );
                    };
                    return (
                      <div key={log.id} onClick={() => handleGlobalResultClick(log)} style={{ display:"flex", alignItems:"flex-start", gap:"10px", padding:"10px 14px", cursor:"pointer", borderBottom:`1px solid ${theme.border}` }}>
                        <div style={{ width:"36px", height:"50px", borderRadius:"7px", overflow:"hidden", flexShrink:0, background:darkMode?"#1a1a1a":"#eee", display:"flex", alignItems:"center", justifyContent:"center" }}>
                          {log.artwork ? <img src={log.artwork} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} onError={e => e.target.style.display="none"}/> : <span style={{ fontSize:"18px" }}>{ss2.icon}</span>}
                        </div>
                        <div style={{ flex:1, overflow:"hidden", minWidth:0 }}>
                          <div style={{ fontWeight:"700", fontSize:"13px", color:theme.text, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{log.title}</div>
                          <div style={{ fontSize:"10px", color:theme.subtext, marginTop:"1px", marginBottom:"5px" }}>{ss2.icon} {log.media_type}{log.creator ? ` · ${log.creator}` : ""}</div>
                          <div style={{ display:"flex", gap:"4px", flexWrap:"wrap", marginBottom: log._notesSnippet ? "6px" : 0 }}>
                            <span style={{ fontSize:"9px", fontWeight:"700", padding:"1px 6px", borderRadius:"20px", border:`1px solid ${vs2.border}`, background:vs2.bg, color:vs2.color, whiteSpace:"nowrap" }}>{vs2.emoji} {log.verdict}</span>
                            {coll && <span style={{ fontSize:"9px", fontWeight:"700", padding:"1px 6px", borderRadius:"20px", border:`1px solid ${collAccent(coll.name)}55`, color:collAccent(coll.name), whiteSpace:"nowrap" }}>{coll.emoji} {coll.name}</span>}
                            {isQueue && <span style={{ fontSize:"9px", padding:"1px 6px", borderRadius:"20px", background:darkMode?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.04)", color:theme.subtext }}>In queue</span>}
                          </div>
                          {log._notesSnippet && (
                            <div style={{ fontSize:"11px", color:theme.subtext, fontStyle:"italic", lineHeight:"1.55",
                              borderLeft:`2px solid ${darkMode?"rgba(255,255,255,0.1)":"rgba(0,0,0,0.1)"}`, paddingLeft:"7px" }}>
                              💭 {renderSnippet(log._notesSnippet)}
                            </div>
                          )}
                        </div>
                        <span style={{ fontSize:"11px", color:theme.subtext, flexShrink:0, marginTop:2 }}>→</span>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          )}
        </div>
        <div style={{ display:"flex", gap:"6px", alignItems:"center", flexShrink:0 }}>
          <button onClick={() => setShowAbout(true)} style={{ background:"none", border:`1px solid ${theme.border}`, color:theme.subtext2, fontSize:"10px", fontWeight:"600", padding:"5px 8px", borderRadius:"20px", cursor:"pointer" }}>About</button>
          <button onClick={() => setShowSettings(true)} style={{ background:"none", border:`1px solid ${theme.border}`, color:theme.subtext2, fontSize:"15px", width:"30px", height:"30px", borderRadius:"50%", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>⚙️</button>
        </div>
      </div>

      {/* ── TAB CONTENT ── */}
      <div
        ref={scrollRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ overflowY:"auto", height:"calc(100vh - 56px - env(safe-area-inset-top, 0px))", position:"relative" }}
      >
        {/* Pull-to-refresh indicator */}
        {(pulling || refreshing) && (
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:`${pullDist}px`, overflow:"hidden", transition: refreshing ? "none" : "height 0.15s ease", pointerEvents:"none" }}>
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:"6px", opacity: Math.min(pullDist / PULL_THRESHOLD, 1) }}>
              <div style={{
                width:"24px", height:"24px", borderRadius:"50%",
                border:`2px solid ${theme.border2}`,
                borderTopColor: "#3498db",
                animation: refreshing ? "ptr-spin 0.7s linear infinite" : "none",
                transform: refreshing ? undefined : `rotate(${Math.min(pullDist / PULL_THRESHOLD, 1) * 270}deg)`,
                transition: "transform 0.1s ease",
              }}/>
              <style>{`@keyframes ptr-spin{to{transform:rotate(360deg)}}`}</style>
              <span style={{ fontSize:"9px", color:theme.subtext, fontWeight:"600", letterSpacing:"0.08em" }}>
                {refreshing ? "Resetting…" : pullDist >= PULL_THRESHOLD ? "Release to reset" : "Pull to reset filters"}
              </span>
            </div>
          </div>
        )}
        {activeTab === "home"    && renderHome()}
        {activeTab === "log"     && renderLog()}
        {activeTab === "history" && renderHistory()}
        {activeTab === "queue"   && renderQueue()}
        {activeTab === "journal" && <JournalTab logs={logs} theme={theme} darkMode={darkMode} onEdit={log => startEdit(log)} onDelete={handleDelete}/>}
        {activeTab === "threads" && <ThreadsTab logs={logs} links={links} theme={theme} darkMode={darkMode} onAddLink={addLink} onRemoveLink={removeLink} onEdit={log => startEdit(log)} mapHighlightId={mapHighlightId} getVerdictStyle={gvs} collections={collections} hiddenCollIds={hiddenCollIds} hideMap={true}/>}
      </div>

      {/* ── TAB BAR ── */}
      <div style={{ position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)", width:"100%", maxWidth:"500px", background:theme.tabBar, borderTop:`1px solid ${theme.border}`, display:"flex", zIndex:100, paddingBottom:"env(safe-area-inset-bottom, 0px)" }}>
        {tabs.map(tab => {
          const active = activeTab === tab.id;
          const isLog = tab.id === "log";
          return (
            <button key={tab.id} onClick={() => { setActiveTab(tab.id); if (tab.id !== "threads") setMapHighlightId(null); }}
              style={{ flex:1, padding:"8px 0 6px", background:"none", border:"none", display:"flex", flexDirection:"column", alignItems:"center", gap:"2px", cursor:"pointer", position:"relative" }}>
              {active && !isLog && <div style={{ position:"absolute", top:0, left:"25%", right:"25%", height:"2px", background:"#3498db", borderRadius:"0 0 2px 2px" }}/>}
              {isLog ? (
                <div style={{ width:"28px", height:"28px", borderRadius:"50%", background: active ? "#3498db" : darkMode ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:"1px" }}>
                  <span style={{ fontSize:"16px", lineHeight:1, color: active ? "#fff" : darkMode ? "#fff" : "#333", fontWeight:"300" }}>+</span>
                </div>
              ) : (
                <span style={{ fontSize:"16px", lineHeight:1, filter: active ? "none" : "grayscale(1) opacity(0.4)" }}>{tab.icon}</span>
              )}
              <span style={{ fontSize:"9px", fontWeight: active ? "700" : "500", color: active ? "#3498db" : theme.subtext, letterSpacing:"0.02em" }}>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── COLLECTION MODAL ── */}
      {showCollModal && (
        <div onClick={() => setShowCollModal(false)} style={{ position:"fixed", top:0, left:0, right:0, bottom:0, background:"rgba(0,0,0,0.6)", zIndex:200, display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
          <div onClick={e => e.stopPropagation()} style={{ background:theme.card, borderRadius:"20px 20px 0 0", width:"100%", maxWidth:"500px", padding:"20px 20px 40px", border:`1px solid ${theme.border2}` }}>
            <div style={{ width:"36px", height:"4px", background:theme.border2, borderRadius:"2px", margin:"0 auto 20px" }}/>
            <div style={{ fontSize:"16px", fontWeight:"700", marginBottom:"16px", color:theme.text }}>{editingColl ? "Edit Collection" : "New Collection"}</div>
            <label style={{ fontSize:"10px", fontWeight:"700", color:theme.subtext, letterSpacing:"0.08em", textTransform:"uppercase", display:"block", marginBottom:"8px" }}>Icon</label>
            <div style={{ display:"flex", flexWrap:"wrap", gap:"6px", marginBottom:"16px" }}>
              {COLL_EMOJIS.map(em => <button key={em} onClick={() => setCollEmoji(em)} style={{ width:"36px", height:"36px", borderRadius:"8px", border:`2px solid ${collEmoji===em?theme.border2:"transparent"}`, background:collEmoji===em?(darkMode?"rgba(255,255,255,0.08)":"rgba(0,0,0,0.06)"):"none", fontSize:"18px", cursor:"pointer" }}>{em}</button>)}
            </div>
            <input placeholder="Collection name" value={collName} onChange={e => setCollName(e.target.value)} style={inputStyle} autoFocus/>
            <textarea placeholder="Description (optional)" value={collDesc} onChange={e => setCollDesc(e.target.value)} style={{ ...inputStyle, height:"60px", resize:"none", overflow:"hidden" }}/>
            <button onClick={saveCollection} disabled={!collName.trim()} style={{ width:"100%", padding:"13px", borderRadius:"12px", border:"none", background:darkMode?"#fff":"#111", color:darkMode?"#000":"#fff", fontWeight:"700", fontSize:"14px", cursor:"pointer", opacity:!collName.trim()?0.4:1 }}>
              {editingColl ? "Save changes" : "Create Collection"}
            </button>
          </div>
        </div>
      )}

      {/* ── AUTH MODAL ── */}
      {showAuthModal && (
        <div style={{ position:"fixed", top:0, left:0, right:0, bottom:0, background:"rgba(0,0,0,0.85)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:"20px" }}>
          <div style={{ background:theme.card, padding:"28px", borderRadius:"20px", width:"100%", maxWidth:"340px", border:`1px solid ${theme.border2}` }}>
            <h3 style={{ textAlign:"center", marginBottom:"8px", fontSize:"18px", fontWeight:"700" }}>{isSignUp ? "Create account" : "Welcome back"}</h3>
            {authMsg && <div style={{ padding:"10px", background:"#27ae60", color:"#fff", borderRadius:"8px", fontSize:"12px", marginBottom:"14px", textAlign:"center" }}>{authMsg}</div>}
            <p style={{ fontSize:"11px", textAlign:"center", color:theme.subtext, marginBottom:"18px" }}>{logs.length>0&&!user ? "Your guest entries will sync on login." : "Access your logs anywhere."}</p>
            <button onClick={() => supabase.auth.signInWithOAuth({ provider:"google" })} style={{ width:"100%", padding:"12px", borderRadius:"10px", border:"none", background:"#fff", color:"#000", fontWeight:"600", cursor:"pointer", marginBottom:"16px", fontSize:"14px" }}>Continue with Google</button>
            <form onSubmit={handleAuth}>
              <input name="email" type="email" placeholder="Email" required style={inputStyle}/>
              <input name="password" type="password" placeholder="Password" required style={inputStyle}/>
              <button type="submit" style={{ width:"100%", padding:"12px", borderRadius:"10px", border:"none", background:"#3498db", color:"#fff", fontWeight:"600", cursor:"pointer", fontSize:"14px" }}>{isSignUp ? "Sign up" : "Login"}</button>
            </form>
            {!isSignUp && <button onClick={handleForgotPassword} style={{ background:"none", border:"none", color:"#3498db", cursor:"pointer", fontSize:"12px", display:"block", margin:"10px auto 0", fontWeight:"600" }}>Forgot password?</button>}
            <button onClick={() => { setIsSignUp(v=>!v); setAuthMsg(""); }} style={{ background:"none", border:"none", color:"#3498db", cursor:"pointer", fontSize:"12px", display:"block", margin:"12px auto 0", fontWeight:"600" }}>{isSignUp ? "Already have an account? Login" : "Need an account? Sign up"}</button>
            <button onClick={() => setShowAuthModal(false)} style={{ background:"none", border:"none", color:theme.subtext, cursor:"pointer", fontSize:"12px", display:"block", margin:"12px auto 0" }}>Close</button>
          </div>
        </div>
      )}

      {/* ── SETTINGS ── */}
      {showSettings && (
        <div onClick={() => setShowSettings(false)} style={{ position:"fixed", top:0, left:0, right:0, bottom:0, background:"rgba(0,0,0,0.6)", zIndex:200, display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
          <div onClick={e => e.stopPropagation()} style={{ background:theme.card, borderRadius:"20px 20px 0 0", width:"100%", maxWidth:"500px", padding:"20px 20px 40px", border:`1px solid ${theme.border2}` }}>
            <div style={{ width:"36px", height:"4px", background:theme.border2, borderRadius:"2px", margin:"0 auto 20px" }}/>
            <div style={{ fontSize:"16px", fontWeight:"700", marginBottom:"20px", color:theme.text }}>Settings</div>
            {[
              { label:"Appearance", sub: darkMode?"Dark mode":"Light mode", right:<button onClick={() => setDarkMode(v=>!v)} style={{ background:darkMode?"#3498db":"rgba(0,0,0,0.1)", border:"none", borderRadius:"20px", width:"48px", height:"26px", cursor:"pointer", position:"relative", transition:"background 0.2s", flexShrink:0 }}><div style={{ position:"absolute", top:"3px", left:darkMode?"24px":"3px", width:"20px", height:"20px", borderRadius:"50%", background:"#fff", transition:"left 0.2s", boxShadow:"0 1px 4px rgba(0,0,0,0.3)" }}/></button> },
              { label: user ? "Account" : "Sync your data", sub: user ? `Logged in as ${user.email}` : "Log in to sync across devices", right: user ? <button onClick={() => { supabase.auth.signOut(); setShowSettings(false); }} style={{ padding:"7px 14px", borderRadius:"20px", border:`1px solid ${theme.border2}`, background:"none", color:theme.text, fontSize:"12px", fontWeight:"600", cursor:"pointer", flexShrink:0 }}>Logout</button> : <button onClick={() => { setShowSettings(false); setShowAuthModal(true); setAuthMsg(""); }} style={{ padding:"7px 14px", borderRadius:"20px", border:"1px solid #3498db", background:"none", color:"#3498db", fontSize:"12px", fontWeight:"600", cursor:"pointer", flexShrink:0 }}>Login ☁️</button> },
              { label:"Export data", sub:"Download all logs as CSV", right:<button onClick={() => { exportCSV(logs, collections); setShowSettings(false); }} style={{ padding:"7px 14px", borderRadius:"20px", border:`1px solid ${theme.border2}`, background:"none", color:"#27ae60", fontSize:"12px", fontWeight:"600", cursor:"pointer", flexShrink:0 }}>Export 📥</button> },
              { label:"Delete account", sub:"Permanently delete all your data", labelColor:"#e74c3c", right:<button onClick={() => { setShowSettings(false); handleDeleteAccount(); }} style={{ padding:"7px 14px", borderRadius:"20px", border:"1px solid #e74c3c", background:"none", color:"#e74c3c", fontSize:"12px", fontWeight:"600", cursor:"pointer", flexShrink:0 }}>Delete ⚠️</button> },
            ].map((row, i, arr) => (
              <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"14px 0", borderBottom: i < arr.length-1 ? `1px solid ${theme.border}` : "none" }}>
                <div>
                  <div style={{ fontSize:"14px", fontWeight:"600", color: row.labelColor || theme.text }}>{row.label}</div>
                  <div style={{ fontSize:"11px", color:theme.subtext, marginTop:"2px" }}>{row.sub}</div>
                </div>
                {row.right}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── ABOUT ── */}
      {showAbout && (
        <div onClick={() => setShowAbout(false)} style={{ position:"fixed", top:0, left:0, right:0, bottom:0, background:"rgba(0,0,0,0.6)", zIndex:200, display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
          <div onClick={e => e.stopPropagation()} style={{ background:theme.card, borderRadius:"20px 20px 0 0", width:"100%", maxWidth:"500px", padding:"20px 20px 40px", border:`1px solid ${theme.border2}` }}>
            <div style={{ width:"36px", height:"4px", background:theme.border2, borderRadius:"2px", margin:"0 auto 20px" }}/>
            <div style={{ fontSize:"16px", fontWeight:"700", marginBottom:"14px", color:theme.text }}>About</div>
            <p style={{ fontSize:"13px", color:theme.subtext2, lineHeight:"1.7", margin:0 }}>
              <b style={{ color:theme.text }}>Did you like it?</b><br/><br/>
              Track everything you've watched, read, listened to or experienced. Log books, films, albums, gigs, restaurants, galleries and more. Voice-note your thoughts on the go. Pin locations on the map.
            </p>
            <button onClick={() => setShowAbout(false)} style={{ marginTop:"20px", width:"100%", padding:"12px", borderRadius:"12px", border:`1px solid ${theme.border2}`, background:"none", color:theme.text, fontSize:"14px", fontWeight:"600", cursor:"pointer" }}>Close</button>
          </div>
        </div>
      )}

      {/* ── QUICK LOG ── */}
      {showQuickLog && (
        <QuickLog
          theme={theme}
          darkMode={darkMode}
          onSave={handleQuickSave}
          onClose={() => { setShowQuickLog(false); setLastQuickLogEntry(null); }}
          onExpandFull={() => {
            setShowQuickLog(false);
            // Pre-fill the full log form with the quick-logged entry's data
            const latest = logs[0];
            if (latest) startEdit(latest);
            else setActiveTab("log");
            setLastQuickLogEntry(null);
          }}
        />
      )}

      {/* ── UNDO TOAST ── */}
      {undoItem && (
        <div style={{ position:"fixed", bottom:"80px", left:"50%", transform:"translateX(-50%)", background:darkMode?"#1a1a1a":"#222", color:"#fff", padding:"12px 16px", borderRadius:"14px", display:"flex", alignItems:"center", gap:"12px", zIndex:150, boxShadow:"0 4px 20px rgba(0,0,0,0.4)", fontSize:"13px", fontWeight:"500", whiteSpace:"nowrap" }}>
          <span>Deleted <b>{undoItem.title}</b></span>
          <button onClick={undoDelete} style={{ background:"#3498db", border:"none", color:"#fff", padding:"5px 12px", borderRadius:"8px", cursor:"pointer", fontSize:"12px", fontWeight:"700" }}>Undo</button>
        </div>
      )}
    </div>
  );
}
