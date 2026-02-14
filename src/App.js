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
  const [showAbout, setShowAbout] = useState(false); 
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  const listRef = useRef(null);

  // 1. AUTH & SCROLL LISTENERS
  useEffect(() => {
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) setUser(session.user);
      setLoading(false);
    };
    getInitialSession();

    const checkScroll = () => {
      setShowScrollBtn(window.scrollY > 400);
    };
    window.addEventListener("scroll", checkScroll);
    return () => window.removeEventListener("scroll", checkScroll);
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

  const exportToCSV = () => {
    if (logs.length === 0) return alert("Nothing to export!");
    const headers = ["Title", "Creator", "Type", "Verdict", "Year", "Notes", "Date Logged"];
    const rows = logs.map(log => [
      `"${log.title}"`, `"${log.creator}"`, log.media_type, log.verdict, 
      log.year_released || "", `"${log.notes.replace(/"/g, '""')}"`, 
      new Date(log.logged_at).toLocaleDateString()
    ]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `did-i-like-it-backup-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  // 3. LOGIC & STATS
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
      const logMonthYear = new Date(log.logged_at).toLocaleString('default', { month: 'long', year: 'numeric' });
      const searchableText = `${log.title} ${log.creator} ${log.notes}`.toLowerCase();
      const matchesSearch = searchableText.includes(searchTerm.toLowerCase());
      const matchesMedium = filterMedium === "All" || log.media_type === filterMedium;
      let matchesView = searchTerm.length > 0 ? true : (viewMode === "Reading" ? isActive : viewMode === "Queue" ? isQueue : isHistory);
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
          <button onClick={() => setShowAbout(!showAbout)} style={{ ...smallBtn, fontWeight: showAbout ? 'bold' : 'normal' }}>
            {showAbout ? "← Close Info" : "About the App"}
          </button>
          <button onClick={() => supabase.auth.signOut()} style={{ ...smallBtn, color: "#888" }}>Logout</button>
        </div>
      </div>

      {/* ABOUT & EXPORT */}
      {showAbout && (
        <div style={{ background: "#fdfefe", padding: "20px", borderRadius: "15px", border: "2px solid #3498db", marginBottom: "25px", boxShadow: "4px 4px 0px #3498db", lineHeight: "1.6" }}>
          <h3 style={{ marginTop: 0, color: "#2980b9" }}>What is this?</h3>
          <p style={{ fontSize: "14px", color: "#444" }}>A low-pressure media diary focusing on your gut reactions.</p>
          <div style={{ fontSize: "13px", background: "#fff", padding: "10px", borderRadius: "8px", border: "1px solid #eee" }}>
            <div style={{ marginBottom: "5px" }}>🟢 <strong>I liked it:</strong> Would recommend.</div>
            <div style={{ marginBottom: "5px" }}>🟡 <strong>It was ok:</strong> Once was enough.</div>
            <div>🔴 <strong>I didn't like it:</strong> Not for me.</div>
          </div>
          <div style={{ marginTop: "15px", paddingTop: "15px", borderTop: "1px solid #eee" }}>
            <button onClick={exportToCSV} style={{ ...smallBtn, color: "#27ae60", fontWeight: "bold" }}>📥 Download My Data (.csv)</button>
          </div>
        </div>
      )}

      {/* STATS */}
      <div style={{ marginBottom: '25px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px' }}>
          {isEditingName ? (
            <input value={customName} onChange={(e) => setCustomName(e.target.value)} onBlur={saveName} onKeyDown={(e) => e.key === 'Enter' && saveName()} autoFocus style={{ fontSize: '22px', fontWeight: 'bold', border: 'none', borderBottom: '2px solid #000', outline: 'none', width: '220px' }} />
          ) : (
            <><h3 style={{ margin: 0, fontSize: '22px' }}>{customName ? `${customName}'s Library` : "Your Stats"}</h3><button onClick={() => setIsEditingName(true)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>✏️</button></>
          )}
        </div>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '15px' }}>
          {["Book", "Movie", "Album"].map(type => (
            <div key={type} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ background: '#fff', padding: '10px', borderRadius: '12px 12px 4px 4px', textAlign: 'center', border: '2px solid #eee', borderBottom: 'none' }}>
                <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#999', textTransform: 'uppercase' }}>{type}s</div>
                <div style={{ fontSize: '20px', fontWeight: '800' }}>{stats[type].total}</div>
              </div>
              <div style={{ display: 'flex', gap: '2px', height: '30px' }}>
                <div title="Liked" style={{ flex: 1, background: '#e8f5e9', color: '#2e7d32', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 'bold', borderRadius: '0 0 0 8px', border: '1px solid #c8e6c9' }}>{stats[type].liked}</div>
                <div title="Ok" style={{ flex:
