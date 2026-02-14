import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

// --- SECURE CONFIGURATION ---
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Helper for Show More/Less in the history list
const ExpandableNote = ({ text }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const isLong = text.length > 120;
  const displayedText = isLong && !isExpanded ? text.substring(0, 120) + "..." : text;

  return (
    <div style={{ marginTop: "10px", marginRight: "10px", padding: "12px", background: "#f9f9f9", borderRadius: "8px", fontSize: "14px", fontStyle: "italic", borderLeft: "4px solid #ddd" }}>
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
  
  const [customName, setCustomName] = useState(localStorage.getItem("user_custom_name") || "");
  const [isEditingName, setIsEditingName] = useState(false);
  const [showAbout, setShowAbout] = useState(false); 
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  const listRef = useRef(null);
  const textareaRef = useRef(null);

  // Auth & Scroll listeners
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

  // Form expansion logic
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

  // Helper for media visual styles
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
    const active = logs.filter(l => l.verdict === "Currently Reading");
    const getBreakdown = (type) => {
      const items = logs.filter(l => l.media_type === type && !queueStatuses.includes(l.verdict) && l.verdict !== "Currently Reading");
      return {
        total: items.length,
        liked: items.filter(l => l.verdict === "Liked").length,
        ok: items.filter(l => l.verdict === "Kind of").length,
        no: items.filter(l => l.verdict === "Didn't Like").length
      };
    };
    return { Book: getBreakdown("Book"), Movie: getBreakdown("Movie"), Album: getBreakdown("Album"), activeCount: active.length, queueCount: logs.filter(l => queueStatuses.includes(l.verdict)).length };
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
      {/* HEADER */}
      <div style={{ textAlign: "center", marginBottom: "25px" }}>
        <h2 style={{ margin: "0 0 10px 0", fontSize: "28px" }}>🤔 Did I Like It?</h2>
        <div style={{ display: "flex", justifyContent: "center", gap: "20px" }}>
          <button onClick={() => setShowAbout(!showAbout)} style={{ ...smallBtn, color: "#3498db" }}>Info</button>
          <button onClick={() => supabase.auth.signOut()} style={{ ...smallBtn, color: "#888" }}>Logout</button>
        </div>
      </div>

      {/* DASHBOARD STATS */}
      <div style={{ marginBottom: '25px' }}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '15px' }}>
          {["Book", "Movie", "Album"].map(type => {
            const m = getMediaStyle(type);
            return (
              <div key={type} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ background: '#fff', padding: '10px', borderRadius: '12px 12px 4px 4px', textAlign: 'center', border: '2px solid #eee', borderBottom: 'none' }}>
                  <div style={{ fontSize: '10px', fontWeight: 'bold', color: m.color, textTransform: 'uppercase' }}>{m.icon} {type}s</div>
                  <div style={{ fontSize: '20px', fontWeight: '800' }}>{stats[type].total}</div>
                </div>
                <div style={{ display: 'flex', gap: '2px', height: '30px' }}>
                  <div title="Liked" style={{ flex: 1, background: '#e8f5e9', color: '#2e7d32', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 'bold', borderRadius: '0 0 0 8px', border: '1px solid #c8e6c9' }}>{stats[type].liked}</div>
                  <div title="Ok" style={{ flex: 1, background: '#fff3e0', color: '#ef6c00', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 'bold', border: '1px solid #ffe0b2' }}>{stats[type].ok}</div>
                  <div title="No" style={{ flex: 1, background: '#ffebee', color: '#c62828', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 'bold', borderRadius: '0 0 8px 0', border: '1px solid #ffcdd2' }}>{stats[type].no}</div>
                </div>
              </div>
            );
          })}
        </div>
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
          <input placeholder="Creator" value={creator} onChange={(e) => setCreator(e.target.value)} style={{ ...inputStyle, flex: 2 }} />
          <input placeholder="Year" value={year} type="number" onChange={(e) => setYear(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
        </div>
        
        {/* AUTO-EXPANDING TEXTAREA */}
        <textarea 
          ref={textareaRef}
          placeholder="My thoughts..." 
          value={notes} 
          onChange={(e) => setNotes(e.target.value)} 
          onInput={adjustTextAreaHeight}
          style={{ ...inputStyle, height: "60px", minHeight: "60px", maxHeight: "350px", resize: "none", overflowY: "auto" }} 
        />

        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <div style={{ display: 'flex', gap: '5px' }}>
            <button onClick={() => setVerdict("Liked")} style={{ ...verdictBtn, flex: 1, background: verdict === "Liked" ? "#4caf50" : "#fff", color: verdict === "Liked" ? "#fff" : "#000" }}>🟢 I liked it</button>
            <button onClick={() => setVerdict("Kind of")} style={{ ...verdictBtn, flex: 1, background: verdict === "Kind of" ? "#ff9800" : "#fff", color: verdict === "Kind of" ? "#fff" : "#000" }}>🟡 It was ok</button>
            <button onClick={() => setVerdict("Didn't Like")} style={{ ...verdictBtn, flex: 1, background: verdict === "Didn't Like" ? "#f44336" : "#fff", color: verdict === "Didn't Like" ? "#fff" : "#000" }}>🔴 I didn't like it</button>
          </div>
        </div>
        <button onClick={handleSave} style={{ ...primaryBtn, marginTop: "20px" }}>{editingId ? "UPDATE ENTRY" : "SAVE ENTRY"}</button>
      </div>

      {/* TABS & SEARCH */}
      <div ref={listRef} style={{ display: 'flex', gap: '5px', marginBottom: '15px', background: '#eee', borderRadius: '12px', padding: '4px' }}>
        {["History", "Reading", "Queue"].map((tab) => (
          <button key={tab} onClick={() => setViewMode(tab)} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', background: viewMode === tab ? "#fff" : "transparent" }}>{tab}</button>
        ))}
      </div>
      <input placeholder="🔍 Search library..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ ...inputStyle, borderRadius: "30px", marginBottom: '20px' }} />

      {/* LOG LIST */}
      <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
        {filteredLogs.map((log) => {
          const m = getMediaStyle(log.media_type);
          return (
            <div key={log.id} style={{ 
              padding: "15px 0 15px 15px", 
              borderBottom: "2px solid #eee",
              borderLeft: `5px solid ${m.color}`, 
              borderRadius: "4px"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: '10px', fontWeight: 'bold', background: m.bg, color: m.color, padding: '2px 8px', borderRadius: '4px', border: `1px solid ${m.color}33` }}>
                    {m.icon} {log.media_type.toUpperCase()}
                  </span>
                  <div style={{ fontSize: "18px", fontWeight: "bold", marginTop: '5px' }}>{log.title}</div>
                  <div style={{ color: "#444", fontSize: '14px' }}>{log.creator}</div>
                </div>
                <div style={{ textAlign: "right", display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px', paddingRight: '10px' }}>
                  <div style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold', background: log.verdict === "Liked" ? "#e8f5e9" : log.verdict === "Kind of" ? "#fff3e0" : log.verdict === "Didn't Like" ? "#ffebee" : "#f4f6f7", color: log.verdict === "Liked" ? "#2e7d32" : log.verdict === "Kind of" ? "#ef6c00" : log.verdict === "Didn't Like" ? "#c62828" : "#566573", border: `1px solid ${log.verdict === "Liked" ? "#4caf50" : log.verdict === "Kind of" ? "#ff9800" : log.verdict === "Didn't Like" ? "#f44336" : "#d5dbdb"}` }}>
                    {log.verdict === "Liked" ? "🟢 I liked it" : log.verdict === "Kind of" ? "🟡 It was ok" : log.verdict === "Didn't Like" ? "🔴 I didn't like it" : log.verdict}
                  </div>
                  <div style={{ display: "flex", gap: "10px" }}><button onClick={() => startEdit(log)} style={smallBtn}>Edit</button><button onClick={() => deleteLog(log.id)} style={{ ...smallBtn, color: "red" }}>Delete</button></div>
                </div>
              </div>
              {log.notes && <ExpandableNote text={log.notes} />}
            </div>
          );
        })}
      </div>

      {showScrollBtn && (
        <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} style={scrollBtnStyle}>↑</button>
      )}
    </div>
  );
}

// STYLES
const inputStyle = { width: "100%", padding: "12px", marginBottom: "10px", borderRadius: "8px", border: "1px solid #ddd", boxSizing: "border-box", fontSize: "14px" };
const primaryBtn = { width: "100%", padding: "15px", background: "#000", color: "#fff", borderRadius: "8px", border: "none", fontWeight: "bold", cursor: "pointer", fontSize: "16px" };
const verdictBtn = { padding: "10px", borderRadius: "8px", border: "1px solid #ddd", cursor: "pointer", textAlign: "left", fontWeight: "500", fontSize: '13px' };
const smallBtn = { background: "none", border: "none", fontSize: "12px", cursor: "pointer", color: "#0070f3", padding: 0 };
const scrollBtnStyle = { position: "fixed", bottom: "30px", right: "20px", width: "45px", height: "45px", borderRadius: "50%", background: "rgba(0,0,0,0.7)", color: "#fff", border: "none", fontSize: "20px" };
