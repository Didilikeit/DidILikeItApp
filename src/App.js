import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

// --- SUPABASE SETUP ---
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- COMPONENT: EXPANDABLE NOTE ---
const ExpandableNote = ({ text }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const isLong = text.length > 120;
  const displayedText = isLong && !isExpanded ? text.substring(0, 120) + "..." : text;

  return (
    <div style={{ marginTop: "10px", padding: "12px", background: "#f9f9f9", borderRadius: "8px", fontSize: "14px", fontStyle: "italic", borderLeft: "4px solid #ddd" }}>
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
  const [viewMode, setViewMode] = useState("History"); 
  const [showAbout, setShowAbout] = useState(false);
  const [customName] = useState(localStorage.getItem("user_custom_name") || "My Library");

  const textareaRef = useRef(null);
  const listTopRef = useRef(null);

  // --- AUTH & DATA ---
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

  // --- LOGIC: CLICKABLE STATS & SCROLL ---
  const handleStatClick = (type, mode = "History") => {
    setFilterMedium(type);
    setViewMode(mode);
    setSearchTerm("");
    setTimeout(() => listTopRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  // --- ACTIONS ---
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
      case 'Book': return { color: '#2980b9', icon: '📖' };
      case 'Movie': return { color: '#8e44ad', icon: '🎬' };
      case 'Album': return { color: '#16a085', icon: '💿' };
      default: return { color: '#7f8c8d', icon: '📎' };
    }
  };

  const getVerdictStyle = (v) => {
    switch(v) {
      case "Liked": return { bg: "#e8f5e9", color: "#2e7d32", border: "#c8e6c9" };
      case "Kind of": return { bg: "#fff3e0", color: "#ef6c00", border: "#ffe0b2" };
      case "Didn't Like": return { bg: "#ffebee", color: "#c62828", border: "#ffcdd2" };
      default: return { bg: "#f0f0f0", color: "#555", border: "#ddd" };
    }
  };

  // --- MEMOIZED DATA ---
  const stats = useMemo(() => {
    const queueTypes = ["Want to Read", "Want to Watch", "Want to Listen"];
    const getBreakdown = (type) => {
      const items = logs.filter(l => l.media_type === type && !queueTypes.includes(l.verdict) && l.verdict !== "Currently Reading");
      return { total: items.length, liked: items.filter(l => l.verdict === "Liked").length, ok: items.filter(l => l.verdict === "Kind of").length, no: items.filter(l => l.verdict === "Didn't Like").length };
    };
    return { Book: getBreakdown("Book"), Movie: getBreakdown("Movie"), Album: getBreakdown("Album"), active: logs.filter(l => l.verdict === "Currently Reading").length, queue: logs.filter(l => queueTypes.includes(l.verdict)).length };
  }, [logs]);

  const dateOptions = ["All", ...new Set(logs.map(l => new Date(l.logged_at).toLocaleString('default', { month: 'long', year: 'numeric' })))];

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const isQueue = ["Want to Read", "Want to Watch", "Want to Listen"].includes(log.verdict);
      const isActive = log.verdict === "Currently Reading";
      const logMonthYear = new Date(log.logged_at).toLocaleString('default', { month: 'long', year: 'numeric' });
      const searchable = `${log.title} ${log.creator} ${log.notes} ${log.verdict} ${logMonthYear}`.toLowerCase();
      
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

  if (loading) return <div style={{ textAlign: "center", padding: "50px" }}>Loading...</div>;

  return (
    <div style={{ padding: "20px", maxWidth: "500px", margin: "auto", fontFamily: "sans-serif", color: "#333" }}>
      {/* HEADER */}
      <div style={{ textAlign: "center", marginBottom: "25px" }}>
        <h2 style={{ margin: 0, fontSize: "28px" }}>🤔 Did I Like It?</h2>
        <div style={{ display: "flex", justifyContent: "center", gap: "15px", marginTop: "10px" }}>
          <button onClick={() => setShowAbout(!showAbout)} style={smallBtn}>{showAbout ? "Close Info" : "About / Export"}</button>
          <button onClick={() => supabase.auth.signOut()} style={smallBtn}>Logout</button>
        </div>
      </div>

      {showAbout && (
        <div style={{ background: "#fdfefe", padding: "20px", borderRadius: "15px", border: "2px solid #3498db", marginBottom: "25px", boxShadow: "4px 4px 0px #3498db" }}>
          <h3 style={{ marginTop: 0 }}>Library Tools</h3>
          <p style={{ fontSize: "14px" }}>Manage your gut reactions and export your history.</p>
          <button onClick={exportCSV} style={{ ...smallBtn, color: "#27ae60", fontWeight: "bold" }}>📥 Export Data (.csv)</button>
        </div>
      )}

      {/* STATS DASHBOARD */}
      <div style={{ marginBottom: '25px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h3 style={{ margin: 0 }}>{customName}</h3>
          <div style={{ display: 'flex', gap: '8px' }}>
             <button onClick={() => handleStatClick("All", "Reading")} style={{ ...pillBtn, background: '#e1f5fe', color: '#01579b' }}>📖 {stats.active} Active</button>
             <button onClick={() => handleStatClick("All", "Queue")} style={{ ...pillBtn, background: '#f3e5f5', color: '#4a148c' }}>⏳ {stats.queue} Queue</button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {["Book", "Movie", "Album"].map(type => {
            const m = getMediaStyle(type);
            const s = stats[type];
            return (
              <div key={type} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <button onClick={() => handleStatClick(type, "History")} style={{ background: '#fff', padding: '10px', borderRadius: '12px 12px 4px 4px', textAlign: 'center', border: '2px solid #eee', borderBottom: 'none', cursor: 'pointer' }}>
                  <div style={{ fontSize: '10px', fontWeight: 'bold', color: m.color }}>{m.icon} {type}s</div>
                  <div style={{ fontSize: '18px', fontWeight: '800' }}>{s.total}</div>
                </button>
                <div style={{ display: 'flex', gap: '2px', height: '22px' }}>
                  <div title="Liked" style={{ flex: s.liked || 1, background: '#e8f5e9', border: '1px solid #c8e6c9', borderRadius: '0 0 0 8px', fontSize: '9px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2e7d32' }}>{s.liked || ""}</div>
                  <div title="Ok" style={{ flex: s.ok || 1, background: '#fff3e0', border: '1px solid #ffe0b2', fontSize: '9px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef6c00' }}>{s.ok || ""}</div>
                  <div title="No" style={{ flex: s.no || 1, background: '#ffebee', border: '1px solid #ffcdd2', borderRadius: '0 0 8px 0', fontSize: '9px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c62828' }}>{s.no || ""}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ENTRY FORM */}
      <div style={{ background: "#fff", padding: "20px", borderRadius: "15px", border: "2px solid #000", marginBottom: "30px", boxShadow: "5px 5px 0px #000" }}>
        <div style={{ display: "flex", gap: "5px", marginBottom: "15px" }}>
          {["Book", "Movie", "Album"].map((t) => (
            <button key={t} onClick={() => { setMediaType(t); setVerdict(""); }} style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "none", background: mediaType === t ? "#000" : "#eee", color: mediaType === t ? "#fff" : "#000", fontWeight: "bold", cursor: "pointer" }}>{t}</button>
          ))}
        </div>
        <input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle} />
        <div style={{ display: "flex", gap: "10px" }}>
          <input placeholder="Creator" value={creator} onChange={(e) => setCreator(e.target.value)} style={{ ...inputStyle, flex: 2 }} />
          <input placeholder="Year" value={year} type="number" onChange={(e) => setYear(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
        </div>
        <div style={{ marginBottom: "10px" }}>
          <label style={{ fontSize: "11px", color: "#888", fontWeight: "bold" }}>LOG DATE (OPTIONAL)</label>
          <input type="date" value={manualDate} onChange={(e) => setManualDate(e.target.value)} style={{ ...inputStyle, marginTop: "4px" }} />
        </div>
        <textarea ref={textareaRef} placeholder="My thoughts..." value={notes} onChange={(e) => setNotes(e.target.value)} style={{ ...inputStyle, height: "60px", minHeight: "60px", resize: "none" }} />
        
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {mediaType === "Book" ? (
            <div style={{ display: 'flex', gap: '5px' }}>
              <button onClick={() => setVerdict("Currently Reading")} style={{ ...verdictBtn, flex: 1, background: verdict === "Currently Reading" ? "#3498db" : "#fff", color: verdict === "Currently Reading" ? "#fff" : "#000" }}>📖 Reading Now</button>
              <button onClick={() => setVerdict("Want to Read")} style={{ ...verdictBtn, flex: 1, background: verdict === "Want to Read" ? "#5dade2" : "#fff", color: verdict === "Want to Read" ? "#fff" : "#000" }}>🔖 Want to Read</button>
            </div>
          ) : (
            <button onClick={() => setVerdict(mediaType === "Movie" ? "Want to Watch" : "Want to Listen")} style={{ ...verdictBtn, background: verdict.includes("Want") ? "#9b59b6" : "#fff", color: verdict.includes("Want") ? "#fff" : "#000" }}>⏳ Queue {mediaType}</button>
          )}
          <div style={{ display: 'flex', gap: '5px' }}>
            <button onClick={() => setVerdict("Liked")} style={{ ...verdictBtn, flex: 1, background: verdict === "Liked" ? "#4caf50" : "#fff", color: verdict === "Liked" ? "#fff" : "#000" }}>🟢 Liked</button>
            <button onClick={() => setVerdict("Kind of")} style={{ ...verdictBtn, flex: 1, background: verdict === "Kind of" ? "#ff9800" : "#fff", color: verdict === "Kind of" ? "#fff" : "#000" }}>🟡 Ok</button>
            <button onClick={() => setVerdict("Didn't Like")} style={{ ...verdictBtn, flex: 1, background: verdict === "Didn't Like" ? "#f44336" : "#fff", color: verdict === "Didn't Like" ? "#fff" : "#000" }}>🔴 No</button>
          </div>
        </div>
        <button onClick={handleSave} style={{ ...primaryBtn, marginTop: "20px" }}>{editingId ? "UPDATE ENTRY" : "SAVE ENTRY"}</button>
      </div>

      {/* FILTER TABS */}
      <div ref={listTopRef} style={{ display: 'flex', gap: '5px', marginBottom: '15px', background: '#eee', borderRadius: '12px', padding: '4px' }}>
        {["History", "Reading", "Queue"].map((tab) => (
          <button key={tab} onClick={() => setViewMode(tab)} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', background: viewMode === tab ? "#fff" : "transparent", fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>{tab}</button>
        ))}
      </div>
      
      {/* SEARCH & DATE PICKERS */}
      <input placeholder="🔍 Search title, creator, or thoughts..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ ...inputStyle, borderRadius: "25px", paddingLeft: "20px" }} />
      <div style={{ display: 'flex', gap: '10px', marginBottom: '25px' }}>
        <select value={filterMedium} onChange={(e) => setFilterMedium(e.target.value)} style={inputStyle}>
            <option value="All">All Mediums</option><option value="Book">Books</option><option value="Movie">Movies</option><option value="Album">Albums</option>
        </select>
        <select value={filterDate} onChange={(e) => setFilterDate(e.target.value)} style={inputStyle}>
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
            <div key={log.id} style={{ padding: "15px", borderBottom: "2px solid #eee", background: '#fff' }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: 'flex-start' }}>
                <div>
                  <span style={{ fontSize: '10px', fontWeight: 'bold', color: m.color }}>{m.icon} {log.media_type.toUpperCase()}</span>
                  <div style={{ fontSize: "18px", fontWeight: "bold", margin: "4px 0" }}>{log.title}</div>
                  <div style={{ fontSize: "14px", color: "#666" }}>{log.creator}</div>
                  <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>{dateStr} {log.year_released && `• ${log.year_released}`}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ 
                    fontSize: '10px', fontWeight: 'bold', padding: '4px 8px', borderRadius: '6px', 
                    background: v.bg, color: v.color, border: `1px solid ${v.border}`, marginBottom: '10px', display: 'inline-block' 
                  }}>
                    {log.verdict.toUpperCase()}
                  </div>
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                    <button onClick={() => { setEditingId(log.id); setTitle(log.title); setCreator(log.creator); setNotes(log.notes); setYear(log.year_released || ""); setVerdict(log.verdict); setMediaType(log.media_type); window.scrollTo({ top: 0, behavior: 'smooth' }); }} style={smallBtn}>Edit</button>
                    <button onClick={() => deleteLog(log.id)} style={{ ...smallBtn, color: 'red' }}>Delete</button>
                  </div>
                </div>
              </div>
              {log.notes && <ExpandableNote text={log.notes} />}
            </div>
          );
        })}
        {filteredLogs.length === 0 && <div style={{ textAlign: 'center', padding: '40px', color: '#999', fontSize: '14px' }}>No entries found for this view.</div>}
      </div>
    </div>
  );
}

// --- REUSABLE STYLES ---
const inputStyle = { width: "100%", padding: "12px", marginBottom: "10px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "14px", boxSizing: "border-box" };
const primaryBtn = { width: "100%", padding: "16px", background: "#000", color: "#fff", borderRadius: "8px", border: "none", fontWeight: "bold", cursor: "pointer", fontSize: "14px" };
const verdictBtn = { padding: "10px", borderRadius: "8px", border: "1px solid #ddd", cursor: "pointer", fontSize: '12px', fontWeight: "600", transition: "all 0.2s" };
const smallBtn = { background: "none", border: "none", fontSize: "12px", cursor: "pointer", color: "#0070f3" };
const pillBtn = { border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold', padding: '4px 10px', borderRadius: '12px' };
