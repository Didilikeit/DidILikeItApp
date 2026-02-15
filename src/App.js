import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

// --- SUPABASE SETUP ---
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- GLOBAL HELPER: BULLETPROOF HIGHLIGHTING --- [cite: 3]
const getHighlightedText = (content, term) => {
  if (!term || !content) return content;
  
  // Clean the term for highlighting: remove the leading/trailing quotes if present
  // but keep the internal text for matching
  const highlightTerm = term.replace(/^"|"$/g, '');
  if (!highlightTerm) return content;

  const escapedTerm = highlightTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = content.toString().split(new RegExp(`(${escapedTerm})`, "gi"));
  
  return parts.map((part, i) => 
    part.toLowerCase() === highlightTerm.toLowerCase() 
      ? <mark key={i} style={{ backgroundColor: "#f1c40f", color: "#000", borderRadius: "2px", padding: "0 2px" }}>{part}</mark> 
      : part
  );
};

// --- COMPONENT: EXPANDABLE NOTE --- [cite: 3-8]
const ExpandableNote = ({ text, isDarkMode, searchTerm }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const isLong = text.length > 120;
  const displayedText = isLong && !isExpanded ? text.substring(0, 120) + "..." : text;

  return (
    <div style={{ 
      marginTop: "10px", 
      padding: "12px", 
      background: isDarkMode ? "#2d2d2d" : "#f9f9f9", 
      borderRadius: "8px", 
      fontSize: "14px", 
      fontStyle: "italic", 
      borderLeft: `4px solid ${isDarkMode ? "#444" : "#ddd"}`,
      color: isDarkMode ? "#bbb" : "#555"
    }}>
      "{getHighlightedText(displayedText, searchTerm)}"
      {isLong && (
        <button 
          onClick={() => setIsExpanded(!isExpanded)} 
          style={{ background: "none", border: "none", fontSize: "12px", cursor: "pointer", color: "#3498db", fontWeight: "bold", marginLeft: "8px", textDecoration: "underline" }}
        >
          {isExpanded ? "Less" : "More"}
        </button>
      )}
    </div>
  );
};

export default function DidILikeItUltimate() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState([]); // [cite: 10]
  
  // Auth Modal State [cite: 10-11]
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [authMsg, setAuthMsg] = useState(""); 

  // Theme State [cite: 11]
  const [darkMode, setDarkMode] = useState(localStorage.getItem("dark_mode") === "true");

  // Form State [cite: 12-14]
  const [title, setTitle] = useState("");
  const [creator, setCreator] = useState("");
  const [notes, setNotes] = useState("");
  const [mediaType, setMediaType] = useState("Movie");
  const [verdict, setVerdict] = useState("");
  const [year, setYear] = useState("");
  const [manualDate, setManualDate] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [isSaving, setIsSaving] = useState(false); // New Improvement

  // UI/Filter State [cite: 14-16]
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMedium, setFilterMedium] = useState("All");
  const [filterDate, setFilterDate] = useState("All");
  const [verdictFilter, setVerdictFilter] = useState("");
  const [sortBy, setSortBy] = useState("Date"); 
  const [statYearFilter, setStatYearFilter] = useState(new Date().getFullYear().toString());
  const [viewMode, setViewMode] = useState("History"); 
  const [showAbout, setShowAbout] = useState(false);
const [filterMonth, setFilterMonth] = useState("All");

  // Custom Name State [cite: 17]
  const [customName, setCustomName] = useState(localStorage.getItem("user_custom_name") || "");
  const [isEditingName, setIsEditingName] = useState(false);

  const textareaRef = useRef(null); // [cite: 18]
  const listTopRef = useRef(null);
  const formRef = useRef(null); // New Improvement

  const theme = { // [cite: 18-22]
    bg: darkMode ? "#000000" : "#f4f4f4",
    card: darkMode ? "#111111" : "#ffffff",
    text: darkMode ? "#e0e0e0" : "#333333",
    border: darkMode ? "#222222" : "#000000",
    input: darkMode ? "#1a1a1a" : "#ffffff",
    subtext: darkMode ? "#888" : "#666",
    statCard: darkMode ? "#161616" : "#ffffff"
  };

  useEffect(() => {
    document.body.style.backgroundColor = theme.bg;
  }, [theme.bg]);

  // --- LOG FETCHING --- [cite: 23]
  const fetchLogs = useCallback(async (currentUser) => {
    if (!currentUser) {
      const localData = JSON.parse(localStorage.getItem("guest_logs") || "[]");
      setLogs(localData);
      return;
    }
    const { data, error } = await supabase.from("logs").select("*").order("logged_at", { ascending: false });
    if (!error) setLogs(data || []);
  }, []);

  // --- MERGE LOGIC --- [cite: 24]
  const mergeGuestData = useCallback(async (userId) => {
    const localData = JSON.parse(localStorage.getItem("guest_logs") || "[]");
    if (localData.length === 0) return;

    const logsToUpload = localData.map(({ id, ...rest }) => ({
      ...rest,
      user_id: userId
    }));

    const { error } = await supabase.from("logs").insert(logsToUpload);
    if (!error) {
      localStorage.removeItem("guest_logs");
      fetchLogs(userId);
    }
  }, [fetchLogs]);

  // --- AUTH & DATA INITIALIZATION --- [cite: 25-28]
  useEffect(() => {
    localStorage.setItem("dark_mode", darkMode);
  }, [darkMode]);

