import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

// --- SECURE CONFIGURATION ---
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
          style={{ background: "none", border: "none", fontSize: "12px", cursor: "pointer", color: "#3498db", fontWeight: "bold", textDecoration: "underline", marginLeft: "8px" }}
        >
          {isExpanded ? "Show Less" : "Show More"}
        </button>
      )}
    </div>
  );
};

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
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  
  const [customName, setCustomName] = useState(localStorage.getItem("user_custom_name") || "");
  const [isEditingName, setIsEditingName] = useState(false);
  const [showAbout, setShowAbout] = useState(false); 

  const textareaRef = useRef(null);
  const listTopRef = useRef(null); // Reference for scrolling

  useEffect(() => {
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) setUser(session.user);
      setLoading(false);
    };
    getInitialSession();
    const checkScroll = () => setShowScrollBtn(window.scrollY > 400);
    window.addEventListener("scroll", checkScroll);
    return () => window.removeEventListener("scroll", checkScroll);
  }, []);

  const fetchLogs = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase.from("logs").select("*").order("logged_at", { ascending: false });
    if (!error) setLogs(data || []);
  }, [user]);

  useEffect(() => { if (user) fetchLogs(); }, [user, fetchLogs]);

  const scrollToResults = () => {
    setTimeout(() => {
      listTopRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const handleStatClick = (type, mode = "History") => {
    setFilterMedium(type);
    setViewMode(mode);
    setSearchTerm("");
    scrollToResults();
  };

  const adjustTextAreaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "60px";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
    }
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
    if (error) alert(`Error: ${error.message}`);
    else {
      setTitle(""); setCreator(""); setNotes(""); setYear(""); setVerdict(""); setManualDate("");
      setEditingId(null);
      if (textareaRef.current) textareaRef.current.style.height = "60px";
      fetchLogs();
    }
  };

  const startEdit = (log) => {
    setEditingId(log.id); setTitle(log.title); setCreator(log.creator || "");
    setNotes(log.notes || ""); setYear(log.year_released || "");
    setVerdict(log.verdict); setMediaType(log.media_type);
    setManualDate(new Date(log.logged_at).toISOString().split('T')[0]);
    setTimeout(() => adjustTextAreaHeight(), 50);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteLog = async (id) => {
    if (window.confirm("Delete forever?")) { await supabase.from("logs").delete().eq("id", id); fetchLogs(); }
  };

  const getMediaStyle = (type) => {
    switch(type) {
      case 'Book': return { color: '#2980b9', bg: '#ebf5fb', icon: '📖' };
      case 'Movie': return { color: '#8e44ad', bg: '#f5eef8', icon: '🎬' };
      case 'Album': return { color: '#16a085', bg: '#e8f8f5', icon: '💿' };
      default: return { color: '#7f8c8d', bg: '#f4f6f7', icon: '📎' };
    }
  };

  const stats = useMemo(() => {
    const queueStatuses = ["Want to Read", "Want to Watch", "Want to Listen"];
    const getBreakdown = (type) => {
      const items = logs.filter(l => l.media_type === type && !queueStatuses.includes(l.verdict) && l.verdict !== "Currently Reading");
      return {
        total: items.length,
        liked: items.filter(l => l.verdict === "Liked").length,
        ok: items.filter(l => l.verdict === "Kind of").length,
        no: items.filter(l => l.verdict === "Didn't Like").length
      };
    };
    return { 
      Book: getBreakdown("Book"), 
      Movie: getBreakdown("Movie"), 
      Album: getBreakdown("Album"), 
      activeCount: logs.filter(l => l.verdict === "Currently Reading").length, 
      queueCount: logs.filter(l => queueStatuses.includes(l.verdict)).length 
    };
  }, [logs]);

  const dateOptions = useMemo(() => {
    const dates = logs.map(l => new Date(l.logged_at).toLocaleString('default', { month: 'long', year: 'numeric' }));
    return ["All", ...new Set(dates)];
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const isQueue = ["Want to Read", "Want to Watch", "Want to Listen"].includes(log.verdict);
      const isActive = log.verdict === "Currently Reading";
      const isHistory = !isQueue && !isActive;
      const logDateObj = new Date(log.logged_at);
      const logMonthYear = logDateObj.toLocaleString('default', { month: 'long', year: 'numeric' });
      const fullDateStr = logDateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      const searchableText = `${log.title} ${log.creator} ${log.notes} ${log.year_released || ""} ${fullDateStr} ${log.verdict}`.toLowerCase();
      
      const matchesSearch = searchableText.includes(searchTerm.toLowerCase());
      const matchesMedium = filterMedium === "All" || log.media_type === filterMedium;
      const matchesDate = !isHistory || filterDate === "All" || logMonthYear === filterDate;
      
      let matchesView = false;
      if (searchTerm.length > 0) matchesView = true;
      else {
        if (viewMode === "Reading") matchesView = isActive;
        else if (viewMode === "Queue") matchesView = isQueue;
        else matchesView = isHistory;
      }
      return matchesSearch && matchesMedium && matchesDate && matchesView;
    });
  }, [logs, searchTerm, filterMedium, viewMode, filterDate]);

  if (loading) return <div style={{ textAlign: "center", padding: "50px" }}>Loading...</div>;

  return (
    <div style={{ padding: "20px", maxWidth: "500px", margin: "auto", fontFamily: "sans-serif" }}>
      <div style={{ textAlign: "center", marginBottom: "25px" }}>
        <h2 style={{ margin: 0 }}>🤔 Did I Like It?</h2>
        <div style={{ display: "flex", justifyContent: "center", gap: "15px", marginTop: "10px" }}>
          <button onClick={() => setShowAbout(!showAbout)} style={smallBtn}>{showAbout ? "Close" : "Info / Export"}</button>
          <button onClick={() => supabase.auth.signOut()} style={smallBtn}>Logout</button>
        </div>
      </div>

      {showAbout && (
        <div style={{ background: "#fdfefe", padding: "20px", borderRadius: "15px", border: "2px solid #3498db", marginBottom: "25px", boxShadow: "4px 4px 0px #3498db" }}>
          <p style={{ fontSize: "14px", marginTop: 0 }}>A private log for your media reactions.</p>
          <button onClick={() => {
             const headers = ["Title", "Creator", "Type", "Verdict", "Year", "Notes", "Date Logged"];
             const rows = logs.map(l => [`"${l.title}"`, `"${l.creator}"`, l.media_type, l.verdict, l.year_released || "", `"${l.notes.replace(/"/g, '""')}"`, new Date(l.logged_at).toLocaleDateString()]);
             const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
             const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
             const url = URL.createObjectURL(blob);
             const link = document.createElement("a"); link.href = url; link.download = `media-export.csv`; link.click();
          }} style={{ ...smallBtn, color: "#27ae60", fontWeight: "bold" }}>📥 Export CSV</button>
        </div>
      )}

      {/* DASHBOARD */}
      <div style={{ marginBottom: '25px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h3 style={{ margin: 0 }}>{customName || "Stats Overview"}</h3>
          <div style={{ display: 'flex', gap: '10px' }}>
             <button onClick={() => handleStatClick("All", "Reading")} style={{ border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold', background: '#e1f5fe', color: '#01579b', padding: '2px 8px', borderRadius: '10px' }}>📖 {stats.activeCount} Reading</button>
             <button onClick={() => handleStatClick("All", "Queue")} style={{ border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold', background: '#f3e5f5', color: '#4a148c', padding: '2px 8px', borderRadius: '10px' }}>⏳ {stats.queueCount} Queue</button>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '8px' }}>
          {["Book", "Movie", "Album"].map(type => {
            const m = getMediaStyle(type);
            return (
              <div key={type} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <button 
                  onClick={() => handleStatClick(type, "History")}
                  style={{ background: '#fff', padding: '10px', borderRadius: '12px 12px 4px 4px', textAlign: 'center', border: '2px solid #eee', borderBottom: 'none', cursor: 'pointer', width: '100%' }}
                >
                  <div style={{ fontSize: '10px', fontWeight: 'bold', color: m.color }}>{m.icon} {type}s</div>
                  <div style={{ fontSize: '18px', fontWeight: '800' }}>{stats[type].total}</div>
                </button>
                <div style={{ display: 'flex', gap: '2px', height: '25px' }}>
                  <div style={{ flex: 1, background: '#e8f5e9', color: '#2e7d32', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 'bold', borderRadius: '0 0 0 8px', border: '1px solid #c8e6c9' }}>{stats[type].liked}</div>
                  <div style={{ flex: 1, background: '#fff3e0', color: '#ef6c00', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 'bold', border: '1px solid #ffe0b2' }}>{stats[type].ok}</div>
                  <div style={{ flex: 1, background: '#ffebee', color: '#c62828', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 'bold', borderRadius: '0 0 8px 0', border: '1px solid #ffcdd2' }}>{stats[type].no}</div>
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
            <button key={t} onClick={() => { setMediaType(t); setVerdict(""); }} style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "none", background: mediaType === t ? "#000" : "#eee", color: mediaType === t ? "#fff" : "#000", fontWeight: "bold", cursor: 'pointer' }}>{t}</button>
          ))}
        </div>
        <input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle} />
        <div style={{ display: "flex", gap: "10px" }}>
          <input placeholder="Creator" value={creator} onChange={(e) => setCreator(e.target.value)} style={{ ...inputStyle, flex: 2 }} />
          <input placeholder="Year" value={year} type="number" onChange={(e) => setYear(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
        </div>
        <input type="date" value={manualDate} onChange={(e) => setManualDate(e.target.value)} style={inputStyle} />
        <textarea ref={textareaRef} placeholder="My thoughts..." value={notes} onChange={(e) => setNotes(e.target.value)} onInput={adjustTextAreaHeight} style={{ ...inputStyle, height: "60px", minHeight: "60px", maxHeight: "350px", resize: "none" }} />
        
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
            <button onClick={() => setVerdict("Liked")} style={{ ...verdictBtn, flex: 1, background: verdict === "Liked" ? "#4caf50" : "#fff", color: verdict === "Liked" ? "#fff" : "#000" }}>🟢 Liked</button>
            <button onClick={() => setVerdict("Kind of")} style={{ ...verdictBtn, flex: 1, background: verdict === "Kind of" ? "#ff9800" : "#fff", color: verdict === "Kind of" ? "#fff" : "#000" }}>🟡 Ok</button>
            <button onClick={() => setVerdict("Didn't Like")} style={{ ...verdictBtn, flex: 1, background: verdict === "Didn't Like" ? "#f44336" : "#fff", color: verdict === "Didn't Like" ? "#fff" : "#000" }}>🔴 No</button>
          </div>
        </div>
        <button onClick={handleSave} style={{ ...primaryBtn, marginTop: "20px" }}>{editingId ? "UPDATE" : "SAVE"}</button>
      </div>

      {/* FILTER TABS & SEARCH */}
      <div ref={listTopRef} style={{ display: 'flex', gap: '5px', marginBottom: '15px', background: '#eee', borderRadius: '12px', padding: '4px' }}>
        {["History", "Reading", "Queue"].map((tab) => (
          <button key={tab} onClick={() => setViewMode(tab)} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', background: viewMode === tab ? "#fff" : "transparent", fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>{tab}</button>
        ))}
      </div>
      <input placeholder="🔍 Search list..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ ...inputStyle, borderRadius: "30px" }} />
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <select value={filterMedium} onChange={(e) => setFilterMedium(e.target.value)} style={inputStyle}>
            <option value="All">All Types</option><option value="Book">Books</option><option value="Movie">Movies</option><option value="Album">Albums</option>
        </select>
        <select value={filterDate} onChange={(e) => setFilterDate(e.target.value)} style={inputStyle}>
            {dateOptions.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      {/* LIST */}
      <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
        {filteredLogs.map((log) => {
          const m = getMediaStyle(log.media_type);
          const dateStr = new Date(log.logged_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
          return (
            <div key={log.id} style={{ padding: "15px", borderBottom: "2px solid #eee", borderLeft: `5px solid ${m.color}`, background: '#fff' }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div>
                  <span style={{ fontSize: '10px', fontWeight: 'bold', color: m.color }}>{m.icon} {log.media_type}</span>
                  <div style={{ fontSize: "18px", fontWeight: "bold" }}>{log.title}</div>
                  <div style={{ fontSize: "14px", color: "#666" }}>{log.creator}</div>
                  <div style={{ fontSize: '11px', color: '#999' }}>{dateStr} {log.year_released && `• ${log.year_released}`}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#555', marginBottom: '5px' }}>{log.verdict.toUpperCase()}</div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => startEdit(log)} style={smallBtn}>Edit</button>
                    <button onClick={() => deleteLog(log.id)} style={{ ...smallBtn, color: 'red' }}>Delete</button>
                  </div>
                </div>
              </div>
              {log.notes && <ExpandableNote text={log.notes} />}
            </div>
          );
        })}
      </div>
      {showScrollBtn && <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} style={{ position: 'fixed', bottom: '20px', right: '20px', padding: '10px 15px', borderRadius: '50%', background: '#000', color: '#fff', border: 'none', cursor: 'pointer' }}>↑</button>}
    </div>
  );
}

const inputStyle = { width: "100%", padding: "12px", marginBottom: "10px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "14px", boxSizing: 'border-box' };
const primaryBtn = { width: "100%", padding: "15px", background: "#000", color: "#fff", borderRadius: "8px", border: "none", fontWeight: "bold", cursor: "pointer" };
const verdictBtn = { padding: "10px", borderRadius: "8px", border: "1px solid #ddd", cursor: "pointer", fontSize: '12px' };
const smallBtn = { background: "none", border: "none", fontSize: "12px", cursor: "pointer", color: "#0070f3" };
