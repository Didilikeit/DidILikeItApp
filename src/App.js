import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";

// --- SECURE KEYS (Vercel) ---
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || "https://gfqmbvaierdvlfwzyzlj.supabase.co";
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY || "sb_publishable_3QrJ82zuDQi8sxoWmxi0MA_mWZ98OOk";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default function DidILikeIt() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [logs, setLogs] = useState([]);
  const [title, setTitle] = useState("");
  const [creator, setCreator] = useState("");
  const [notes, setNotes] = useState("");
  const [mediaType, setMediaType] = useState("Movie");
  const [verdict, setVerdict] = useState("");
  const [year, setYear] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMedium, setFilterMedium] = useState("All");
  const [viewMode, setViewMode] = useState("History"); // "History" or "Queue"
  const [editingId, setEditingId] = useState(null);

  // 1. AUTH LISTENER
  useEffect(() => {
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setLoading(false);
    };
    getInitialSession();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // 2. ACTIONS
  const handleLogin = async () => {
    if (!email || !password) return alert("Enter email and password!");
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { alert(error.message); setLoading(false); }
    else { setUser(data.user); setLoading(false); }
  };

  const handleSignUp = async () => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) alert(error.message);
    else alert("Sign up successful! Now try logging in.");
  };

  const handleLogout = async () => { await supabase.auth.signOut(); setUser(null); setLogs([]); };

  const fetchLogs = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase.from("logs").select("*").order("logged_at", { ascending: false });
    if (!error) setLogs(data || []);
  }, [user]);

  useEffect(() => { if (user) fetchLogs(); }, [user, fetchLogs]);

  const handleSave = async () => {
    if (!title || !verdict) return alert("Title and Status required!");
    const logData = { title, creator, notes, media_type: mediaType, verdict, year_released: year || null, user_id: user.id };
    if (editingId) { await supabase.from("logs").update(logData).eq("id", editingId); }
    else { await supabase.from("logs").insert([logData]); }
    setTitle(""); setCreator(""); setNotes(""); setYear(""); setVerdict(""); setEditingId(null);
    fetchLogs();
  };

  const deleteLog = async (id) => {
    if (confirm("Delete forever?")) { await supabase.from("logs").delete().eq("id", id); fetchLogs(); }
  };

  const startEdit = (log) => {
    setEditingId(log.id); setTitle(log.title); setCreator(log.creator || "");
    setNotes(log.notes || ""); setYear(log.year_released || "");
    setVerdict(log.verdict); setMediaType(log.media_type);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // 3. LOGIC & FILTERING
  const counts = useMemo(() => ({
    Book: logs.filter(l => l.media_type === 'Book' && !l.verdict.includes("Want to") && l.verdict !== "Reading Now").length,
    Album: logs.filter(l => l.media_type === 'Album' && !l.verdict.includes("Want to")).length,
    Movie: logs.filter(l => l.media_type === 'Movie' && !l.verdict.includes("Want to")).length,
  }), [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const isQueueItem = log.verdict === "Reading Now" || log.verdict.startsWith("Want to");
      
      // Filter by Search Term
      const searchableText = [log.title, log.creator, log.notes].join(" ").toLowerCase();
      const matchesSearch = searchableText.includes(searchTerm.toLowerCase());
      
      // Filter by Medium
      const matchesMedium = filterMedium === "All" || log.media_type === filterMedium;
      
      // Filter by View Mode (History vs Queue)
      const matchesView = viewMode === "Queue" ? isQueueItem : !isQueueItem;
      
      return matchesSearch && matchesMedium && matchesView;
    }).sort((a, b) => {
        // In Queue, keep "Reading Now" at the very top
        if (viewMode === "Queue") {
            if (a.verdict === "Reading Now") return -1;
            if (b.verdict === "Reading Now") return 1;
        }
        return 0;
    });
  }, [logs, searchTerm, filterMedium, viewMode]);

  if (loading) return <div style={{ textAlign: "center", padding: "50px", fontFamily: "sans-serif" }}>Loading...</div>;

  if (!user) {
    return (
      <div style={{ padding: "40px 20px", maxWidth: "400px", margin: "auto", textAlign: "center", fontFamily: "sans-serif" }}>
        <h1 style={{ fontSize: "50px" }}>🤔</h1>
        <h2>Did I Like It?</h2>
        <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} />
        <input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} />
        <button onClick={handleLogin} style={primaryBtn}>Login</button>
        <button onClick={handleSignUp} style={{ ...primaryBtn, background: "#eee", color: "#000", marginTop: "10px" }}>Create Account</button>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px", maxWidth: "500px", margin: "auto", fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <button onClick={handleLogout} style={{ background: "none", border: "none", color: "#888", cursor: "pointer" }}>Logout</button>
        <h2 style={{ margin: 0 }}>🤔 Did I Like It?</h2>
        <div style={{ width: "50px" }}></div>
      </div>

      {/* COUNTERS */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        {Object.entries(counts).map(([type, count]) => (
          <div key={type} style={{ flex: 1, background: '#f0f0f0', padding: '10px', borderRadius: '10px', textAlign: 'center', border: '1px solid #ddd' }}>
            <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#666' }}>{type.toUpperCase()}S</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{count}</div>
          </div>
        ))}
      </div>

      {/* INPUT FORM */}
      <div style={{ background: "#fff", padding: "20px", borderRadius: "15px", border: "2px solid #000", marginBottom: "30px", boxShadow: "5px 5px 0px #000" }}>
        <div style={{ display: "flex", gap: "5px", marginBottom: "15px" }}>
          {["Book", "Movie", "Album"].map((t) => (
            <button key={t} onClick={() => {setMediaType(t); setVerdict("");}} style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "none", background: mediaType === t ? "#000" : "#eee", color: mediaType === t ? "#fff" : "#000", fontWeight: "bold" }}>{t}</button>
          ))}
        </div>
        <input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle} />
        <div style={{ display: "flex", gap: "10px" }}>
          <input placeholder={mediaType === "Book" ? "Author" : mediaType === "Movie" ? "Director" : "Artist"} value={creator} onChange={(e) => setCreator(e.target.value)} style={{ ...inputStyle, flex: 2 }} />
          <input placeholder="Year" value={year} type="number" onChange={(e) => setYear(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
        </div>
        <textarea placeholder="My thoughts..." value={notes} onChange={(e) => setNotes(e.target.value)} style={{ ...inputStyle, height: "60px", resize: "none" }} />
        
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {["Queue", "Liked", "Kind of", "Didn't Like"].map((v) => {
            let label = v;
            let icon = "";
            let color = "#fff";
            
            if (v === "Queue") {
              if (mediaType === "Book") { label = "Reading Now"; icon = "📖"; color = "#3498db"; }
              else if (mediaType === "Movie") { label = "Want to Watch"; icon = "⏳"; color = "#9b59b6"; }
              else { label = "Want to Listen"; icon = "🎧"; color = "#e67e22"; }
            } else if (v === "Liked") { label = "I liked it"; icon = "🟢"; color = "#4caf50"; }
            else if (v === "Kind of") { label = "It was ok"; icon = "🟡"; color = "#ff9800"; }
            else { label = "I didn't like it"; icon = "🔴"; color = "#f44336"; }

            const isSelected = verdict === (v === "Queue" ? (mediaType === "Book" ? "Reading Now" : mediaType === "Movie" ? "Want to Watch" : "Want to Listen") : v);

            return (
              <button key={v} onClick={() => setVerdict(v === "Queue" ? (mediaType === "Book" ? "Reading Now" : mediaType === "Movie" ? "Want to Watch" : "Want to Listen") : v)} 
                style={{ ...verdictBtn, background: isSelected ? color : "#fff", color: isSelected ? "#fff" : "#000" }}>
                {icon} {label}
              </button>
            );
          })}
        </div>
        <button onClick={handleSave} style={{ ...primaryBtn, marginTop: "20px" }}>{editingId ? "UPDATE ENTRY" : "LOCK IT IN"}</button>
      </div>

      {/* VIEW TOGGLE */}
      <div style={{ display: 'flex', marginBottom: '20px', background: '#eee', borderRadius: '10px', padding: '4px' }}>
        <button onClick={() => setViewMode("History")} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold', background: viewMode === "History" ? "#fff" : "transparent", boxShadow: viewMode === "History" ? "0 2px 4px rgba(0,0,0,0.1)" : "none" }}>History</button>
        <button onClick={() => setViewMode("Queue")} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold', background: viewMode === "Queue" ? "#fff" : "transparent", boxShadow: viewMode === "Queue" ? "0 2px 4px rgba(0,0,0,0.1)" : "none" }}>My Queue</button>
      </div>

      {/* SEARCH & FILTER */}
      <div style={{ display: 'flex', gap: '5px', marginBottom: '20px' }}>
        <input placeholder="🔍 Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ ...inputStyle, borderRadius: "30px", marginBottom: 0, flex: 2 }} />
        <select value={filterMedium} onChange={(e) => setFilterMedium(e.target.value)} style={{ ...inputStyle, flex: 1, marginBottom: 0 }}>
          <option value="All">All Types</option>
          <option value="Book">Books</option><option value="Movie">Movies</option><option value="Album">Albums</option>
        </select>
      </div>

      {/* LOG ENTRIES */}
      <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
        {filteredLogs.length === 0 && <div style={{ textAlign: 'center', color: '#888', padding: '20px' }}>Nothing to show here yet!</div>}
        {filteredLogs.map((log) => {
          const dateLabel = new Date(log.logged_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
          const isReading = log.verdict === "Reading Now";
          const isQueue = log.verdict.startsWith("Want to");
          
          return (
            <div key={log.id} style={{ 
              padding: "15px", borderBottom: "2px solid #eee", 
              background: isReading ? "#f0f7ff" : (isQueue ? "#fff" : "transparent"),
              borderLeft: isReading ? "5px solid #3498db" : (isQueue ? "5px solid #9b59b6" : "none"),
              borderRadius: (isReading || isQueue) ? "12px" : "0px",
              boxShadow: (isReading || isQueue) ? "0 2px 8px rgba(0,0,0,0.05)" : "none"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "17px", fontWeight: "bold" }}>{log.title}</div>
                  <div style={{ color: "#666", fontSize: '14px' }}>{log.creator}</div>
                  <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>{isQueue ? "Added" : "Logged"} {dateLabel}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span style={{ fontSize: "20px" }}>
                    {log.verdict === "Reading Now" ? "📖" : log.verdict === "Want to Watch" ? "⏳" : log.verdict === "Want to Listen" ? "🎧" : (log.verdict === "Liked" ? "🟢" : log.verdict === "Kind of" ? "🟡" : "🔴")}
                  </span>
                  <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                    <button onClick={() => startEdit(log)} style={smallBtn}>Edit</button>
                    <button onClick={() => deleteLog(log.id)} style={{ ...smallBtn, color: "red" }}>Delete</button>
                  </div>
                </div>
              </div>
              {log.notes && (
                <div 
                  onClick={(e) => {
                    const isExpanded = e.currentTarget.style.webkitLineClamp === 'unset';
                    e.currentTarget.style.display = "-webkit-box";
                    e.currentTarget.style.webkitBoxOrient = "vertical";
                    e.currentTarget.style.webkitLineClamp = isExpanded ? "3" : "unset";
                  }}
                  style={{ marginTop: "10px", padding: "10px", background: "#f9f9f9", borderRadius: "8px", fontSize: "13px", fontStyle: "italic", cursor: "pointer", display: "-webkit-box", WebkitLineClamp: "3", WebkitBoxOrient: "vertical", overflow: "hidden" }}
                >
                  "{log.notes}"
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const inputStyle = { width: "100%", padding: "12px", marginBottom: "10px", borderRadius: "8px", border: "1px solid #ddd", boxSizing: "border-box", fontSize: "14px" };
const primaryBtn = { width: "100%", padding: "15px", background: "#000", color: "#fff", borderRadius: "8px", border: "none", fontWeight: "bold", cursor: "pointer", fontSize: "16px" };
const verdictBtn = { padding: "12px", borderRadius: "8px", border: "1px solid #ddd", cursor: "pointer", textAlign: "left", fontWeight: "500", fontSize: '14px' };
const smallBtn = { background: "none", border: "none", fontSize: "12px", cursor: "pointer", color: "#0070f3", padding: 0 };