useEffect(() => {
    // 1. Initial Session Check
    const initializeApp = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const activeUser = session?.user ?? null;
        setUser(activeUser);
        await fetchLogs(activeUser);
      } catch (err) {
        console.error("Initialization error:", err);
        fetchLogs(null); // Fallback to guest data
      } finally {
        setLoading(false); // GUARANTEED to turn off loading screen
      }
    };

    initializeApp();

    // 2. Listen for Auth Changes (Login/Logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const activeUser = session?.user ?? null;
      setUser(activeUser);
      
      if (activeUser) {
        setShowAuthModal(false);
        setAuthMsg(""); 
        await fetchLogs(activeUser); // Refresh logs for the new user
        await mergeGuestData(activeUser.id);
      } else {
        fetchLogs(null); // Revert to guest logs on logout
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchLogs, mergeGuestData]);

  // AUTH HANDLERS [cite: 29-34]
  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthMsg("");
    const email = e.target.email.value;
    const password = e.target.password.value;

    if (isSignUp) {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        alert(error.message);
      } else if (data?.user && data?.session === null) {
        setAuthMsg("Check your email to verify your account!");
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) alert(error.message);
    }
  };

  const handleForgotPassword = async () => { // [cite: 34-36]
    const email = prompt("Enter your email address for a reset link:");
    if (!email) return;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    if (error) alert(error.message);
    else alert("Reset email sent!");
  };

  const handleDeleteAccount = async () => { // [cite: 36-41]
    const confirmWipe = window.confirm(
      "WARNING: This will permanently delete your account and ALL your media logs. This cannot be undone. Proceed?"
    );
    if (!confirmWipe) return;

    if (user) {
      const { error } = await supabase.rpc('delete_user_account');
      if (error) {
        alert("Error deleting account: " + error.message);
      } else {
        await supabase.auth.signOut();
        alert("Your account and data have been permanently deleted.");
        window.location.reload(); 
      }
    } else {
      localStorage.removeItem("guest_logs");
      fetchLogs(null);
      alert("Guest data cleared.");
    }
  };

  useEffect(() => { // [cite: 41]
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "60px";
      const scrollHeight = textarea.scrollHeight;
      textarea.style.height = scrollHeight + "px";
    }
  }, [notes]);

  const handleStatClick = (type, mode = "History") => { // [cite: 42-43]
    setFilterMedium(type);
    setViewMode(mode);
    setSearchTerm("");
    setTimeout(() => listTopRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  const handleSave = async () => {
        const trimmedTitle = title.trim();
        if (!trimmedTitle || !verdict) return alert("Title and Verdict required!");

        // FIX: Convert year to string before checking length
        const yearStr = year ? year.toString() : "";
        if (yearStr && (yearStr.length !== 4 || isNaN(yearStr))) {
            return alert("Please enter a valid 4-digit year.");
        }

    setIsSaving(true);
    
    // Determine if this is moving from Queue/Reading to a finished state
    const isFinishedVerdict = ["I loved it", "I liked it", "Meh", "I didn't like it"].includes(verdict);
    
    const logData = { 
      title: trimmedTitle, 
      creator: creator.trim(), 
      notes: notes.trim(), 
      media_type: mediaType, 
      verdict, 
      year_released: year || null,
      // If manually set, use that. If moving to History, set to NOW. Otherwise, let it stay.
      ...(manualDate ? { logged_at: new Date(manualDate).toISOString() } : 
         (isFinishedVerdict ? { logged_at: new Date().toISOString() } : {}))
    };

    try {
      if (user) {
        const { error } = editingId 
          ? await supabase.from("logs").update(logData).eq("id", editingId)
          : await supabase.from("logs").insert([{ ...logData, user_id: user.id, logged_at: logData.logged_at || new Date().toISOString() }]);
        if (error) throw error;
        fetchLogs(user);
      } else {
        let currentLogs = JSON.parse(localStorage.getItem("guest_logs") || "[]");
        if (editingId) {
          currentLogs = currentLogs.map(l => l.id === editingId ? { ...l, ...logData } : l);
        } else {
          currentLogs.unshift({ ...logData, id: Date.now().toString(), logged_at: logData.logged_at || new Date().toISOString() });
        }
        localStorage.setItem("guest_logs", JSON.stringify(currentLogs));
        fetchLogs(null);
      }
      resetForm();
    } catch (err) {
      alert(err.message);
    } finally {
      setIsSaving(false); // Change this to FALSE
    }
  };

  const resetForm = () => { // [cite: 52]
    setTitle(""); setCreator(""); setNotes(""); setYear(""); setVerdict(""); setManualDate("");
    setEditingId(null);
  };

  const deleteLog = async (id) => { // [cite: 53-55]
    if (window.confirm("Permanently delete this entry?")) {
      if (user) {
        await supabase.from("logs").delete().eq("id", id);
      } else {
        const currentLogs = JSON.parse(localStorage.getItem("guest_logs") || "[]");
        localStorage.setItem("guest_logs", JSON.stringify(currentLogs.filter(l => l.id !== id)));
      }
      fetchLogs(user);
    }
  };

  const saveName = () => { // [cite: 56]
    localStorage.setItem("user_custom_name", customName.trim());
    setIsEditingName(false);
  };

  const exportCSV = () => { // [cite: 57-58]
    const headers = ["Title", "Creator", "Type", "Verdict", "Year", "Notes", "Date"];
    const rows = logs.map(l => [`"${l.title}"`, `"${l.creator}"`, l.media_type, l.verdict, l.year_released || "", `"${(l.notes || "").replace(/"/g, '""')}"`, new Date(l.logged_at).toLocaleDateString()]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = "my-media-log.csv"; link.click();
  };

  const getMediaStyle = (type) => { // [cite: 58-59]
    switch(type) {
      case 'Book': return { color: '#3498db', icon: '📖', creatorLabel: 'Author' };
      case 'Movie': return { color: '#9b59b6', icon: '🎬', creatorLabel: 'Director' };
      case 'Album': return { color: '#1abc9c', icon: '💿', creatorLabel: 'Artist/Band' };
      default: return { color: '#95a5a6', icon: '📎', creatorLabel: 'Creator' };
    }
  };

  const getVerdictStyle = (v) => { // [cite: 59-73]
    const isDark = darkMode;
    switch(v) {
      case "I loved it": 
        return { bg: isDark ? "rgba(255, 215, 0, 0.15)" : "#fff9c4", color: isDark ? "#f1c40f" : "#9a7d0a", border: isDark ? "#f1c40f" : "#fbc02d", emoji: "⭐" };
      case "I liked it": 
        return { bg: isDark ? "rgba(76, 175, 80, 0.2)" : "#e8f5e9", color: isDark ? "#81c784" : "#2e7d32", border: isDark ? "#4caf50" : "#c8e6c9", emoji: "🟢" };
      case "Meh": 
        return { bg: isDark ? "rgba(255, 152, 0, 0.2)" : "#fff3e0", color: isDark ? "#ffb74d" : "#ef6c00", border: isDark ? "#ff9800" : "#ffe0b2", emoji: "🟡" };
      case "I didn't like it": 
        return { bg: isDark ? "rgba(244, 67, 54, 0.2)" : "#ffebee", color: isDark ? "#e57373" : "#c62828", border: isDark ? "#f44336" : "#ffcdd2", emoji: "🔴" };
      case "Currently Reading": 
        return { bg: isDark ? "rgba(3, 169, 244, 0.2)" : "#e1f5fe", color: isDark ? "#4fc3f7" : "#01579b", border: isDark ? "#03a9f4" : "#b3e5fc", emoji: "📖" };
      default:
        if (v && v.startsWith("Want to")) {
          return { bg: isDark ? "rgba(156, 39, 176, 0.2)" : "#f3e5f5", color: isDark ? "#ce93d8" : "#4a148c", border: isDark ? "#9c27b0" : "#e1bee7", emoji: "⏳" };
        }
        return { bg: isDark ? "#333" : "#f0f0f0", color: isDark ? "#bbb" : "#555", border: isDark ? "#444" : "#ddd", emoji: "⚪" };
    }
  };

  const availableYears = useMemo(() => {
    // Only extract years from logs that have a valid logged_at date
    const years = logs
      .map(l => l.logged_at ? new Date(l.logged_at).getFullYear().toString() : null)
      .filter(y => y && y !== "NaN"); // Filter out nulls and NaN
    
    return ["All", ...new Set(years)].sort((a, b) => b - a);
  }, [logs]);

  const stats = useMemo(() => { // [cite: 74-76]
    const categories = {
      Book: { total: 0, loved: 0, liked: 0, meh: 0, no: 0 },
      Movie: { total: 0, loved: 0, liked: 0, meh: 0, no: 0 },
      Album: { total: 0, loved: 0, liked: 0, meh: 0, no: 0 },
      active: 0, queue: 0
    };
    logs.forEach(log => {
      const logYear = new Date(log.logged_at).getFullYear().toString();
      const v = log.verdict;
      const type = log.media_type;
      if (statYearFilter !== "All" && logYear !== statYearFilter) return;
      if (v === "Currently Reading") categories.active++;
      else if (v?.startsWith("Want to")) categories.queue++;
      else if (categories[type]) {
        categories[type].total++;
        if (v === "I loved it") categories[type].loved++;
        else if (v === "I liked it") categories[type].liked++;
        else if (v === "Meh") categories[type].meh++;
        else if (v === "I didn't like it") categories[type].no++;
      }
    });
    return categories;
  }, [logs, statYearFilter]);

  const dateOptions = ["All", ...new Set(logs.map(l => new Date(l.logged_at).toLocaleString('default', { month: 'long', year: 'numeric' })))]; // [cite: 77]

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const isQueue = log.verdict && log.verdict.startsWith("Want to");
      const isActive = log.verdict === "Currently Reading";
      const logMonthYear = log.logged_at 
        ? new Date(log.logged_at).toLocaleString('default', { month: 'long', year: 'numeric' }) 
        : "";
      const yearWithBrackets = log.year_released ? `(${log.year_released})` : "";
      
      let matchesSearch = false;
      const term = searchTerm.toLowerCase().trim();
      
      if (!term) {
        matchesSearch = true;
      } else if (term.startsWith('"')) {
        // PHRASE SEARCH: Remove the first quote and optional end quote
        const phrase = term.replace(/^"|"$/g, '');
        const fieldsToSearch = [log.title, log.creator, log.notes].map(f => (f || "").toLowerCase());
        // Matches if any field contains the exact sequence typed so far
        matchesSearch = fieldsToSearch.some(f => f.includes(phrase));
      } else {
        // NORMAL SEARCH: Split by words
        const searchWords = term.split(/\s+/);
        const searchable = `${log.title} ${log.creator} ${log.notes} ${log.verdict} ${logMonthYear} ${yearWithBrackets}`.toLowerCase();
        matchesSearch = searchWords.every(word => searchable.includes(word));
      }

      const matchesMedium = filterMedium === "All" || log.media_type === filterMedium;
      const matchesVerdict = !verdictFilter || log.verdict === verdictFilter;
      const logYear = log.logged_at ? new Date(log.logged_at).getFullYear().toString() : "";
      const matchesYear = statYearFilter === "All" || logYear === statYearFilter;
      
      // NEW: Month Match Logic
      const matchesMonth = filterMonth === "All" || logMonthYear === filterMonth;

      let matchesView = searchTerm.length > 0;
      if (!matchesView) {
        if (viewMode === "Reading") matchesView = isActive;
        else if (viewMode === "Queue") matchesView = isQueue;
        else matchesView = !isActive && !isQueue;
      }

      return matchesSearch && matchesMedium && matchesVerdict && matchesYear && matchesView && matchesMonth;
    }).sort((a, b) => {
      if (sortBy === "Title") return (a.title || "").localeCompare(b.title || "");
      if (sortBy === "Verdict") {
          const order = { "I loved it": 0, "I liked it": 1, "Meh": 2, "I didn't like it": 3, "Currently Reading": 4 };
          return (order[a.verdict] ?? 99) - (order[b.verdict] ?? 99);
      }
      return new Date(b.logged_at) - new Date(a.logged_at);
    });
  }, [logs, searchTerm, filterMedium, viewMode, verdictFilter, statYearFilter, sortBy, filterMonth]);

  // UI STYLES [cite: 86-90]
