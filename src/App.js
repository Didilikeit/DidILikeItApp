
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

// --- SUPABASE SETUP ---
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- COMPONENT: EXPANDABLE NOTE ---
const ExpandableNote = ({ text, isDarkMode }) => {
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
      "{displayedText}"
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
  
  // Theme State
  const [darkMode, setDarkMode] = useState(localStorage.getItem("dark_mode") === "true");

  // Form State
  const [title, setTitle] = useState("");
  const [creator, setCreator] = useState("");
  const [notes, setNotes] = useState("");
  const [mediaType, setMediaType] = useState("Movie");
  const [verdict, setVerdict] = useState("");
  const [year, setYear] = useState("");
  const [manualDate, setManualDate] = useState("");
  const [editingId, setEditingId] = useState(null);

  // UI/Filter State
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMedium, setFilterMedium] = useState("All");
  const [filterDate, setFilterDate] = useState("All");
  const [statYearFilter, setStatYearFilter] = useState(new Date().getFullYear().toString()); // Stats Year Filter
  const [viewMode, setViewMode] = useState("History"); 
  const [showAbout, setShowAbout] = useState(false);
  
  // Custom Name State
  const [customName, setCustomName] = useState(localStorage.getItem("user_custom_name") || "");
  const [isEditingName, setIsEditingName] = useState(false);

  const textareaRef = useRef(null);
  const listTopRef = useRef(null);

 // --- THEME DEFINITION ---
  const theme = {
    bg: darkMode ? "#000000" : "#f4f4f4", // Pure black
    card: darkMode ? "#111111" : "#ffffff", // Deep grey cards
    text: darkMode ? "#e0e0e0" : "#333333",
    border: darkMode ? "#222222" : "#000000", // Muted borders
    input: darkMode ? "#1a1a1a" : "#ffffff",
    subtext: darkMode ? "#888" : "#666",
    statCard: darkMode ? "#161616" : "#ffffff"
  };

  // This forces the literal browser window background to change
  useEffect(() => {
    document.body.style.backgroundColor = theme.bg;
  }, [theme.bg]);

  // --- AUTH & DATA ---
  useEffect(() => {
    localStorage.setItem("dark_mode", darkMode);
  }, [darkMode]);

  useEffect(() => {
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) setUser(session.user);
      setLoading(false);
    };
    getInitialSession();
  }, []);

  const fetchLogs = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase.from("logs").select("*").order("logged_at", { ascending: false });
    if (!error) setLogs(data || []);
  }, [user]);

  useEffect(() => { if (user) fetchLogs(); }, [user, fetchLogs]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "60px";
      const scrollHeight = textarea.scrollHeight;
      textarea.style.height = scrollHeight + "px";
    }
  }, [notes]);

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
      media_type: mediaType, verdict, year_released: year || null, user_id: user.id,
      ...(manualDate && { logged_at: new Date(manualDate).toISOString() })
    };
    const { error } = editingId 
      ? await supabase.from("logs").update(logData).eq("id", editingId)
      : await supabase.from("logs").insert([logData]);
    
    if (error) alert(error.message);
    else {
      setTitle(""); setCreator(""); setNotes(""); setYear(""); setVerdict(""); setManualDate("");
      setEditingId(null); fetchLogs();
    }
  };

  const deleteLog = async (id) => {
    if (window.confirm("Permanently delete this entry?")) {
      await supabase.from("logs").delete().eq("id", id);
      fetchLogs();
    }
  };

  const saveName = () => {
    localStorage.setItem("user_custom_name", customName);
    setIsEditingName(false);
  };

  const exportCSV = () => {
    const headers = ["Title", "Creator", "Type", "Verdict", "Year", "Notes", "Date"];
    const rows = logs.map(l => [`"${l.title}"`, `"${l.creator}"`, l.media_type, l.verdict, l.year_released || "", `"${l.notes.replace(/"/g, '""')}"`, new Date(l.logged_at).toLocaleDateString()]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = "my-media-log.csv"; link.click();
  };

  // --- STYLING HELPERS ---
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
      case "I liked it": 
        return { bg: isDark ? "rgba(76, 175, 80, 0.2)" : "#e8f5e9", color: isDark ? "#81c784" : "#2e7d32", border: isDark ? "#4caf50" : "#c8e6c9", emoji: "🟢" };
      case "It was ok": 
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

  // --- DYNAMIC YEAR LIST FOR STATS ---
  const availableYears = useMemo(() => {
    const years = logs.map(l => new Date(l.logged_at).getFullYear().toString());
    return ["All", ...new Set(years)].sort((a, b) => b - a);
  }, [logs]);

  // --- MEMOIZED STATS (FILTERED BY statYearFilter) ---
  const stats = useMemo(() => {
    const categories = {
      Book: { total: 0, liked: 0, ok: 0, no: 0 },
      Movie: { total: 0, liked: 0, ok: 0, no: 0 },
      Album: { total: 0, liked: 0, ok: 0, no: 0 },
      active: 0, queue: 0
    };

    logs.forEach(log => {
      const logYear = new Date(log.logged_at).getFullYear().toString();
      const v = log.verdict;
      const type = log.media_type;

      // Queue and Active items are usually "global", but we can filter them too if desired. 
      // Here we filter everything by the year selected.
      if (statYearFilter !== "All" && logYear !== statYearFilter) return;

      if (v === "Currently Reading") categories.active++;
      else if (v?.startsWith("Want to")) categories.queue++;
      else if (categories[type]) {
        categories[type].total++;
        if (v === "I liked it") categories[type].liked++;
        else if (v === "It was ok") categories[type].ok++;
        else if (v === "I didn't like it") categories[type].no++;
      }
    });
    return categories;
  }, [logs, statYearFilter]);

  const dateOptions = ["All", ...new Set(logs.map(l => new Date(l.logged_at).toLocaleString('default', { month: 'long', year: 'numeric' })))];

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const isQueue = log.verdict && log.verdict.startsWith("Want to");
      const isActive = log.verdict === "Currently Reading";
      const logMonthYear = new Date(log.logged_at).toLocaleString('default', { month: 'long', year: 'numeric' });
      const yearWithBrackets = log.year_released ? `(${log.year_released})` : "";
      const searchable = `${log.title} ${log.creator} ${log.notes} ${log.verdict} ${logMonthYear} ${yearWithBrackets}`.toLowerCase();
      
      const matchesSearch = searchable.includes(searchTerm.toLowerCase());
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
    <div style={{ padding: "20px", maxWidth: "500px", margin: "auto", fontFamily: "sans-serif", backgroundColor: theme.bg, color: theme.text, minHeight: "100vh", transition: "0.2s all" }}>
      {/* HEADER */}
      <div style={{ textAlign: "center", marginBottom: "25px" }}>
        <h2 style={{ margin: 0, fontSize: "28px" }}>🤔 Did I Like It?</h2>
        <div style={{ display: "flex", justifyContent: "center", gap: "15px", marginTop: "10px" }}>
          <button onClick={() => setDarkMode(!darkMode)} style={smallBtn}>{darkMode ? "☀️ Light" : "🌙 Dark"}</button>
          <button onClick={() => setShowAbout(!showAbout)} style={smallBtn}>{showAbout ? "Close" : "About"}</button>
          <button onClick={() => supabase.auth.signOut()} style={smallBtn}>Logout</button>
        </div>
      </div>

      {showAbout && (
  <div style={{ 
    background: theme.card, 
    padding: "20px", 
    borderRadius: "15px", 
    border: `2px solid ${darkMode ? "#1a4a6e" : "#3498db"}`, 
    marginBottom: "25px",
    lineHeight: "1.5"
  }}>
    <p style={{ fontSize: "15px", margin: "0 0 15px 0", color: theme.text }}>
      What are you reading at the moment? Watched anything good lately? Have you heard their new album?
      <br /><br />
        Did you like it?
        <br /><br />
      Well, you've got no excuse not to answer now. You're welcome.
    </p>
    <button onClick={exportCSV} style={{ ...smallBtn, color: "#27ae60", fontWeight: "bold", padding: 0 }}>
      📥 Export Data (.csv)
    </button>
  </div>
)}

      {/* STATS DASHBOARD */}
      <div style={{ marginBottom: '25px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              {isEditingName ? (
                <div style={{ display: 'flex', gap: '5px' }}>
                  <input value={customName} onChange={(e) => setCustomName(e.target.value)} style={{ ...inputStyle, background: theme.input, color: theme.text, marginBottom: 0, padding: '4px 8px', width: '120px' }} placeholder="Name" />
                  <button onClick={saveName} style={{ border: 'none', background: theme.text, color: theme.bg, borderRadius: '4px', cursor: 'pointer' }}>✓</button>
                </div>
              ) : (
                <h3 style={{ margin: 0, fontSize: '18px' }}>
                  {customName ? `${customName}'s Stats` : "Your Stats"} 
                  <button onClick={() => setIsEditingName(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', marginLeft: '8px' }}>✏️</button>
                </h3>
              )}
            </div>
            {/* YEAR SELECTOR FOR STATS */}
            <select 
              value={statYearFilter} 
              onChange={(e) => setStatYearFilter(e.target.value)}
              style={{ background: 'none', border: 'none', color: '#3498db', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', outline: 'none', padding: 0, marginTop: '4px' }}
            >
              {availableYears.map(y => <option key={y} value={y}>{y === "All" ? "All Time" : y}</option>)}
            </select>
          </div>
          
          <div style={{ display: 'flex', gap: '8px' }}>
             <button onClick={() => handleStatClick("All", "Reading")} style={{ ...pillBtn, background: darkMode ? "#1b3341" : "#e1f5fe", color: darkMode ? "#4fc3f7" : "#01579b" }}>📖 {stats.active}</button>
             <button onClick={() => handleStatClick("All", "Queue")} style={{ ...pillBtn, background: darkMode ? "#331b41" : "#f3e5f5", color: darkMode ? "#ce93d8" : "#4a148c" }}>⏳ {stats.queue}</button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {["Book", "Movie", "Album"].map(type => {
            const m = getMediaStyle(type);
            const s = stats[type];
            return (
              <div key={type} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <button onClick={() => handleStatClick(type, "History")} style={{ background: theme.statCard, padding: '10px', borderRadius: '12px 12px 4px 4px', textAlign: 'center', border: `2px solid ${darkMode ? "#333" : "#eee"}`, borderBottom: 'none', cursor: 'pointer', color: theme.text }}>
                  <div style={{ fontSize: '10px', fontWeight: 'bold', color: m.color }}>{m.icon} {type}s</div>
                  <div style={{ fontSize: '18px', fontWeight: '800' }}>{s.total}</div>
                </button>
                <div style={{ display: 'flex', gap: '2px', height: '22px' }}>
                  <div title="Liked" style={{ flex: s.liked || 1, background: getVerdictStyle("I liked it").bg, border: `1px solid ${getVerdictStyle("I liked it").border}`, borderRadius: '0 0 0 8px', fontSize: '11px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', color: getVerdictStyle("I liked it").color }}>{s.liked || ""}</div>
                  <div title="Ok" style={{ flex: s.ok || 1, background: getVerdictStyle("It was ok").bg, border: `1px solid ${getVerdictStyle("It was ok").border}`, fontSize: '11px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', color: getVerdictStyle("It was ok").color }}>{s.ok || ""}</div>
                  <div title="No" style={{ flex: s.no || 1, background: getVerdictStyle("I didn't like it").bg, border: `1px solid ${getVerdictStyle("I didn't like it").border}`, borderRadius: '0 0 8px 0', fontSize: '11px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', color: getVerdictStyle("I didn't like it").color }}>{s.no || ""}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ENTRY FORM */}
      <div style={{ background: theme.card, padding: "20px", borderRadius: "15px", border: `2px solid ${theme.border}`, marginBottom: "30px", boxShadow: darkMode ? "0 4px 20px rgba(0,0,0,0.5)" : `5px 5px 0px ${theme.border}` 
}}>
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
          {mediaType === "Book" ? (
            <div style={{ display: 'flex', gap: '5px' }}>
              <button onClick={() => setVerdict("Currently Reading")} style={{ ...verdictBtn, flex: 1, background: verdict === "Currently Reading" ? "#3498db" : theme.input, color: verdict === "Currently Reading" ? "#fff" : theme.text, borderColor: darkMode ? "#444" : "#ddd" }}>📖 Reading Now</button>
              <button onClick={() => setVerdict("Want to Read")} style={{ ...verdictBtn, flex: 1, background: verdict === "Want to Read" ? "#5dade2" : theme.input, color: verdict === "Want to Read" ? "#fff" : theme.text, borderColor: darkMode ? "#444" : "#ddd" }}>🔖 Want to Read</button>
            </div>
          ) : (
            <button onClick={() => setVerdict(mediaType === "Movie" ? "Want to Watch" : "Want to Listen")} style={{ ...verdictBtn, background: verdict.includes("Want") ? "#9b59b6" : theme.input, color: verdict.includes("Want") ? "#fff" : theme.text, borderColor: darkMode ? "#444" : "#ddd" }}>⏳ {mediaType === "Movie" ? "Want to Watch" : "Want to Listen"}</button>
          )}
          <div style={{ display: 'flex', gap: '5px' }}>
            <button onClick={() => setVerdict("I liked it")} style={{ ...verdictBtn, flex: 1, background: verdict === "I liked it" ? "#4caf50" : theme.input, color: verdict === "I liked it" ? "#fff" : theme.text, borderColor: darkMode ? "#444" : "#ddd" }}>🟢 Liked</button>
            <button onClick={() => setVerdict("It was ok")} style={{ ...verdictBtn, flex: 1, background: verdict === "It was ok" ? "#ff9800" : theme.input, color: verdict === "It was ok" ? "#fff" : theme.text, borderColor: darkMode ? "#444" : "#ddd" }}>🟡 OK</button>
            <button onClick={() => setVerdict("I didn't like it")} style={{ ...verdictBtn, flex: 1, background: verdict === "I didn't like it" ? "#f44336" : theme.input, color: verdict === "I didn't like it" ? "#fff" : theme.text, borderColor: darkMode ? "#444" : "#ddd" }}>🔴 No</button>
          </div>
        </div>
        <button onClick={handleSave} style={{ ...primaryBtn, marginTop: "20px", background: darkMode ? "#fff" : "#000", color: darkMode ? "#000" : "#fff" }}>{editingId ? "UPDATE ENTRY" : "SAVE ENTRY"}</button>
      </div>

      {/* FILTER TABS */}
      <div ref={listTopRef} style={{ display: 'flex', gap: '5px', marginBottom: '15px', background: darkMode ? "#333" : "#eee", borderRadius: '12px', padding: '4px' }}>
        {["History", "Reading", "Queue"].map((tab) => (
          <button key={tab} onClick={() => setViewMode(tab)} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', background: viewMode === tab ? (darkMode ? "#444" : "#fff") : "transparent", color: theme.text, fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>{tab}</button>
        ))}
      </div>
      
      <input placeholder="🔍 Search library..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ ...inputStyle, background: theme.input, color: theme.text, borderColor: darkMode ? "#444" : "#ddd", borderRadius: "25px", paddingLeft: "20px" }} />
      <div style={{ display: 'flex', gap: '10px', marginBottom: '25px' }}>
        <select value={filterMedium} onChange={(e) => setFilterMedium(e.target.value)} style={{ ...inputStyle, background: theme.input, color: theme.text, borderColor: darkMode ? "#444" : "#ddd" }}>
            <option value="All">All Mediums</option><option value="Book">Books</option><option value="Movie">Movies</option><option value="Album">Albums</option>
        </select>
        <select value={filterDate} onChange={(e) => setFilterDate(e.target.value)} style={{ ...inputStyle, background: theme.input, color: theme.text, borderColor: darkMode ? "#444" : "#ddd" }}>
            {dateOptions.map(d => <option key={d} value={d}>{d === "All" ? "All Time" : d}</option>)}
        </select>
      </div>

      {/* HISTORY LIST */}
      <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
        {filteredLogs.map((log) => {
          const m = getMediaStyle(log.media_type);
          const v = getVerdictStyle(log.verdict);
          const dateStr = new Date(log.logged_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
          
          return (
            <div key={log.id} style={{ padding: "15px", borderBottom: `2px solid ${darkMode ? "#333" : "#eee"}`, borderLeft: `6px solid ${m.color}`, background: theme.card }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: 'flex-start' }}>
                <div>
                  <span style={{ fontSize: '10px', fontWeight: 'bold', color: m.color }}>{m.icon} {log.media_type.toUpperCase()}</span>
                  <div style={{ fontSize: "18px", fontWeight: "bold", margin: "4px 0" }}>{log.title}</div>
                  <div style={{ fontSize: "14px", color: theme.subtext }}>{log.creator}</div>
                  <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>{dateStr} {log.year_released && `• (${log.year_released})`}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ 
                    fontSize: '10px', fontWeight: 'bold', padding: '4px 8px', borderRadius: '6px', 
                    background: v.bg, color: v.color, border: `1px solid ${v.border}`, marginBottom: '10px', display: 'inline-block' 
                  }}>
                    {v.emoji} {log.verdict}
                  </div>
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                    <button onClick={() => { setEditingId(log.id); setTitle(log.title); setCreator(log.creator); setNotes(log.notes); setYear(log.year_released || ""); setVerdict(log.verdict); setMediaType(log.media_type); window.scrollTo({ top: 0, behavior: 'smooth' }); }} style={{ ...smallBtn, color: "#3498db" }}>Edit</button>
                    <button onClick={() => deleteLog(log.id)} style={{ ...smallBtn, color: '#e74c3c' }}>Delete</button>
                  </div>
                </div>
              </div>
              {log.notes && <ExpandableNote text={log.notes} isDarkMode={darkMode} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const inputStyle = { 
  width: "100%", 
  padding: "12px", 
  marginBottom: "10px", 
  borderRadius: "8px", 
  border: "1px solid #ddd", 
  fontSize: "14px", 
  boxSizing: "border-box",
  outline: "none" // Prevents the bright browser outline on tap
};
const primaryBtn = { width: "100%", padding: "16px", borderRadius: "8px", border: "none", fontWeight: "bold", cursor: "pointer", fontSize: "14px" };
const verdictBtn = { padding: "10px", borderRadius: "8px", border: "1px solid #ddd", cursor: "pointer", fontSize: '12px', fontWeight: "600" };
const smallBtn = { 
  background: "none", 
  border: "none", 
  fontSize: "12px", 
  cursor: "pointer",
  color: "inherit" // This makes it inherit theme.text from the parent container
};
const pillBtn = { border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold', padding: '4px 10px', borderRadius: '12px' };
