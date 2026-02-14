import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";

// --- SECURE CONFIGURATION ---
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;
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
  const [filterDate, setFilterDate] = useState("All");
  const [viewMode, setViewMode] = useState("History"); // Tabs: History, Reading, Queue
  const [editingId, setEditingId] = useState(null);
  const [displayName, setDisplayName] = useState("My");

  // 1. AUTH LISTENER
  useEffect(() => {
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        setDisplayName(session.user.user_metadata?.display_name || "My");
      }
      setLoading(false);
    };
    getInitialSession();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) setDisplayName(session.user.user_metadata?.display_name || "My");
    });
    return () => subscription.unsubscribe();
  }, []);

  // 2. ACTIONS
  const fetchLogs = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase.from("logs").select("*").order("logged_at", { ascending: false });
    if (!error) setLogs(data || []);
  }, [user]);

  useEffect(() => { if (user) fetchLogs(); }, [user, fetchLogs]);

  const handleSave = async () => {
    if (!title || !verdict) return alert("Title and Verdict required!");
    const logData = { title: title.trim(), creator: creator.trim(), notes: notes.trim(), media_type: mediaType, verdict, year_released: year || null, user_id: user.id };
    
    const { error } = editingId 
      ? await supabase.from("logs").update(logData).eq("id", editingId)
      : await supabase.from("logs").insert([logData]);

    if (error) alert(`Error: ${error.message}`);
    else {
      setTitle(""); setCreator(""); setNotes(""); setYear(""); setVerdict(""); setEditingId(null);
      fetchLogs();
    }
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
  const counts = useMemo(() => {
    const historyStatuses = ["Liked", "Kind of", "Didn't Like"];
    return {
      Book: logs.filter(l => l.media_type === 'Book' && historyStatuses.includes(l.verdict)).length,
      Album: logs.filter(l => l.media_type === 'Album' && historyStatuses.includes(l.verdict)).length,
      Movie: logs.filter(l => l.media_type === 'Movie' && historyStatuses.includes(l.verdict)).length,
    };
  }, [logs]);

  const dateOptions = useMemo(() => {
    const dates = logs.map(l => {
      const d = new Date(l.logged_at);
      return d.toLocaleString('default', { month: 'long', year: 'numeric' });
    });
    return ["All", ...new Set(dates)];
  }, [logs]);

  const filteredLogs = logs.filter((log) => {
    const isQueue = ["Want to Read", "Want to Watch", "Want to Listen"].includes(log.verdict);
    const isActive = log.verdict === "Currently Reading";
    const isHistory = !isQueue && !isActive;

    const logMonthYear = new Date(log.logged_at).toLocaleString('default', { month: 'long', year: 'numeric' });
    const searchableText = `${log.title} ${log.creator} ${log.notes}`.toLowerCase();
    const matchesSearch = searchableText.includes(searchTerm.toLowerCase());
    const matchesMedium = filterMedium === "All" || log.media_type === filterMedium;

    let matchesView = false;
    if (searchTerm.length > 0) matchesView = true;
    else if (viewMode === "Reading") matchesView = isActive;
    else if (viewMode === "Queue") matchesView = isQueue;
    else matchesView = isHistory;

    const matchesDate = !isHistory || filterDate === "All" || logMonthYear === filterDate;
    
    return matchesSearch && matchesMedium && matchesDate && matchesView;
  });

  if (loading) return <div style={{ textAlign: "center", padding: "50px", fontFamily: "sans-serif" }}>Loading...</div>;

  if (!user) {
    return (
      <div style={{ padding: "40px 20px", maxWidth: "400px", margin: "auto", textAlign: "center", fontFamily: "sans-serif" }}>
        <h1 style={{ fontSize: "50px" }}>🤔</h1>
        <h2>Did I Like It?</h2>
        <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} />
        <input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} />
        <button onClick={async () => {
           const { data, error } = await supabase.auth.signInWithPassword({ email, password });
           if (error) alert(error.message); else setUser(data.user);
        }} style={primaryBtn}>Login</button>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px", maxWidth: "500px", margin: "auto", fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
        <button onClick={() => supabase.auth.signOut()} style={{ background: "none", border: "none", color: "#888", cursor: "pointer" }}>Logout</button>
        <h2 style={{ margin: 0 }}>🤔 Did I Like It?</h2>
        <div style={{ width: "50px" }}></div>
      </div>

      <h3 style={{ margin: "10px 0", fontSize: '22px' }}>{displayName}'s Stats</h3>

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
            <button key={t} onClick={() => { setMediaType(t); setVerdict(""); }} style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "none", background: mediaType === t ? "#000" : "#eee", color: mediaType === t ? "#fff" : "#000", fontWeight: "bold" }}>{t}</button>
          ))}
        </div>
        <input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle} />
        <div style={{ display: "flex", gap: "10px" }}>
          <input placeholder={mediaType === "Book" ? "Author" : mediaType === "Movie" ? "Director" : "Artist"} value={creator} onChange={(e) => setCreator(e.target.value)} style={{ ...inputStyle, flex: 2 }} />
          <input placeholder="Year" value={year} type="number" onChange={(e) => setYear(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
        </div>
        <textarea placeholder="My thoughts..." value={notes} onChange={(e) => setNotes(e.target.value)} style={{ ...inputStyle, height: "60px", resize: "none" }} />
        
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {mediaType === "Book" ? (
            <div style={{ display: 'flex', gap: '5px' }}>
              <button onClick={() => setVerdict("Currently Reading")} style={{ ...verdictBtn, flex: 1, background: verdict === "Currently Reading" ? "#3498db" : "#fff", color: verdict === "Currently Reading" ? "#fff" : "#000" }}>📖 Reading Now</button>
              <button onClick={() => setVerdict("Want to Read")} style={{ ...verdictBtn, flex: 1, background: verdict === "Want to Read" ? "#5dade2" : "#fff", color: verdict === "Want to Read" ? "#fff" : "#000" }}>🔖 Want to Read</button>
            </div>
          ) : (
            <button 
              onClick={() => setVerdict(mediaType === "Movie" ? "Want to Watch" : "Want to Listen")} 
              style={{ ...verdictBtn, background: ["Want to Watch", "Want to Listen"].includes(verdict) ? "#9b59b6" : "#fff", color: ["Want to Watch", "Want to Listen"].includes(verdict) ? "#fff" : "#000" }}
            >
              {mediaType === "Movie" ? "⏳ Want to Watch" : "🎧 Want to Listen"}
            </button>
          )}

          <div style={{ display: 'flex', gap: '5px' }}>
            <button onClick={() => setVerdict("Liked")} style={{ ...verdictBtn, flex: 1, background: verdict === "Liked" ? "#4caf50" : "#fff", color: verdict === "Liked" ? "#fff" : "#000" }}>🟢 I liked it</button>
            <button onClick={() => setVerdict("Kind of")} style={{ ...verdictBtn, flex: 1, background: verdict === "Kind of" ? "#ff9800" : "#fff", color: verdict === "Kind of" ? "#fff" : "#000" }}>🟡 It was ok</button>
            <button onClick={() => setVerdict("Didn't Like")} style={{ ...verdictBtn, flex: 1, background: verdict === "Didn't Like" ? "#f44336" : "#fff", color: verdict === "Didn't Like" ? "#fff" : "#000" }}>🔴 I didn't like it</button>
          </div>
        </div>
        <button onClick={handleSave} style={{ ...primaryBtn, marginTop: "20px" }}>{editingId ? "UPDATE ENTRY" : "SAVE TO LOG"}</button>
      </div>

      {/* THREE-TAB NAVIGATION */}
      <div style={{ display: 'flex', gap: '5px', marginBottom: '15px', background: '#eee', borderRadius: '12px', padding: '4px' }}>
        {["History", "Reading", "Queue"].map((tab) => (
          <button 
            key={tab}
            onClick={() => setViewMode(tab)} 
            style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', background: viewMode === tab ? "#fff" : "transparent", boxShadow: viewMode === tab ? "0 2px 5px rgba(0,0,0,0.1)" : "none" }}>
            {tab === "Queue" ? "My Queue" : tab}
          </button>
        ))}
      </div>

      {/* FILTERS */}
      <div style={{ marginBottom: '20px' }}>
        <input placeholder="🔍 Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ ...inputStyle, borderRadius: "30px", marginBottom: '10px' }} />
        <div style={{ display: 'flex', gap: '10px' }}>
          <select value={filterMedium} onChange={(e) => setFilterMedium(e.target.value)} style={{ ...inputStyle, flex: 1, marginBottom: 0 }}>
            <option value="All">All Mediums</option>
            <option value="Book">Books</option><option value="Movie">Movies</option><option value="Album">Albums</option>
          </select>
          {viewMode === "History" && (
            <select value={filterDate} onChange={(e) => setFilterDate(e.target.value)} style={{ ...inputStyle, flex: 1, marginBottom: 0 }}>
              {dateOptions.map(d => <option key={d} value={d}>{d === "All" ? "All Time" : d}</option>)}
            </select>
          )}
        </div>
      </div>

      {/* LIST */}
      <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
        {filteredLogs.map((log) => (
          <div key={log.id} style={{ padding: "15px 0", borderBottom: "2px solid #eee" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: '10px', fontWeight: 'bold', background: '#eee', padding: '2px 6px', borderRadius: '4px' }}>{log.media_type}</span>
                <div style={{ fontSize: "18px", fontWeight: "bold", marginTop: '5px' }}>{log.title} {log.year_released && <span style={{ fontWeight: 'normal', color: '#888' }}>({log.year_released})</span>}</div>
                <div style={{ color: "#444", fontSize: '14px' }}>{log.creator}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <span style={{ fontSize: "20px" }}>
                   {log.verdict === "Currently Reading" ? "📖" : log.verdict === "Want to Read" ? "🔖" : log.verdict === "Want to Watch" ? "⏳" : log.verdict === "Want to Listen" ? "🎧" : (log.verdict === "Liked" ? "🟢" : log.verdict === "Kind of" ? "🟡" : "🔴")}
                </span>
                <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                  <button onClick={() => startEdit(log)} style={smallBtn}>Edit</button>
                  <button onClick={() => deleteLog(log.id)} style={{ ...smallBtn, color: "red" }}>Delete</button>
                </div>
              </div>
            </div>
            
            {/* THOUGHTS WITH READ MORE TRICK */}
            {log.notes && (
              <div 
                onClick={(e) => {
                  const isExpanded = e.currentTarget.style.webkitLineClamp === 'unset';
                  e.currentTarget.style.webkitLineClamp = isExpanded ? "3" : "unset";
                }}
                style={{ 
                  marginTop: "10px", padding: "12px", background: "#f9f9f9", borderRadius: "8px", 
                  fontSize: "14px", fontStyle: "italic", borderLeft: "4px solid #ddd", cursor: "pointer",
                  display: "-webkit-box", WebkitLineClamp: "3", WebkitBoxOrient: "vertical", overflow: "hidden" 
                }}
              >
                "{log.notes}"
              </div>
            )}
          </div>
        ))}
        {filteredLogs.length === 0 && <div style={{ textAlign: 'center', color: '#999', marginTop: '20px' }}>Nothing here yet!</div>}
      </div>
    </div>
  );
}

const inputStyle = { width: "100%", padding: "12px", marginBottom: "10px", borderRadius: "8px", border: "1px solid #ddd", boxSizing: "border-box", fontSize: "14px" };
const primaryBtn = { width: "100%", padding: "15px", background: "#000", color: "#fff", borderRadius: "8px", border: "none", fontWeight: "bold", cursor: "pointer", fontSize: "16px" };
const verdictBtn = { padding: "12px", borderRadius: "8px", border: "1px solid #ddd", cursor: "pointer", textAlign: "left", fontWeight: "500", fontSize: '14px' };
const smallBtn = { background: "none", border: "none", fontSize: "12px", cursor: "pointer", color: "#0070f3", padding: 0 };
