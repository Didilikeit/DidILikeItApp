

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

// --- ACTUAL SETUP USING VERCEL VARIABLES ---
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL; 
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;

// Initialize the real Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const TMDB_KEY = process.env.REACT_APP_TMDB_KEY;
const LAST_FM_KEY = process.env.REACT_APP_LAST_FM_KEY;
const GOOGLE_BOOKS_KEY = process.env.REACT_APP_GOOGLE_BOOKS_KEY;
const TMDB_GENRES = {28:"Action",12:"Adventure",16:"Animation",35:"Comedy",80:"Crime",99:"Documentary",18:"Drama",10751:"Family",14:"Fantasy",36:"History",27:"Horror",10402:"Music",9648:"Mystery",10749:"Romance",878:"Sci-Fi",10770:"TV Movie",53:"Thriller",10752:"War",37:"Western"};

// ─── CATEGORIES & SUBTYPES ────────────────────────────────────────────────────
const CATEGORIES = {
  Read:        { icon:"📖", color:"#3498db", subtypes:["Book","Comic / Graphic Novel","Short Story / Essay"] },
  Watched:     { icon:"🎬", color:"#9b59b6", subtypes:["Movie","TV Series","Documentary","YouTube / Online Series","Short Film","Sport"] },
  Listened:    { icon:"🎵", color:"#1abc9c", subtypes:["Album","Podcast","Audiobook"] },
  Experienced: { icon:"✨", color:"#e67e22", subtypes:["Gig / Concert","Play / Theatre","Gallery / Museum","Landmark / Place","Restaurant / Food","Sports Event","Festival"] },
};
const SUBTYPE_TO_CAT = {};
Object.entries(CATEGORIES).forEach(([cat,def])=>def.subtypes.forEach(s=>{SUBTYPE_TO_CAT[s]=cat;}));
const getCat = (type) => SUBTYPE_TO_CAT[type]||"Watched";
const SUBTYPE_ICONS = {"Book":"📖","Comic / Graphic Novel":"📚","Short Story / Essay":"📝","Movie":"🎬","TV Series":"📺","Documentary":"🎥","YouTube / Online Series":"▶️","Short Film":"🎞","Sport":"🏆","Album":"💿","Podcast":"🎙","Audiobook":"🔊","Gig / Concert":"🎸","Play / Theatre":"🎭","Gallery / Museum":"🖼","Landmark / Place":"📍","Restaurant / Food":"🍽","Sports Event":"🏅","Festival":"🎪"};
const CREATOR_LABELS = {"Book":"Author","Comic / Graphic Novel":"Author","Short Story / Essay":"Author","Movie":"Director","TV Series":"Creator","Documentary":"Director","YouTube / Online Series":"Creator","Short Film":"Director","Sport":"Teams / Players","Album":"Artist / Band","Podcast":"Host","Audiobook":"Author","Gig / Concert":"Artist","Play / Theatre":"Company / Writer","Gallery / Museum":"Artist / Curator","Landmark / Place":"","Restaurant / Food":"","Sports Event":"Teams","Festival":""};
const API_TYPES = {"Movie":"tmdb_movie","TV Series":"tmdb_tv","Documentary":"tmdb_movie","Book":"books","Comic / Graphic Novel":"books","Short Story / Essay":"books","Audiobook":"books","Album":"lastfm"};
const getSubtypeStyle = (type) => ({ color:CATEGORIES[getCat(type)]?.color||"#95a5a6", icon:SUBTYPE_ICONS[type]||"📎", cat:getCat(type) });

// ─── COLLECTIONS ──────────────────────────────────────────────────────────────
const COLL_EMOJIS = ["🗂","✈️","🎬","📚","🎵","🏖","🎭","🏔","🍷","🎮","⚽","🎪","🌍","🏛","🎸","📺","🍜","🎯","🌟","🔖"];
const COLL_COLORS = ["#3498db","#9b59b6","#e67e22","#1abc9c","#e74c3c","#f39c12","#2ecc71","#e91e63","#00bcd4","#8bc34a"];
const collAccent = (name) => { let h=0; for(let i=0;i<name.length;i++)h=name.charCodeAt(i)+((h<<5)-h); return COLL_COLORS[Math.abs(h)%COLL_COLORS.length]; };

// ─── IMAGE COMPRESSION ────────────────────────────────────────────────────────
const compressImage = (file, maxWidth=800, quality=0.72) => new Promise(resolve => {
  const reader = new FileReader();
  reader.onload = e => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let w=img.width, h=img.height;
      if (w>maxWidth) { h=Math.round(h*maxWidth/w); w=maxWidth; }
      canvas.width=w; canvas.height=h;
      canvas.getContext("2d").drawImage(img,0,0,w,h);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
});

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const getHighlightedText = (content, term) => {
  if (!term||!content) return content;
  const ht = term.replace(/^"|"$/g,""); if(!ht) return content;
  const esc = ht.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
  const parts = content.toString().split(new RegExp("("+esc+")","gi"));
  return parts.map((p,i)=>p.toLowerCase()===ht.toLowerCase()?<mark key={i} style={{backgroundColor:"#f1c40f",color:"#000",borderRadius:"2px",padding:"0 2px"}}>{p}</mark>:p);
};
const generateCoverGradient = (title) => {
  let hash=0; for(let i=0;i<title.length;i++) hash=title.charCodeAt(i)+((hash<<5)-hash);
  const h1=Math.abs(hash)%360, h2=(h1+40+(Math.abs(hash>>8)%80))%360;
  return {color1:`hsl(${h1},50%,35%)`,color2:`hsl(${h2},60%,20%)`};
};

