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
  const [viewMode, setViewMode] = useState("History"); // History vs Queue
  const [editingId, setEditingId] = useState(null);

  // 1. AUTH
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

  // 2. FETCH DATA
  const fetchLogs = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase.from("logs").select("*").order("logged_at", { ascending: false });
    if (!error) setLogs(data || []);
  }, [user]);

  useEffect(() => { if (user) fetchLogs(); }, [user, fetchLogs]);

  // 3. ACTIONS
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

  // 4. FILTER LOGIC
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const isQueueItem = log.verdict === "Reading Now" || log.verdict === "Want to Watch" || log.verdict === "Want to Listen";
      const searchableText = `${log.title} ${log.creator} ${log.notes} ${log.year_released}`.toLowerCase();
      const matchesSearch = searchableText.includes(searchTerm.toLowerCase());
      const matchesMedium = filterMedium === "All" || log.media_type === filterMedium;
      
      // Global search ignores tabs. Otherwise, split by History/Queue.
      const matchesView = searchTerm.length > 0 ? true : (viewMode === "Queue" ? isQueueItem : !isQueueItem);
      
      return matchesSearch && matchesMedium && matchesView;
    });
  }, [logs, searchTerm, filterMedium, viewMode]);

  if (loading) return <div style={{ textAlign: "center", padding: "50px", fontFamily: "sans-serif" }}>Loading...</div>;

  // LOGIN SCREEN
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
        <button onClick={async () => {
           const { error } = await supabase.auth.signUp({ email, password });
           if (error) alert(error.message); else alert("Check your email!");
        }} style={{ ...primaryBtn, background: "#eee", color: "#000", marginTop: "10px" }}>Create Account</button>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px", maxWidth: "500px", margin: "auto", fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <button onClick={() => supabase.auth.signOut()} style={{ background: "none", border: "none", color: "#888", cursor: "pointer" }}>Logout</button>
        <h2 style={{ margin: 0 }}>🤔 Did I Like It?</h2>
        <div style={{ width: "50px" }}></div>
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
          {/* Dynamic Queue Status */}
          {mediaType === "Book" && <button onClick={() => setVerdict("Reading Now")} style={{ ...verdictBtn, background: verdict === "Reading Now" ? "#3498db" : "#fff", color: verdict === "Reading Now" ? "#fff" : "#000" }}>📖 Reading Now</button>}
          {mediaType === "Movie" && <button onClick={() => setVerdict("Want to Watch")} style={{ ...verdictBtn, background: verdict === "Want to Watch" ? "#9b59b6" : "#fff", color: verdict === "Want to Watch" ? "#fff" : "#000" }}>⏳ Want to Watch</button>}
          {mediaType === "Album" && <button onClick={() => setVerdict("Want to Listen")} style={{ ...verdictBtn, background: verdict === "Want to Listen" ? "#e67e22" : "#fff", color: verdict === "Want to Listen" ? "#fff" : "#000" }}>🎧 Want to Listen</button>}

          <div style={{ display: 'flex', gap: '5px' }}>
            <button onClick={() => setVerdict("Liked")} style={{ ...verdictBtn, flex: 1, background: verdict === "Liked" ? "#4caf50" : "#fff", color: verdict === "Liked" ? "#fff" : "#000" }}>🟢 Liked</button>
            <button onClick={() => setVerdict("Kind of")} style={{ ...verdictBtn, flex: 1, background: verdict === "Kind of" ? "#ff9800" : "#fff", color: verdict === "Kind of" ? "#fff" : "#000" }}>🟡 Ok</button>
            <button onClick={() => setVerdict("Didn't Like")} style={{ ...verdictBtn, flex: 1, background: verdict === "Didn't Like" ? "#f44336" : "#fff", color: verdict === "Didn't Like" ? "#fff" : "#000" }}>🔴 No</button>
          </div>
        </div>
        <button onClick={handleSave} style={{ ...primaryBtn, marginTop: "20px" }}>{editingId ? "UPDATE ENTRY" : "LOCK IT IN"}</button>
      </div>

      {/* VIEW TOGGLE */}
      {searchTerm.length === 0 && (
        <div style={{ display: 'flex', marginBottom: '15px', background: '#eee', borderRadius: '10px', padding: '4px' }}>
          <button onClick={() => setViewMode("History")} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', fontWeight: 'bold', background: viewMode === "History" ? "#fff" : "transparent" }}>History</button>
          <button onClick={() => setViewMode("Queue")} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', fontWeight: 'bold', background: viewMode === "Queue" ? "#fff" : "transparent" }}>My Queue</button>
        </div>
      )}

      {/* SEARCH/FILTER */}
      <div style={{ display: 'flex', gap: '5px', marginBottom: '20px' }}>
        <input placeholder="🔍 Search everything..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ ...inputStyle, borderRadius: "30px", flex: 2, marginBottom: 0 }} />
        <select value={filterMedium} onChange={(e) => setFilterMedium(e.target.value)} style={{ ...inputStyle, flex: 1, marginBottom: 0 }}>
          <option value="All">All Types</option>
          <option value="Book">Books</option><option value="Movie">Movies</option><option value="Album">Albums</option>
        </select>
      </div>

      {/* THE LIST */}
      <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
        {filteredLogs.map((log) => {
          const dateLabel = new Date(log.logged_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
          return (
            <div key={log.id} style={{ padding: "15px", borderBottom: "2px solid #eee", background: "#fff", borderRadius: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', color: '#999' }}>{log.media_type}</span>
                  <div style={{ fontSize: "17px", fontWeight: "bold" }}>{log.title} {log.year_released && <span style={{ fontWeight: "normal", color: "#888", fontSize: '14px' }}>({log.year_released})</span>}</div>
                  <div style={{ color: "#666", fontSize: '14px' }}>{log.creator}</div>
                  <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>Added {dateLabel}</div>
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
              {log.notes && <div style={{ marginTop: "10px", padding: "10px", background: "#f9f9f9", borderRadius: "8px", fontSize: "13px", fontStyle: "italic" }}>"{log.notes}"</div>}
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