const smallBtn = { 
    background: "none", 
    border: "none", // Removed the border
    padding: "5px 10px", 
    borderRadius: "15px", 
    cursor: "pointer", 
    fontSize: "12px", 
    color: theme.text,
    fontWeight: "500", // Slightly bolder text often looks better when borders are removed
    opacity: 0.8 // Softens the look slightly
  };  const primaryBtn = { width: "100%", padding: "12px", borderRadius: "10px", border: "none", fontWeight: "bold", cursor: "pointer", fontSize: "14px" };
  const verdictBtn = { padding: "10px", borderRadius: "8px", border: "1px solid", fontSize: "12px", fontWeight: "bold", cursor: "pointer", transition: "0.2s" };
  const pillBtn = { border: 'none', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' };
  const inputStyle = { width: "100%", padding: "12px", marginBottom: "12px", borderRadius: "8px", border: "1px solid", boxSizing: "border-box", fontSize: "14px", outline: "none" };

  if (loading) return <div style={{ textAlign: "center", padding: "50px", background: theme.bg, color: theme.text, minHeight: "100vh" }}>Loading...</div>; // [cite: 91]

  return (
    <div style={{ padding: "20px", maxWidth: "500px", margin: "auto", fontFamily: "sans-serif", backgroundColor: theme.bg, color: theme.text, minHeight: "100vh", transition: "0.2s all" }}>
      
      {/* HEADER [cite: 92-94] */}
      <div style={{ textAlign: "center", marginBottom: "25px" }}>
        <h2 style={{ margin: 0, fontSize: "28px" }}>🤔 Did I Like It?</h2>
        <div style={{ display: "flex", justifyContent: "center", gap: "15px", marginTop: "10px" }}>
          <button onClick={() => setDarkMode(!darkMode)} style={smallBtn}>{darkMode ? "☀️ Light" : "🌙 Dark"}</button>
          <button onClick={() => setShowAbout(!showAbout)} style={smallBtn}>{showAbout ? "Close" : "About"}</button>
          {user ? (
            <button onClick={() => supabase.auth.signOut()} style={smallBtn}>Logout</button>
          ) : (
            <button onClick={() => { setShowAuthModal(true); setAuthMsg(""); }} style={{ ...smallBtn, color: "#3498db", fontWeight: "bold" }}>☁️ Login/Sync</button>
          )}
        </div>
      </div>

      {/* AUTH MODAL [cite: 94-101] */}
      {showAuthModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.9)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div style={{ background: theme.card, padding: "30px", borderRadius: "20px", width: "100%", maxWidth: "340px", border: `1px solid ${theme.border}` }}>
            <h3 style={{ textAlign: "center", marginBottom: "10px" }}>{isSignUp ? "Create Account" : "Welcome Back"}</h3>
            {authMsg && (
              <div style={{ padding: "12px", background: "#27ae60", color: "#fff", borderRadius: "8px", fontSize: "13px", marginBottom: "15px", textAlign: "center", lineHeight: "1.4" }}>
                {authMsg}
              </div>
            )}
            <p style={{ fontSize: "11px", textAlign: "center", color: theme.subtext, marginBottom: "20px" }}>
              {logs.length > 0 && !user ? "Your guest entries will sync once you log in." : "Access your media logs anywhere."}
            </p>
            <button onClick={() => supabase.auth.signInWithOAuth({ provider: 'google' })} style={{ ...primaryBtn, background: "#fff", color: "#000", marginBottom: "20px" }}>Continue with Google</button>
            <form onSubmit={handleAuth}>
              <input name="email" type="email" placeholder="Email" required style={{ ...inputStyle, background: theme.input, color: theme.text }} />
              <input name="password" type="password" placeholder="Password" required style={{ ...inputStyle, background: theme.input, color: theme.text }} />
              <button type="submit" style={{ ...primaryBtn, background: "#3498db", color: "#fff" }}>{isSignUp ? "Sign Up" : "Login"}</button>
            </form>
            {!isSignUp && (
              <button onClick={handleForgotPassword} style={{ ...smallBtn, display: "block", margin: "10px auto 0", color: "#3498db" }}>Forgot Password?</button>
            )}
            <button onClick={() => { setIsSignUp(!isSignUp); setAuthMsg(""); }} style={{ ...smallBtn, display: "block", margin: "15px auto 0", color: "#3498db" }}>{isSignUp ? "Already have an account? Login" : "Need an account? Sign Up"}</button>
            <button onClick={() => setShowAuthModal(false)} style={{ ...smallBtn, display: "block", margin: "20px auto 0" }}>Close</button>
          </div>
        </div>
      )}

      {/* ABOUT SECTION [cite: 102-103] */}
      {showAbout && (
        <div style={{ background: theme.card, padding: "20px", borderRadius: "15px", border: `2px solid ${darkMode ? "#1a4a6e" : "#3498db"}`, marginBottom: "25px", lineHeight: "1.5" }}>
          <p style={{ fontSize: "12px", margin: "0 0 12px 0", color: theme.text }}>
            <b> Did you like it?</b> <br /><br /> Use this app to track everything you've watched, read or listened to. Or simply log everything you're currently reading or want to check out. <br /><br />
          </p>
          <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'center' }}>
            <button onClick={exportCSV} style={{ ...smallBtn, color: "#27ae60", fontWeight: "bold" }}>📥 Export CSV</button>
            <button onClick={handleDeleteAccount} style={{ ...smallBtn, color: "#ff4d4d", fontWeight: "bold", border: "1px solid #ff4d4d" }}>⚠️ Delete Account</button>
          </div>
        </div>
      )}

