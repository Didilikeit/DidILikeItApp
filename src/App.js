import { useState, useEffect, useCallback, useMemo, useRef } from "react";
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
  const [manualDate, setManualDate] = useState(""); 
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMedium, setFilterMedium] = useState("All");
  const [filterDate, setFilterDate] = useState("All");
  const [viewMode, setViewMode] = useState("History"); 
  const [editingId, setEditingId] = useState(null);
  
  const [customName, setCustomName] = useState(localStorage.getItem("user_custom_name") || "");
  const [isEditingName, setIsEditingName] = useState(false);

  const listRef = useRef(null);

  // 1. AUTH LISTENER
  useEffect(() => {
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) setUser(session.user);
      setLoading(false);
    };
    getInitialSession();
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
    const logData = { 
      title: title.trim(), creator: creator.trim(), notes: notes.trim(), 
      media_type: mediaType, verdict, year_released: year || null, user_id: user.id,
      ...(manualDate && { logged_at: new Date(manualDate).toISOString() })
    };
    const { error } = editingId 
      ? await supabase.from("logs").update(logData).eq("id", editingId)
      : await supabase.from("logs").insert([logData]);
    if (error) alert(`Error: ${error.message}`);
    else {
      setTitle(""); setCreator(""); setNotes(""); setYear(""); setVerdict(""); setManualDate("");
      setEditingId(null); fetchLogs();
    }
  };

  const deleteLog = async (id) => {
    if (confirm("Delete forever?")) { await supabase.from("logs").delete().eq("id", id); fetchLogs(); }
  };

  const startEdit = (log) => {
    setEditingId(log.id); setTitle(log.title); setCreator(log.creator || "");
    setNotes(log.notes || ""); setYear(log.year_released || "");
    setVerdict(log.verdict); setMediaType(log.media_type);
    setManualDate(new Date(log.logged_at).toISOString().split('T')[0]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const jumpToTab = (mode) => {
    setViewMode(mode);
    setTimeout(() => {
      listRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const saveName = () => {
    localStorage.setItem("user_custom_name", customName);
    setIsEditingName(false);
  };

  // 3. LOGIC & STATS
  const stats = useMemo(() => {
    const queueStatuses = ["Want to Read", "Want to Watch", "Want to Listen"];
    const completed = logs.filter(l => !queueStatuses.includes(l.verdict) && l.verdict !== "Currently Reading");
    const active = logs.filter(l => l.verdict === "Currently Reading");
    const queue = logs.filter(l => queueStatuses.includes(l.verdict));
    return {
      books: completed.filter(l => l.media_type === "Book").length,
      movies: completed.filter(l => l.media_type === "Movie").length,
      albums: completed.filter(l => l.media_type === "Album").length,
      activeCount: active.length,
      queueCount: queue.length
    };
  }, [logs]);

  const dateOptions = useMemo(() => {
    const dates = logs.map(l => {
      const d = new Date(l.logged_at);
      return d.toLocaleString('default', { month: 'long', year: 'numeric' });
    });
    return ["All", ...new Set(dates)];
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const isQueue = ["Want to Read", "Want to Watch", "Want to Listen"].includes(log.verdict);
      const isActive = log.verdict === "Currently Reading";
      const isHistory = !isQueue && !isActive;
      const logMonthYear = new Date(log.logged_at).toLocaleString('default', { month: 'long', year: 'numeric' });
      
      const searchableText = `${log.title} ${log.creator} ${log.notes}`.toLowerCase();
      const matchesSearch = searchableText.includes(searchTerm.toLowerCase());
      const matchesMedium = filterMedium === "All" || log.media_type === filterMedium;

      let matchesView = false;
      if (searchTerm.length > 0) matchesView = true;
      else {
        if (viewMode === "Reading") matchesView = isActive;
        else if (viewMode === "Queue") matchesView = isQueue;
        else matchesView = isHistory;
      }

      const matchesDate = !isHistory || filterDate === "All" || logMonthYear === filterDate;
      return matchesSearch && matchesMedium && matchesDate && matchesView;
    });
  }, [logs, searchTerm, filterMedium, viewMode, filterDate]);

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

      {/* STATS SECTION */}
      <div style={{ marginBottom: '25px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
          {isEditingName ? (
            <input value={customName} placeholder="Enter name..." onChange={(e) => setCustomName(e.target.value)} onBlur={saveName} onKeyDown={(e) => e.key === 'Enter' && saveName()} autoFocus style={{ fontSize: '22px', fontWeight: 'bold', border: 'none', borderBottom: '2px solid #000', outline: 'none', width: '220px' }} />
          ) : (
            <>
              <h3 style={{ margin: 0, fontSize: '22px' }}>{customName ? `${customName}'s Library` : "Your Stats"}</h3>
              <button onClick={() => setIsEditingName(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }}>✏️</button>
            </>
          )}
        </div>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
          {[{ l: 'Books', c: stats.books }, { l: 'Movies', c: stats.movies }, { l: 'Albums', c: stats.albums }].map(i => (
            <div key={i.l} style={{ flex: 1, background: '#fff', padding: '10px', borderRadius: '12px', textAlign: 'center', border: '2px solid #eee' }}>
              <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#999', textTransform: 'uppercase' }}>{i.l}</div>
              <div style={{ fontSize: '20px', fontWeight: '800' }}>{i.c}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <div onClick={() => jumpToTab("Reading")} style={{ flex: 1, background: '#fef9e7', padding: '8px 12px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', border: viewMode === "Reading" ? '2px solid #f1c40f' : '1px solid #f9e79f' }}>
            <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#996e00' }}>📖 Reading Now</span>
            <span style={{ fontSize: '14px', fontWeight: '800' }}>{stats.activeCount}</span>
          </div>
          <div onClick={() => jumpToTab("Queue")} style={{ flex: 1, background: '#f4f6f7', padding: '8px 12px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', border: viewMode === "Queue" ? '2px solid #34495e' : '1px solid #d5dbdb' }}>
            <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#566573' }}>🔖 In Queue</span>
            <span style={{ fontSize: '14px', fontWeight: '800' }}>{stats.queueCount}</span>
          </div>
        </div>
      </div>

      {/* FORM SECTION */}
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
        <div style={{ marginBottom: "10px" }}>
          <label style={{ fontSize: "11px", color: "#888", display: "block", marginBottom: "3px", fontWeight: "bold", textTransform: "uppercase" }}>{mediaType === "Book" ? "Date Read" : mediaType === "Movie" ? "Date Watched" : "Date Listened"}</label>
          <input type="date" value={manualDate} onChange={(e) => setManualDate(e.target.value)} style={{ ...inputStyle, marginBottom: 0, padding: "8px" }} />
        </div>
        <textarea placeholder="My thoughts..." value={notes} onChange={(e) => setNotes(e.target.value)} style={{ ...inputStyle, height: "60px", resize: "none" }} />
        
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {mediaType === "Book" ? (
            <div style={{ display: 'flex', gap: '5px' }}>
              <button onClick={() => setVerdict("Currently Reading")} style={{ ...verdictBtn, flex: 1, background: verdict === "Currently Reading" ? "#3498db" : "#fff", color: verdict === "Currently Reading" ? "#fff" : "#000" }}>📖 Reading Now</button>
              <button onClick={() => setVerdict("Want to Read")} style={{ ...verdictBtn, flex: 1, background: verdict === "Want to Read" ? "#5dade2" : "#fff", color: verdict === "Want to Read" ? "#fff" : "#000" }}>🔖 Want to Read</button>
            </div>
          ) : (
            <button onClick={() => setVerdict(mediaType === "Movie" ? "Want to Watch" : "Want to Listen")} style={{ ...verdictBtn, background: ["Want to Watch", "Want to Listen"].includes(verdict) ? "#9b59b6" : "#fff", color: ["Want to Watch", "Want to Listen"].includes(verdict) ? "#fff" : "#000" }}>{mediaType === "Movie" ? "⏳ Want to Watch" : "🎧 Want to Listen"}</button>
          )}
          <div style={{ display: 'flex', gap: '5px' }}>
            <button onClick={() => setVerdict("Liked")} style={{ ...verdictBtn, flex: 1, background: verdict === "Liked" ? "#4caf50" : "#fff", color: verdict === "Liked" ? "#fff" : "#000" }}>🟢 I liked it</button>
            <button onClick={() => setVerdict("Kind of")} style={{ ...verdictBtn, flex: 1, background: verdict === "Kind of" ? "#ff9800" : "#fff", color: verdict === "Kind of" ? "#fff" : "#000" }}>🟡 It was ok</button>
            <button onClick={() => setVerdict("Didn't Like")} style={{ ...verdictBtn, flex: 1, background: verdict === "Didn't Like" ? "#f44336" : "#fff", color: verdict === "Didn't Like" ? "#fff" : "#000" }}>🔴 I didn't like it</button>
          </div>
        </div>
        <button onClick={handleSave} style={{ ...primaryBtn, marginTop: "20px" }}>{editingId ? "UPDATE" : "SAVE"}</button>
      </div>

      {/* TABS & SEARCH */}
      <div ref={listRef} style={{ display: 'flex', gap: '5px', marginBottom: '15px', background: '#eee', borderRadius: '12px', padding: '4px' }}>
        {["History", "Reading", "Queue"].map((tab) => (
          <button key={tab} onClick={() => setViewMode(tab)} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', background: viewMode === tab ? "#fff" : "transparent" }}>{tab}</button>
        ))}
      </div>

      <div style={{ marginBottom: '20px' }}>
        <input placeholder="🔍 Global search (all tabs)..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ ...inputStyle, borderRadius: "30px", marginBottom: '10px' }} />
        <div style={{ display: 'flex', gap: '10px' }}>
          <select value={filterMedium} onChange={(e) => setFilterMedium(e.target.value)} style={{ ...inputStyle, flex: 1, marginBottom: 0 }}>
            <option value="All">All Mediums</option>
            <option value="Book">Books</option><option value="Movie">Movies</option><option value="Album">Albums</option>
          </select>
          <select value={filterDate} onChange={(e) => setFilterDate(e.target.value)} style={{ ...inputStyle, flex: 1, marginBottom: 0 }}>
             {dateOptions.map(d => <option key={d} value={d}>{d === "All" ? "All Time" : d}</option>)}
          </select>
        </div>
      </div>

      {/* LIST VIEW */}
      <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
        {filteredLogs.map((log) => {
          const isQueue = ["Want to Read", "Want to Watch", "Want to Listen"].includes(log.verdict);
          const isActive = log.verdict === "Currently Reading";
          let verb = isActive ? "Started" : isQueue ? "Added" : (log.media_type === "Book" ? "Read" : log.media_type === "Movie" ? "Watched" : "Listened to");
          
          return (
            <div key={log.id} style={{ padding: "15px 0", borderBottom: "2px solid #eee" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: '10px', fontWeight: 'bold', background: '#eee', padding: '2px 6px', borderRadius: '4px' }}>{log.media_type}</span>
                  <div style={{ fontSize: "18px", fontWeight: "bold", marginTop: '5px' }}>{log.title} {log.year_released && <span style={{ fontWeight: 'normal', color: '#888' }}>({log.year_released})</span>}</div>
                  <div style={{ color: "#444", fontSize: '14px' }}>{log.creator}</div>
                  <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>{verb} on {new Date(log.logged_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                </div>

                {/* SENTIMENT BADGE SECTION */}
                <div style={{ textAlign: "right", display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                  <div style={{
                    padding: '4px 10px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: log.verdict === "Liked" ? "#e8f5e9" : log.verdict === "Kind of" ? "#fff3e0" : log.verdict === "Didn't Like" ? "#ffebee" : "#f4f6f7",
                    color: log.verdict === "Liked" ? "#2e7d32" : log.verdict === "Kind of" ? "#ef6c00" : log.verdict === "Didn't Like" ? "#c62828" : "#566573",
                    border: `1px solid ${log.verdict === "Liked" ? "#4caf50" : log.verdict === "Kind of" ? "#ff9800" : log.verdict === "Didn't Like" ? "#f44336" : "#d5dbdb"}`
                  }}>
                    <span>{log.verdict === "Currently Reading" ? "📖" : log.verdict === "Want to Read" ? "🔖" : log.verdict === "Want to Watch" ? "⏳" : log.verdict === "Want to Listen" ? "🎧" : (log.verdict === "Liked" ? "🟢" : log.verdict === "Kind of" ? "🟡" : "🔴")}</span>
                    {log.verdict === "Liked" && "I liked it"}
                    {log.verdict === "Kind of" && "It was ok"}
                    {log.verdict === "Didn't Like" && "I didn't like it"}
                    {log.verdict === "Currently Reading" && "Currently Reading"}
                    {isQueue && "In Queue"}
                  </div>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <button onClick={() => startEdit(log)} style={smallBtn}>Edit</button>
                    <button onClick={() => deleteLog(log.id)} style={{ ...smallBtn, color: "red" }}>Delete</button>
                  </div>
                </div>
              </div>
              
              {log.notes && (
                <div onClick={(e) => { const isExp = e.currentTarget.style.webkitLineClamp === 'unset'; e.currentTarget.style.webkitLineClamp = isExp ? "3" : "unset"; }}
                     style={{ marginTop: "10px", padding: "12px", background: "#f9f9f9", borderRadius: "8px", fontSize: "14px", fontStyle: "italic", borderLeft: "4px solid #ddd", cursor: "pointer", display: "-webkit-box", WebkitLineClamp: "3", WebkitBoxOrient: "vertical", overflow: "hidden" }}>
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
const verdictBtn = { padding: "10px", borderRadius: "8px", border: "1px solid #ddd", cursor: "pointer", textAlign: "left", fontWeight: "500", fontSize: '13px' };
const smallBtn = { background: "none", border: "none", fontSize: "12px", cursor: "pointer", color: "#0070f3", padding: 0 };
