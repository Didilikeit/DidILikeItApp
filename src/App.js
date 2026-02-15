import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

// --- SUPABASE SETUP ---
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- COMPONENT: HIGHLIGHT TEXT ---
const HighlightText = ({ text, search, isDarkMode }) => {
  const stringText = String(text || "");
  if (!search.trim()) return <span>{stringText}</span>;

  // Check for exact phrase in quotes, else use whole search term
  const match = search.match(/"([^"]+)"/);
  const phrase = match ? match[1] : search;
  
  // Escape regex special characters
  const safePhrase = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = stringText.split(new RegExp(`(${safePhrase})`, "gi"));
  
  return (
    <span>
      {parts.map((part, i) => 
        part.toLowerCase() === phrase.toLowerCase() ? (
          <mark key={i} style={{ 
            backgroundColor: isDarkMode ? "#ffd54f" : "#fff176", 
            color: "#000",
            padding: "0 2px",
            borderRadius: "2px" 
          }}>{part}</mark>
        ) : (
          part
        )
      )}
    </span>
  );
};

// --- COMPONENT: EXPANDABLE NOTE ---
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
      "<HighlightText text={displayedText} search={searchTerm} isDarkMode={isDarkMode} />"
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
  const [logs, setLogs] = useState([]);
  
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [authMsg, setAuthMsg] = useState(""); 

  const [darkMode, setDarkMode] = useState(localStorage.getItem("dark_mode") === "true");

  const [title, setTitle] = useState("");
  const [creator, setCreator] = useState("");
  const [notes, setNotes] = useState("");
  const [mediaType, setMediaType] = useState("Movie");
  const [verdict, setVerdict] = useState("");
  const [year, setYear] = useState("");
  const [manualDate, setManualDate] = useState("");
  const [editingId, setEditingId] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterMedium, setFilterMedium] = useState("All");
  const [filterDate, setFilterDate] = useState("All");
  const [statYearFilter, setStatYearFilter] = useState(new Date().getFullYear().toString()); 
  const [viewMode, setViewMode] = useState("History"); 
  const [showAbout, setShowAbout] = useState(false);
  
  const [customName, setCustomName] = useState(localStorage.getItem("user_custom_name") || "");
  const [isEditingName, setIsEditingName] = useState(false);

  const textareaRef = useRef(null);
  const listTopRef = useRef(null);

  const theme = {
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

  const fetchLogs = useCallback(async (currentUser) => {
    if (!currentUser) {
      const localData = JSON.parse(localStorage.getItem("guest_logs") || "[]");
      setLogs(localData);
      return;
    }
    const { data, error } = await supabase.from("logs").select("*").order("logged_at", { ascending: false });
    if (!error) setLogs(data || []);
  }, []);

  const mergeGuestData = useCallback(async (userId) => {
    const localData = JSON.parse(localStorage.getItem("guest_logs") || "[]");
    if (localData.length === 0) return;
    const logsToUpload = localData.map(({ id, ...rest }) => ({ ...rest, user_id: userId }));
    const { error } = await supabase.from("logs").insert(logsToUpload);
    if (!error) {
      localStorage.removeItem("guest_logs");
      fetchLogs(userId);
    }
  }, [fetchLogs]);

  useEffect(() => {
    localStorage.setItem("dark_mode", darkMode);
  }, [darkMode]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const activeUser = session?.user ?? null;
      setUser(activeUser);
      fetchLogs(activeUser);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const activeUser = session?.user ?? null;
      setUser(activeUser);
      if (activeUser) {
        setShowAuthModal(false);
        mergeGuestData(activeUser.id);
      } else {
        fetchLogs(null);
      }
    });
    return () => subscription.unsubscribe();
  }, [fetchLogs, mergeGuestData]);

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthMsg("");
    const email = e.target.email.value;
    const password = e.target.password.value;
    if (isSignUp) {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) alert(error.message);
      else if (data?.user && data?.session === null) setAuthMsg("Check your email!");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) alert(error.message);
    }
  };

  const handleStatClick = (type, mode = "History") => {
    setFilterMedium(type);
    setViewMode(mode);
    setSearchTerm("");
    setTimeout(() => listTopRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  const handleSave = async () => {
    if (!title || !verdict) return alert("Title and Verdict required!");
    const logData = { 
      title: title.trim(), creator: creator.trim(), notes: notes.trim(), 
      media_type: mediaType, verdict, year_released: year || null,
      ...(manualDate && { logged_at: new Date(manualDate).toISOString() })
    };
    if (user) {
      const { error } = editingId 
        ? await supabase.from("logs").update(logData).eq("id", editingId)
        : await supabase.from("logs").insert([{ ...logData, user_id: user.id }]);
      if (error) alert(error.message);
      else { fetchLogs(user); resetForm(); }
    } else {
      let currentLogs = JSON.parse(localStorage.getItem("guest_logs") || "[]");
      if (editingId) currentLogs = currentLogs.map(l => l.id === editingId ? { ...logData, id: editingId } : l);
      else currentLogs.unshift({ ...logData, id: Date.now().toString(), logged_at: logData.logged_at || new Date().toISOString() });
      localStorage.setItem("guest_logs", JSON.stringify(currentLogs));
      fetchLogs(null);
      resetForm();
    }
  };

  const resetForm = () => {
    setTitle(""); setCreator(""); setNotes(""); setYear(""); setVerdict(""); setManualDate("");
    setEditingId(null);
  };

  const deleteLog = async (id) => {
    if (window.confirm("Permanently delete this entry?")) {
      if (user) await supabase.from("logs").delete().eq("id", id);
      else {
        const currentLogs = JSON.parse(localStorage.getItem("guest_logs") || "[]");
        localStorage.setItem("guest_logs", JSON.stringify(currentLogs.filter(l => l.id !== id)));
      }
      fetchLogs(user);
    }
  };

  const getMediaStyle = (type) => {
    switch(type) {
      case 'Book': return { color: '#3498db', icon: '📖', creatorLabel: 'Author' };
      case 'Movie': return { color: '#9b59b6', icon: '🎬', creatorLabel: 'Director' };
      case 'Album': return { color: '#1abc9c', icon: '💿', creatorLabel: 'Artist/Band' };
      default: return { color: '#95a5a6', icon: '📎', creatorLabel: 'Creator' };
    }
  };

  const getVerdictStyle = (v) => {
    const isDark = darkMode;
    switch(v) {
      case "I liked it": return { bg: isDark ? "rgba(76, 175, 80, 0.2)" : "#e8f5e9", color: isDark ? "#81c784" : "#2e7d32", border: isDark ? "#4caf50" : "#c8e6c9", emoji: "🟢" };
      case "It was ok": return { bg: isDark ? "rgba(255, 152, 0, 0.2)" : "#fff3e0", color: isDark ? "#ffb74d" : "#ef6c00", border: isDark ? "#ff9800" : "#ffe0b2", emoji: "🟡" };
      case "I didn't like it": return { bg: isDark ? "rgba(244, 67, 54, 0.2)" : "#ffebee", color: isDark ? "#e57373" : "#c62828", border: isDark ? "#f44336" : "#ffcdd2", emoji: "🔴" };
      case "Currently Reading": return { bg: isDark ? "rgba(3, 169, 244, 0.2)" : "#e1f5fe", color: isDark ? "#4fc3f7" : "#01579b", border: isDark ? "#03a9f4" : "#b3e5fc", emoji: "📖" };
      default:
        if (v && v.startsWith("Want to")) return { bg: isDark ? "rgba(156, 39, 176, 0.2)" : "#f3e5f5", color: isDark ? "#ce93d8" : "#4a148c", border: isDark ? "#9c27b0" : "#e1bee7", emoji: "⏳" };
        return { bg: isDark ? "#333" : "#f0f0f0", color: isDark ? "#bbb" : "#555", border: isDark ? "#444" : "#ddd", emoji: "⚪" };
    }
  };

  const availableYears = useMemo(() => {
    const years = logs.map(l => new Date(l.logged_at).getFullYear().toString());
    return ["All", ...new Set(years)].sort((a, b) => b - a);
  }, [logs]);

  const stats = useMemo(() => {
    const categories = { Book: { total: 0, liked: 0, ok: 0, no: 0 }, Movie: { total: 0, liked: 0, ok: 0, no: 0 }, Album: { total: 0, liked: 0, ok: 0, no: 0 }, active: 0, queue: 0 };
    logs.forEach(log => {
      const logYear = new Date(log.logged_at).getFullYear().toString();
      if (statYearFilter !== "All" && logYear !== statYearFilter) return;
      if (log.verdict === "Currently Reading") categories.active++;
      else if (log.verdict?.startsWith("Want to")) categories.queue++;
      else if (categories[log.media_type]) {
        categories[log.media_type].total++;
        if (log.verdict === "I liked it") categories[log.media_type].liked++;
        else if (log.verdict === "It was ok") categories[log.media_type].ok++;
        else if (log.verdict === "I didn't like it") categories[log.media_type].no++;
      }
    });
    return categories;
  }, [logs, statYearFilter]);

  const dateOptions = ["All", ...new Set(logs.map(l => new Date(l.logged_at).toLocaleString('default', { month: 'long', year: 'numeric' })))];

  // --- UPDATED FILTER LOGIC (QUOTE SEARCH) ---
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const isQueue = log.verdict && log.verdict.startsWith("Want to");
      const isActive = log.verdict === "Currently Reading";
      const logMonthYear = new Date(log.logged_at).toLocaleString('default', { month: 'long', year: 'numeric' });
      const yearWithBrackets = log.year_released ? `(${log.year_released})` : "";
      const searchable = `${log.title} ${log.creator} ${log.notes} ${log.verdict} ${logMonthYear} ${yearWithBrackets}`.toLowerCase();
      
      let matchesSearch = true;
      if (searchTerm) {
        const exactMatchQuery = searchTerm.match(/"([^"]+)"/);
        if (exactMatchQuery) {
          matchesSearch = searchable.includes(exactMatchQuery[1].toLowerCase());
        } else {
          matchesSearch = searchable.includes(searchTerm.toLowerCase());
        }
      }

      const matchesMedium = filterMedium === "All" || log.media_type === filterMedium;
      const matchesDate = filterDate === "All" || logMonthYear === filterDate;
      
      let matchesView = searchTerm.length > 0;
      if (!matchesView) {
        if (viewMode === "Reading") matchesView = isActive;
        else if (viewMode === "Queue") matchesView = isQueue;
        else matchesView = !isActive && !isQueue;
      }
      return matchesSearch && matchesMedium && matchesDate && matchesView;
    });
  }, [logs, searchTerm, filterMedium, viewMode, filterDate]);

  if (loading) return <div style={{ textAlign: "center", padding: "50px", background: theme.bg, color: theme.text, minHeight: "100vh" }}>Loading...</div>;

  return (
    <div style={{ padding: "20px", maxWidth: "500px", margin: "auto", fontFamily: "sans-serif", backgroundColor: theme.bg, color: theme.text, minHeight: "100vh" }}>
      
      {/* HEADER & AUTH MODAL (Condensed for brevity) */}
      <div style={{ textAlign: "center", marginBottom: "25px" }}>
        <h2 style={{ margin: 0, fontSize: "28px" }}>🤔 Did I Like It?</h2>
        <div style={{ display: "flex", justifyContent: "center", gap: "15px", marginTop: "10px" }}>
          <button onClick={() => setDarkMode(!darkMode)} style={smallBtn}>{darkMode ? "☀️ Light" : "🌙 Dark"}</button>
          <button onClick={() => setShowAbout(!showAbout)} style={smallBtn}>{showAbout ? "Close" : "About"}</button>
          {user ? <button onClick={() => supabase.auth.signOut()} style={smallBtn}>Logout</button> : <button onClick={() => setShowAuthModal(true)} style={{ ...smallBtn, color: "#3498db", fontWeight: "bold" }}>Login</button>}
        </div>
      </div>

      {showAuthModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.9)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div style={{ background: theme.card, padding: "30px", borderRadius: "20px", width: "100%", maxWidth: "340px", border: `1px solid ${theme.border}` }}>
            <h3 style={{ textAlign: "center" }}>{isSignUp ? "Create Account" : "Login"}</h3>
            <form onSubmit={handleAuth}>
              <input name="email" type="email" placeholder="Email" required style={{ ...inputStyle, background: theme.input, color: theme.text }} />
              <input name="password" type="password" placeholder="Password" required style={{ ...inputStyle, background: theme.input, color: theme.text }} />
              <button type="submit" style={{ ...primaryBtn, background: "#3498db", color: "#fff" }}>{isSignUp ? "Sign Up" : "Login"}</button>
            </form>
            <button onClick={() => setShowAuthModal(false)} style={{ ...smallBtn, display: "block", margin: "20px auto 0" }}>Close</button>
          </div>
        </div>
      )}

      {/* STATS DASHBOARD */}
      <div style={{ marginBottom: '25px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
           <h3 style={{ margin: 0, fontSize: '18px' }}>{customName ? `${customName}'s Stats` : "Your Stats"}</h3>
           <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => handleStatClick("All", "Reading")} style={{ ...pillBtn, background: darkMode ? "#1b3341" : "#e1f5fe", color: darkMode ? "#4fc3f7" : "#01579b" }}>📖 {stats.active}</button>
              <button onClick={() => handleStatClick("All", "Queue")} style={{ ...pillBtn, background: darkMode ? "#331b41" : "#f3e5f5", color: darkMode ? "#ce93d8" : "#4a148c" }}>⏳ {stats.queue}</button>
           </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {["Book", "Movie", "Album"].map(type => (
            <div key={type} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <button onClick={() => handleStatClick(type, "History")} style={{ background: theme.statCard, padding: '10px', borderRadius: '12px 12px 4px 4px', border: `2px solid ${darkMode ? "#333" : "#eee"}`, cursor: 'pointer', color: theme.text }}>
                <div style={{ fontSize: '10px', fontWeight: 'bold', color: getMediaStyle(type).color }}>{getMediaStyle(type).icon} {type}s</div>
                <div style={{ fontSize: '18px', fontWeight: '800' }}>{stats[type].total}</div>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ENTRY FORM */}
      <div style={{ background: theme.card, padding: "20px", borderRadius: "15px", border: `2px solid ${theme.border}`, marginBottom: "30px" }}>
        <div style={{ display: "flex", gap: "5px", marginBottom: "15px" }}>
          {["Book", "Movie", "Album"].map((t) => (
            <button key={t} onClick={() => { setMediaType(t); setVerdict(""); }} style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "none", background: mediaType === t ? (darkMode ? "#fff" : "#000") : (darkMode ? "#333" : "#eee"), color: mediaType === t ? (darkMode ? "#000" : "#fff") : theme.text, fontWeight: "bold" }}>{t}</button>
          ))}
        </div>
        <input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} style={{ ...inputStyle, background: theme.input, color: theme.text }} />
        <div style={{ display: "flex", gap: "10px" }}>
          <input placeholder={getMediaStyle(mediaType).creatorLabel} value={creator} onChange={(e) => setCreator(e.target.value)} style={{ ...inputStyle, flex: 2, background: theme.input, color: theme.text }} />
          <input placeholder="Year" value={year} type="number" onChange={(e) => setYear(e.target.value)} style={{ ...inputStyle, flex: 1, background: theme.input, color: theme.text }} />
        </div>
        <textarea placeholder="My thoughts..." value={notes} onChange={(e) => setNotes(e.target.value)} style={{ ...inputStyle, background: theme.input, color: theme.text, height: "60px" }} />
        <button onClick={handleSave} style={{ ...primaryBtn, background: darkMode ? "#fff" : "#000", color: darkMode ? "#000" : "#fff" }}>{editingId ? "UPDATE" : "SAVE"}</button>
      </div>

      {/* SEARCH & LIST */}
      <div ref={listTopRef} style={{ display: 'flex', gap: '5px', marginBottom: '15px', background: darkMode ? "#333" : "#eee", borderRadius: '12px', padding: '4px' }}>
        {["History", "Reading", "Queue"].map((tab) => (
          <button key={tab} onClick={() => setViewMode(tab)} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', background: viewMode === tab ? (darkMode ? "#444" : "#fff") : "transparent", color: theme.text, fontSize: '12px', fontWeight: 'bold' }}>{tab}</button>
        ))}
      </div>
      
      <input 
        placeholder='🔍 Search (use "quotes" for exact phrase)...' 
        value={searchTerm} 
        onChange={(e) => setSearchTerm(e.target.value)} 
        style={{ ...inputStyle, background: theme.input, color: theme.text, borderRadius: "25px", paddingLeft: "20px" }} 
      />

      <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
        {filteredLogs.map((log) => {
          const m = getMediaStyle(log.media_type);
          const v = getVerdictStyle(log.verdict);
          const dateStr = new Date(log.logged_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
          return (
            <div key={log.id} style={{ padding: "15px", borderBottom: `2px solid ${darkMode ? "#333" : "#eee"}`, borderLeft: `6px solid ${m.color}`, background: theme.card }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div>
                  <span style={{ fontSize: '10px', fontWeight: 'bold', color: m.color }}>{m.icon} {log.media_type.toUpperCase()}</span>
                  <div style={{ fontSize: "18px", fontWeight: "bold", margin: "4px 0" }}>
                    <HighlightText text={log.title} search={searchTerm} isDarkMode={darkMode} />
                  </div>
                  <div style={{ fontSize: "14px", color: theme.subtext }}>
                    <HighlightText text={log.creator} search={searchTerm} isDarkMode={darkMode} />
                  </div>
                  <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>
                    <HighlightText text={dateStr} search={searchTerm} isDarkMode={darkMode} />
                    {log.year_released && (
                      <> • (<HighlightText text={log.year_released} search={searchTerm} isDarkMode={darkMode} />)</>
                    )}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: '10px', fontWeight: 'bold', padding: '4px 8px', borderRadius: '6px', background: v.bg, color: v.color }}>{v.emoji} {log.verdict}</div>
                </div>
              </div>
              {log.notes && <ExpandableNote text={log.notes} isDarkMode={darkMode} searchTerm={searchTerm} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const inputStyle = { width: "100%", padding: "12px", marginBottom: "10px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "14px", boxSizing: "border-box" };
const primaryBtn = { width: "100%", padding: "16px", borderRadius: "8px", border: "none", fontWeight: "bold", cursor: "pointer" };
const smallBtn = { background: "none", border: "none", fontSize: "12px", cursor: "pointer", color: "inherit" };
const pillBtn = { padding: "4px 12px", borderRadius: "20px", border: "none", fontSize: "12px", fontWeight: "bold", cursor: "pointer" };