{/* STATS DASHBOARD */}
      <div style={{ marginBottom: '25px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
          <div>
            {isEditingName ? (
              /* Wrap the input in a form to catch the "Enter" key */
              <form 
                onSubmit={(e) => {
                  e.preventDefault(); // Prevents the page from refreshing
                  saveName();
                }}
                style={{ display: 'flex', gap: '5px', alignItems: 'center' }}
              >
                <input 
                  value={customName} 
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Enter name..."
                  style={{ 
                    ...inputStyle, 
                    width: '120px', 
                    padding: '4px 8px', 
                    fontSize: '14px', 
                    marginBottom: 0,
                    background: theme.input,
                    color: theme.text 
                  }}
                  autoFocus
                />
                <button type="submit" style={{ ...smallBtn, color: "#27ae60", padding: '4px 8px' }}>
                  ✅
                </button>
              </form>
            ) : (
              <h3 style={{ margin: 0, fontSize: '18px' }}>
                {customName ? `${customName}'s stats` : "Your stats"} 
                <button 
                  onClick={() => setIsEditingName(true)} 
                  style={{ background: 'none', border: 'none', cursor: 'pointer', marginLeft: '8px', fontSize: '14px' }}
                >
                  ✏️
                </button>
              </h3>
            )}
            
            <select 
              value={statYearFilter} 
              onChange={(e) => setStatYearFilter(e.target.value)} 
              style={{ background: 'none', border: 'none', color: '#3498db', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', outline: 'none' }}
            >
              {availableYears.map(y => <option key={y} value={y}>{y === "All" ? "All Time" : y}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
             <button 
               onClick={() => { 
                 setViewMode("Reading"); 
                 setFilterMedium("All"); 
                 setVerdictFilter(""); 
                 setSearchTerm(""); // Clear search
                 setTimeout(() => listTopRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
               }} 
               style={{ ...pillBtn, background: darkMode ? "#1b3341" : "#e1f5fe", color: darkMode ? "#4fc3f7" : "#01579b" }}
             >
               📖 {stats.active}
             </button>
             
             <button 
               onClick={() => { 
                 setViewMode("Queue"); 
                 setFilterMedium("All"); 
                 setVerdictFilter(""); 
                 setSearchTerm(""); // Clear search
                 setTimeout(() => listTopRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
               }} 
               style={{ ...pillBtn, background: darkMode ? "#331b41" : "#f3e5f5", color: darkMode ? "#ce93d8" : "#4a148c" }}
             >
               ⏳ {stats.queue}
             </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {["Book", "Movie", "Album"].map(type => {
            const m = getMediaStyle(type);
            const s = stats[type];
            return (
              <div key={type} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
               {/* Main Category Box */}
                <button 
                  onClick={() => { 
                    setFilterMedium(type); 
                    setViewMode("History"); 
                    setVerdictFilter(""); 
                    // ADD THIS LINE BELOW:
                    setTimeout(() => listTopRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
                  }} 
                  style={{ 
                    background: theme.statCard, 
                    padding: '10px', 
                    borderRadius: '12px 12px 0 0', 
                    textAlign: 'center', 
                    border: `2px solid ${theme.border}`, 
                    borderBottom: 'none', 
                    cursor: 'pointer', 
                    color: theme.text, 
                    aspectRatio: '1/1', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    width: '100%' 
                  }}
                >
                  <div style={{ fontSize: '10px', fontWeight: 'bold', color: m.color }}>{m.icon} {type}s</div>
                  <div style={{ fontSize: '20px', fontWeight: '800' }}>{s.total}</div>
                </button>
                
                {/* 4 Clickable Sub-Boxes (Filter by Verdict) */}
                <div style={{ display: 'flex', width: '100%' }}>
                  {[
                    { val: s.loved, bg: "#f1c40f", label: "I loved it" },
                    { val: s.liked, bg: "#4caf50", label: "I liked it" },
                    { val: s.meh, bg: "#ff9800", label: "Meh" },
                    { val: s.no, bg: "#f44336", label: "I didn't like it" }
                  ].map((item, idx) => (
                    <button 
                      key={idx} 
                      onClick={() => {
                        setFilterMedium(type);
                        setVerdictFilter(item.label);
                        setViewMode("History");
                        // Scroll to list
                        listTopRef.current?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      style={{ 
                        flex: 1, 
                        background: item.bg, 
                        border: `1px solid ${theme.border}`,
                        borderRadius: idx === 0 ? '0 0 0 8px' : idx === 3 ? '0 0 8px 0' : '0',
                        textAlign: 'center', 
                        padding: '6px 0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        color: "#000", // Font always black
                        cursor: 'pointer',
                        outline: 'none'
                      }}
                    >
                      {item.val}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>            
      {/* ENTRY FORM [cite: 118-138] */}
      <div ref={formRef} style={{ background: theme.card, padding: "20px", borderRadius: "15px", border: `2px solid ${theme.border}`, marginBottom: "30px", boxShadow: darkMode ? "0 4px 20px rgba(0,0,0,0.5)" : `5px 5px 0px ${theme.border}` }}>
        <div style={{ display: "flex", gap: "5px", marginBottom: "15px" }}>
          {["Book", "Movie", "Album"].map((t) => (
            <button key={t} onClick={() => { setMediaType(t); setVerdict(""); }} style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "none", background: mediaType === t ? (darkMode ? "#fff" : "#000") : (darkMode ? "#333" : "#eee"), color: mediaType === t ? (darkMode ? "#000" : "#fff") : theme.text, fontWeight: "bold", cursor: "pointer" }}>{t}</button>
          ))}
        </div>
        <input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} style={{ ...inputStyle, background: theme.input, color: theme.text, borderColor: darkMode ? "#444" : "#ddd" }} />
        <div style={{ display: "flex", gap: "10px" }}>
          <input placeholder={getMediaStyle(mediaType).creatorLabel} value={creator} onChange={(e) => setCreator(e.target.value)} style={{ ...inputStyle, flex: 2, background: theme.input, color: theme.text, borderColor: darkMode ? "#444" : "#ddd" }} />
          <input placeholder="Year" value={year} type="number" onChange={(e) => setYear(e.target.value)} style={{ ...inputStyle, flex: 1, background: theme.input, color: theme.text, borderColor: darkMode ? "#444" : "#ddd" }} />
        </div>
        <div style={{ marginBottom: "10px" }}>
          <label style={{ fontSize: "11px", color: theme.subtext, fontWeight: "bold" }}>LOG DATE (OPTIONAL)</label>
          <input type="date" value={manualDate} onChange={(e) => setManualDate(e.target.value)} style={{ ...inputStyle, marginTop: "4px", background: theme.input, color: theme.text, borderColor: darkMode ? "#444" : "#ddd" }} />
        </div>
        <textarea ref={textareaRef} placeholder="My thoughts..." value={notes} onChange={(e) => setNotes(e.target.value)} style={{ ...inputStyle, background: theme.input, color: theme.text, borderColor: darkMode ? "#444" : "#ddd", height: "60px", overflow: "hidden", resize: "none" }} />
        
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <div style={{ display: 'flex', gap: '5px' }}>
            <button 
              onClick={() => {
                if (mediaType === "Book") setVerdict("Currently Reading");
                else if (mediaType === "Movie") setVerdict("Want to Watch");
                else setVerdict("Want to Listen");
              }} 
              style={{ 
                ...verdictBtn, 
                flex: 1, 
                background: (verdict === "Currently Reading" || verdict === "Want to Watch" || verdict === "Want to Listen") ? "#3498db" : theme.input, 
                color: (verdict === "Currently Reading" || verdict === "Want to Watch" || verdict === "Want to Listen") ? "#fff" : theme.text 
              }}
            >
              ⏳ {mediaType === "Book" ? "Reading Now" : (mediaType === "Movie" ? "Want to Watch" : "Want to Listen")}
            </button>
            {mediaType === "Book" && (
              <button 
                onClick={() => setVerdict("Want to Read")} 
                style={{ ...verdictBtn, flex: 1, background: verdict === "Want to Read" ? "#9c27b0" : theme.input, color: verdict === "Want to Read" ? "#fff" : theme.text }}
              >
                🔖 Want to Read
              </button>
            )}
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <button onClick={() => setVerdict("I loved it")} style={{ ...verdictBtn, background: verdict === "I loved it" ? "#f1c40f" : theme.input, color: verdict === "I loved it" ? "#000" : theme.text, borderColor: "#f1c40f" }}>⭐ Loved it</button>
            <button onClick={() => setVerdict("I liked it")} style={{ ...verdictBtn, background: verdict === "I liked it" ? "#4caf50" : theme.input, color: verdict === "I liked it" ? "#fff" : theme.text, borderColor: "#4caf50" }}>🟢 Liked it</button>
            <button onClick={() => setVerdict("Meh")} style={{ ...verdictBtn, background: verdict === "Meh" ? "#ff9800" : theme.input, color: verdict === "Meh" ? "#fff" : theme.text, borderColor: "#ff9800" }}>🟡 Meh</button>
            <button onClick={() => setVerdict("I didn't like it")} style={{ ...verdictBtn, background: verdict === "I didn't like it" ? "#f44336" : theme.input, color: verdict === "I didn't like it" ? "#fff" : theme.text, borderColor: "#f44336" }}>🔴 Didn't like it</button>
          </div>
        </div>

        <button onClick={handleSave} disabled={isSaving} style={{ ...primaryBtn, marginTop: "20px", background: darkMode ? "#fff" : "#000", color: darkMode ? "#000" : "#fff", opacity: isSaving ? 0.7 : 1 }}>{isSaving ? "SAVING..." : (editingId ? "UPDATE ENTRY" : "SAVE ENTRY")}</button>
      </div>

      {/* FILTER TABS [cite: 139-141] */}
      <div ref={listTopRef} style={{ display: 'flex', gap: '5px', marginBottom: '15px', background: darkMode ? "#333" : "#eee", borderRadius: '12px', padding: '4px' }}>
        {["History", "Reading", "Queue"].map((tab) => (
          <button key={tab} onClick={() => setViewMode(tab)} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', background: viewMode === tab ? (darkMode ? "#444" : "#fff") : "transparent", color: theme.text, fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>{tab}</button>
        ))}
      </div>
      
{verdictFilter && (
  <div style={{ marginBottom: '10px', fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
    <span style={{ color: theme.subtext }}>Showing: <b>{verdictFilter}</b></span>
    <button onClick={() => setVerdictFilter("")} style={{ background: 'none', border: 'none', color: '#3498db', cursor: 'pointer', fontWeight: 'bold' }}>✕ Clear Filter</button>
  </div>
)}

<div style={{ position: 'relative', marginBottom: '15px' }}>
        <input 
          placeholder="🔍 Search library..." 
          value={searchTerm} 
          onChange={(e) => setSearchTerm(e.target.value)} 
          style={{ 
            ...inputStyle, 
            background: theme.input, 
            color: theme.text, 
            borderColor: darkMode ? "#444" : "#ddd", 
            borderRadius: "25px", 
            paddingLeft: "20px",
            paddingRight: "40px", // Make room for the X
            marginBottom: 0 
          }} 
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm("")}
            style={{
              position: 'absolute',
              right: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              color: theme.subtext,
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: 'bold',
              padding: '5px'
            }}
          >
            ✕
          </button>
        )}
      </div>
      
      <div style={{ 
  display: 'flex', 
  gap: '6px',             // Slightly smaller gap to save space
  marginBottom: '25px', 
  width: '100%',          // Ensure it spans the full width
  boxSizing: 'border-box' 
}}>
  {/* Sort Dropdown */}
  <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} 
    style={{ ...inputStyle, flex: 1, minWidth: 0, padding: "8px 4px", fontSize: "11px", background: theme.input, color: theme.text, marginBottom: 0 }}>
      <option value="Date">📅 Most recent</option>
      <option value="Title">🔤 Title (A-Z)</option>
      <option value="Verdict">⭐ Rank</option>
  </select>

  {/* Month Dropdown */}
  <select value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} 
    style={{ ...inputStyle, flex: 1.2, minWidth: 0, padding: "8px 4px", fontSize: "11px", background: theme.input, color: theme.text, marginBottom: 0 }}>
      {dateOptions.map(month => (
        <option key={month} value={month}>{month === "All" ? "📅 Month" : month}</option>
      ))}
  </select>

  {/* Medium/Category Dropdown */}
  <select value={filterMedium} onChange={(e) => setFilterMedium(e.target.value)} 
    style={{ ...inputStyle, flex: 1, minWidth: 0, padding: "8px 4px", fontSize: "11px", background: theme.input, color: theme.text, marginBottom: 0 }}>
      <option value="All">📂 All</option>
      <option value="Book">Books</option>
      <option value="Movie">Movies</option>
      <option value="Album">Albums</option>
  </select>
</div>

      {/* LISTING */}
      {filteredLogs.map((log) => {
        const m = getMediaStyle(log.media_type); // Media Style
        const v = getVerdictStyle(log.verdict);    // Verdict Style
        
        return (
          <div key={log.id} style={{ 
            background: theme.card, 
            padding: "16px", 
            borderRadius: "12px", 
            marginBottom: "16px", 
            border: `1px solid ${theme.border}`,
            position: 'relative',
            overflow: 'hidden' 
          }}>
            {/* The Coloured Side Bar */}
            <div style={{ 
              position: 'absolute', 
              left: 0, 
              top: 0, 
              bottom: 0, 
              width: '5px', 
              background: m.color 
            }} />

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", paddingLeft: '8px' }}>
                {/* Media Type Banner (Fixed for Light Mode) */}
                <span style={{ 
                  fontSize: "10px", 
                  fontWeight: "bold", 
                  background: darkMode ? m.color : `${m.color}22`, 
                  color: darkMode ? "#fff" : m.color, 
                  padding: "2px 8px", 
                  borderRadius: "4px",
                  border: darkMode ? 'none' : `1px solid ${m.color}`
                }}>
                  {m.icon} {log.media_type.toUpperCase()}
                </span>
                
                {/* Verdict Banner */}
                <span style={{ 
                  fontSize: "10px", 
                  fontWeight: "bold", 
                  background: v.bg, 
                  color: v.color, 
                  padding: "2px 8px", 
                  borderRadius: "4px", 
                  border: `1px solid ${v.border}` 
                }}>
                  {v.emoji} {log.verdict}
                </span>
              </div>
              
              <div style={{ display: "flex", gap: "10px" }}>
                <button onClick={() => {
                  setEditingId(log.id);
                  setTitle(log.title);
                  setCreator(log.creator || "");
                  setMediaType(log.media_type);
                  setVerdict(log.verdict);
                  setNotes(log.notes || "");
                  setYear(log.year_released || "");
                  setManualDate(log.logged_at ? log.logged_at.split('T')[0] : "");
                  formRef.current?.scrollIntoView({ behavior: 'smooth' }); 
                }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "14px" }}>✏️</button>
                <button onClick={() => deleteLog(log.id)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "14px" }}>🗑️</button>
              </div>
            </div>

            <h3 style={{ margin: "0 0 4px 0", fontSize: "18px", paddingLeft: '8px' }}>
              {getHighlightedText(log.title, searchTerm)} {log.year_released && <span style={{ fontWeight: "normal", color: theme.subtext }}>({log.year_released})</span>}
            </h3>

            {/* "Directed by" Logic */}
            {log.creator && (
              <div style={{ fontSize: "14px", color: theme.subtext, marginBottom: "8px", paddingLeft: '8px' }}>
                {log.media_type === "Movie" ? "directed by " : "by "} 
                {getHighlightedText(log.creator, searchTerm)}
              </div>
            )}

            {log.notes && (
              <div style={{ paddingLeft: '8px' }}>
                <ExpandableNote text={log.notes} isDarkMode={darkMode} searchTerm={searchTerm} />
              </div>
            )}

            {/* Date Labels */}
            <div style={{ marginTop: "12px", fontSize: "11px", color: theme.subtext, fontWeight: "bold", paddingLeft: '8px' }}>
              {(() => {
                const dateStr = new Date(log.logged_at).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
                if (log.verdict && log.verdict.startsWith("Want to")) return `Added on ${dateStr}`;
                if (log.verdict === "Currently Reading") return `Started reading on ${dateStr}`;
                if (log.media_type === "Book") return `Read on ${dateStr}`;
                if (log.media_type === "Movie") return `Watched on ${dateStr}`;
                if (log.media_type === "Album") return `Listened to on ${dateStr}`;
                return `Logged: ${dateStr}`;
              })()}
            </div>
          </div>
        );
      })}

      {/* Improvement: Empty State */}
      {filteredLogs.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px", color: theme.subtext }}>
          <div style={{ fontSize: "40px", marginBottom: "10px" }}>🔍</div>
          <p>No logs found matching your filters.</p>
        </div>
      )}
    </div>
  );
}