// ─── MEDIA CARD ───────────────────────────────────────────────────────────────
const MediaCard = ({ log, theme, darkMode, getVerdictStyle, onEdit, onDelete, searchTerm }) => {
  const [isFlipped, setIsFlipped] = React.useState(false);
  const vs = getVerdictStyle(log.verdict);
  const ss = getSubtypeStyle(log.media_type);
  const isExp = ss.cat === "Experienced";
  const isRead = ss.cat === "Read";

  const getNotesPreview = (notes, term) => {
    if (!notes) return null;
    const words = notes.split(/\s+/);
    if (term && term.length > 1) {
      const clean = term.replace(/^"|"$/g,"").toLowerCase();
      const nl = notes.toLowerCase();
      const idx = nl.search(new RegExp("(?<![a-z])"+clean.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),"i"));
      if (idx !== -1) {
        const wb = notes.slice(0,idx).trim()===""?0:notes.slice(0,idx).trim().split(/\s+/).length;
        const s=Math.max(0,wb-8),e=Math.min(words.length,wb+12);
        return `${s>0?"…":""}${words.slice(s,e).join(" ")}${e<words.length?"…":""}`;
      }
    }
    return words.slice(0,30).join(" ")+(words.length>30?"…":"");
  };

  const ArtworkFallback = () => {
    if (isExp) return (
      <div style={{width:"100%",height:"100%",background:`linear-gradient(145deg,${ss.color}55,${ss.color}22)`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:"8px",padding:"12px",textAlign:"center"}}>
        <span style={{fontSize:"36px"}}>{ss.icon}</span>
        {log.location_venue&&<div style={{color:"rgba(255,255,255,0.9)",fontSize:"10px",fontWeight:"600",wordBreak:"break-word"}}>{log.location_venue}</div>}
        {log.location_city&&<div style={{color:"rgba(255,255,255,0.6)",fontSize:"9px"}}>📍 {log.location_city}</div>}
      </div>
    );
    if (isRead) {
      const {color1,color2}=generateCoverGradient(log.title||"");
      return (
        <div style={{width:"100%",height:"100%",background:`linear-gradient(145deg,${color1},${color2})`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"12px",boxSizing:"border-box",textAlign:"center",gap:"8px"}}>
          <div style={{width:"30px",height:"2px",background:"rgba(255,255,255,0.4)",borderRadius:"2px"}}/>
          <div style={{color:"#fff",fontSize:"11px",fontWeight:"bold",lineHeight:"1.3",wordBreak:"break-word",textShadow:"0 1px 3px rgba(0,0,0,0.4)",maxHeight:"60%",overflow:"hidden"}}>{log.title}</div>
          <div style={{width:"20px",height:"1px",background:"rgba(255,255,255,0.3)",borderRadius:"2px"}}/>
          <div style={{color:"rgba(255,255,255,0.75)",fontSize:"9px",fontStyle:"italic",letterSpacing:"0.05em",wordBreak:"break-word"}}>{log.creator}</div>
          <div style={{width:"30px",height:"2px",background:"rgba(255,255,255,0.4)",borderRadius:"2px"}}/>
        </div>
      );
    }
    return <div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{fontSize:"40px"}}>{ss.icon}</span></div>;
  };

  const pill = (color,bg,border) => ({color,background:bg,fontSize:"9px",fontWeight:"700",padding:"2px 7px",borderRadius:"20px",border:`1px solid ${border}`,letterSpacing:"0.03em",whiteSpace:"nowrap"});

  const MetaHeader = ({ showFlipBtn }) => (
    <div style={{padding:"10px 10px 8px",display:"flex",flexDirection:"column",gap:"5px"}}>
      <div style={{display:"flex",gap:"4px",flexWrap:"wrap",alignItems:"center",justifyContent:showFlipBtn?"space-between":"flex-start"}}>
        <div style={{display:"flex",gap:"4px",flexWrap:"wrap"}}>
          <span style={pill(ss.color,"transparent",ss.color)}>{ss.icon} {log.media_type}</span>
          <span style={pill(vs.color,vs.bg,vs.border)}>{vs.emoji} {log.verdict}</span>
          {log.genre&&<span style={pill(darkMode?"#888":"#666","transparent",darkMode?"#333":"#ddd")}>{log.genre}</span>}
        </div>
        {showFlipBtn&&<button onClick={()=>setIsFlipped(false)} style={{background:"none",border:"none",color:theme.subtext,fontSize:"16px",cursor:"pointer",lineHeight:1,padding:"0 2px"}}>↩</button>}
      </div>
      <div style={{fontWeight:"700",fontSize:"13px",color:theme.text,lineHeight:"1.3",wordBreak:"break-word"}}>{log.title}</div>
      <div style={{fontSize:"11px",color:theme.subtext}}>{log.creator}{log.year_released?` · ${log.year_released}`:""}</div>
      {(log.location_venue||log.location_city)&&<div style={{fontSize:"10px",color:ss.color}}>📍 {[log.location_venue,log.location_city].filter(Boolean).join(", ")}</div>}
      {log.current_page&&<div style={{fontSize:"10px",color:theme.subtext}}>📄 Page {log.current_page}</div>}
    </div>
  );

  return (
    <div style={{perspective:"1000px"}}>
      <div style={{position:"relative",width:"100%",transformStyle:"preserve-3d",transition:"transform 0.5s ease",transform:isFlipped?"rotateY(180deg)":"rotateY(0deg)"}}>
        <div style={{backfaceVisibility:"hidden",WebkitBackfaceVisibility:"hidden",background:theme.card,borderRadius:"14px",overflow:"hidden",border:`1px solid ${theme.border}`,display:"flex",flexDirection:"column"}}>
          <MetaHeader showFlipBtn={false}/>
          <div style={{position:"relative",width:"100%",aspectRatio:"2/3",backgroundColor:darkMode?"#111":"#eee",overflow:"hidden"}}>
            {log.artwork?(
              <>
                <img src={log.artwork} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}
                  onLoad={e=>{if(e.target.naturalWidth<128&&isRead){e.target.style.display="none";const fb=document.getElementById(`fb-${log.id}`);if(fb)fb.style.display="flex";}}}
                  onError={e=>{e.target.style.display="none";const fb=document.getElementById(`fb-${log.id}`);if(fb)fb.style.display="flex";}}
                />
                <div id={`fb-${log.id}`} style={{display:"none",position:"absolute",top:0,left:0,width:"100%",height:"100%"}}><ArtworkFallback/></div>
              </>
            ):<ArtworkFallback/>}
            {log.notes&&(
              <div onClick={()=>setIsFlipped(true)} style={{position:"absolute",bottom:0,left:0,right:0,background:"linear-gradient(transparent,rgba(0,0,0,0.92) 40%)",padding:"32px 10px 12px",cursor:"pointer"}}>
                <div style={{fontSize:"9px",fontWeight:"700",color:"rgba(255,255,255,0.5)",letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:"4px"}}>💭 My thoughts</div>
                <div style={{fontSize:"11px",color:"#fff",lineHeight:"1.5",fontStyle:"italic",display:"-webkit-box",WebkitLineClamp:4,WebkitBoxOrient:"vertical",overflow:"hidden"}}>
                  {getHighlightedText(getNotesPreview(log.notes,searchTerm),searchTerm)}
                </div>
                <div style={{fontSize:"9px",color:"rgba(255,255,255,0.4)",marginTop:"5px",textAlign:"right"}}>tap to read more →</div>
              </div>
            )}
          </div>
          <div style={{padding:"8px 10px",display:"flex",gap:"5px"}}>
            <button onClick={e=>{e.stopPropagation();onEdit();}} style={{flex:1,padding:"5px",borderRadius:"8px",border:`1px solid ${theme.border}`,background:"none",color:"#3498db",fontSize:"11px",fontWeight:"600",cursor:"pointer"}}>Edit</button>
            <button onClick={e=>{e.stopPropagation();onDelete();}} style={{flex:1,padding:"5px",borderRadius:"8px",border:`1px solid ${theme.border}`,background:"none",color:"#e74c3c",fontSize:"11px",fontWeight:"600",cursor:"pointer"}}>Delete</button>
          </div>
        </div>
        <div style={{position:"absolute",top:0,left:0,right:0,bottom:0,backfaceVisibility:"hidden",WebkitBackfaceVisibility:"hidden",transform:"rotateY(180deg)",background:theme.card,borderRadius:"14px",border:`1px solid ${theme.border}`,display:"flex",flexDirection:"column",overflow:"hidden"}}>
          <MetaHeader showFlipBtn={true}/>
          <div style={{flex:1,overflowY:"auto",padding:"10px 12px",WebkitOverflowScrolling:"touch",minHeight:0}}>
            <div style={{fontSize:"12px",color:theme.text,lineHeight:"1.7",fontStyle:"italic",borderLeft:`3px solid ${darkMode?"#2a2a2a":"#eee"}`,paddingLeft:"10px",whiteSpace:"pre-wrap"}}>
              {getHighlightedText(log.notes,searchTerm)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── QUEUE CARD ───────────────────────────────────────────────────────────────
const QueueCard = ({ log, theme, darkMode, getVerdictStyle, onEdit, onDelete }) => {
  const [expanded, setExpanded] = React.useState(false);
  const vs = getVerdictStyle(log.verdict);
  const ss = getSubtypeStyle(log.media_type);
  return (
    <div style={{background:theme.card,border:`1px solid ${theme.border}`,borderRadius:"14px",overflow:"hidden"}}>
      <div style={{padding:"14px 16px",display:"flex",alignItems:"center",gap:"12px"}}>
        <div style={{width:"44px",height:"60px",borderRadius:"8px",overflow:"hidden",flexShrink:0,background:darkMode?"#1a1a1a":"#eee",display:"flex",alignItems:"center",justifyContent:"center"}}>
          {log.artwork?<img src={log.artwork} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}} onError={e=>e.target.style.display="none"}/>:<span style={{fontSize:"20px"}}>{ss.icon}</span>}
        </div>
        <div style={{flex:1,overflow:"hidden"}}>
          <div style={{fontWeight:"700",fontSize:"14px",color:theme.text,lineHeight:"1.3",marginBottom:"3px",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{log.title}</div>
          <div style={{fontSize:"12px",color:theme.subtext,marginBottom:"6px"}}>{log.creator}{log.year_released?` · ${log.year_released}`:""}</div>
          <div style={{display:"flex",gap:"5px",flexWrap:"wrap"}}>
            <span style={{fontSize:"9px",fontWeight:"700",padding:"2px 7px",borderRadius:"20px",border:`1px solid ${vs.border}`,background:vs.bg,color:vs.color}}>{vs.emoji} {log.verdict}</span>
            {log.genre&&<span style={{fontSize:"9px",fontWeight:"600",padding:"2px 7px",borderRadius:"20px",border:`1px solid ${theme.border}`,color:theme.subtext}}>{log.genre}</span>}
            {log.current_page&&<span style={{fontSize:"9px",fontWeight:"700",padding:"2px 7px",borderRadius:"20px",background:darkMode?"rgba(52,152,219,0.15)":"#e1f5fe",border:"1px solid rgba(52,152,219,0.3)",color:"#3498db"}}>📄 Page {log.current_page}</span>}
          </div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:"5px",flexShrink:0}}>
          <button onClick={()=>onEdit()} style={{padding:"5px 10px",borderRadius:"8px",border:`1px solid ${theme.border}`,background:"none",color:"#3498db",fontSize:"11px",fontWeight:"600",cursor:"pointer"}}>Edit</button>
          <button onClick={()=>onDelete()} style={{padding:"5px 10px",borderRadius:"8px",border:`1px solid ${theme.border}`,background:"none",color:"#e74c3c",fontSize:"11px",fontWeight:"600",cursor:"pointer"}}>Delete</button>
        </div>
      </div>
      {log.notes&&(
        <div style={{borderTop:`1px solid ${theme.border}`}}>
          <div style={{padding:"12px 16px"}}>
            <div style={{fontSize:"9px",fontWeight:"700",color:theme.subtext,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:"6px"}}>💭 Thoughts</div>
            <div style={{fontSize:"12px",color:theme.subtext2,fontStyle:"italic",lineHeight:"1.7",borderLeft:`2px solid ${theme.border2}`,paddingLeft:"10px",whiteSpace:"pre-wrap",wordBreak:"break-word",maxHeight:expanded?"none":"calc(1.7em * 3)",overflow:expanded?"visible":"hidden"}}>
              {log.notes}
            </div>
          </div>
          {log.notes.length>80&&(
            <button onClick={()=>setExpanded(v=>!v)} style={{width:"100%",padding:"8px",background:darkMode?"rgba(255,255,255,0.02)":"rgba(0,0,0,0.02)",border:"none",borderTop:`1px solid ${theme.border}`,color:"#3498db",fontSize:"11px",fontWeight:"600",cursor:"pointer"}}>
              {expanded?"↑ Show less":"↓ Read more"}
            </button>
          )}
        </div>
      )}
    </div>
  );
};


// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function DidILikeIt() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [authMsg, setAuthMsg] = useState("");
  const [logs, setLogs] = useState([]);

  // Collections — stored in localStorage for both guest and logged-in users
  const [collections, setCollections] = useState(() => {
    try { return JSON.parse(localStorage.getItem("dili_collections")||"[]"); } catch { return []; }
  });

  const [activeTab, setActiveTab] = useState("stats");
  const [historyView, setHistoryView] = useState("grid"); // "grid" | "collections"

  const [darkMode, setDarkMode] = useState(() => {
    const s = localStorage.getItem("dark_mode"); return s!==null?s==="true":true;
  });

  // Form
  const [title, setTitle] = useState("");
  const [creator, setCreator] = useState("");
  const [notes, setNotes] = useState("");
  const [mediaType, setMediaType] = useState("Movie");
  const [activeCat, setActiveCat] = useState("Watched");
  const [verdict, setVerdict] = useState("");
  const [year, setYear] = useState("");
  const [manualDate, setManualDate] = useState("");
  const [currentPage, setCurrentPage] = useState("");
  const [artwork, setArtwork] = useState("");
  const [genre, setGenre] = useState("");
  const [locationVenue, setLocationVenue] = useState("");
  const [locationCity, setLocationCity] = useState("");
  const [collectionId, setCollectionId] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // API search
  const [searchResults, setSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  // History
  const [historySearch, setHistorySearch] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [filterCat, setFilterCat] = useState("All");
  const [verdictFilter, setVerdictFilter] = useState("");
  const [sortBy, setSortBy] = useState("Date");
  const [filterMonth, setFilterMonth] = useState("All");
  const [showCollEntries, setShowCollEntries] = useState(false);

  // Queue
  const [queueFilter, setQueueFilter] = useState("All");

  // Stats
  const [statYearFilter, setStatYearFilter] = useState(new Date().getFullYear().toString());
  const [insightsOpen, setInsightsOpen] = useState(false);
  const [customName, setCustomName] = useState(localStorage.getItem("user_custom_name")||"");
  const [isEditingName, setIsEditingName] = useState(false);

  // Undo
  const [undoItem, setUndoItem] = useState(null);
  const undoTimerRef = useRef(null);

  // Post-save scroll
  const [savedEntryId, setSavedEntryId] = useState(null);
  const savedEntryRef = useRef(null);

  // Collections UI
  const [showCollModal, setShowCollModal] = useState(false);
  const [editingColl, setEditingColl] = useState(null);
  const [collName, setCollName] = useState("");
  const [collEmoji, setCollEmoji] = useState("🗂");
  const [collDesc, setCollDesc] = useState("");
  const [openCollId, setOpenCollId] = useState(null);

  // Modals
  const [showAbout, setShowAbout] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const textareaRef = useRef(null);
  const firstMatchRef = useRef(null);

  // ── THEME ──
  const theme = useMemo(() => ({
    bg:      darkMode?"#080808":"#f2f2f2",
    card:    darkMode?"#111111":"#ffffff",
    text:    darkMode?"#e8e8e8":"#111111",
    subtext: darkMode?"#555":"#999",
    subtext2:darkMode?"#888":"#666",
    border:  darkMode?"rgba(255,255,255,0.07)":"rgba(0,0,0,0.08)",
    border2: darkMode?"rgba(255,255,255,0.12)":"rgba(0,0,0,0.14)",
    input:   darkMode?"#111":"#fff",
    tabBar:  darkMode?"#0d0d0d":"#ffffff",
  }), [darkMode]);

  useEffect(()=>{ document.body.style.backgroundColor=theme.bg; },[theme.bg]);
  useEffect(()=>{ localStorage.setItem("dark_mode",darkMode); },[darkMode]);
  useEffect(()=>{ localStorage.setItem("dili_collections",JSON.stringify(collections)); },[collections]);

  // ── DATA ──
  const fetchLogs = useCallback(async (u) => {
    if (!u) { setLogs(JSON.parse(localStorage.getItem("guest_logs")||"[]")); return; }
    const {data,error} = await supabase.from("logs").select("*").order("logged_at",{ascending:false});
    if (!error) setLogs(data||[]);
  },[]);

  const mergeGuest = useCallback(async (userId) => {
    const local = JSON.parse(localStorage.getItem("guest_logs")||"[]");
    if (!local.length) return;
    const {error} = await supabase.from("logs").insert(local.map(({id,...r})=>({...r,user_id:userId})));
    if (!error) { localStorage.removeItem("guest_logs"); fetchLogs(userId); }
  },[fetchLogs]);

  useEffect(()=>{
    const init = async () => {
      try {
        const {data:{session}} = await supabase.auth.getSession();
        const u=session?.user??null; setUser(u); await fetchLogs(u);
      } catch(e){console.error(e);} finally{setLoading(false);}
    };
    init();
    const {data:{subscription}} = supabase.auth.onAuthStateChange(async(event,session)=>{
      const u=session?.user??null; setUser(u);
      if (event==="PASSWORD_RECOVERY") { const pw=prompt("Enter your new password:"); if(pw){const{error}=await supabase.auth.updateUser({password:pw});if(error)alert(error.message);else alert("Password updated!");} }
      if (u){setShowAuthModal(false);setAuthMsg("");await mergeGuest(u.id);}
      else fetchLogs(null);
    });
    return ()=>subscription.unsubscribe();
  },[fetchLogs,mergeGuest]);

  useEffect(()=>{ const ta=textareaRef.current; if(ta){ta.style.height="60px";ta.style.height=ta.scrollHeight+"px";} },[notes]);

  useEffect(()=>{
    if (historySearch.length>1) {
      const t=setTimeout(()=>firstMatchRef.current?.scrollIntoView({behavior:"smooth",block:"start"}),300);
      return ()=>clearTimeout(t);
    }
  },[historySearch]);

  useEffect(()=>{
    if (savedEntryId) {
      const t=setTimeout(()=>{savedEntryRef.current?.scrollIntoView({behavior:"smooth",block:"center"});setSavedEntryId(null);},150);
      return ()=>clearTimeout(t);
    }
  },[savedEntryId,logs]);

  // ── AUTH ──
  const handleAuth = async (e) => {
    e.preventDefault(); setAuthMsg("");
    const email=e.target.email.value, password=e.target.password.value;
    if (isSignUp) {
      const {data,error} = await supabase.auth.signUp({email,password});
      if (error) alert(error.message);
      else if (data?.user&&!data?.session) setAuthMsg("Check your email to verify!");
    } else {
      const {error} = await supabase.auth.signInWithPassword({email,password});
      if (error) alert(error.message);
    }
  };
  const handleForgotPassword = async () => {
    const email=prompt("Enter your email:"); if(!email) return;
    const {error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:window.location.origin});
    if(error)alert(error.message);else alert("Reset email sent!");
  };
  const handleDeleteAccount = async () => {
    if (!window.confirm("WARNING: This permanently deletes your account and ALL logs. Proceed?")) return;
    if (user) {
      const {error}=await supabase.rpc("delete_user_account");
      if(error)alert("Error: "+error.message);
      else{await supabase.auth.signOut();alert("Account deleted.");window.location.reload();}
    } else { localStorage.removeItem("guest_logs"); fetchLogs(null); alert("Guest data cleared."); }
  };

  // ── API SEARCH ──
  useEffect(()=>{
    const delay=setTimeout(()=>{ if(searchQuery.length>=3)handleLiveSearch(searchQuery); else setSearchResults([]); },250);
    return ()=>clearTimeout(delay);
  },[searchQuery,mediaType]);

  const handleLiveSearch = async (q) => {
    if (q.length<3){setSearchResults([]);return;}
    const at=API_TYPES[mediaType]; if(!at) return;
    try {
      if(at==="tmdb_movie"){const r=await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${TMDB_KEY}&query=${encodeURIComponent(q)}`);setSearchResults((await r.json()).results?.slice(0,6)||[]);}
      else if(at==="tmdb_tv"){const r=await fetch(`https://api.themoviedb.org/3/search/tv?api_key=${TMDB_KEY}&query=${encodeURIComponent(q)}`);setSearchResults((await r.json()).results?.slice(0,6).map(x=>({...x,_tv:true}))||[]);}
      else if(at==="books"){
        const [r1,r2]=await Promise.all([fetch(`https://www.googleapis.com/books/v1/volumes?q=intitle:${encodeURIComponent(q)}&orderBy=relevance&printType=books&maxResults=10&langRestrict=en&key=${GOOGLE_BOOKS_KEY}`),fetch(`https://www.googleapis.com/books/v1/volumes?q=inauthor:${encodeURIComponent(q)}&orderBy=relevance&printType=books&maxResults=10&langRestrict=en&key=${GOOGLE_BOOKS_KEY}`)]);
        const [d1,d2]=await Promise.all([r1.json(),r2.json()]);
        const seen=new Set(); setSearchResults([...(d1.items||[]),...(d2.items||[])].filter(i=>{if(seen.has(i.id))return false;seen.add(i.id);return true;}).slice(0,12));
      }
      else if(at==="lastfm"){const r=await fetch(`https://ws.audioscrobbler.com/2.0/?method=album.search&album=${encodeURIComponent(q)}&api_key=${LAST_FM_KEY}&format=json`);setSearchResults((await r.json()).results?.albummatches?.album?.slice(0,6)||[]);}
    } catch(e){console.error(e);}
  };

  const selectResult = async (item) => {
    setSearchResults([]);
    const at=API_TYPES[mediaType];
    if(at==="tmdb_movie"){setTitle(item.title);setYear(item.release_date?.split("-")[0]||"");setGenre(TMDB_GENRES[item.genre_ids?.[0]]||"");setArtwork(item.poster_path?`https://image.tmdb.org/t/p/w500${item.poster_path}`:"");try{const r=await fetch(`https://api.themoviedb.org/3/movie/${item.id}/credits?api_key=${TMDB_KEY}`);const d=await r.json();setCreator(d.crew?.find(p=>p.job==="Director")?.name||"");}catch{setCreator("");}}
    else if(at==="tmdb_tv"){setTitle(item.name);setYear(item.first_air_date?.split("-")[0]||"");setGenre(TMDB_GENRES[item.genre_ids?.[0]]||"");setArtwork(item.poster_path?`https://image.tmdb.org/t/p/w500${item.poster_path}`:"");try{const r=await fetch(`https://api.themoviedb.org/3/tv/${item.id}/credits?api_key=${TMDB_KEY}`);const d=await r.json();setCreator(d.crew?.find(p=>p.job==="Executive Producer")?.name||"");}catch{setCreator("");}}
    else if(at==="books"){setTitle(item.volumeInfo.title);setCreator(item.volumeInfo.authors?.join(", ")||"");const il=item.volumeInfo?.imageLinks;const raw=il?.thumbnail||il?.smallThumbnail||"";setArtwork(raw?raw.replace("zoom=1","zoom=0").replace("http://","https://"):"");setYear(item.volumeInfo.publishedDate?.split("-")[0]||"");setGenre(item.volumeInfo?.categories?.[0]||"");}
    else if(at==="lastfm"){setTitle(item.name);setCreator(item.artist);setArtwork(item.image?(item.image[4]?.["#text"]||item.image[3]?.["#text"]||item.image[2]?.["#text"]||""):"");try{const r=await fetch(`https://ws.audioscrobbler.com/2.0/?method=album.getInfo&api_key=${LAST_FM_KEY}&artist=${encodeURIComponent(item.artist)}&album=${encodeURIComponent(item.name)}&format=json`);const d=await r.json();const rd=d.album?.releasedate?.trim();if(rd){const m=rd.match(/\d{4}/);setYear(m?m[0]:"");}else setYear("");setGenre(d.album?.tags?.tag?.[0]?.name||"");}catch{setYear("");}}
  };

  // ── SAVE ──
  const handleSave = async () => {
    const trimmedTitle=title.trim();
    if(!trimmedTitle||!verdict) return alert("Title and Verdict are required.");
    const yearStr=year?year.toString():"";
    if(yearStr&&(yearStr.length!==4||isNaN(yearStr))) return alert("Please enter a valid 4-digit year.");
    setIsSaving(true);
    const isFinished=["I loved it","I liked it","Meh","I didn't like it"].includes(verdict);
    const isQueue=verdict?.startsWith("Want to")||verdict?.startsWith("Currently");
    const logData={
      title:trimmedTitle,creator:creator.trim(),notes:notes.trim(),media_type:mediaType,verdict,
      year_released:year||null,artwork:artwork||null,current_page:currentPage||null,genre:genre||null,
      location_venue:locationVenue.trim()||null,location_city:locationCity.trim()||null,
      collection_id:collectionId||null,
      ...(manualDate?{logged_at:new Date(manualDate).toISOString()}:(isFinished?{logged_at:new Date().toISOString()}:{}))
    };
    try {
      if (user) {
        const {error}=editingId?await supabase.from("logs").update(logData).eq("id",editingId):await supabase.from("logs").insert([{...logData,user_id:user.id,logged_at:logData.logged_at||new Date().toISOString()}]);
        if(error)throw error; fetchLogs(user);
      } else {
        let cur=JSON.parse(localStorage.getItem("guest_logs")||"[]");
        if(editingId)cur=cur.map(l=>l.id===editingId?{...l,...logData}:l);
        else cur.unshift({...logData,id:Date.now().toString(),logged_at:logData.logged_at||new Date().toISOString()});
        localStorage.setItem("guest_logs",JSON.stringify(cur)); fetchLogs(null);
      }
      const sid=editingId; resetForm();
      if(isQueue)setActiveTab("queue"); else setActiveTab("history");
      setSavedEntryId(sid||"latest");
    } catch(err){alert(err.message);} finally{setIsSaving(false);}
  };

  const resetForm = () => {
    setTitle("");setCreator("");setNotes("");setYear("");setVerdict("");
    setManualDate("");setCurrentPage("");setArtwork("");setGenre("");
    setLocationVenue("");setLocationCity("");setCollectionId("");setEditingId(null);
    setSearchResults([]);setSearchQuery("");
  };

  // ── DELETE ──
  const deleteLog = (id) => {
    const item=logs.find(l=>l.id===id); if(!item) return;
    setLogs(prev=>prev.filter(l=>l.id!==id)); setUndoItem(item);
    if(undoTimerRef.current)clearTimeout(undoTimerRef.current);
    undoTimerRef.current=setTimeout(async()=>{
      if(user)await supabase.from("logs").delete().eq("id",id);
      else{const c=JSON.parse(localStorage.getItem("guest_logs")||"[]");localStorage.setItem("guest_logs",JSON.stringify(c.filter(l=>l.id!==id)));}
      setUndoItem(null);
    },5000);
  };
  const undoDelete = () => {
    if(!undoItem)return; clearTimeout(undoTimerRef.current);
    setLogs(prev=>{if(prev.find(l=>l.id===undoItem.id))return prev;return[undoItem,...prev].sort((a,b)=>new Date(b.logged_at)-new Date(a.logged_at));});
    setUndoItem(null);
  };
  const startEdit = (log) => {
    setEditingId(log.id);setTitle(log.title);setCreator(log.creator||"");setNotes(log.notes||"");setYear(log.year_released||"");
    setMediaType(log.media_type);setActiveCat(getCat(log.media_type));setVerdict(log.verdict);setArtwork(log.artwork||"");
    setGenre(log.genre||"");setCurrentPage(log.current_page||"");setLocationVenue(log.location_venue||"");setLocationCity(log.location_city||"");
    setCollectionId(log.collection_id||"");setActiveTab("log");
  };

  // ── COLLECTIONS ──
  const saveCollection = () => {
    if(!collName.trim()) return;
    if(editingColl) setCollections(prev=>prev.map(c=>c.id===editingColl?{...c,name:collName.trim(),emoji:collEmoji,desc:collDesc.trim()}:c));
    else setCollections(prev=>[...prev,{id:Date.now().toString(),name:collName.trim(),emoji:collEmoji,desc:collDesc.trim(),createdAt:new Date().toISOString()}]);
    setShowCollModal(false);setCollName("");setCollEmoji("🗂");setCollDesc("");setEditingColl(null);
  };
  const deleteCollection = (id) => {
    if(!window.confirm("Delete this collection? Entries stay but lose their collection tag.")) return;
    setCollections(prev=>prev.filter(c=>c.id!==id));
    const cur=JSON.parse(localStorage.getItem("guest_logs")||"[]");
    localStorage.setItem("guest_logs",JSON.stringify(cur.map(l=>l.collection_id===id?{...l,collection_id:null}:l)));
    setLogs(prev=>prev.map(l=>l.collection_id===id?{...l,collection_id:null}:l));
  };
  const openEditColl = (c) => { setEditingColl(c.id);setCollName(c.name);setCollEmoji(c.emoji||"🗂");setCollDesc(c.desc||"");setShowCollModal(true); };

  // ── MISC HELPERS ──
  const saveName = () => { localStorage.setItem("user_custom_name",customName.trim()); setIsEditingName(false); };
  const exportCSV = () => {
    const headers=["Title","Creator","Type","Category","Verdict","Genre","Year","Venue","City","Collection","Notes","Date"];
    const rows=logs.map(l=>{const coll=collections.find(c=>c.id===l.collection_id);return[`"${l.title}"`,`"${l.creator||""}"`,l.media_type,getCat(l.media_type),l.verdict,l.genre||"",l.year_released||"",l.location_venue||"",l.location_city||"",coll?.name||"",`"${(l.notes||"").replace(/"/g,'""')}"`,new Date(l.logged_at).toLocaleDateString()];});
    const csv=[headers,...rows].map(r=>r.join(",")).join("\n");
    const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));a.download="my-culture-log.csv";a.click();
  };

  const getVerdictStyle = (v) => {
    switch(v){
      case "I loved it":       return{bg:darkMode?"rgba(255,215,0,0.12)":"#fff9c4",  color:darkMode?"#f1c40f":"#9a7d0a", border:darkMode?"rgba(241,196,15,0.3)":"#fbc02d", emoji:"⭐"};
      case "I liked it":       return{bg:darkMode?"rgba(76,175,80,0.15)":"#e8f5e9",  color:darkMode?"#81c784":"#2e7d32", border:darkMode?"rgba(76,175,80,0.3)":"#c8e6c9",  emoji:"🟢"};
      case "Meh":              return{bg:darkMode?"rgba(255,152,0,0.15)":"#fff3e0",  color:darkMode?"#ffb74d":"#ef6c00", border:darkMode?"rgba(255,152,0,0.3)":"#ffe0b2",  emoji:"🟡"};
      case "I didn't like it": return{bg:darkMode?"rgba(244,67,54,0.15)":"#ffebee",  color:darkMode?"#e57373":"#c62828", border:darkMode?"rgba(244,67,54,0.3)":"#ffcdd2",  emoji:"🔴"};
      default:
        if(v?.startsWith("Currently"))return{bg:darkMode?"rgba(3,169,244,0.15)":"#e1f5fe",  color:darkMode?"#4fc3f7":"#01579b",border:darkMode?"rgba(3,169,244,0.3)":"#b3e5fc",  emoji:"▶️"};
        if(v?.startsWith("Want to"))  return{bg:darkMode?"rgba(156,39,176,0.15)":"#f3e5f5", color:darkMode?"#ce93d8":"#4a148c",border:darkMode?"rgba(156,39,176,0.3)":"#e1bee7", emoji:"⏳"};
        return{bg:darkMode?"#1a1a1a":"#f0f0f0",color:darkMode?"#bbb":"#555",border:darkMode?"#222":"#ddd",emoji:"⚪"};
    }
  };

  // ── COMPUTED ──
  const availableYears = useMemo(()=>{
    const years=logs.map(l=>l.logged_at?new Date(l.logged_at).getFullYear().toString():null).filter(y=>y&&y!=="NaN");
    return["All",...new Set(years)].sort((a,b)=>b-a);
  },[logs]);

  const stats = useMemo(()=>{
    const cats={};Object.keys(CATEGORIES).forEach(c=>{cats[c]={total:0,loved:0,liked:0,meh:0,no:0};});cats.active=0;cats.queue=0;
    logs.forEach(log=>{
      if(statYearFilter!=="All"&&new Date(log.logged_at).getFullYear().toString()!==statYearFilter)return;
      const v=log.verdict,cat=getCat(log.media_type);
      if(v?.startsWith("Currently"))cats.active++;
      else if(v?.startsWith("Want to"))cats.queue++;
      else if(cats[cat]){cats[cat].total++;if(v==="I loved it")cats[cat].loved++;else if(v==="I liked it")cats[cat].liked++;else if(v==="Meh")cats[cat].meh++;else if(v==="I didn't like it")cats[cat].no++;}
    });
    return cats;
  },[logs,statYearFilter]);

  const dateOptions = useMemo(()=>["All",...new Set(logs.map(l=>new Date(l.logged_at).toLocaleString("default",{month:"long",year:"numeric"})))], [logs]);

  const filterLogs = useCallback((arr,term,catF,vF,month,sort,view)=>{
    return arr.filter(log=>{
      const isQueue=log.verdict?.startsWith("Want to"), isActive=log.verdict?.startsWith("Currently");
      const lmy=log.logged_at?new Date(log.logged_at).toLocaleString("default",{month:"long",year:"numeric"}):"";
      let matchSearch=true;
      if(term){
        const t=term.toLowerCase().trim();
        if(t.startsWith('"')){const ph=t.replace(/^"|"$/g,"");matchSearch=[log.title,log.creator,log.notes,log.location_venue,log.location_city].some(f=>(f||"").toLowerCase().includes(ph));}
        else{const src=`${log.title} ${log.creator} ${log.notes} ${log.verdict} ${lmy} ${log.location_venue||""} ${log.location_city||""}`.toLowerCase();const parts=t.split(" ");const done=parts.slice(0,-1);const cur=parts[parts.length-1];matchSearch=done.every(w=>{if(!w)return true;const esc=w.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");return new RegExp(`(?<![a-z])${esc}(?![a-z])`,"i").test(src);})&&(cur===""||new RegExp(`(?<![a-z])${cur.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}`,"i").test(src));}
      }
      const matchCat=catF==="All"||getCat(log.media_type)===catF;
      const matchV=!vF||log.verdict===vF;
      const matchMonth=month==="All"||lmy===month;
      let matchView=true;
      if(!term&&view){if(view==="history")matchView=!isActive&&!isQueue;if(view==="queue")matchView=isActive||isQueue;}
      return matchSearch&&matchCat&&matchV&&matchMonth&&matchView;
    }).sort((a,b)=>{
      if(sort==="Title")return(a.title||"").localeCompare(b.title||"");
      if(sort==="Verdict"){const o={"I loved it":0,"I liked it":1,"Meh":2,"I didn't like it":3};return(o[a.verdict]??99)-(o[b.verdict]??99);}
      return new Date(b.logged_at)-new Date(a.logged_at);
    });
  },[]);

  const filteredHistory = useMemo(()=>{
    const base=filterLogs(logs,historySearch,filterCat,verdictFilter,filterMonth,sortBy,"history");
    return showCollEntries?base:base.filter(l=>!l.collection_id);
  },[logs,historySearch,filterCat,verdictFilter,filterMonth,sortBy,filterLogs,showCollEntries]);

  const filteredQueue = useMemo(()=>filterLogs(logs,"",queueFilter,"","All","Date","queue"),[logs,queueFilter,filterLogs]);
  const collEntriesCount = useMemo(()=>logs.filter(l=>l.collection_id).length,[logs]);

  // ── STYLES ──
  const inputStyle={width:"100%",padding:"12px",borderRadius:"10px",border:`1px solid ${theme.border2}`,boxSizing:"border-box",fontSize:"14px",outline:"none",background:theme.input,color:theme.text,marginBottom:"12px",transition:"border-color 0.2s"};
  const vBtn=(active,color)=>({padding:"11px 10px",borderRadius:"10px",border:`1px solid ${active?color:theme.border2}`,background:active?color:"none",color:active?(color==="#f1c40f"?"#000":"#fff"):theme.text,fontWeight:"600",fontSize:"12px",cursor:"pointer",transition:"all 0.15s"});

  // ── SEARCH DROPDOWN ──
  const renderSearchDropdown = () => searchResults.length>0&&(
    <div style={{position:"absolute",top:"100%",left:0,right:0,zIndex:50,background:theme.card,borderRadius:"12px",boxShadow:"0 8px 30px rgba(0,0,0,0.4)",border:`1px solid ${theme.border2}`,maxHeight:"280px",overflowY:"auto",marginTop:"4px"}}>
      {searchResults.map((item,i)=>{
        let t="",sub="",thumb=null;
        const at=API_TYPES[mediaType];
        if(at==="tmdb_movie"){t=item.title;sub=item.release_date?.split("-")[0]||"";thumb=item.poster_path?`https://image.tmdb.org/t/p/w92${item.poster_path}`:null;}
        else if(at==="tmdb_tv"){t=item.name;sub=item.first_air_date?.split("-")[0]||"";thumb=item.poster_path?`https://image.tmdb.org/t/p/w92${item.poster_path}`:null;}
        else if(at==="books"){t=item.volumeInfo?.title||"";sub=`${item.volumeInfo?.authors?.join(", ")||""} (${item.volumeInfo?.publishedDate?.split("-")[0]||""})`;const il=item.volumeInfo?.imageLinks;thumb=(il?.thumbnail||il?.smallThumbnail||"").replace("http://","https://")||null;}
        else{t=item.name;sub=item.artist;thumb=item.image?(item.image[4]?.["#text"]||item.image[3]?.["#text"]||null):null;}
        const ss=getSubtypeStyle(mediaType);
        return(
          <div key={item.id||i} onClick={()=>selectResult(item)} style={{display:"flex",alignItems:"center",padding:"10px 12px",cursor:"pointer",borderBottom:`1px solid ${theme.border}`,gap:"10px"}}>
            <div style={{width:"36px",height:"50px",backgroundColor:darkMode?"#1a1a1a":"#eee",borderRadius:"6px",overflow:"hidden",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
              {thumb?<img src={thumb} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<span style={{fontSize:"16px"}}>{ss.icon}</span>}
            </div>
            <div style={{flex:1,overflow:"hidden"}}>
              <div style={{fontWeight:"600",color:theme.text,fontSize:"13px",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{t}</div>
              <div style={{fontSize:"11px",color:theme.subtext,marginTop:"2px"}}>{sub}</div>
            </div>
          </div>
        );
      })}
      <div onClick={()=>setSearchResults([])} style={{padding:"12px",textAlign:"center",color:"#3498db",fontWeight:"600",cursor:"pointer",fontSize:"12px"}}>✕ Close — type manually instead</div>
    </div>
  );

  // ════════════════════════════════════════════
  // TAB: LOG
  // ════════════════════════════════════════════
  const renderLog = () => {
    const catDef=CATEGORIES[activeCat];
    const isExp=activeCat==="Experienced";
    const hasApi=!!API_TYPES[mediaType];
    const creatorLabel=CREATOR_LABELS[mediaType];
    const queueVal=activeCat==="Read"?"Currently reading":activeCat==="Watched"?"Currently watching":"Currently listening";
    const wantVal=activeCat==="Read"?"Want to read":activeCat==="Watched"?"Want to watch":"Want to listen";
    return (
      <div style={{padding:"20px 16px 100px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"20px"}}>
          <div>
            <h1 style={{fontSize:"22px",fontWeight:"700",letterSpacing:"-0.5px",margin:0,color:theme.text}}>{editingId?"Edit entry":"Log something"}</h1>
            <p style={{fontSize:"12px",color:theme.subtext,margin:"3px 0 0"}}>{editingId?"Make your changes below":"What did you experience?"}</p>
          </div>
          {editingId&&<button onClick={resetForm} style={{background:"none",border:`1px solid ${theme.border2}`,color:theme.subtext,fontSize:"11px",padding:"6px 12px",borderRadius:"20px",cursor:"pointer"}}>Cancel</button>}
        </div>

        {/* CATEGORY TABS */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:"6px",marginBottom:"14px"}}>
          {Object.entries(CATEGORIES).map(([cat,def])=>{
            const active=activeCat===cat;
            return <button key={cat} onClick={()=>{setActiveCat(cat);setMediaType(def.subtypes[0]);setVerdict("");setSearchResults([]);setSearchQuery("");}} style={{padding:"8px 4px",borderRadius:"10px",border:`1px solid ${active?def.color:theme.border}`,background:active?`${def.color}18`:"none",color:active?def.color:theme.subtext2,fontWeight:"600",fontSize:"11px",cursor:"pointer",textAlign:"center",transition:"all 0.15s"}}><div style={{fontSize:"16px",marginBottom:"2px"}}>{def.icon}</div><div>{cat}</div></button>;
          })}
        </div>

        {/* SUBTYPE PILLS */}
        <div style={{display:"flex",gap:"5px",marginBottom:"16px",overflowX:"auto",paddingBottom:"4px"}}>
          {catDef.subtypes.map(sub=>{
            const active=mediaType===sub;const ss=getSubtypeStyle(sub);
            return <button key={sub} onClick={()=>{setMediaType(sub);setVerdict("");setSearchResults([]);setSearchQuery("");}} style={{flexShrink:0,padding:"5px 10px",borderRadius:"20px",border:`1px solid ${active?ss.color:theme.border}`,background:active?`${ss.color}18`:"none",color:active?ss.color:theme.subtext,fontSize:"11px",fontWeight:"600",cursor:"pointer",whiteSpace:"nowrap",transition:"all 0.15s"}}>{ss.icon} {sub}</button>;
          })}
        </div>

        {/* TITLE */}
        <div style={{position:"relative"}}>
          <input type="text" placeholder={hasApi?`Search for a ${mediaType.toLowerCase()}…`:`${mediaType} title…`} value={title} onChange={e=>{setTitle(e.target.value);if(hasApi)setSearchQuery(e.target.value);}} style={inputStyle}/>
          {renderSearchDropdown()}
        </div>

        {creatorLabel&&<input placeholder={creatorLabel} value={creator} onChange={e=>setCreator(e.target.value)} style={inputStyle}/>}

        <div style={{display:"flex",gap:"10px"}}>
          {!isExp&&<input placeholder="Year" value={year} type="number" onChange={e=>setYear(e.target.value)} style={{...inputStyle,flex:1}}/>}
          <input placeholder="Genre / Category" value={genre} onChange={e=>setGenre(e.target.value)} style={{...inputStyle,flex:2}}/>
        </div>

        {/* LOCATION */}
        {isExp&&(
          <div style={{display:"flex",gap:"10px"}}>
            <input placeholder="Venue name" value={locationVenue} onChange={e=>setLocationVenue(e.target.value)} style={{...inputStyle,flex:2}}/>
            <input placeholder="City" value={locationCity} onChange={e=>setLocationCity(e.target.value)} style={{...inputStyle,flex:1}}/>
          </div>
        )}

        {/* PHOTO */}
        {isExp&&(
          <div style={{marginBottom:"12px"}}>
            <label style={{fontSize:"10px",fontWeight:"700",color:theme.subtext,letterSpacing:"0.08em",textTransform:"uppercase",display:"block",marginBottom:"6px"}}>Photo (optional)</label>
            <div style={{display:"flex",gap:"8px"}}>
              <input placeholder="Paste image URL…" value={artwork} onChange={e=>setArtwork(e.target.value)} style={{...inputStyle,flex:1,marginBottom:0}}/>
              <label style={{flexShrink:0,padding:"0 14px",height:"44px",borderRadius:"10px",border:`1px solid ${theme.border2}`,background:"none",color:theme.subtext,fontSize:"18px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                📷<input type="file" accept="image/*" style={{display:"none"}} onChange={async e=>{const f=e.target.files?.[0];if(!f)return;const c=await compressImage(f);setArtwork(c);}}/>
              </label>
            </div>
            {artwork&&(
              <div style={{marginTop:"8px",position:"relative",display:"inline-block"}}>
                <img src={artwork} alt="" style={{height:"70px",borderRadius:"8px",objectFit:"cover"}} onError={e=>e.target.style.display="none"}/>
                <button onClick={()=>setArtwork("")} style={{position:"absolute",top:"-6px",right:"-6px",background:"#e74c3c",border:"none",color:"#fff",borderRadius:"50%",width:"18px",height:"18px",fontSize:"11px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
              </div>
            )}
          </div>
        )}

        {activeCat==="Read"&&verdict?.startsWith("Currently")&&<input placeholder="Current page" type="text" inputMode="numeric" value={currentPage} onChange={e=>setCurrentPage(e.target.value.replace(/\D/g,""))} style={inputStyle}/>}

        {/* COLLECTION ASSIGN */}
        {collections.length>0&&(
          <div style={{marginBottom:"12px"}}>
            <label style={{fontSize:"10px",fontWeight:"700",color:theme.subtext,letterSpacing:"0.08em",textTransform:"uppercase",display:"block",marginBottom:"6px"}}>Collection (optional)</label>
            <select value={collectionId} onChange={e=>setCollectionId(e.target.value)} style={{...inputStyle,marginBottom:0}}>
              <option value="">No collection</option>
              {collections.map(c=><option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
            </select>
          </div>
        )}

        <textarea ref={textareaRef} placeholder="My thoughts… (optional)" value={notes} onChange={e=>setNotes(e.target.value)} style={{...inputStyle,height:"60px",overflow:"hidden",resize:"none",marginTop:"4px"}}/>

        <div style={{marginBottom:"16px"}}>
          <label style={{fontSize:"10px",fontWeight:"700",color:theme.subtext,letterSpacing:"0.08em",textTransform:"uppercase",display:"block",marginBottom:"6px"}}>Log date (optional)</label>
          <input type="date" value={manualDate} onChange={e=>setManualDate(e.target.value)} style={inputStyle}/>
        </div>

        <div style={{marginBottom:"20px"}}>
          <label style={{fontSize:"10px",fontWeight:"700",color:theme.subtext,letterSpacing:"0.08em",textTransform:"uppercase",display:"block",marginBottom:"8px"}}>Your verdict</label>
          {!isExp&&(
            <div style={{display:"flex",gap:"6px",marginBottom:"8px"}}>
              <button onClick={()=>setVerdict(queueVal)} style={{...vBtn(verdict===queueVal,"#3498db"),flex:1}}>▶️ {queueVal}</button>
              <button onClick={()=>setVerdict(wantVal)}  style={{...vBtn(verdict===wantVal,"#9c27b0"),flex:1}}>⏳ {wantVal}</button>
            </div>
          )}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px"}}>
            <button onClick={()=>setVerdict("I loved it")}       style={vBtn(verdict==="I loved it","#f1c40f")}>⭐ Loved it</button>
            <button onClick={()=>setVerdict("I liked it")}       style={vBtn(verdict==="I liked it","#4caf50")}>🟢 Liked it</button>
            <button onClick={()=>setVerdict("Meh")}              style={vBtn(verdict==="Meh","#ff9800")}>🟡 Meh</button>
            <button onClick={()=>setVerdict("I didn't like it")} style={vBtn(verdict==="I didn't like it","#e74c3c")}>🔴 Didn't like it</button>
          </div>
        </div>

        <button onClick={handleSave} disabled={isSaving} style={{width:"100%",padding:"14px",borderRadius:"12px",border:"none",background:darkMode?"#fff":"#111",color:darkMode?"#000":"#fff",fontWeight:"700",fontSize:"15px",cursor:"pointer",opacity:isSaving?0.6:1,transition:"opacity 0.2s"}}>
          {isSaving?"Saving…":(editingId?"Update entry":"Save entry")}
        </button>
      </div>
    );
  };

  // ════════════════════════════════════════════
  // TAB: HISTORY
  // ════════════════════════════════════════════
  const renderHistory = () => (
    <div style={{padding:"20px 16px 100px"}}>
      <div style={{marginBottom:"20px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px"}}>
          <h1 style={{fontSize:"22px",fontWeight:"700",letterSpacing:"-0.5px",margin:0,color:theme.text}}>History</h1>
          <div style={{display:"flex",gap:"6px",alignItems:"center"}}>
            <span style={{fontSize:"12px",color:theme.subtext}}>{filteredHistory.length} entries</span>
            <button onClick={()=>setHistoryView(v=>v==="grid"?"collections":"grid")}
              style={{padding:"5px 10px",borderRadius:"20px",border:`1px solid ${historyView==="collections"?"#e67e22":theme.border}`,background:historyView==="collections"?"rgba(230,126,34,0.12)":"none",color:historyView==="collections"?"#e67e22":theme.subtext,fontSize:"11px",fontWeight:"600",cursor:"pointer"}}>
              🗂 Collections
            </button>
          </div>
        </div>

        {historyView==="grid"&&(
          <>
            <div style={{position:"relative",marginBottom:"12px"}}>
              <span style={{position:"absolute",left:"14px",top:"50%",transform:"translateY(-50%)",fontSize:"14px",color:theme.subtext,pointerEvents:"none"}}>🔍</span>
              <input placeholder="Search everything…" value={historySearch} onChange={e=>setHistorySearch(e.target.value)} onFocus={()=>setSearchFocused(true)} onBlur={()=>setSearchFocused(false)} style={{...inputStyle,paddingLeft:"40px",paddingRight:historySearch?"40px":"14px",borderRadius:"12px",marginBottom:0}}/>
              {historySearch&&<button onClick={()=>setHistorySearch("")} style={{position:"absolute",right:"12px",top:"50%",transform:"translateY(-50%)",background:"none",border:"none",color:theme.subtext,cursor:"pointer",fontSize:"16px"}}>✕</button>}
            </div>
            <div style={{display:"flex",gap:"6px",overflowX:"auto",paddingBottom:"4px",marginBottom:"8px"}}>
              {["All",...Object.keys(CATEGORIES)].map(cat=>{
                const def=CATEGORIES[cat];const active=filterCat===cat;
                return <button key={cat} onClick={()=>setFilterCat(cat)} style={{flexShrink:0,padding:"5px 11px",borderRadius:"20px",border:`1px solid ${active?(def?.color||theme.border2):theme.border}`,background:active?(darkMode?`${def?.color||"#fff"}18`:`${def?.color||"#000"}10`):"none",color:active?(def?.color||theme.text):theme.subtext,fontSize:"11px",fontWeight:"600",cursor:"pointer",whiteSpace:"nowrap"}}>{def?`${def.icon} ${cat}`:"All"}</button>;
              })}
            </div>
            <div style={{display:"flex",gap:"6px",marginBottom:"8px"}}>
              <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={{flex:1,padding:"7px 10px",borderRadius:"20px",border:`1px solid ${theme.border}`,background:theme.input,color:theme.subtext,fontSize:"11px",cursor:"pointer",outline:"none"}}><option value="Date">Recent</option><option value="Title">A–Z</option><option value="Verdict">Ranked</option></select>
              <select value={filterMonth} onChange={e=>setFilterMonth(e.target.value)} style={{flex:1.5,padding:"7px 10px",borderRadius:"20px",border:`1px solid ${theme.border}`,background:theme.input,color:theme.subtext,fontSize:"11px",cursor:"pointer",outline:"none"}}>
                {dateOptions.map(m=><option key={m} value={m}>{m==="All"?"All months":m}</option>)}
              </select>
            </div>
            {collEntriesCount>0&&(
              <button onClick={()=>setShowCollEntries(v=>!v)} style={{display:"flex",alignItems:"center",gap:"5px",fontSize:"11px",fontWeight:"600",color:theme.subtext2,background:"none",border:`1px solid ${theme.border}`,borderRadius:"20px",padding:"4px 10px",cursor:"pointer",marginBottom:"8px"}}>
                <span>{showCollEntries?"👁":"👁‍🗨"}</span>
                <span>{showCollEntries?"Showing":"Hiding"} {collEntriesCount} collection {collEntriesCount===1?"entry":"entries"}</span>
              </button>
            )}
            {verdictFilter&&<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"8px"}}><span style={{fontSize:"12px",color:theme.subtext}}>Filtered: <b style={{color:theme.text}}>{verdictFilter}</b></span><button onClick={()=>setVerdictFilter("")} style={{background:"none",border:"none",color:"#3498db",cursor:"pointer",fontSize:"12px",fontWeight:"600"}}>Clear ✕</button></div>}
          </>
        )}
      </div>

      {historyView==="collections"?(
        <div>
          <button onClick={()=>{setEditingColl(null);setCollName("");setCollEmoji("🗂");setCollDesc("");setShowCollModal(true);}} style={{width:"100%",padding:"12px",borderRadius:"12px",border:`1px dashed ${theme.border2}`,background:"none",color:"#3498db",fontSize:"13px",fontWeight:"600",cursor:"pointer",marginBottom:"16px"}}>
            + New Collection
          </button>
          {collections.length===0?(
            <div style={{textAlign:"center",padding:"40px 20px",color:theme.subtext}}>
              <div style={{fontSize:"40px",marginBottom:"12px"}}>🗂</div>
              <div style={{fontSize:"16px",fontWeight:"600",color:theme.text,marginBottom:"6px"}}>No collections yet</div>
              <div style={{fontSize:"13px"}}>Group entries into collections — a holiday, a film series, a reading challenge</div>
            </div>
          ):(
            <div style={{display:"flex",flexDirection:"column",gap:"10px"}}>
              {collections.map(coll=>{
                const collLogs=logs.filter(l=>l.collection_id===coll.id);
                const isOpen=openCollId===coll.id;
                const accent=collAccent(coll.name);
                return(
                  <div key={coll.id} style={{background:theme.card,border:`1px solid ${theme.border}`,borderRadius:"14px",overflow:"hidden"}}>
                    <div onClick={()=>setOpenCollId(isOpen?null:coll.id)} style={{padding:"16px",cursor:"pointer",display:"flex",alignItems:"center",gap:"12px",position:"relative"}}>
                      <div style={{position:"absolute",top:0,left:0,right:0,height:"2px",background:`linear-gradient(90deg,transparent,${accent},transparent)`,opacity:0.6}}/>
                      <div style={{width:"40px",height:"40px",borderRadius:"10px",background:`${accent}22`,border:`1px solid ${accent}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"20px",flexShrink:0}}>{coll.emoji}</div>
                      <div style={{flex:1,overflow:"hidden"}}>
                        <div style={{fontWeight:"700",fontSize:"15px",color:theme.text}}>{coll.name}</div>
                        {coll.desc&&<div style={{fontSize:"11px",color:theme.subtext,marginTop:"2px",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{coll.desc}</div>}
                        <div style={{fontSize:"10px",color:theme.subtext2,marginTop:"3px"}}>{collLogs.length} {collLogs.length===1?"entry":"entries"}</div>
                      </div>
                      <div style={{display:"flex",gap:"6px",alignItems:"center"}}>
                        <button onClick={e=>{e.stopPropagation();openEditColl(coll);}} style={{background:"none",border:`1px solid ${theme.border}`,color:theme.subtext,fontSize:"11px",padding:"4px 8px",borderRadius:"8px",cursor:"pointer"}}>Edit</button>
                        <button onClick={e=>{e.stopPropagation();deleteCollection(coll.id);}} style={{background:"none",border:"none",color:"#e74c3c",fontSize:"16px",cursor:"pointer",padding:"4px"}}>🗑</button>
                        <span style={{fontSize:"12px",color:theme.subtext,display:"inline-block",transition:"transform 0.2s",transform:isOpen?"rotate(180deg)":"rotate(0deg)"}}>⌄</span>
                      </div>
                    </div>
                    {isOpen&&(
                      <div style={{borderTop:`1px solid ${theme.border}`,padding:"12px"}}>
                        {collLogs.length===0?(
                          <div style={{textAlign:"center",padding:"20px",color:theme.subtext,fontSize:"12px"}}>No entries yet. Assign entries to this collection when logging.</div>
                        ):(
                          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px"}}>
                            {collLogs.map(log=>(
                              <MediaCard key={log.id} log={log} theme={theme} darkMode={darkMode} getVerdictStyle={getVerdictStyle} searchTerm="" onEdit={()=>startEdit(log)} onDelete={()=>deleteLog(log.id)}/>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ):(
        filteredHistory.length===0?(
          <div style={{textAlign:"center",padding:"60px 20px",color:theme.subtext}}>
            <div style={{fontSize:"40px",marginBottom:"12px"}}>{historySearch?"🔍":logs.length===0?"📚":"🎯"}</div>
            <div style={{fontSize:"16px",fontWeight:"600",color:theme.text,marginBottom:"6px"}}>{historySearch?"No results found":logs.length===0?"Nothing logged yet":"No matches"}</div>
            <div style={{fontSize:"13px"}}>{historySearch?`No entries match "${historySearch}"`:logs.length===0?"Tap Log to add your first entry":"Try adjusting your filters"}</div>
            {logs.length===0&&<button onClick={()=>setActiveTab("log")} style={{marginTop:"20px",padding:"12px 24px",borderRadius:"12px",border:"none",background:darkMode?"#fff":"#111",color:darkMode?"#000":"#fff",fontWeight:"600",cursor:"pointer"}}>Log something →</button>}
          </div>
        ):(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px"}}>
            {filteredHistory.map((log,i)=>(
              <div key={log.id} ref={(savedEntryId==="latest"&&i===0)||savedEntryId===log.id?savedEntryRef:i===0?firstMatchRef:null}>
                <MediaCard log={log} theme={theme} darkMode={darkMode} getVerdictStyle={getVerdictStyle} searchTerm={historySearch} onEdit={()=>startEdit(log)} onDelete={()=>deleteLog(log.id)}/>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );

  // ════════════════════════════════════════════
  // TAB: STATS
  // ════════════════════════════════════════════
  const renderStats = () => {
    const finishedLogs=logs.filter(l=>{if(statYearFilter!=="All"&&new Date(l.logged_at).getFullYear().toString()!==statYearFilter)return false;return["I loved it","I liked it","Meh","I didn't like it"].includes(l.verdict);});
    const total=finishedLogs.length||1;
    const hitCount=finishedLogs.filter(l=>l.verdict==="I loved it"||l.verdict==="I liked it").length;
    const hitRate=Math.round((hitCount/total)*100);
    const creatorCount={};finishedLogs.forEach(l=>{if(!l.creator)return;const k=`${l.creator}|||${l.media_type}`;creatorCount[k]=(creatorCount[k]||0)+1;});
    const topCreatorEntry=Object.entries(creatorCount).sort((a,b)=>b[1]-a[1])[0];
    const topCreator=topCreatorEntry?{name:topCreatorEntry[0].split("|||")[0],type:topCreatorEntry[0].split("|||")[1],count:topCreatorEntry[1]}:null;
    const genreCount={};finishedLogs.forEach(l=>{if(l.genre)genreCount[l.genre]=(genreCount[l.genre]||0)+1;});
    const topGenres=Object.entries(genreCount).sort((a,b)=>b[1]-a[1]).slice(0,4);
    const maxGenre=topGenres[0]?.[1]||1;
    const genreColors=["#3498db","#9b59b6","#1abc9c","#e74c3c"];
    const monthCount={};logs.forEach(l=>{if(!l.logged_at)return;if(statYearFilter!=="All"&&new Date(l.logged_at).getFullYear().toString()!==statYearFilter)return;const k=new Date(l.logged_at).toLocaleString("default",{month:"long",year:"numeric"});monthCount[k]=(monthCount[k]||0)+1;});
    const topMonth=Object.entries(monthCount).sort((a,b)=>b[1]-a[1])[0];
    const maxMonth=topMonth?.[1]||1;
    const last12=Array.from({length:12},(_,i)=>{const d=new Date();d.setMonth(d.getMonth()-(11-i));const k=d.toLocaleString("default",{month:"long",year:"numeric"});return{key:k,count:monthCount[k]||0};});
    const icBase={background:theme.card,border:`1px solid ${theme.border}`,borderRadius:"14px",padding:"14px"};
    return (
      <div style={{padding:"20px 16px 100px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"24px"}}>
          <div>
            {isEditingName?(
              <form onSubmit={e=>{e.preventDefault();saveName();}} style={{display:"flex",gap:"6px",alignItems:"center"}}>
                <input value={customName} onChange={e=>setCustomName(e.target.value)} placeholder="Your name…" autoFocus style={{...inputStyle,width:"130px",padding:"6px 10px",fontSize:"14px",marginBottom:0}}/>
                <button type="submit" style={{background:"none",border:"none",color:"#27ae60",fontSize:"16px",cursor:"pointer"}}>✅</button>
              </form>
            ):(
              <div style={{fontSize:"22px",fontWeight:"700",letterSpacing:"-0.5px",color:theme.text}}>
                {customName?`${customName}'s `:"Your "}<span style={{fontStyle:"italic",fontWeight:"300",color:theme.subtext}}>stats</span>
                <button onClick={()=>setIsEditingName(true)} style={{background:"none",border:"none",cursor:"pointer",marginLeft:"6px",fontSize:"13px"}}>✏️</button>
              </div>
            )}
            <select value={statYearFilter} onChange={e=>setStatYearFilter(e.target.value)} style={{background:"none",border:"none",color:"#3498db",fontWeight:"600",fontSize:"11px",cursor:"pointer",outline:"none",marginTop:"4px"}}>
              {availableYears.map(y=><option key={y} value={y}>{y==="All"?"All time":y}</option>)}
            </select>
          </div>
          <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:"5px"}}>
            <button onClick={()=>setActiveTab("queue")} style={{display:"flex",alignItems:"center",gap:"5px",fontSize:"10px",fontWeight:"600",padding:"5px 11px",borderRadius:"20px",border:`1px solid ${theme.border2}`,background:"none",color:theme.subtext2,cursor:"pointer"}}>
              <span style={{width:"5px",height:"5px",borderRadius:"50%",background:"#4fc3f7",flexShrink:0}}/>{stats.active} active
            </button>
            <button onClick={()=>setActiveTab("queue")} style={{display:"flex",alignItems:"center",gap:"5px",fontSize:"10px",fontWeight:"600",padding:"5px 11px",borderRadius:"20px",border:`1px solid ${theme.border2}`,background:"none",color:theme.subtext2,cursor:"pointer"}}>
              <span style={{width:"5px",height:"5px",borderRadius:"50%",background:"#ce93d8",flexShrink:0}}/>{stats.queue} queued
            </button>
          </div>
        </div>

        {/* 2x2 category grid */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px",marginBottom:"8px"}}>
          {Object.entries(CATEGORIES).map(([cat,def])=>{
            const s=stats[cat]||{total:0,loved:0,liked:0,meh:0,no:0};const tot=s.total||1;
            return (
              <div key={cat} onClick={()=>{setFilterCat(cat);setVerdictFilter("");setHistoryView("grid");setActiveTab("history");}} style={{background:theme.card,border:`1px solid ${theme.border}`,borderRadius:"16px",padding:"14px 12px 12px",cursor:"pointer",display:"flex",flexDirection:"column",gap:"6px",position:"relative",overflow:"hidden"}}>
                <div style={{position:"absolute",top:0,left:"15%",right:"15%",height:"1px",background:`linear-gradient(90deg,transparent,${def.color},transparent)`,opacity:0.7}}/>
                <div style={{display:"flex",alignItems:"center",gap:"5px"}}>
                  <span style={{fontSize:"14px"}}>{def.icon}</span>
                  <span style={{fontSize:"10px",fontWeight:"700",letterSpacing:"0.08em",textTransform:"uppercase",color:def.color}}>{cat}</span>
                </div>
                <div style={{fontSize:"28px",fontWeight:"800",lineHeight:1,letterSpacing:"-1px",color:theme.text}}>{s.total}</div>
                <div style={{width:"100%",height:"3px",borderRadius:"3px",display:"flex",gap:"1px",overflow:"hidden"}}>
                  {s.loved>0&&<div style={{width:`${(s.loved/tot)*100}%`,background:"#f1c40f",borderRadius:"2px"}}/>}
                  {s.liked>0&&<div style={{width:`${(s.liked/tot)*100}%`,background:"#4caf50",borderRadius:"2px"}}/>}
                  {s.meh>0&&<div style={{width:`${(s.meh/tot)*100}%`,background:"#ff9800",borderRadius:"2px"}}/>}
                  {s.no>0&&<div style={{width:`${(s.no/tot)*100}%`,background:"#e74c3c",borderRadius:"2px"}}/>}
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"2px 4px"}}>
                  {[{val:s.loved,color:"#f1c40f",label:"I loved it"},{val:s.liked,color:"#4caf50",label:"I liked it"},{val:s.meh,color:"#ff9800",label:"Meh"},{val:s.no,color:"#e74c3c",label:"I didn't like it"}].map((item,idx)=>(
                    <div key={idx} onClick={e=>{e.stopPropagation();setFilterCat(cat);setVerdictFilter(item.label);setHistoryView("grid");setActiveTab("history");}} style={{display:"flex",alignItems:"center",gap:"3px",fontSize:"9px",color:theme.subtext2,cursor:"pointer",padding:"2px 3px",borderRadius:"4px"}}>
                      <span style={{width:"5px",height:"5px",borderRadius:"50%",background:item.color,flexShrink:0}}/>{item.val}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <button onClick={()=>setInsightsOpen(v=>!v)} style={{width:"100%",background:"none",border:`1px solid ${theme.border}`,borderRadius:"10px",padding:"9px 14px",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",color:theme.subtext,fontSize:"10px",fontWeight:"700",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:insightsOpen?"10px":"0"}}>
          <span>✦ Insights</span>
          <span style={{fontSize:"13px",display:"inline-block",transition:"transform 0.3s",transform:insightsOpen?"rotate(180deg)":"rotate(0deg)"}}>⌄</span>
        </button>

        {insightsOpen&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px"}}>
            <div style={{...icBase,background:darkMode?"#090f18":"#f0f6ff",border:`1px solid ${darkMode?"rgba(52,152,219,0.15)":"rgba(52,152,219,0.2)"}`}}>
              <div style={{fontSize:"15px",marginBottom:"8px"}}>🎯</div>
              <div style={{fontSize:"24px",fontWeight:"800",letterSpacing:"-0.5px",lineHeight:1}}>{hitRate}%</div>
              <div style={{fontSize:"9px",color:theme.subtext,fontWeight:"700",textTransform:"uppercase",letterSpacing:"0.1em",marginTop:"3px"}}>Hit rate</div>
              <div style={{height:"3px",background:darkMode?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.06)",borderRadius:"3px",overflow:"hidden",margin:"10px 0 5px"}}>
                <div style={{height:"100%",width:`${hitRate}%`,borderRadius:"3px",background:"linear-gradient(90deg,#4caf50,#f1c40f)",transition:"width 0.8s ease"}}/>
              </div>
              <div style={{fontSize:"9px",color:darkMode?"#2a4a6a":"#aac4e0"}}>loved or liked</div>
            </div>
            <div style={icBase}>
              <div style={{fontSize:"15px",marginBottom:"8px"}}>🏆</div>
              {topCreator?(<><div style={{fontSize:"13px",fontWeight:"700",color:theme.text,lineHeight:"1.3"}}>{topCreator.name}</div><div style={{fontSize:"9px",color:theme.subtext,fontWeight:"600",textTransform:"uppercase",letterSpacing:"0.08em",marginTop:"4px"}}>Top creator · {topCreator.count}</div></>):<div style={{fontSize:"11px",color:theme.subtext}}>Log more to see</div>}
            </div>
            {topGenres.length>0&&(
              <div style={{...icBase,gridColumn:"1 / -1"}}>
                <div style={{fontSize:"15px",marginBottom:"6px"}}>🎭</div>
                <div style={{fontSize:"13px",fontWeight:"700",marginBottom:"10px"}}>Top genres</div>
                <div style={{display:"flex",flexDirection:"column",gap:"7px"}}>
                  {topGenres.map(([g,c],i)=>(
                    <div key={g} style={{display:"flex",alignItems:"center",gap:"8px",fontSize:"10px"}}>
                      <div style={{width:"60px",color:theme.subtext,flexShrink:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{g}</div>
                      <div style={{flex:1,height:"2px",background:darkMode?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.06)",borderRadius:"2px",overflow:"hidden"}}><div style={{height:"100%",width:`${(c/maxGenre)*100}%`,background:genreColors[i],borderRadius:"2px"}}/></div>
                      <div style={{width:"12px",textAlign:"right",color:theme.subtext,fontSize:"9px",flexShrink:0}}>{c}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {topMonth&&(
              <div style={{...icBase,gridColumn:"1 / -1"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                  <div>
                    <div style={{fontSize:"15px",marginBottom:"4px"}}>📅</div>
                    <div style={{fontSize:"15px",fontWeight:"700"}}>{topMonth[0]}</div>
                    <div style={{fontSize:"9px",color:theme.subtext,fontWeight:"600",textTransform:"uppercase",letterSpacing:"0.08em",marginTop:"3px"}}>Most active month</div>
                  </div>
                  <div style={{fontSize:"36px",fontWeight:"800",color:darkMode?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.05)",lineHeight:1,letterSpacing:"-2px"}}>{topMonth[1]}</div>
                </div>
                <div style={{display:"flex",alignItems:"flex-end",gap:"3px",height:"28px",marginTop:"12px"}}>
                  {last12.map((m,i)=><div key={i} style={{flex:1,borderRadius:"2px 2px 0 0",background:m.key===topMonth[0]?"#3498db":(darkMode?"rgba(255,255,255,0.07)":"rgba(0,0,0,0.07)"),height:`${Math.max(4,(m.count/maxMonth)*100)}%`,minHeight:"3px"}}/>)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // ════════════════════════════════════════════
  // TAB: QUEUE
  // ════════════════════════════════════════════
  const renderQueue = () => (
    <div style={{padding:"20px 16px 100px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"20px"}}>
        <div>
          <h1 style={{fontSize:"22px",fontWeight:"700",letterSpacing:"-0.5px",margin:0,color:theme.text}}>Queue</h1>
          <p style={{fontSize:"12px",color:theme.subtext,margin:"3px 0 0"}}>What you're into and what's next</p>
        </div>
      </div>
      <div style={{display:"flex",gap:"6px",marginBottom:"20px",overflowX:"auto",paddingBottom:"4px"}}>
        {["All","Read","Watched","Listened"].map(f=>{
          const def=CATEGORIES[f];const active=queueFilter===f;
          return <button key={f} onClick={()=>setQueueFilter(f)} style={{flexShrink:0,padding:"5px 12px",borderRadius:"20px",border:`1px solid ${active?(def?.color||theme.border2):theme.border}`,background:active?(darkMode?`${def?.color||"#fff"}18`:`${def?.color||"#000"}10`):"none",color:active?(def?.color||theme.text):theme.subtext,fontSize:"11px",fontWeight:"600",cursor:"pointer"}}>{def?`${def.icon} ${f}`:"All"}</button>;
        })}
      </div>
      {filteredQueue.length===0?(
        <div style={{textAlign:"center",padding:"60px 20px",color:theme.subtext}}>
          <div style={{fontSize:"40px",marginBottom:"12px"}}>⏳</div>
          <div style={{fontSize:"16px",fontWeight:"600",color:theme.text,marginBottom:"6px"}}>Your queue is empty</div>
          <div style={{fontSize:"13px",marginBottom:"20px"}}>Add something you want to read, watch or listen to</div>
          <button onClick={()=>setActiveTab("log")} style={{padding:"12px 24px",borderRadius:"12px",border:"none",background:darkMode?"#fff":"#111",color:darkMode?"#000":"#fff",fontWeight:"600",cursor:"pointer"}}>Add to queue →</button>
        </div>
      ):(
        <div style={{display:"flex",flexDirection:"column",gap:"10px"}}>
          {filteredQueue.map((log,i)=>(
            <div key={log.id} ref={(savedEntryId==="latest"&&i===0)||savedEntryId===log.id?savedEntryRef:null}>
              <QueueCard log={log} theme={theme} darkMode={darkMode} getVerdictStyle={getVerdictStyle} onEdit={()=>startEdit(log)} onDelete={()=>deleteLog(log.id)}/>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ════════════════════════════════════════════
  // LOADING & MAIN RENDER
  // ════════════════════════════════════════════
  if (loading) return <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",background:theme.bg,color:theme.subtext,fontSize:"14px"}}>Loading…</div>;

  const tabs=[{id:"stats",icon:"📊",label:"Stats"},{id:"log",icon:"＋",label:"Log"},{id:"history",icon:"📚",label:"History"},{id:"queue",icon:"⏳",label:"Queue"}];

  return (
    <div style={{maxWidth:"500px",margin:"0 auto",backgroundColor:theme.bg,color:theme.text,minHeight:"100vh",fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",position:"relative"}}>

      {/* HEADER */}
      <div style={{padding:"14px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:`1px solid ${theme.border}`}}>
        <div style={{fontSize:"17px",fontWeight:"800",letterSpacing:"-0.5px",color:theme.text}}>🤔 Did I Like It?</div>
        <div style={{display:"flex",gap:"8px",alignItems:"center"}}>
          <button onClick={()=>setShowAbout(true)} style={{background:"none",border:`1px solid ${theme.border}`,color:theme.subtext2,fontSize:"11px",fontWeight:"600",padding:"5px 11px",borderRadius:"20px",cursor:"pointer"}}>About</button>
          <button onClick={()=>setShowSettings(true)} style={{background:"none",border:`1px solid ${theme.border}`,color:theme.subtext2,fontSize:"17px",width:"32px",height:"32px",borderRadius:"50%",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",transition:"transform 0.3s"}} onMouseEnter={e=>e.currentTarget.style.transform="rotate(45deg)"} onMouseLeave={e=>e.currentTarget.style.transform="rotate(0deg)"}>⚙️</button>
        </div>
      </div>

      {/* CONTENT */}
      <div>
        {activeTab==="stats"&&renderStats()}
        {activeTab==="log"&&renderLog()}
        {activeTab==="history"&&renderHistory()}
        {activeTab==="queue"&&renderQueue()}
      </div>

      {/* TAB BAR */}
      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:"500px",background:theme.tabBar,borderTop:`1px solid ${theme.border}`,display:"flex",zIndex:100,paddingBottom:"env(safe-area-inset-bottom)"}}>
        {tabs.map(tab=>{
          const active=activeTab===tab.id;
          return <button key={tab.id} onClick={()=>setActiveTab(tab.id)} style={{flex:1,padding:"10px 0 8px",background:"none",border:"none",display:"flex",flexDirection:"column",alignItems:"center",gap:"3px",cursor:"pointer",position:"relative"}}>
            {active&&<div style={{position:"absolute",top:0,left:"30%",right:"30%",height:"2px",background:"#3498db",borderRadius:"0 0 2px 2px"}}/>}
            <span style={{fontSize:tab.id==="log"?"20px":"18px",lineHeight:1,filter:active?"none":"grayscale(1) opacity(0.4)"}}>{tab.icon}</span>
            <span style={{fontSize:"10px",fontWeight:active?"700":"500",color:active?"#3498db":theme.subtext,letterSpacing:"0.02em"}}>{tab.label}</span>
          </button>;
        })}
      </div>

      {/* COLLECTION MODAL */}
      {showCollModal&&(
        <div onClick={()=>setShowCollModal(false)} style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.6)",zIndex:200,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
          <div onClick={e=>e.stopPropagation()} style={{background:theme.card,borderRadius:"20px 20px 0 0",width:"100%",maxWidth:"500px",padding:"20px 20px 40px",border:`1px solid ${theme.border2}`}}>
            <div style={{width:"36px",height:"4px",background:theme.border2,borderRadius:"2px",margin:"0 auto 20px"}}/>
            <div style={{fontSize:"16px",fontWeight:"700",marginBottom:"16px",color:theme.text}}>{editingColl?"Edit Collection":"New Collection"}</div>
            <label style={{fontSize:"10px",fontWeight:"700",color:theme.subtext,letterSpacing:"0.08em",textTransform:"uppercase",display:"block",marginBottom:"8px"}}>Icon</label>
            <div style={{display:"flex",flexWrap:"wrap",gap:"6px",marginBottom:"16px"}}>
              {COLL_EMOJIS.map(em=><button key={em} onClick={()=>setCollEmoji(em)} style={{width:"36px",height:"36px",borderRadius:"8px",border:`2px solid ${collEmoji===em?theme.border2:"transparent"}`,background:collEmoji===em?(darkMode?"rgba(255,255,255,0.08)":"rgba(0,0,0,0.06)"):"none",fontSize:"18px",cursor:"pointer"}}>{em}</button>)}
            </div>
            <input placeholder="Collection name (e.g. Japan 2024, WWE PPVs…)" value={collName} onChange={e=>setCollName(e.target.value)} style={inputStyle} autoFocus/>
            <textarea placeholder="Description (optional)" value={collDesc} onChange={e=>setCollDesc(e.target.value)} style={{...inputStyle,height:"60px",resize:"none",overflow:"hidden"}}/>
            <button onClick={saveCollection} disabled={!collName.trim()} style={{width:"100%",padding:"13px",borderRadius:"12px",border:"none",background:darkMode?"#fff":"#111",color:darkMode?"#000":"#fff",fontWeight:"700",fontSize:"14px",cursor:"pointer",opacity:!collName.trim()?0.4:1}}>
              {editingColl?"Save changes":"Create Collection"}
            </button>
          </div>
        </div>
      )}

      {/* AUTH MODAL */}
      {showAuthModal&&(
        <div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.85)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:"20px"}}>
          <div style={{background:theme.card,padding:"28px",borderRadius:"20px",width:"100%",maxWidth:"340px",border:`1px solid ${theme.border2}`}}>
            <h3 style={{textAlign:"center",marginBottom:"8px",fontSize:"18px",fontWeight:"700"}}>{isSignUp?"Create account":"Welcome back"}</h3>
            {authMsg&&<div style={{padding:"10px",background:"#27ae60",color:"#fff",borderRadius:"8px",fontSize:"12px",marginBottom:"14px",textAlign:"center"}}>{authMsg}</div>}
            <p style={{fontSize:"11px",textAlign:"center",color:theme.subtext,marginBottom:"18px"}}>{logs.length>0&&!user?"Your guest entries will sync on login.":"Access your logs anywhere."}</p>
            <button onClick={()=>supabase.auth.signInWithOAuth({provider:"google"})} style={{width:"100%",padding:"12px",borderRadius:"10px",border:"none",background:"#fff",color:"#000",fontWeight:"600",cursor:"pointer",marginBottom:"16px",fontSize:"14px"}}>Continue with Google</button>
            <form onSubmit={handleAuth}>
              <input name="email" type="email" placeholder="Email" required style={inputStyle}/>
              <input name="password" type="password" placeholder="Password" required style={inputStyle}/>
              <button type="submit" style={{width:"100%",padding:"12px",borderRadius:"10px",border:"none",background:"#3498db",color:"#fff",fontWeight:"600",cursor:"pointer",fontSize:"14px"}}>{isSignUp?"Sign up":"Login"}</button>
            </form>
            {!isSignUp&&<button onClick={handleForgotPassword} style={{background:"none",border:"none",color:"#3498db",cursor:"pointer",fontSize:"12px",display:"block",margin:"10px auto 0",fontWeight:"600"}}>Forgot password?</button>}
            <button onClick={()=>{setIsSignUp(v=>!v);setAuthMsg("");}} style={{background:"none",border:"none",color:"#3498db",cursor:"pointer",fontSize:"12px",display:"block",margin:"12px auto 0",fontWeight:"600"}}>{isSignUp?"Already have an account? Login":"Need an account? Sign up"}</button>
            <button onClick={()=>setShowAuthModal(false)} style={{background:"none",border:"none",color:theme.subtext,cursor:"pointer",fontSize:"12px",display:"block",margin:"12px auto 0"}}>Close</button>
          </div>
        </div>
      )}

      {/* SETTINGS MODAL */}
      {showSettings&&(
        <div onClick={()=>setShowSettings(false)} style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.6)",zIndex:200,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
          <div onClick={e=>e.stopPropagation()} style={{background:theme.card,borderRadius:"20px 20px 0 0",width:"100%",maxWidth:"500px",padding:"20px 20px 40px",border:`1px solid ${theme.border2}`}}>
            <div style={{width:"36px",height:"4px",background:theme.border2,borderRadius:"2px",margin:"0 auto 20px"}}/>
            <div style={{fontSize:"16px",fontWeight:"700",marginBottom:"20px",color:theme.text}}>Settings</div>
            {[
              {label:"Appearance",sub:darkMode?"Dark mode":"Light mode",right:<button onClick={()=>setDarkMode(v=>!v)} style={{background:darkMode?"#3498db":"rgba(0,0,0,0.1)",border:"none",borderRadius:"20px",width:"48px",height:"26px",cursor:"pointer",position:"relative",transition:"background 0.2s",flexShrink:0}}><div style={{position:"absolute",top:"3px",left:darkMode?"24px":"3px",width:"20px",height:"20px",borderRadius:"50%",background:"#fff",transition:"left 0.2s",boxShadow:"0 1px 4px rgba(0,0,0,0.3)"}}/></button>},
              {label:user?"Account":"Sync your data",sub:user?`Logged in as ${user.email}`:"Log in to sync across devices",right:user?<button onClick={()=>{supabase.auth.signOut();setShowSettings(false);}} style={{padding:"7px 14px",borderRadius:"20px",border:`1px solid ${theme.border2}`,background:"none",color:theme.text,fontSize:"12px",fontWeight:"600",cursor:"pointer",flexShrink:0}}>Logout</button>:<button onClick={()=>{setShowSettings(false);setShowAuthModal(true);setAuthMsg("");}} style={{padding:"7px 14px",borderRadius:"20px",border:"1px solid #3498db",background:"none",color:"#3498db",fontSize:"12px",fontWeight:"600",cursor:"pointer",flexShrink:0}}>Login ☁️</button>},
              {label:"Export data",sub:"Download all logs as CSV",right:<button onClick={()=>{exportCSV();setShowSettings(false);}} style={{padding:"7px 14px",borderRadius:"20px",border:`1px solid ${theme.border2}`,background:"none",color:"#27ae60",fontSize:"12px",fontWeight:"600",cursor:"pointer",flexShrink:0}}>Export 📥</button>},
              {label:"Delete account",sub:"Permanently delete all your data",labelColor:"#e74c3c",right:<button onClick={()=>{setShowSettings(false);handleDeleteAccount();}} style={{padding:"7px 14px",borderRadius:"20px",border:"1px solid #e74c3c",background:"none",color:"#e74c3c",fontSize:"12px",fontWeight:"600",cursor:"pointer",flexShrink:0}}>Delete ⚠️</button>},
            ].map((row,i,arr)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 0",borderBottom:i<arr.length-1?`1px solid ${theme.border}`:"none"}}>
                <div><div style={{fontSize:"14px",fontWeight:"600",color:row.labelColor||theme.text}}>{row.label}</div><div style={{fontSize:"11px",color:theme.subtext,marginTop:"2px"}}>{row.sub}</div></div>
                {row.right}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ABOUT MODAL */}
      {showAbout&&(
        <div onClick={()=>setShowAbout(false)} style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.6)",zIndex:200,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
          <div onClick={e=>e.stopPropagation()} style={{background:theme.card,borderRadius:"20px 20px 0 0",width:"100%",maxWidth:"500px",padding:"20px 20px 40px",border:`1px solid ${theme.border2}`}}>
            <div style={{width:"36px",height:"4px",background:theme.border2,borderRadius:"2px",margin:"0 auto 20px"}}/>
            <div style={{fontSize:"16px",fontWeight:"700",marginBottom:"14px",color:theme.text}}>About</div>
            <p style={{fontSize:"13px",color:theme.subtext2,lineHeight:"1.7",margin:0}}><b style={{color:theme.text}}>Did you like it?</b><br/><br/>Use this app to track everything you've watched, read, listened to or experienced. Log books, films, albums, gigs, restaurants, galleries and more — all in one place.</p>
            <button onClick={()=>setShowAbout(false)} style={{marginTop:"20px",width:"100%",padding:"12px",borderRadius:"12px",border:`1px solid ${theme.border2}`,background:"none",color:theme.text,fontSize:"14px",fontWeight:"600",cursor:"pointer"}}>Close</button>
          </div>
        </div>
      )}

      {/* UNDO TOAST */}
      {undoItem&&(
        <div style={{position:"fixed",bottom:"80px",left:"50%",transform:"translateX(-50%)",background:darkMode?"#1a1a1a":"#222",color:"#fff",padding:"12px 16px",borderRadius:"14px",display:"flex",alignItems:"center",gap:"12px",zIndex:150,boxShadow:"0 4px 20px rgba(0,0,0,0.4)",fontSize:"13px",fontWeight:"500",whiteSpace:"nowrap"}}>
          <span>Deleted <b>{undoItem.title}</b></span>
          <button onClick={undoDelete} style={{background:"#3498db",border:"none",color:"#fff",padding:"5px 12px",borderRadius:"8px",cursor:"pointer",fontSize:"12px",fontWeight:"700"}}>Undo</button>
        </div>
      )}
    </div>
  );
}
