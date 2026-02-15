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
      marginTop: "10px", padding: "12px", 
      background: isDarkMode ? "#2d2d2d" : "#f9f9f9", 
      borderRadius: "8px", fontSize: "14px", fontStyle: "italic", 
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
  const [darkMode, setDarkMode] = useState(localStorage.getItem("dark_mode") === "true");
  
  // Auth Modal State
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  // Form State
  const [title, setTitle] = useState("");
  const [creator, setCreator] = useState("");
  const [notes, setNotes] = useState("");
  const [mediaType, setMediaType] = useState("Movie");
  const [verdict, setVerdict] = useState("");
  const [year, setYear] = useState("");
  const [manualDate, setManualDate] = useState("");
  const [editingId, setEditingId] = useState(null);

  // UI State
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMedium, setFilterMedium] = useState("All");
  const [viewMode, setViewMode] = useState("History"); 
  const [showAbout, setShowAbout] = useState(false);

  const textareaRef = useRef(null);

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

  // --- LOG FETCHING ---
  const fetchLogs = useCallback(async (currentUser) => {
    if (!currentUser) {
      const localData = JSON.parse(localStorage.getItem("guest_logs") || "[]");
      setLogs(localData);
      return;
    }
    const { data, error } = await supabase.from("logs").select("*").order("logged_at", { ascending: false });
    if (!error) setLogs(data || []);
  }, []);

  // --- DATA MERGE LOGIC ---
  const mergeGuestData = useCallback(async (userId) => {
    const localData = JSON.parse(localStorage.getItem("guest_logs") || "[]");
    if (localData.length === 0) return;

    // Prepare data for Supabase (removing temporary guest IDs)
    const logsToUpload = localData.map(({ id, ...rest }) => ({
      ...rest,
      user_id: userId
    }));

    const { error } = await supabase.from("logs").insert(logsToUpload);
    
    if (!error) {
      console.log("Guest data merged successfully");
      localStorage.removeItem("guest_logs"); // Clean up
      fetchLogs(userId); // Refresh from DB
    } else {
      console.error("Merge error:", error.message);
    }
  }, [fetchLogs]);

  // --- AUTH INITIALIZATION ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const activeUser = session?.user ?? null;
      setUser(activeUser);
      fetchLogs(activeUser);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
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
    const email = e.target.email.value;
    const password = e.target.password.value;
    const { error } = isSignUp 
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
  };

  const handleSave = async () => {
    if (!title || !verdict) return alert("Title and Verdict required!");
    
    const logData = { 
      title: title.trim(), creator: creator.trim(), notes: notes.trim(), 
      media_type: mediaType, verdict, year_released: year || null,
      logged_at: manualDate ? new Date(manualDate).toISOString() : new Date().toISOString()
    };

    if (user) {
      const { error } = editingId 
        ? await supabase.from("logs").update(logData).eq("id", editingId)
        : await supabase.from("logs").insert([{ ...logData, user_id: user.id }]);
      if (error) alert(error.message);
    } else {
      let currentLogs = JSON.parse(localStorage.getItem("guest_logs") || "[]");
      if (editingId) {
        currentLogs = currentLogs.map(l => l.id === editingId ? { ...logData, id: editingId } : l);
      } else {
        currentLogs.unshift({ ...logData, id: Date.now().toString() });
      }
      localStorage.setItem("guest_logs", JSON.stringify(currentLogs));
    }
    
    setTitle(""); setCreator(""); setNotes(""); setYear(""); setVerdict(""); setManualDate("");
    setEditingId(null); fetchLogs(user);
  };

  const deleteLog = async (id) => {
    if (!window.confirm("Delete this entry?")) return;
    if (user) {
      await supabase.from("logs").delete().eq("id", id);
    } else {
      const currentLogs = JSON.parse(localStorage.getItem("guest_logs") || "[]");
      localStorage.setItem("guest_logs", JSON.stringify(currentLogs.filter(l => l.id !== id)));
    }
    fetchLogs(user);
  };

  // --- UI HELPERS ---
  const getMediaStyle = (type) => {
    switch(type) {
      case 'Book': return { color: '#3498db', icon: '📖', creatorLabel: 'Author' };
      case 'Movie': return { color: '#9b59b6', icon: '🎬', creatorLabel: 'Director' };
      case 'Album': return { color: '#1abc9c', icon: '💿', creatorLabel: 'Artist/Band' };
      default: return { color: '#95a5a6', icon: '📎', creatorLabel: 'Creator' };
    }
  };

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const isQueue = log.verdict?.startsWith("Want to");
      const isActive = log.verdict === "Currently Reading";
      const searchable = `${log.title} ${log.creator} ${log.notes}`.toLowerCase();
      const matchesSearch = searchable.includes(searchTerm.toLowerCase());
      const matchesMedium = filterMedium === "All" || log.media_type === filterMedium;
      let matchesView = searchTerm.length > 0;
      if (!matchesView) {
        if (viewMode === "Reading") matchesView = isActive;
        else if (viewMode === "Queue") matchesView = isQueue;
        else matchesView = !isActive && !isQueue;
      }
      return matchesSearch && matchesMedium && matchesView;
    });
  }, [logs, searchTerm, filterMedium, viewMode]);

  if (loading) return null;

  return (
    <div style={{ padding: "20px", maxWidth: "500px", margin: "auto", backgroundColor: theme.bg, color: theme.text, minHeight: "100vh" }}>
      
      {/* HEADER */}
      <div style={{ textAlign: "center", marginBottom: "25px" }}>
        <h2 style={{ margin: 0, fontSize: "28px" }}>🤔 Did I Like It?</h2>
        <div style={{ display: "flex", justifyContent: "center", gap: "12px", marginTop: "12px" }}>
          <button onClick={() => setDarkMode(!darkMode)} style={smallBtn}>{darkMode ? "☀️ Light" : "🌙 Dark"}</button>
          <button onClick={() => setShowAbout(!showAbout)} style={smallBtn}>About</button>
          {user ? (
            <button onClick={() => supabase.auth.signOut()} style={smallBtn}>Logout</button>
          ) : (
            <button onClick={() => setShowAuthModal(true)} style={{ ...smallBtn, color: "#3498db", fontWeight: "bold" }}>☁️ Sync Account</button>
          )}
        </div>
      </div>

      {/* AUTH MODAL */}
      {showAuthModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.9)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div style={{ background: theme.card, padding: "30px", borderRadius: "20px", width: "100%", maxWidth: "340px", border: `1px solid ${theme.border}` }}>
            <h3 style={{ textAlign: "center", marginBottom: "10px" }}>{isSignUp ? "Create Account" : "Welcome Back"}</h3>
            <p style={{ fontSize: "12px", textAlign: "center", color: theme.subtext, marginBottom: "20px" }}>
              {logs.length > 0 && !user ? "Your guest logs will be moved to your account." : "Access your logs on any device."}
            </p>
            
            <button onClick={() => supabase.auth.signInWithOAuth({ provider: 'google' })} style={{ ...primaryBtn, background: "#fff", color: "#000", marginBottom: "20px" }}>Continue with Google</button>
            <div style={{ textAlign: "center", fontSize: "11px", color: theme.subtext, margin: "10px 0" }}>OR</div>
            <form onSubmit={handleAuth}>
              <input name="email" type="email" placeholder="Email" required style={{ ...inputStyle, background: theme.input, color: theme.text }} />
              <input name="password" type="password" placeholder="Password" required style={{ ...inputStyle, background: theme.input, color: theme.text }} />
              <button type="submit" style={{ ...primaryBtn, background: "#3498db", color: "#fff" }}>{isSignUp ? "Sign Up" : "Login"}</button>
            </form>
            <button onClick={() => setIsSignUp(!isSignUp)} style={{ ...smallBtn, display: "block", margin: "15px auto 0", color: "#3498db" }}>{isSignUp ? "Switch to Login" : "Switch to Sign Up"}</button>
            <button onClick={() => setShowAuthModal(false)} style={{ ...smallBtn, display: "block", margin: "20px auto 0" }}>Close</button>
          </div>
        </div>
      )}

      {/* ENTRY FORM */}
      <div style={{ background: theme.card, padding: "20px", borderRadius: "15px", border: `2px solid ${theme.border}`, marginBottom: "30px" }}>
        <div style={{ display: "flex", gap: "5px", marginBottom: "15px" }}>
          {["Book", "Movie", "Album"].map((t) => (
            <button key={t} onClick={() => setMediaType(t)} style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "none", background: mediaType === t ? (darkMode ? "#fff" : "#000") : theme.input, color: mediaType === t ? (darkMode ? "#000" : "#fff") : theme.text, fontWeight: "bold" }}>{t}</button>
          ))}
        </div>
        <input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} style={{ ...inputStyle, background: theme.input, color: theme.text }} />
        <input placeholder={getMediaStyle(mediaType).creatorLabel} value={creator} onChange={(e) => setCreator(e.target.value)} style={{ ...inputStyle, background: theme.input, color: theme.text }} />
        <div style={{ display: 'flex', gap: '5px' }}>
          {["I liked it", "It was ok", "I didn't like it"].map(v => (
            <button key={v} onClick={() => setVerdict(v)} style={{ ...verdictBtn, flex: 1, background: verdict === v ? "#3498db" : theme.input, color: verdict === v ? "#fff" : theme.text, borderColor: verdict === v ? "#3498db" : "#333" }}>{v}</button>
          ))}
        </div>
        <button onClick={handleSave} style={{ ...primaryBtn, marginTop: "15px", background: darkMode ? "#fff" : "#000", color: darkMode ? "#000" : "#fff" }}>{editingId ? "Update" : "Save Entry"}</button>
      </div>

      {/* FILTER TABS */}
      <div style={{ display: 'flex', gap: '5px', marginBottom: '20px' }}>
        {["History", "Reading", "Queue"].map(tab => (
          <button key={tab} onClick={() => setViewMode(tab)} style={{ ...smallBtn, flex: 1, padding: "8px", borderRadius: "8px", background: viewMode === tab ? theme.card : "transparent", fontWeight: viewMode === tab ? "bold" : "normal", border: viewMode === tab ? `1px solid ${theme.border}` : "none" }}>{tab}</button>
        ))}
      </div>

      {/* LIST */}
      <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
        {filteredLogs.map((log) => {
          const m = getMediaStyle(log.media_type);
          return (
            <div key={log.id} style={{ padding: "15px", borderRadius: "12px", borderLeft: `6px solid ${m.color}`, background: theme.card }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: "16px", fontWeight: "bold" }}>{log.title}</div>
                  <div style={{ fontSize: "13px", color: theme.subtext }}>{log.creator}</div>
                </div>
                <button onClick={() => deleteLog(log.id)} style={{ ...smallBtn, color: '#e74c3c' }}>Delete</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const inputStyle = { width: "100%", padding: "12px", marginBottom: "10px", borderRadius: "8px", border: "1px solid #333", fontSize: "14px", boxSizing: "border-box" };
const primaryBtn = { width: "100%", padding: "14px", borderRadius: "8px", border: "none", fontWeight: "bold", cursor: "pointer" };
const verdictBtn = { padding: "8px", borderRadius: "8px", border: "1px solid #333", cursor: "pointer", fontSize: '11px' };
const smallBtn = { background: "none", border: "none", fontSize: "12px", cursor: "pointer", color: "inherit" };
