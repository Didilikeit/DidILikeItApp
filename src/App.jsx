import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { supabase, fetchCollections, createCollection, updateCollection, deleteCollection as deleteCollectionFromDB, mergeGuestCollections } from "./utils/supabase.js";
import { CATEGORIES, COLL_EMOJIS, API_TYPES, CREATOR_LABELS, PROGRESS_CONFIG } from "./utils/constants.js";
import { buildTheme, getVerdictStyle } from "./utils/theme.js";
import { getCat, getSubtypeStyle, collAccent, compressImage, geocodeVenue, filterLogs, exportCSV, getInsight } from "./utils/helpers.js";
import { useLogs } from "./hooks/useLogs.js";
import { useApiSearch } from "./hooks/useApiSearch.js";
import { EditorialFeed } from "./components/EditorialCard.jsx";
import { GridFeed, ViewToggle } from "./components/GridFeed.jsx";
import { TasteGenome, TasteRadar, TasteOracle } from "./components/TasteIntelligence.jsx";
import { BedsideQueue } from "./components/BedsideQueue.jsx";
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
  const [authError, setAuthError] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [forgotPasswordMode, setForgotPasswordMode] = useState(false);
  const [appError, setAppError] = useState("");

  // ── Data ──
  const { logs, fetchLogs, mergeGuestLogs, saveLog, deleteLog, updateNotes, addRevisit, editRevisit, deleteRevisit, links, addLink, removeLink } = useLogs();
  const [showQuickLog, setShowQuickLog] = useState(false);
  const [lastQuickLogEntry, setLastQuickLogEntry] = useState(null);
  const [collections, setCollections] = useState([]);

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
  const [recommendedBy, setRecommendedBy] = useState(""); // name of person who recommended this
  const [editingId, setEditingId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState("");
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
  const [statsOpen, setStatsOpen] = useState(false);
  const [deepDiveOpen, setDeepDiveOpen] = useState(false);
  const [customName, setCustomName] = useState(localStorage.getItem("user_custom_name") || "");

  // ── Revisit (verdict aging) ──
  const [revisitLog, setRevisitLog] = useState(null);
  const [revisitVerdict, setRevisitVerdict] = useState("");
  const [revisitThoughts, setRevisitThoughts] = useState("");

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

  // Collections load independently — failures must never block the app,
  // but the function returns a promise so callers can await it when needed.
  const loadCollections = useCallback((u) => {
    return fetchCollections(u)
      .then(colls => setCollections(colls))
      .catch(e => console.warn("[collections] load failed (table may not exist yet):", e.message));
  }, []);

  const handleTouchStart = useCallback(e => {
    if (scrollRef.current?.scrollTop === 0) touchStartY.current = e.touches[0].clientY;
    else touchStartY.current = 0;
  }, []);

  const handleTouchMove = useCallback(e => {
    if (!touchStartY.current || refreshing) return;
    const dy = e.touches[0].clientY - touchStartY.current;
    if (dy > 0 && scrollRef.current?.scrollTop === 0) {
      setPulling(true);
      setPullDist(Math.min(dy * 0.45, PULL_THRESHOLD + 20));
    }
  }, [refreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (pulling && pullDist >= PULL_THRESHOLD) {
      setRefreshing(true);
      setPullDist(PULL_THRESHOLD);
      try {
        await Promise.all([fetchLogs(user), loadCollections(user)]);
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
  }, [pulling, pullDist, fetchLogs, loadCollections, user]);

  // Reload data when the user switches back to this tab/window
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        fetchLogs(user);
        loadCollections(user);
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [fetchLogs, loadCollections, user]);

  // Persist settings
  useEffect(() => { document.body.style.backgroundColor = theme.bg; }, [theme.bg]);
  useEffect(() => { localStorage.setItem("dark_mode", darkMode); }, [darkMode]);
  // (collections are now persisted to Supabase, not localStorage)

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

  // ── Android hardware back button ──
  // Capacitor intercepts the back button before popstate ever fires in native
  // builds, so we need BOTH listeners wired to the same handler.
  // Web: popstate fires (sentinel strategy keeps history stack alive)
  // Native: Capacitor App plugin fires 'backButton' event
  const prevTabRef = useRef("home");
  useEffect(() => {
    if (activeTab !== "log") prevTabRef.current = activeTab;
  }, [activeTab]);

  // Push a sentinel on first mount so popstate-based back never exits (web only)
  useEffect(() => {
    window.history.pushState({ dili: "sentinel" }, "");
  }, []);

  // Push state when each overlay opens (web sentinel strategy)
  useEffect(() => {
    if (showQuickLog) window.history.pushState({ dili: "quicklog" }, "");
  }, [showQuickLog]);
  useEffect(() => {
    if (activeTab === "log") window.history.pushState({ dili: "log" }, "");
  }, [activeTab]);
  useEffect(() => {
    if (globalSearchOpen) window.history.pushState({ dili: "search" }, "");
  }, [globalSearchOpen]);
  useEffect(() => {
    if (showAuthModal) window.history.pushState({ dili: "auth" }, "");
  }, [showAuthModal]);

  // Shared handler — same logic for both web (popstate) and native (Capacitor)
  // Sub-components (GridFeed, JournalTab) can push onto window.__backStack to
  // intercept back before App-level navigation handles it.
  const handleBackRef = useRef(null);
  useEffect(() => {
    handleBackRef.current = () => {
      // First: let any sub-component that registered itself handle it
      // (e.g. GridFeed card open, JournalTab detail sheet open)
      if (window.__backStack?.length) {
        const handler = window.__backStack[window.__backStack.length - 1];
        handler();
        return;
      }
      if (showAuthModal) {
        setShowAuthModal(false);
        window.history.pushState({ dili: "sentinel" }, "");
        return;
      }
      if (globalSearchOpen) {
        setGlobalSearchOpen(false);
        setGlobalSearch("");
        window.history.pushState({ dili: "sentinel" }, "");
        return;
      }
      if (showQuickLog) {
        setShowQuickLog(false);
        window.history.pushState({ dili: "sentinel" }, "");
        return;
      }
      if (activeTab === "log") {
        setActiveTab(prevTabRef.current || "home");
        window.history.pushState({ dili: "sentinel" }, "");
        return;
      }
      if (activeTab !== "home") {
        setActiveTab("home");
        window.history.pushState({ dili: "sentinel" }, "");
        return;
      }
      // Already on home with nothing open — re-push sentinel (web), no-op (native)
      window.history.pushState({ dili: "sentinel" }, "");
    };
  }, [showAuthModal, globalSearchOpen, showQuickLog, activeTab]);

  // Web: popstate listener
  useEffect(() => {
    const onPop = () => handleBackRef.current?.();
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // Native: Capacitor App plugin back button listener
  // Native: Capacitor back button is handled in MainActivity.java,
  // which fires a popstate event — so the listener below covers both web and native.

  // ── Auth init ──
  // (loadCollections defined above, near pull-to-refresh)

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const u = session?.user ?? null;
        setUser(u);
        // fetchLogs is required to show the app; loadCollections is best-effort
        await fetchLogs(u);
        loadCollections(u);
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
      if (u) {
        setShowAuthModal(false); setAuthMsg("");
        await mergeGuestLogs(u.id);
        // Migrate guest collections then reload — failures are non-fatal
        mergeGuestCollections(u.id)
          .then(() => loadCollections(u))
          .catch(e => console.warn("[collections] merge failed:", e.message));
      } else {
        fetchLogs(null);
        loadCollections(null);
      }
    });
    return () => subscription.unsubscribe();
  }, [fetchLogs, mergeGuestLogs, loadCollections]);

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
      const v = log.verdict, cat = getCat(log.media_type);
      // In-progress and queue describe the current state of the shelf, so they
      // are never year-filtered; only finished verdicts respect the year filter.
      if (v?.startsWith("Currently")) { cats.active++; return; }
      if (v?.startsWith("Want to") || v === "Want to go") { cats.queue++; return; }
      if (statYearFilter !== "All" && new Date(log.logged_at).getFullYear().toString() !== statYearFilter) return;
      if (cats[cat]) {
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
    e.preventDefault();
    setAuthMsg(""); setAuthError("");
    if (isSignUp) {
      const { data, error } = await supabase.auth.signUp({ email: authEmail, password: authPassword });
      if (error) setAuthError(error.message);
      else if (data?.user && !data?.session) setAuthMsg("Check your email to verify!");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword });
      if (error) setAuthError(error.message);
    }
  };

  const handleForgotPassword = async () => {
    if (!forgotPasswordMode) { setForgotPasswordMode(true); setAuthError(""); return; }
    if (!authEmail.trim()) { setAuthError("Enter your email above first."); return; }
    const { error } = await supabase.auth.resetPasswordForEmail(authEmail.trim(), { redirectTo: window.location.origin });
    if (error) setAuthError(error.message);
    else { setAuthMsg("Password reset email sent!"); setForgotPasswordMode(false); }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm("WARNING: This permanently deletes your account and ALL logs. Proceed?")) return;
    if (user) {
      const { error } = await supabase.rpc("delete_user_account");
      if (error) setAppError("Could not delete account: " + error.message);
      else { await supabase.auth.signOut(); window.location.reload(); }
    } else {
      localStorage.removeItem("guest_logs");
      fetchLogs(null);
    }
  };

  const handleSave = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle || !verdict) { setFormError("Title and Verdict are required."); return; }
    const yearStr = year ? year.toString() : "";
    if (yearStr && (yearStr.length !== 4 || isNaN(yearStr))) { setFormError("Please enter a valid 4-digit year."); return; }
    setFormError(""); setIsSaving(true);
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
      recommended_by: recommendedBy.trim() || null,
    };
    try {
      const sid = editingId;
      const savedId = await saveLog({ logData, editingId, user, verdict });
      // Handle inspired-by link using the returned ID — no setTimeout race condition
      if (!editingId) {
        if (inspiredBy && savedId) addLink(inspiredBy, savedId);
      } else {
        // Editing: remove old incoming link and add new one if changed
        const oldLink = links.find(lk => lk.b === editingId);
        if (oldLink) removeLink(oldLink.a, editingId);
        if (inspiredBy) addLink(inspiredBy, editingId);
      }
      resetForm();
      const isQ = verdict === "Want to go" || verdict?.startsWith("Want to") || verdict?.startsWith("Currently");
      setActiveTab(isQ ? "queue" : "history");
      setSavedEntryId(sid || savedId || "latest");
    } catch (err) { setFormError(err.message); }
    finally { setIsSaving(false); }
  };

  const resetForm = () => {
    setTitle(""); setCreator(""); setNotes(""); setYear(""); setVerdict("");
    setManualDate(""); setCurrentPage(""); setTotalPages(""); setCurrentEpisode(""); setTotalEpisodes(""); setCurrentSeason(""); setArtwork(""); setGenre("");
    setLocationVenue(""); setLocationCity(""); setLocationLat(null); setLocationLng(null);
    setCollectionId(""); setInspiredBy(""); setRecommendedBy(""); setEditingId(null);
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
    deleteLog(id, user).catch(err => {
      console.error("Delete failed:", err);
      // deleteLog already reverted the optimistic removal via fetchLogs.
      // Clear the undo toast so the user can't re-insert what's already back.
      clearTimeout(undoTimerRef.current);
      setUndoItem(null);
      setAppError("Could not delete entry: please try again.");
    });
    setUndoItem(item);
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    undoTimerRef.current = setTimeout(() => setUndoItem(null), 5000);
  };

  const undoDelete = async () => {
    if (!undoItem) return;
    clearTimeout(undoTimerRef.current);
    // Re-insert the deleted item — saveLog returns its new ID.
    // Strip the old DB id/user_id so Supabase assigns a fresh row.
    const { id: _id, user_id: _uid, ...rest } = undoItem;
    try {
      await saveLog({
        logData: { ...rest, manualDate: undoItem.logged_at?.split("T")[0] },
        editingId: null,
        user,
        verdict: undoItem.verdict,
      });
    } catch (e) { console.error("Undo failed:", e); }
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
    // Pre-fill the log date so editing doesn't reset it to today
    if (log.logged_at) {
      const d = new Date(log.logged_at);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth()+1).padStart(2,"0");
      const dd = String(d.getDate()).padStart(2,"0");
      setManualDate(`${yyyy}-${mm}-${dd}`);
    } else {
      setManualDate("");
    }
    setLocationVenue(log.location_venue || "");
    setLocationCity(log.location_city || ""); setLocationLat(log.lat || null);
    setLocationLng(log.lng || null); setCollectionId(log.collection_id || "");
    setRecommendedBy(log.recommended_by || "");
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
    const savedId = await saveLog({ logData: entry, editingId: null, user, verdict: logData.verdict });
    // Store the returned ID so onExpandFull can open the exact entry, not just logs[0]
    setLastQuickLogEntry({ ...entry, id: savedId || "latest" });
  };

  // Collection actions
  const saveCollection = async () => {
    if (!collName.trim()) return;
    const name = collName.trim();
    const emoji = collEmoji;
    const desc = collDesc.trim();

    // Close the modal immediately so the UI feels instant
    setShowCollModal(false); setCollName(""); setCollEmoji("🗂"); setCollDesc(""); setEditingColl(null);

    if (editingColl) {
      // Optimistic update
      setCollections(prev => prev.map(c => c.id === editingColl ? { ...c, name, emoji, desc } : c));
      await updateCollection(user, editingColl, { name, emoji, desc });
    } else {
      // Optimistic insert with a temporary id
      const tempId = "temp_" + Date.now();
      setCollections(prev => [...prev, { id: tempId, name, emoji, desc, created_at: new Date().toISOString() }]);
      const created = await createCollection(user, { name, emoji, desc });
      if (created) {
        // Replace temp entry with the real Supabase row (correct UUID)
        setCollections(prev => prev.map(c => c.id === tempId ? { ...created, desc: created.description ?? desc } : c));
      } else {
        // DB write failed — remove the optimistic entry so no stale temp ID lingers
        setCollections(prev => prev.filter(c => c.id !== tempId));
        setAppError("Could not create collection: please try again.");
      }
    }
  };
  const handleDeleteCollection = async id => {
    if (!window.confirm("Delete this collection? Entries stay but lose their collection tag.")) return;
    await deleteCollectionFromDB(user, id);
    await loadCollections(user);
    if (user) await fetchLogs(user); else fetchLogs(null);
  };
  const openEditColl = c => { setEditingColl(c.id); setCollName(c.name); setCollEmoji(c.emoji || "🗂"); setCollDesc(c.desc || ""); setShowCollModal(true); };
  const saveName = () => { localStorage.setItem("user_custom_name", customName.trim()); };

  // ── Revisit handlers ──
  const openRevisit = log => { setRevisitLog(log); setRevisitVerdict(log.verdict); setRevisitThoughts(""); };
  const closeRevisit = () => { setRevisitLog(null); setRevisitVerdict(""); setRevisitThoughts(""); };
  const saveRevisit = () => {
    if (!revisitLog || !revisitVerdict) return;
    addRevisit(revisitLog, { verdict: revisitVerdict, thoughts: revisitThoughts }, user).catch(err => {
      console.error("Revisit failed:", err);
      setAppError("Could not save revisit: please try again.");
    });
    closeRevisit();
  };
  const handleEditRevisit = (log, index, payload) => {
    editRevisit(log, index, payload, user).catch(err => {
      console.error("Edit revisit failed:", err);
      setAppError("Could not update revisit: please try again.");
    });
  };
  const handleDeleteRevisit = (log, index) => {
    deleteRevisit(log, index, user).catch(err => {
      console.error("Delete revisit failed:", err);
      setAppError("Could not delete revisit: please try again.");
    });
  };

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
    const insight = getInsight(logs, customName);
    const recentLogs = logs.filter(l => ["I loved it","I liked it","Meh","I didn't like it"].includes(l.verdict)).slice(0, 10);

    // ── Shelf design tokens ──
    const currentLogs = logs.filter(l => l.verdict?.startsWith("Currently")).slice(0, 10);
    const queueLogs = logs.filter(l => l.verdict?.startsWith("Want to") || l.verdict === "Want to go").slice(0, 10);
    const progressInfo = l => {
      const cp = Number(l.current_page), tp = Number(l.total_pages);
      const ce = Number(l.current_episode), te = Number(l.total_episodes);
      if (cp > 0 && tp > 0) return { pct: Math.min(100, Math.round((cp/tp)*100)), label:`Page ${cp} of ${tp}` };
      if (ce > 0 && te > 0) return { pct: Math.min(100, Math.round((ce/te)*100)), label: l.current_season ? `S${l.current_season} · Ep ${ce} of ${te}` : `Ep ${ce} of ${te}` };
      if (cp > 0) return { pct: null, label:`Page ${cp}` };
      if (ce > 0) return { pct: null, label: l.current_season ? `S${l.current_season} · Ep ${ce}` : `Ep ${ce}` };
      return null;
    };
    const heroArt = recentLogs.find(l => l.artwork)?.artwork || null;
    const totalLogged = Object.keys(CATEGORIES).reduce((s,k) => s+(stats[k]?.total||0), 0);
    const yearLabel = statYearFilter === "All" ? "all time" : `in ${statYearFilter}`;
    const todayLabel = new Date().toLocaleDateString("en-GB", { weekday:"long", day:"numeric", month:"long" });
    const heroText = darkMode ? "#f5f5f3" : "#141414";
    const heroDim = darkMode ? "rgba(245,245,243,0.55)" : "rgba(20,20,20,0.55)";
    const fadeRGB = darkMode ? "8,8,8" : "242,242,242";
    const SHELF_VERDICTS = {
      "I loved it":       { label:"Loved",    dot:"#d4a843", gold:true },
      "I liked it":       { label:"Liked",    dot:"#7da06b" },
      "Meh":              { label:"Meh",      dot:"#8a8a8a" },
      "I didn't like it": { label:"Disliked", dot:"#b05c5c" },
    };

    // ── "In review" print report tokens & numbers ──
    const serif = "Georgia, 'Times New Roman', serif";
    const inkHi   = darkMode ? "rgba(245,245,243,0.92)" : "rgba(20,20,20,0.92)";
    const inkBody = darkMode ? "rgba(245,245,243,0.8)"  : "rgba(20,20,20,0.8)";
    const inkMid  = darkMode ? "rgba(245,245,243,0.45)" : "rgba(20,20,20,0.5)";
    const inkLow  = darkMode ? "rgba(245,245,243,0.3)"  : "rgba(20,20,20,0.35)";
    const dotted  = darkMode ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.22)";
    const capsStyle = { fontSize:"9.5px", letterSpacing:"0.22em", textTransform:"uppercase", fontWeight:"600", color:inkLow };
    const yearTabs = [...availableYears.filter(y => y !== "All"), "All"];
    const verdictTotals = Object.keys(CATEGORIES).reduce((acc, c) => {
      const s = stats[c] || {};
      acc.loved += s.loved||0; acc.liked += s.liked||0; acc.meh += s.meh||0; acc.no += s.no||0;
      return acc;
    }, { loved:0, liked:0, meh:0, no:0 });
    const pctOf = n => totalLogged > 0 ? Math.round((n/totalLogged)*100) : 0;
    const catRows = Object.keys(CATEGORIES).map(cat => ({ cat, total: stats[cat]?.total||0 })).sort((a,b) => b.total-a.total);
    const catHit = cat => { const s = stats[cat]; return s && s.total > 0 ? Math.round(((s.loved+s.liked)/s.total)*100) : null; };
    const qualifying = catRows.filter(r => r.total >= 3);
    const safest = qualifying.length > 0 ? qualifying.reduce((a,b) => catHit(b.cat) > catHit(a.cat) ? b : a) : null;
    const harshest = qualifying.length > 1 ? qualifying.reduce((a,b) => catHit(b.cat) < catHit(a.cat) ? b : a) : null;
    const revisitedLogs = logs.filter(l => Array.isArray(l.revisits) && l.revisits.length > 1);
    const verdictsChanged = revisitedLogs.filter(l => l.revisits[0]?.verdict !== l.revisits[l.revisits.length-1]?.verdict).length;
    const nowD = new Date();
    let deltaText = "";
    if (statYearFilter === nowD.getFullYear().toString()) {
      const cutoff = new Date(nowD); cutoff.setFullYear(nowD.getFullYear()-1);
      const prevCount = logs.filter(l => {
        if (!["I loved it","I liked it","Meh","I didn't like it"].includes(l.verdict)) return false;
        const d = new Date(l.logged_at);
        return d.getFullYear() === nowD.getFullYear()-1 && d <= cutoff;
      }).length;
      if (prevCount > 0) {
        const diff = totalLogged - prevCount;
        deltaText = diff > 0 ? `${diff} more than this time last year`
          : diff < 0 ? `${Math.abs(diff)} fewer than this time last year`
          : "level with this time last year";
      }
    }
    const openCaption = statYearFilter === "All" ? "things logged all time"
      : statYearFilter === nowD.getFullYear().toString() ? "things logged this year"
      : `things logged in ${statYearFilter}`;
    const footnotes = [];
    if (topCreator) footnotes.push(<>Most logged creator: <b style={{ color:inkHi, fontWeight:"600" }}>{topCreator.name}</b>, {topCreator.count} {topCreator.count === 1 ? "entry" : "entries"}.</>);
    if (safest && catHit(safest.cat) != null) footnotes.push(<>Safest bet: <b style={{ color:inkHi, fontWeight:"600" }}>{safest.cat}</b>: {catHit(safest.cat)}% loved or liked.</>);
    if (harshest && harshest.cat !== safest?.cat) footnotes.push(<>Harshest on: <b style={{ color:inkHi, fontWeight:"600" }}>{harshest.cat}</b>: {catHit(harshest.cat)}% loved or liked.</>);
    if (revisitedLogs.length > 0) footnotes.push(<>{revisitedLogs.length} {revisitedLogs.length === 1 ? "entry" : "entries"} revisited; <b style={{ color:inkHi, fontWeight:"600" }}>{verdictsChanged} {verdictsChanged === 1 ? "verdict" : "verdicts"} changed</b> with time.</>);
    const LeaderRow = ({ label, pct, val, onClick }) => (
      <div onClick={onClick} style={{ display:"flex", alignItems:"baseline", gap:"8px", padding:"7px 0", cursor:"pointer" }}>
        <span style={{ fontSize:"13.5px", color:inkBody, letterSpacing:"-0.01em", flexShrink:0 }}>{label}</span>
        <span style={{ flex:1, borderBottom:`1px dotted ${dotted}`, transform:"translateY(-3px)" }}/>
        <span style={{ fontSize:"11px", color:inkLow, width:"38px", textAlign:"right", flexShrink:0, fontVariantNumeric:"tabular-nums" }}>{pct}%</span>
        <span style={{ fontFamily:serif, fontSize:"15px", color:heroText, flexShrink:0, fontVariantNumeric:"tabular-nums", minWidth:"26px", textAlign:"right" }}>{val}</span>
      </div>
    );

    return (
      <div style={{ padding:"0 0 100px" }}>
        {/* ── HERO ── */}
        <div style={{ position:"relative", overflow:"hidden", padding:"34px 22px 32px", marginBottom:"4px" }}>
          {heroArt ? (
            <img src={heroArt} alt="" aria-hidden="true" style={{ position:"absolute", top:"-30%", left:"-15%", width:"130%", height:"150%", objectFit:"cover", filter:"blur(48px) saturate(1.2)", opacity:darkMode ? 0.45 : 0.4, transform:"translateZ(0)", pointerEvents:"none" }}/>
          ) : (
            <div style={{ position:"absolute", inset:"-60px", background:"radial-gradient(ellipse 70% 55% at 75% 8%, rgba(196,138,63,0.45), transparent 60%), radial-gradient(ellipse 60% 45% at 15% 22%, rgba(96,58,38,0.5), transparent 65%)", filter:"blur(30px)", pointerEvents:"none" }}/>
          )}
          <div style={{ position:"absolute", inset:0, background:`linear-gradient(180deg, rgba(${fadeRGB},0.08) 0%, rgba(${fadeRGB},0.5) 55%, rgba(${fadeRGB},0.92) 88%, ${theme.bg} 100%)`, pointerEvents:"none" }}/>
          <div style={{ position:"relative" }}>
            <div style={{ fontSize:"10.5px", letterSpacing:"0.22em", textTransform:"uppercase", color:heroDim, fontWeight:"600", marginBottom:"12px" }}>{todayLabel}</div>
            <div style={{ fontSize:"34px", fontWeight:"700", letterSpacing:"-0.035em", lineHeight:"1.05", color:heroText, marginBottom:"10px" }}>
              Did I Like It<span style={{ color:"#d4a843" }}>?</span>
            </div>
            <div style={{ fontSize:"13.5px", color:heroDim, letterSpacing:"-0.01em", lineHeight:"1.5", marginBottom:"28px", maxWidth:"320px" }}>{insight}</div>
            <div style={{ display:"flex", gap:"10px" }}>
              <button onClick={() => setShowQuickLog(true)} style={{ flex:1, padding:"16px 0", borderRadius:"100px", border:"none", textAlign:"center", fontSize:"14.5px", fontWeight:"600", letterSpacing:"-0.015em", cursor:"pointer", fontFamily:"inherit", background:darkMode ? "#f5f5f3" : "#141414", color:darkMode ? "#0a0a0a" : "#f5f5f3", boxShadow:darkMode ? "0 8px 28px rgba(0,0,0,0.45)" : "0 8px 24px rgba(0,0,0,0.2)" }}>
                Quick log
              </button>
              <button onClick={() => setActiveTab("log")} style={{ flex:1, padding:"16px 0", borderRadius:"100px", textAlign:"center", fontSize:"14.5px", fontWeight:"600", letterSpacing:"-0.015em", cursor:"pointer", fontFamily:"inherit", background:darkMode ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)", color:heroText, border:`1px solid ${darkMode ? "rgba(255,255,255,0.16)" : "rgba(0,0,0,0.15)"}`, backdropFilter:"blur(14px)", WebkitBackdropFilter:"blur(14px)" }}>
                Full log
              </button>
            </div>
          </div>
        </div>

        {/* ── RECENTLY LOGGED (shelf) ── */}
        {recentLogs.length > 0 && (
          <div style={{ marginBottom:"6px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", padding:"8px 22px 14px" }}>
              <div style={{ fontSize:"11px", fontWeight:"600", color:theme.subtext, letterSpacing:"0.18em", textTransform:"uppercase" }}>Recently logged</div>
              <button onClick={() => setActiveTab("history")} style={{ background:"none", border:"none", color:theme.subtext, fontSize:"12px", fontWeight:"500", cursor:"pointer", padding:0 }}>View all</button>
            </div>
            <div style={{ display:"flex", gap:"14px", overflowX:"auto", padding:"4px 22px 26px", scrollbarWidth:"none", WebkitOverflowScrolling:"touch", scrollSnapType:"x proximity" }}>
              {recentLogs.map((log, idx) => {
                const sv = SHELF_VERDICTS[log.verdict] || { label:"", dot:"#777" };
                const featured = idx === 0;
                const catColor = CATEGORIES[getCat(log.media_type)]?.color || "#888";
                return (
                  <div key={log.id} onClick={() => { setHistoryDisplay("compact"); setActiveTab("history"); setDeepLinkOpenId(log.id); }}
                    style={{ flexShrink:0, width:featured ? "148px" : "124px", cursor:"pointer", scrollSnapAlign:"start" }}>
                    <div style={{ position:"relative", width:"100%", aspectRatio:"2/3", borderRadius:"12px", overflow:"hidden", marginBottom:"10px", border:`1px solid ${darkMode ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.08)"}`, boxShadow:darkMode ? "0 16px 34px rgba(0,0,0,0.55)" : "0 12px 28px rgba(0,0,0,0.16)", background:darkMode ? "#141414" : "#e8e8e8" }}>
                      <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", background:`linear-gradient(160deg, ${catColor}38, ${catColor}0d)` }}>
                        <span style={{ fontFamily:"Georgia, 'Times New Roman', serif", fontSize:featured ? "42px" : "36px", color:`${catColor}cc`, lineHeight:1 }}>{(log.title || "?").charAt(0).toUpperCase()}</span>
                      </div>
                      {log.artwork && <img src={log.artwork} alt="" style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover", display:"block" }} onError={e => e.target.style.display="none"}/>}
                      <div style={{ position:"absolute", inset:0, background:"linear-gradient(165deg, rgba(255,255,255,0.10) 0%, transparent 38%)", pointerEvents:"none" }}/>
                      {featured && (
                        <div style={{ position:"absolute", top:"9px", left:"9px", fontSize:"9px", fontWeight:"700", letterSpacing:"0.14em", textTransform:"uppercase", color:"rgba(245,245,243,0.92)", background:"rgba(8,8,8,0.55)", backdropFilter:"blur(8px)", WebkitBackdropFilter:"blur(8px)", padding:"4px 8px", borderRadius:"20px", border:"1px solid rgba(255,255,255,0.14)" }}>Latest</div>
                      )}
                    </div>
                    <div style={{ fontSize:featured ? "14px" : "13px", fontWeight:"600", letterSpacing:"-0.01em", color:theme.text, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", marginBottom:"4px" }}>{log.title}</div>
                    <div style={{ fontSize:"10px", letterSpacing:"0.08em", textTransform:"uppercase", fontWeight:"600", color:sv.gold ? "#d4a843" : theme.subtext, display:"flex", alignItems:"center", gap:"6px" }}>
                      <span style={{ width:"5px", height:"5px", borderRadius:"50%", background:sv.dot, flexShrink:0, boxShadow:sv.gold ? "0 0 8px rgba(212,168,67,0.55)" : "none" }}/>
                      <span style={{ whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{sv.label} · {log.media_type}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── ON THE GO + UP NEXT (mini shelves) ── */}
        {[
          { key:"current", title:"On the go", items:currentLogs },
          { key:"upnext",  title:"Up next",   items:queueLogs },
        ].map(sec => sec.items.length > 0 && (
          <div key={sec.key} style={{ marginBottom:"6px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", padding:"8px 22px 14px" }}>
              <div style={{ fontSize:"11px", fontWeight:"600", color:theme.subtext, letterSpacing:"0.18em", textTransform:"uppercase" }}>{sec.title}</div>
              <button onClick={() => setActiveTab("queue")} style={{ background:"none", border:"none", color:theme.subtext, fontSize:"12px", fontWeight:"500", cursor:"pointer", padding:0 }}>View all</button>
            </div>
            <div style={{ display:"flex", gap:"12px", overflowX:"auto", padding:"4px 22px 24px", scrollbarWidth:"none", WebkitOverflowScrolling:"touch", scrollSnapType:"x proximity" }}>
              {sec.items.map(log => {
                const catColor = CATEGORIES[getCat(log.media_type)]?.color || "#888";
                const prog = sec.key === "current" ? progressInfo(log) : null;
                return (
                  <div key={log.id} onClick={() => setActiveTab("queue")}
                    style={{ flexShrink:0, width:"104px", cursor:"pointer", scrollSnapAlign:"start" }}>
                    <div style={{ position:"relative", width:"100%", aspectRatio:"2/3", borderRadius:"11px", overflow:"hidden", marginBottom:"9px", border:`1px solid ${darkMode ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.08)"}`, boxShadow:darkMode ? "0 12px 26px rgba(0,0,0,0.5)" : "0 10px 22px rgba(0,0,0,0.14)", background:darkMode ? "#141414" : "#e8e8e8" }}>
                      <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", background:`linear-gradient(160deg, ${catColor}38, ${catColor}0d)` }}>
                        <span style={{ fontFamily:"Georgia, 'Times New Roman', serif", fontSize:"30px", color:`${catColor}cc`, lineHeight:1 }}>{(log.title || "?").charAt(0).toUpperCase()}</span>
                      </div>
                      {log.artwork && <img src={log.artwork} alt="" style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover", display:"block" }} onError={e => e.target.style.display="none"}/>}
                      <div style={{ position:"absolute", inset:0, background:"linear-gradient(165deg, rgba(255,255,255,0.10) 0%, transparent 38%)", pointerEvents:"none" }}/>
                      {prog?.pct != null && (
                        <div style={{ position:"absolute", bottom:0, left:0, right:0, height:"3px", background:"rgba(0,0,0,0.55)" }}>
                          <div style={{ height:"100%", width:`${prog.pct}%`, background:"rgba(255,255,255,0.9)" }}/>
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize:"12px", fontWeight:"600", letterSpacing:"-0.01em", color:theme.text, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", marginBottom:"3px" }}>{log.title}</div>
                    <div style={{ fontSize:"9.5px", letterSpacing:"0.08em", textTransform:"uppercase", fontWeight:"600", color:theme.subtext, display:"flex", alignItems:"center", gap:"5px" }}>
                      <span style={{ width:"5px", height:"5px", borderRadius:"50%", background:catColor, flexShrink:0 }}/>
                      <span style={{ whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{prog ? prog.label : log.media_type}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* ── QUIET STATS ── */}
        <div style={{ margin:"0 22px", paddingTop:"24px", borderTop:`1px solid ${theme.border}` }}>
          <div style={{ width:"28px", height:"2px", background:"#d4a843", borderRadius:"2px", marginBottom:"16px", opacity:0.85 }}/>
          <div style={{ fontSize:"13.5px", lineHeight:"2.1", color:theme.subtext, letterSpacing:"-0.005em" }}>
            <b style={{ color:theme.text, fontWeight:"600", fontVariantNumeric:"tabular-nums" }}>{totalLogged}</b> things logged {yearLabel} &nbsp;·&nbsp; <span style={{ color:"#d4a843", fontWeight:"600", fontVariantNumeric:"tabular-nums" }}>{hitRate}%</span> hit rate
            {(topCreator || stats.active > 0) && <br/>}
            {topCreator && <>Most logged: <b style={{ color:theme.text, fontWeight:"600" }}>{topCreator.name}</b></>}
            {stats.active > 0 && (
              <span onClick={() => setActiveTab("queue")} style={{ cursor:"pointer" }}>
                {topCreator ? <> &nbsp;·&nbsp; </> : null}<b style={{ color:theme.text, fontWeight:"600", fontVariantNumeric:"tabular-nums" }}>{stats.active}</b> in progress
              </span>
            )}
          </div>
          <button onClick={() => setStatsOpen(v => !v)} style={{ display:"inline-flex", alignItems:"center", gap:"7px", marginTop:"18px", fontSize:"12.5px", fontWeight:"600", fontFamily:"inherit", color:theme.subtext2, border:`1px solid ${theme.border2}`, borderRadius:"100px", padding:"10px 18px", cursor:"pointer", background:darkMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)" }}>
            {statsOpen ? "Hide stats" : "Full stats"} <span style={{ fontSize:"10px", color:theme.subtext }}>{statsOpen ? "▴" : "▾"}</span>
          </button>
        </div>

        {/* ── STATS: IN REVIEW (print report) ── */}
        {statsOpen && (<>
        <div style={{ padding:"34px 26px 0" }}>
          {/* Report header */}
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline" }}>
            <div style={{ fontFamily:serif, fontStyle:"italic", fontSize:"19px", color:inkHi }}>In review</div>
            <div style={{ display:"flex", gap:"16px", flexWrap:"wrap", justifyContent:"flex-end" }}>
              {yearTabs.map(y => (
                <button key={y} onClick={() => setStatYearFilter(y)}
                  style={{ background:"none", border:"none", padding:0, fontSize:"11px", fontWeight:"500", fontFamily:"inherit", fontVariantNumeric:"tabular-nums", color:statYearFilter === y ? heroText : inkLow, cursor:"pointer" }}>
                  {y}
                </button>
              ))}
            </div>
          </div>
          <div style={{ borderTop:`1px solid ${darkMode ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.5)"}`, borderBottom:`1px solid ${theme.border}`, height:"3px", marginTop:"16px" }}/>

          {/* Opening figure */}
          <div style={{ padding:"34px 0 28px", borderBottom:`1px solid ${theme.border}` }}>
            <div style={{ fontFamily:serif, fontSize:"92px", lineHeight:"0.9", color:heroText, fontVariantNumeric:"tabular-nums" }}>{totalLogged}</div>
            <div style={{ fontSize:"13px", color:inkMid, marginTop:"14px", lineHeight:"1.65", maxWidth:"300px" }}>
              {openCaption}{deltaText ? <>: <i style={{ fontFamily:serif, color:inkHi }}>{deltaText}</i></> : null}
            </div>
          </div>

          {/* By category */}
          <div style={{ padding:"24px 0", borderBottom:`1px solid ${theme.border}` }}>
            <div style={{ ...capsStyle, marginBottom:"14px" }}>By category</div>
            {catRows.map(({ cat, total }) => (
              <LeaderRow key={cat} label={cat} pct={pctOf(total)} val={total}
                onClick={() => { setFilterCat(cat); setVerdictFilter(""); setActiveTab("history"); }}/>
            ))}
          </div>

          {/* By verdict */}
          <div style={{ padding:"24px 0", borderBottom:`1px solid ${theme.border}` }}>
            <div style={{ ...capsStyle, marginBottom:"14px" }}>By verdict</div>
            {[
              { l:"Loved",       v:"I loved it",       n:verdictTotals.loved },
              { l:"Liked",       v:"I liked it",       n:verdictTotals.liked },
              { l:"Meh",         v:"Meh",              n:verdictTotals.meh },
              { l:"Didn't like", v:"I didn't like it", n:verdictTotals.no },
            ].map(row => (
              <LeaderRow key={row.v} label={row.l} pct={pctOf(row.n)} val={row.n}
                onClick={() => { setFilterCat("All"); setVerdictFilter(row.v); setActiveTab("history"); }}/>
            ))}
          </div>

          {/* Hit rate */}
          <div style={{ padding:"26px 0", borderBottom:`1px solid ${theme.border}`, display:"flex", alignItems:"baseline", justifyContent:"space-between" }}>
            <div style={{ fontFamily:serif, fontSize:"56px", lineHeight:1, color:"#d4a843", fontVariantNumeric:"tabular-nums" }}>{hitRate}%</div>
            <div style={{ fontSize:"12.5px", color:inkMid, textAlign:"right", lineHeight:"1.65" }}>
              hit rate:<br/><b style={{ color:inkHi, fontWeight:"600" }}>{hitCount} of {totalLogged}</b> loved or liked
            </div>
          </div>

          {/* Rhythm */}
          <div style={{ padding:"26px 0", borderBottom:`1px solid ${theme.border}` }}>
            <div style={{ ...capsStyle, marginBottom:"18px" }}>Rhythm</div>
            <div style={{ display:"flex", alignItems:"flex-end", gap:"6px", height:"54px" }}>
              {last12.map((m, i) => {
                const isPeak = topMonth && m.key === topMonth[0];
                return (
                  <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", gap:"7px", height:"100%" }}>
                    <div style={{ flex:1, display:"flex", alignItems:"flex-end" }}>
                      <div style={{ width:"100%", height:`${Math.max(4,(m.count/maxMonth)*100)}%`, minHeight:"2px", background:isPeak ? heroText : (darkMode ? "rgba(245,245,243,0.16)" : "rgba(20,20,20,0.16)") }}/>
                    </div>
                    <div style={{ fontSize:"8px", color:isPeak ? inkHi : inkLow, fontWeight:"500", textAlign:"center" }}>{m.label}</div>
                  </div>
                );
              })}
            </div>
            {topMonth && (
              <div style={{ fontSize:"12.5px", color:inkMid, lineHeight:"1.65", marginTop:"12px" }}>
                <i style={{ fontFamily:serif, color:inkHi }}>{topMonth[0].split(" ")[0]} was the peak</i>: {topMonth[1]} {topMonth[1] === 1 ? "thing" : "things"} in one month.
              </div>
            )}
          </div>

          {/* Footnotes */}
          {footnotes.length > 0 && (
            <div style={{ padding:"24px 0 0" }}>
              <div style={{ ...capsStyle, marginBottom:"12px" }}>Footnotes</div>
              {footnotes.map((fn, i) => (
                <div key={i} style={{ display:"flex", gap:"10px", padding:"6px 0", fontSize:"12.5px", lineHeight:"1.65", color:inkMid }}>
                  <span style={{ fontFamily:serif, fontSize:"11px", color:inkLow, flexShrink:0, paddingTop:"1px" }}>{i+1}</span>
                  <div>{fn}</div>
                </div>
              ))}
            </div>
          )}

          {/* Deep dive */}
          <div onClick={() => setDeepDiveOpen(v => !v)}
            style={{ marginTop:"30px", paddingTop:"18px", borderTop:`1px solid ${theme.border}`, display:"flex", justifyContent:"space-between", alignItems:"baseline", cursor:"pointer", fontSize:"12px", color:inkLow }}>
            <span><span style={{ textDecoration:"underline", textDecorationColor:dotted, textUnderlineOffset:"3px" }}>Deep dive</span>: genome, radar, heatmap, DNA, oracle</span>
            <span>{deepDiveOpen ? "▴" : "▾"}</span>
          </div>

          {deepDiveOpen && (<div style={{ marginTop:"22px" }}>
          {/* GENOME */}
          <TasteGenome logs={logs} theme={theme} darkMode={darkMode} statYearFilter={statYearFilter}/>

          {/* RADAR */}
          <TasteRadar logs={logs} theme={theme} darkMode={darkMode} statYearFilter={statYearFilter}/>

          <div style={{ marginBottom:"10px" }}><ActivityCalendar logs={logs} theme={theme} darkMode={darkMode}/></div>
          <GenreDNA logs={logs} theme={theme} darkMode={darkMode} statYearFilter={statYearFilter}/>
          
          {/* ORACLE */}
          <div style={{ marginTop:"10px" }}>
            <TasteOracle logs={logs} theme={theme} darkMode={darkMode} statYearFilter={statYearFilter}/>
          </div>
          </div>)}
        </div>
        </>)}
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

        {/* ── RECOMMENDED BY ── */}
        <div style={{ marginBottom:"12px" }}>
          <label style={{ fontSize:"10px", fontWeight:"700", color:theme.subtext, letterSpacing:"0.08em", textTransform:"uppercase", display:"block", marginBottom:"6px" }}>
            👤 Recommended by <span style={{ fontWeight:400, textTransform:"none", letterSpacing:0, color:theme.subtext }}>(optional)</span>
          </label>
          <input
            type="text"
            placeholder="e.g. Jack, Chris, Mum…"
            value={recommendedBy}
            onChange={e => setRecommendedBy(e.target.value)}
            style={{ ...inputStyle, marginBottom:0 }}
          />
        </div>

        {/* Notes */}
        {(() => {
          const TEMPLATES = [
            {
              label: "3 thoughts",
              icon: "✦",
              text: "1. \n\n2. \n\n3. ",
            },
            {
              label: "5 thoughts",
              icon: "✦✦",
              text: "1. \n\n2. \n\n3. \n\n4. \n\n5. ",
            },
            {
              label: "Liked / didn't",
              icon: "±",
              text: "What I liked:\n\nWhat I didn't:\n",
            },
            {
              label: "Would I return?",
              icon: "↩",
              text: "Would I return / recommend?\n\nWhy:\n",
            },
            {
              label: "One image",
              icon: "◎",
              text: "The image that stays with me:\n\n",
            },
            {
              label: "Changed me?",
              icon: "△",
              text: "Did it change how I see something?\n\n",
            },
          ];

          const applyTemplate = (tpl) => {
            if (notes && notes.trim()) {
              if (!window.confirm("Replace your current notes with this template?")) return;
            }
            setNotes(tpl.text);
            setTimeout(() => {
              const ta = textareaRef.current;
              if (!ta) return;
              ta.focus();
              // Place cursor at the first meaningful position
              const pos = tpl.text.indexOf("\n") !== -1 ? tpl.text.indexOf("\n") : tpl.text.length;
              ta.setSelectionRange(pos, pos);
            }, 50);
          };

          return (
            <div style={{ marginBottom:"8px" }}>
              <label style={{ fontSize:"10px", fontWeight:"700", color:theme.subtext, letterSpacing:"0.08em", textTransform:"uppercase", display:"block", marginBottom:"6px" }}>
                Thoughts (optional)
              </label>
              {/* Template pills — always visible */}
              <div style={{ display:"flex", gap:"5px", flexWrap:"wrap", marginBottom:"8px" }}>
                {TEMPLATES.map(tpl => (
                  <button key={tpl.label} onClick={() => applyTemplate(tpl)}
                    style={{
                      fontSize:"10px", padding:"4px 10px", borderRadius:"20px",
                      border:`1px solid ${theme.border2}`,
                      background: notes && notes === tpl.text ? (darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)") : "none",
                      color: theme.subtext, cursor:"pointer", whiteSpace:"nowrap",
                      display:"flex", alignItems:"center", gap:"4px",
                    }}>
                    <span style={{ opacity:0.5 }}>{tpl.icon}</span> {tpl.label}
                  </button>
                ))}
              </div>
              <textarea ref={textareaRef} placeholder="How did it make you feel? What stuck with you?…"
                value={notes} onChange={e => setNotes(e.target.value)}
                style={{ ...inputStyle, height:"60px", overflow:"hidden", resize:"none", marginBottom:0,
                  fontSize:"15px", lineHeight:"1.7", fontStyle: notes ? "italic" : "normal",
                  transition:"font-style 0.2s" }}/>
            </div>
          );
        })()}

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

        {formError && (
          <div style={{ padding:"10px 12px", background:"rgba(231,76,60,0.12)", color:"#e74c3c", border:"1px solid rgba(231,76,60,0.25)", borderRadius:"10px", fontSize:"13px", marginBottom:"8px" }}>
            {formError}
          </div>
        )}
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
                        <button onClick={e => { e.stopPropagation(); handleDeleteCollection(coll.id); }} style={{ background:"none", border:"none", color:"#e74c3c", fontSize:"16px", cursor:"pointer", padding:"4px" }}>🗑</button>
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
                                    onRevisit={openRevisit}
                                    onEditRevisit={handleEditRevisit}
                                    onDeleteRevisit={handleDeleteRevisit}
                                    searchTerm=""
                                  />
                                : <div style={{ padding:"12px" }}>
                                    <EditorialFeed
                                      logs={collLogs}
                                      theme={theme} darkMode={darkMode} getVerdictStyle={gvs}
                                      searchTerm="" collections={collections}
                                      onMapClick={handleMapClick} onNotesUpdate={handleUpdateNotes}
                                      onEdit={log => startEdit(log)} onDelete={id => handleDelete(id)}
                                      onRevisit={openRevisit}
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
            onRevisit={openRevisit}
            onEditRevisit={handleEditRevisit}
            onDeleteRevisit={handleDeleteRevisit}
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
            onRevisit={openRevisit}
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
                      // Odd-indexed parts are the captured matches from split(); even-indexed are non-matches.
                      return parts.map((p, i) =>
                        i % 2 === 1 ? <mark key={i} style={{ background:"rgba(241,196,15,0.3)", color:"#f1c40f", borderRadius:2, padding:"0 1px" }}>{p}</mark> : p
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
            {authError && <div style={{ padding:"10px", background:"rgba(231,76,60,0.15)", color:"#e74c3c", border:"1px solid rgba(231,76,60,0.3)", borderRadius:"8px", fontSize:"12px", marginBottom:"14px", textAlign:"center" }}>{authError}</div>}
            <p style={{ fontSize:"11px", textAlign:"center", color:theme.subtext, marginBottom:"18px" }}>{logs.length>0&&!user ? "Your guest entries will sync on login." : "Access your logs anywhere."}</p>
            {!forgotPasswordMode && <button onClick={() => supabase.auth.signInWithOAuth({ provider:"google" })} style={{ width:"100%", padding:"12px", borderRadius:"10px", border:"none", background:"#fff", color:"#000", fontWeight:"600", cursor:"pointer", marginBottom:"16px", fontSize:"14px" }}>Continue with Google</button>}
            <form onSubmit={handleAuth}>
              <input
                type="email" placeholder="Email" required
                value={authEmail} onChange={e => setAuthEmail(e.target.value)}
                style={inputStyle}
              />
              {!forgotPasswordMode && (
                <input
                  type="password" placeholder="Password" required
                  value={authPassword} onChange={e => setAuthPassword(e.target.value)}
                  style={inputStyle}
                />
              )}
              {!forgotPasswordMode && <button type="submit" style={{ width:"100%", padding:"12px", borderRadius:"10px", border:"none", background:"#3498db", color:"#fff", fontWeight:"600", cursor:"pointer", fontSize:"14px" }}>{isSignUp ? "Sign up" : "Login"}</button>}
            </form>
            {!isSignUp && (
              <button onClick={handleForgotPassword} style={{ background:"none", border:"none", color:"#3498db", cursor:"pointer", fontSize:"12px", display:"block", margin:"10px auto 0", fontWeight:"600" }}>
                {forgotPasswordMode ? "Send reset email →" : "Forgot password?"}
              </button>
            )}
            {forgotPasswordMode && <button onClick={() => { setForgotPasswordMode(false); setAuthError(""); }} style={{ background:"none", border:"none", color:theme.subtext, cursor:"pointer", fontSize:"12px", display:"block", margin:"8px auto 0" }}>← Back to login</button>}
            {!forgotPasswordMode && <button onClick={() => { setIsSignUp(v=>!v); setAuthMsg(""); setAuthError(""); }} style={{ background:"none", border:"none", color:"#3498db", cursor:"pointer", fontSize:"12px", display:"block", margin:"12px auto 0", fontWeight:"600" }}>{isSignUp ? "Already have an account? Login" : "Need an account? Sign up"}</button>}
            <button onClick={() => { setShowAuthModal(false); setForgotPasswordMode(false); setAuthError(""); }} style={{ background:"none", border:"none", color:theme.subtext, cursor:"pointer", fontSize:"12px", display:"block", margin:"12px auto 0" }}>Close</button>
          </div>
        </div>
      )}

      {/* ── SETTINGS ── */}
      {/* ── REVISIT SHEET ── */}
      {revisitLog && (
        <div onClick={closeRevisit} style={{ position:"fixed", top:0, left:0, right:0, bottom:0, background:"rgba(0,0,0,0.65)", backdropFilter:"blur(6px)", WebkitBackdropFilter:"blur(6px)", zIndex:500, display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
          <div onClick={e => e.stopPropagation()} style={{ background:theme.card, borderRadius:"20px 20px 0 0", width:"100%", maxWidth:"500px", padding:"20px 20px 40px", border:`1px solid ${theme.border2}` }}>
            <div style={{ width:"36px", height:"4px", background:theme.border2, borderRadius:"2px", margin:"0 auto 20px" }}/>
            <div style={{ fontSize:"10.5px", letterSpacing:"0.18em", textTransform:"uppercase", color:"#d4a843", fontWeight:"600", marginBottom:"6px" }}>Revisit</div>
            <div style={{ fontSize:"19px", fontWeight:"700", letterSpacing:"-0.02em", color:theme.text, marginBottom:"4px" }}>{revisitLog.title}</div>
            <div style={{ fontSize:"12.5px", color:theme.subtext, marginBottom:"18px" }}>
              How do you feel about it now? Your earlier verdict stays in the timeline.
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px" }}>
              {["I loved it","I liked it","Meh","I didn't like it"].map(v => {
                const vs = gvs(v);
                const active = revisitVerdict === v;
                return (
                  <button key={v} onClick={() => setRevisitVerdict(v)}
                    style={{ padding:"13px 8px", borderRadius:"12px", border:`1px solid ${active ? vs.border : theme.border}`, background:active ? vs.bg : "none", color:active ? vs.color : theme.subtext2, fontWeight:"600", fontSize:"12.5px", cursor:"pointer", fontFamily:"inherit", transition:"all 0.15s" }}>
                    {v}
                  </button>
                );
              })}
            </div>
            <textarea value={revisitThoughts} onChange={e => setRevisitThoughts(e.target.value)} placeholder="New thoughts… (optional)"
              style={{ width:"100%", minHeight:"84px", marginTop:"12px", padding:"12px 14px", borderRadius:"12px", border:`1px solid ${theme.border}`, background:theme.input, color:theme.text, fontSize:"13px", lineHeight:"1.5", fontFamily:"inherit", outline:"none", resize:"vertical", boxSizing:"border-box" }}/>
            <div style={{ display:"flex", gap:"10px", marginTop:"14px" }}>
              <button onClick={closeRevisit} style={{ flex:1, padding:"14px 0", borderRadius:"100px", border:`1px solid ${theme.border2}`, background:"none", color:theme.subtext2, fontWeight:"600", fontSize:"13.5px", cursor:"pointer", fontFamily:"inherit" }}>Cancel</button>
              <button onClick={saveRevisit} disabled={!revisitVerdict}
                style={{ flex:1, padding:"14px 0", borderRadius:"100px", border:"none", background:revisitVerdict ? (darkMode ? "#f5f5f3" : "#141414") : theme.border, color:revisitVerdict ? (darkMode ? "#0a0a0a" : "#f5f5f3") : theme.subtext, fontWeight:"600", fontSize:"13.5px", cursor:revisitVerdict ? "pointer" : "default", fontFamily:"inherit" }}>
                Save revisit
              </button>
            </div>
          </div>
        </div>
      )}

      {showSettings && (
        <div onClick={() => setShowSettings(false)} style={{ position:"fixed", top:0, left:0, right:0, bottom:0, background:"rgba(0,0,0,0.6)", zIndex:200, display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
          <div onClick={e => e.stopPropagation()} style={{ background:theme.card, borderRadius:"20px 20px 0 0", width:"100%", maxWidth:"500px", padding:"20px 20px 40px", border:`1px solid ${theme.border2}` }}>
            <div style={{ width:"36px", height:"4px", background:theme.border2, borderRadius:"2px", margin:"0 auto 20px" }}/>
            <div style={{ fontSize:"16px", fontWeight:"700", marginBottom:"20px", color:theme.text }}>Settings</div>
            {[
              { label:"Your name", sub:"Used in your home page insights", right:<input value={customName} onChange={e => setCustomName(e.target.value)} onBlur={saveName} placeholder="Add name" style={{ width:"130px", padding:"7px 12px", borderRadius:"20px", border:`1px solid ${theme.border2}`, background:"none", color:theme.text, fontSize:"12px", outline:"none", textAlign:"right", flexShrink:0, fontFamily:"inherit" }}/> },
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
            const savedId = lastQuickLogEntry?.id;
            const target = (savedId && savedId !== "latest")
              ? logs.find(l => l.id === savedId)
              : logs[0];
            if (target) startEdit(target);
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

      {/* ── APP ERROR TOAST ── */}
      {appError && (
        <div style={{ position:"fixed", bottom:"80px", left:"50%", transform:"translateX(-50%)", background:"#c0392b", color:"#fff", padding:"12px 16px", borderRadius:"14px", display:"flex", alignItems:"center", gap:"12px", zIndex:150, boxShadow:"0 4px 20px rgba(0,0,0,0.4)", fontSize:"13px", fontWeight:"500", maxWidth:"90vw" }}>
          <span>{appError}</span>
          <button onClick={() => setAppError("")} style={{ background:"rgba(255,255,255,0.2)", border:"none", color:"#fff", padding:"4px 10px", borderRadius:"6px", cursor:"pointer", fontSize:"12px", fontWeight:"700" }}>✕</button>
        </div>
      )}
    </div>
  );
}
