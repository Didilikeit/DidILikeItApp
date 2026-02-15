import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

// --- SUPABASE SETUP ---
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- HELPER: HIGHLIGHT TEXT ---
const HighlightedText = ({ text, highlight, isDarkMode }) => {
  if (!highlight.trim()) return <span>{text}</span>;
  
  // Clean the highlight term (handle quotes and trim trailing spaces)
  const cleanTerm = highlight.startsWith('"') ? highlight.replace(/^"|"$/g, '').trim() : highlight.trim();
  if (!cleanTerm) return <span>{text}</span>;

  const parts = text.split(new RegExp(`(${cleanTerm})`, 'gi'));
  return (
    <span>
      {parts.map((part, i) => 
        part.toLowerCase() === cleanTerm.toLowerCase() ? (
          <mark key={i} style={{ backgroundColor: isDarkMode ? "#f1c40f" : "#ffeaa7", color: "#000", padding: "0 2px", borderRadius: "2px" }}>{part}</mark>
        ) : part
      )}
    </span>
  );
};

// --- COMPONENT: EXPANDABLE NOTE ---
const ExpandableNote = ({ text, isDarkMode, highlight }) => {
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
      "<HighlightedText text={displayedText} highlight={highlight} isDarkMode={isDarkMode} />"
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
  
  // Auth Modal State
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [authMsg, setAuthMsg] = useState(""); 

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
  const [statYearFilter, setStatYearFilter] = useState(new Date().getFullYear().toString()); 
  const [viewMode, setViewMode] = useState("History"); 
  const [showAbout, setShowAbout] = useState(false);
  
  // Custom Name State
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
      if (event === "PASSWORD_RECOVERY") {
        const newPassword = prompt("Enter your new password:");
        if (newPassword) {
          const { error } = await supabase.auth.updateUser({ password: newPassword });
          if (error) alert(error.message);
          else alert("Password updated successfully!");
        }
      }
      if (activeUser) {
        setShowAuthModal(false);
        setAuthMsg(""); 
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
      else if (data?.user && data?.session === null) setAuthMsg("Check your email to verify your account!");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) alert(error.message);
    }
  };

  const handleForgotPassword = async () => {
    const email = prompt("Enter your email address for a reset link:");
    if (!email) return;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
    if (error) alert(error.message);
    else alert("Reset email sent!");
  };

  const handleDeleteAccount = async () => {
    const confirmWipe = window.confirm("WARNING: Permanent deletion. Proceed?");
    if (!confirmWipe) return;
    if (user) {
      const { error } = await supabase.rpc('delete_user_account');
      if (error) alert("Error deleting account: " + error.message);
      else { await supabase.auth.signOut(); window.location.reload(); }
    } else {
      localStorage.removeItem("guest_logs");
      fetchLogs(null);
      alert("Guest data cleared.");
    }
  };

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
      if (editingId) {
        currentLogs = currentLogs.map(l => l.id === editingId ? { ...logData, id: editingId } : l);
      } else {
        currentLogs.unshift({ ...logData, id: Date.now().toString(), logged_at: logData.logged_at || new Date().toISOString() });
      }
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

  const saveName = () => {
    localStorage.setItem("user_custom_name", customName);
    setIsEditingName(false);
  };

  const exportCSV = () => {
    const headers = ["Title", "Creator", "Type", "Verdict", "Year", "Notes", "Date"];
    const rows = logs.map(l => [`"${l.title}"`, `"${l.creator}"`, l.media_type, l.verdict, l.year_released || "", `"${(l.notes || "").replace(/"/g, '""')}"`, new Date(l.logged_at).toLocaleDateString()]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = "my-media-log.csv"; link.click();
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
      const v = log.verdict; const type = log.media_type;
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
      
      let matchesSearch = false;
      const term = searchTerm.toLowerCase();
      
      if (term.startsWith('"')) {
        // FIX: Added .trim() here so a trailing space doesn't break quote search
        const cleanQuote = term.replace(/^"|"$/g, '').trim();
        const fieldsToSearch = [log.title, log.creator, log.notes].map(f => (f || "").toLowerCase());
        matchesSearch = fieldsToSearch.some(f => f.includes(cleanQuote));
      } else {
        const searchable = `${log.title} ${log.creator} ${log.notes} ${log.verdict} ${logMonthYear} ${yearWithBrackets}`.toLowerCase();
        matchesSearch = searchable.includes(term);
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
    <div style={{ padding: "20px", maxWidth: "500px", margin: "auto", fontFamily: "sans-serif", backgroundColor: theme.bg, color: theme.text, minHeight: "100vh", transition: "0.2s all" }}>
      
      {/* HEADER */}
      <div style={{ textAlign: "center", marginBottom: "25px" }}>
        <h2 style={{ margin: 0, fontSize: "28px" }}>🤔 Did I Like It?</h2>
        <div style={{ display: "flex", justifyContent: "center", gap: "15px", marginTop: "10px" }}>
          <button onClick={() => setDarkMode(!darkMode)} style={smallBtn}>{darkMode ? "☀️ Light" : "🌙 Dark"}</button>
          <button onClick={() => setShowAbout(!showAbout)} style={smallBtn}>{showAbout ? "Close" : "About"}</button>
          {user ? <button onClick={() => supabase.auth.signOut()} style={smallBtn}>Logout</button> : <button onClick={() => { setShowAuthModal(true); setAuthMsg(""); }} style={{ ...smallBtn, color: "#3498db", fontWeight: "bold" }}>☁️ Login/Sync</button>}
        </div>
      </div>

      {/* AUTH MODAL */}
      {showAuthModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.9)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div style={{ background: theme.card, padding: "30px", borderRadius: "20px", width: "100%", maxWidth: "340px", border: `1px solid ${theme.border}` }}>
            <h3 style={{ textAlign: "center", marginBottom: "10px" }}>{isSignUp ? "Create Account" : "Welcome Back"}</h3>
            {authMsg && <div style={{ padding: "12px", background: "#27ae60", color: "#fff", borderRadius: "8px", fontSize: "13px", marginBottom: "15px", textAlign: "center", lineHeight: "1.4" }}>{authMsg}</div>}
            <button onClick={() => supabase.auth.signInWithOAuth({ provider: 'google' })} style={{ ...primaryBtn, background: "#fff", color: "#000", marginBottom: "20px" }}>Continue with Google</button>
            <form onSubmit={handleAuth}>
              <input name="email" type="email" placeholder="Email" required style={{ ...inputStyle, background: theme.input, color: theme.text }} />
              <input name="password" type="password" placeholder="Password" required style={{ ...inputStyle, background: theme.input, color: theme.text }} />
              <button type="submit" style={{ ...primaryBtn, background: "#3498db", color: "#fff" }}>{isSignUp ? "Sign Up" : "Login"}</button>
            </form>
            <button onClick={() => { setIsSignUp(!isSignUp); setAuthMsg(""); }} style={{ ...smallBtn, display: "block", margin: "15px auto 0", color: "#3498db" }}>{isSignUp ? "Already have an account? Login" : "Need an account? Sign Up"}</button>
            <button onClick={() => setShowAuthModal(false)} style={{ ...smallBtn, display: "block", margin: "20px auto 0" }}>Close</button>
          </div>
        </div>
      )}

      {showAbout && (
        <div style={{ background: theme.card, padding: "20px", borderRadius: "15px", border: `2px solid ${darkMode ? "#1a4a6e" : "#3498db"}`, marginBottom: "25px", lineHeight: "1.5" }}>
          <p style={{ fontSize: "15px", margin: "0 0 15px 0", color: theme.text }}><i>Did you like it?</i> Well, you've got no excuse not to answer now.</p>
          <button onClick={exportCSV} style={{ ...smallBtn, color: "#27ae60", fontWeight: "bold" }}>📥 Export CSV</button>
          <button onClick={handleDeleteAccount} style={{ ...smallBtn, color: "#ff4d4d", marginLeft: "10px" }}>⚠️ Delete Data</button>
        </div>
      )}

      {/* STATS DASHBOARD */}
      <div style={{ marginBottom: '25px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '18px' }}>{customName ? `${customName}'s Stats` : "Your Stats"} <button onClick={() => setIsEditingName(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px' }}>✏️</button></h3>
            <select value={statYearFilter} onChange={(e) => setStatYearFilter(e.target.value)} style={{ background: 'none', border: 'none', color: '#3498db', fontWeight: 'bold', fontSize: '12px' }}>
              {availableYears.map(y => <option key={y} value={y}>{y === "All" ? "All Time" : y}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {["Book", "Movie", "Album"].map(type => (
            <div key={type} style={{ flex: 1 }}>
              <button onClick={() => handleStatClick(type, "History")} style={{ background: theme.statCard, padding: '10px', borderRadius: '8px', border: `1px solid ${theme.border}`, width: '100%', color: theme.text }}>
                <div style={{ fontSize: '10px' }}>{type}s</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{stats[type].total}</div>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ENTRY FORM */}
      <div style={{ background: theme.card, padding: "20px", borderRadius: "15px", border: `2px solid ${theme.border}`, marginBottom: "30px", boxShadow: darkMode ? "0 4px 20px rgba(0,0,0,0.5)" : `5px 5px 0px ${theme.border}` }}>
        <div style={{ display: "flex", gap: "5px", marginBottom: "15px" }}>
          {["Book", "Movie", "Album"].map((t) => (
            <button key={t} onClick={() => { setMediaType(t); setVerdict(""); }} style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "none", background: mediaType === t ? (darkMode ? "#fff" : "#000") : (darkMode ? "#333" : "#eee"), color: mediaType === t ? (darkMode ? "#000" : "#fff") : theme.text, fontWeight: "bold" }}>{t}</button>
          ))}
        </div>
        <input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} style={{ ...inputStyle, background: theme.input, color: theme.text }} />
        <input placeholder={getMediaStyle(mediaType).creatorLabel} value={creator} onChange={(e) => setCreator(e.target.value)} style={{ ...inputStyle, background: theme.input, color: theme.text }} />
        <textarea ref={textareaRef} placeholder="My thoughts..." value={notes} onChange={(e) => setNotes(e.target.value)} style={{ ...inputStyle, background: theme.input, color: theme.text, height: "60px", resize: "none" }} />
        <div style={{ display: 'flex', gap: '5px' }}>
            <button onClick={() => setVerdict("I liked it")} style={{ ...verdictBtn, flex: 1, background: verdict === "I liked it" ? "#4caf50" : theme.input, color: verdict === "I liked it" ? "#fff" : theme.text }}>🟢 Liked</button>
            <button onClick={() => setVerdict("It was ok")} style={{ ...verdictBtn, flex: 1, background: verdict === "It was ok" ? "#ff9800" : theme.input, color: verdict === "It was ok" ? "#fff" : theme.text }}>🟡 Ok</button>
            <button onClick={() => setVerdict("I didn't like it")} style={{ ...verdictBtn, flex: 1, background: verdict === "I didn't like it" ? "#f44336" : theme.input, color: verdict === "I didn't like it" ? "#fff" : theme.text }}>🔴 No</button>
        </div>
        <button onClick={handleSave} style={{ ...primaryBtn, marginTop: "20px", background: darkMode ? "#fff" : "#000", color: darkMode ? "#000" : "#fff" }}>SAVE ENTRY</button>
      </div>

      <div ref={listTopRef} style={{ display: 'flex', gap: '5px', marginBottom: '15px', background: darkMode ? "#333" : "#eee", borderRadius: '12px', padding: '4px' }}>
        {["History", "Reading", "Queue"].map((tab) => (
          <button key={tab} onClick={() => setViewMode(tab)} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', background: viewMode === tab ? (darkMode ? "#444" : "#fff") : "transparent", color: theme.text, fontSize: '12px', fontWeight: 'bold' }}>{tab}</button>
        ))}
      </div>
      
      <input placeholder="🔍 Search library..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ ...inputStyle, background: theme.input, color: theme.text, borderRadius: "25px", paddingLeft: "20px" }} />

      <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
        {filteredLogs.map((log) => {
          const m = getMediaStyle(log.media_type);
          const v = getVerdictStyle(log.verdict);
          return (
            <div key={log.id} style={{ padding: "15px", borderLeft: `6px solid ${m.color}`, background: theme.card }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: 'flex-start' }}>
                <div>
                  <span style={{ fontSize: '10px', fontWeight: 'bold', color: m.color }}>{m.icon} {log.media_type.toUpperCase()}</span>
                  {/* FIX: Title Highlighting */}
                  <div style={{ fontSize: "18px", fontWeight: "bold", margin: "4px 0" }}>
                    <HighlightedText text={log.title} highlight={searchTerm} isDarkMode={darkMode} />
                  </div>
                  {/* FIX: Creator Highlighting */}
                  <div style={{ fontSize: "14px", color: theme.subtext }}>
                    <HighlightedText text={log.creator} highlight={searchTerm} isDarkMode={darkMode} />
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: '10px', fontWeight: 'bold', padding: '4px 8px', borderRadius: '6px', background: v.bg, color: v.color, border: `1px solid ${v.border}` }}>{v.emoji} {log.verdict}</div>
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                    <button onClick={() => deleteLog(log.id)} style={{ ...smallBtn, color: '#e74c3c' }}>Delete</button>
                  </div>
                </div>
              </div>
              {/* FIX: Notes Highlighting via ExpandableNote props */}
              {log.notes && <ExpandableNote text={log.notes} isDarkMode={darkMode} highlight={searchTerm} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const inputStyle = { width: "100%", padding: "12px", marginBottom: "10px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "14px", boxSizing: "border-box" };
const primaryBtn = { width: "100%", padding: "16px", borderRadius: "8px", border: "none", fontWeight: "bold", cursor: "pointer" };
const verdictBtn = { padding: "10px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "12px", cursor: "pointer" };
const smallBtn = { background: "none", border: "none", fontSize: "12px", cursor: "pointer", color: "#666" };
const pillBtn = { border: 'none', borderRadius: '20px', padding: '4px 12px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' };
