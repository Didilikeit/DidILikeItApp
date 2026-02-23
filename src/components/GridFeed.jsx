import React, { useState, useEffect } from "react";
import { getSubtypeStyle, generateCoverGradient } from "../utils/helpers.js";
import { VERDICT_PILL_STYLE } from "./EditorialCard.jsx";

// ─── FONTS (same as editorial) ────────────────────────────────────────────────
if (!document.getElementById("editorial-fonts")) {
  const link = document.createElement("link");
  link.id = "editorial-fonts";
  link.rel = "stylesheet";
  link.href = "https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Unbounded:wght@300;400;700;900&display=swap";
  document.head.appendChild(link);
}

const VERDICT_BAND = v => ({
  "I loved it":       "linear-gradient(to bottom,#f1c40f,#e67e22)",
  "I liked it":       "linear-gradient(to bottom,#81c784,#4caf50)",
  "Meh":              "linear-gradient(to bottom,#ffb74d,#ff9800)",
  "I didn't like it": "linear-gradient(to bottom,#e57373,#e74c3c)",
  "Want to go":       "linear-gradient(to bottom,#ce93d8,#9b59b6)",
  "Currently reading":"linear-gradient(to bottom,#64b5f6,#1565c0)",
  "Currently watching":"linear-gradient(to bottom,#64b5f6,#1565c0)",
  "Currently listening":"linear-gradient(to bottom,#64b5f6,#1565c0)",
}[v] || "linear-gradient(to bottom,rgba(255,255,255,0.15),rgba(255,255,255,0.04))");

const loggedOnLabel = (log) => {
  if (!log.logged_at) return null;
  const d = new Date(log.logged_at);
  const dateStr = d.toLocaleDateString("en-GB", { day:"numeric", month:"short", year:"numeric" });
  const cat = getSubtypeStyle(log.media_type)?.cat || "";
  const verb = cat==="Read"?"Read on":cat==="Watched"?"Watched on":cat==="Listened"?"Listened on":cat==="Experienced"?"Went on":"Logged";
  return `${verb} ${dateStr}`;
};

// ─── ARTWORK TILE ─────────────────────────────────────────────────────────────
const ArtworkTile = ({ log }) => {
  const [err, setErr] = useState(false);
  const ss = getSubtypeStyle(log.media_type);
  const { color1, color2 } = generateCoverGradient(log.title || "");
  if (log.artwork && !err) {
    return (
      <img src={log.artwork} alt="" onError={() => setErr(true)}
        style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover" }}/>
    );
  }
  return (
    <div style={{ position:"absolute", inset:0, background:`linear-gradient(145deg,${color1},${color2})`,
      display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:4 }}>
      <span style={{ fontSize:22, opacity:0.5 }}>{ss.icon}</span>
    </div>
  );
};

// ─── EXPAND PANEL ─────────────────────────────────────────────────────────────
const ExpandPanel = ({ log, darkMode, onClose, onEdit, onDelete, onNotesUpdate }) => {
  const vp = VERDICT_PILL_STYLE(log.verdict);
  const ss = getSubtypeStyle(log.media_type);
  const { color1, color2 } = generateCoverGradient(log.title || "");
  const [imgErr, setImgErr] = useState(false);
  const [localNotes, setLocalNotes] = useState(log.notes || "");
  const [editing, setEditing] = useState(false);
  const handleSave = () => { onNotesUpdate?.(log.id, localNotes); setEditing(false); };
  useEffect(() => { setLocalNotes(log.notes || ""); }, [log.notes]);

  return (
    <div style={{ position:"fixed", inset:0, zIndex:400, display:"flex", alignItems:"flex-end" }}
      onClick={onClose}>
      <style>{`
        @keyframes gridPanelUp { from { transform:translateY(100%); opacity:0 } to { transform:translateY(0); opacity:1 } }
        @keyframes gridScrimIn { from { opacity:0 } to { opacity:1 } }
      `}</style>

      {/* Scrim */}
      <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.75)",
        backdropFilter:"blur(14px)", WebkitBackdropFilter:"blur(14px)",
        animation:"gridScrimIn 0.25s ease" }}/>

      {/* Sheet */}
      <div onClick={e => e.stopPropagation()}
        style={{ position:"relative", width:"100%", maxHeight:"92vh",
          background:"#080808", borderRadius:"20px 20px 0 0",
          border:"1px solid rgba(255,255,255,0.08)", borderBottom:"none",
          overflow:"hidden", display:"flex", flexDirection:"column",
          animation:"gridPanelUp 0.32s cubic-bezier(0.32,0.72,0,1)",
          boxShadow:"0 -20px 60px rgba(0,0,0,0.8)" }}>

        {/* Hero strip */}
        <div style={{ height:200, position:"relative", flexShrink:0, overflow:"hidden" }}>
          {log.artwork && !imgErr
            ? <img src={log.artwork} alt="" onError={() => setImgErr(true)}
                style={{ width:"100%", height:"100%", objectFit:"cover",
                  filter:"brightness(0.45) saturate(0.65)" }}/>
            : <div style={{ width:"100%", height:"100%",
                background:`linear-gradient(145deg,${color1},${color2})`,
                display:"flex", alignItems:"center", justifyContent:"center" }}>
                <span style={{ fontSize:72, opacity:0.2 }}>{ss.icon}</span>
              </div>
          }
          {/* Gradient overlay */}
          <div style={{ position:"absolute", inset:0,
            background:"linear-gradient(to bottom,rgba(8,8,8,0) 0%,rgba(8,8,8,0.85) 70%,rgba(8,8,8,1) 100%)" }}/>
          {/* Verdict stripe */}
          <div style={{ position:"absolute", top:0, left:0, bottom:0, width:3,
            background:VERDICT_BAND(log.verdict) }}/>
          {/* Close button */}
          <button onClick={onClose}
            style={{ position:"absolute", top:14, right:14, width:32, height:32,
              borderRadius:"50%", background:"rgba(0,0,0,0.55)", backdropFilter:"blur(8px)",
              border:"1px solid rgba(255,255,255,0.12)", color:"rgba(255,255,255,0.6)",
              fontSize:16, cursor:"pointer", display:"flex", alignItems:"center",
              justifyContent:"center" }}>✕</button>
          {/* Dots menu */}
          <button onClick={() => { onClose(); onEdit(log); }}
            style={{ position:"absolute", top:14, right:54, width:32, height:32,
              borderRadius:"50%", background:"rgba(0,0,0,0.55)", backdropFilter:"blur(8px)",
              border:"1px solid rgba(255,255,255,0.12)", color:"rgba(255,255,255,0.4)",
              fontSize:12, cursor:"pointer", display:"flex", alignItems:"center",
              justifyContent:"center", letterSpacing:"1px" }}>···</button>
          {/* Title overlay */}
          <div style={{ position:"absolute", bottom:0, left:0, right:0, padding:"0 18px 16px" }}>
            <div style={{ fontFamily:"'Unbounded',sans-serif", fontSize:7, letterSpacing:"0.2em",
              color:"rgba(255,255,255,0.3)", marginBottom:6, textTransform:"uppercase" }}>
              {ss.icon} {log.media_type}{log.creator ? ` · ${log.creator}` : ""}
            </div>
            <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:26, color:"#fff",
              lineHeight:1.05, letterSpacing:"-0.5px" }}>
              {log.title}
            </div>
          </div>
        </div>

        {/* Meta row */}
        <div style={{ padding:"12px 18px 12px", display:"flex", alignItems:"center", gap:10,
          borderBottom:"1px solid rgba(255,255,255,0.06)", flexShrink:0 }}>
          <div style={{ padding:"4px 10px", borderRadius:3, border:`1px solid ${vp.border}`,
            background:vp.bg, fontFamily:"'Unbounded',sans-serif", fontSize:8,
            fontWeight:700, letterSpacing:"0.1em", color:vp.color }}>
            {vp.label}
          </div>
          {loggedOnLabel(log) && (
            <div style={{ fontFamily:"'Unbounded',sans-serif", fontSize:8,
              color:"rgba(255,255,255,0.2)", letterSpacing:"0.08em" }}>
              {loggedOnLabel(log)}
            </div>
          )}
          <div style={{ flex:1 }}/>
          <button onClick={() => { if(window.confirm(`Delete "${log.title}"?`)) { onDelete(log.id); onClose(); } }}
            style={{ background:"none", border:"none", color:"rgba(231,76,60,0.5)",
              fontSize:14, cursor:"pointer", padding:"4px" }}>🗑</button>
        </div>

        {/* Notes body */}
        <div style={{ flex:1, overflowY:"auto", WebkitOverflowScrolling:"touch" }}>
          {editing ? (
            <textarea value={localNotes} onChange={e => setLocalNotes(e.target.value)} autoFocus
              style={{ width:"100%", height:"100%", minHeight:160, background:"none", border:"none",
                padding:"16px 18px", fontFamily:"'DM Serif Display',serif", fontStyle:"italic",
                fontSize:15, color:"rgba(255,255,255,0.85)", lineHeight:1.9, resize:"none",
                outline:"none", boxSizing:"border-box" }}/>
          ) : (
            <div style={{ padding:"16px 18px 32px" }}>
              {log.notes
                ? <div style={{ fontFamily:"'DM Serif Display',serif", fontStyle:"italic",
                    fontSize:15, color:"rgba(255,255,255,0.65)", lineHeight:1.9,
                    whiteSpace:"pre-wrap", wordBreak:"break-word" }}>
                    {log.notes}
                  </div>
                : <div style={{ fontFamily:"'Unbounded',sans-serif", fontSize:8,
                    color:"rgba(255,255,255,0.12)", letterSpacing:"0.15em",
                    textAlign:"center", paddingTop:20 }}>
                    NO NOTES YET
                  </div>
              }
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div style={{ padding:"10px 18px 24px", borderTop:"1px solid rgba(255,255,255,0.06)",
          display:"flex", gap:8, flexShrink:0 }}>
          {editing ? (
            <>
              <button onClick={handleSave}
                style={{ flex:1, padding:"10px", borderRadius:8, border:"none",
                  background:"rgba(255,255,255,0.1)", color:"#fff",
                  fontFamily:"'Unbounded',sans-serif", fontSize:8, letterSpacing:"0.1em",
                  cursor:"pointer" }}>SAVE</button>
              <button onClick={() => { setLocalNotes(log.notes||""); setEditing(false); }}
                style={{ flex:1, padding:"10px", borderRadius:8,
                  border:"1px solid rgba(255,255,255,0.07)", background:"none",
                  color:"rgba(255,255,255,0.3)", fontFamily:"'Unbounded',sans-serif",
                  fontSize:8, letterSpacing:"0.1em", cursor:"pointer" }}>CANCEL</button>
            </>
          ) : (
            <>
              <button onClick={() => setEditing(true)}
                style={{ flex:1, padding:"10px", borderRadius:8,
                  border:"1px solid rgba(255,255,255,0.07)", background:"none",
                  color:"rgba(255,255,255,0.3)", fontFamily:"'Unbounded',sans-serif",
                  fontSize:8, letterSpacing:"0.1em", cursor:"pointer" }}>✏ EDIT NOTES</button>
              <button onClick={onClose}
                style={{ flex:1, padding:"10px", borderRadius:8,
                  border:"1px solid rgba(255,255,255,0.07)", background:"none",
                  color:"rgba(255,255,255,0.3)", fontFamily:"'Unbounded',sans-serif",
                  fontSize:8, letterSpacing:"0.1em", cursor:"pointer" }}>← BACK</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── GRID FEED ────────────────────────────────────────────────────────────────
export const GridFeed = ({ logs, darkMode, onEdit, onDelete, onNotesUpdate, searchTerm = "" }) => {
  const [selected, setSelected] = useState(null);
  const GAP = 2;

  if (!logs.length) return null;

  // Keep selected in sync if logs change (e.g. after note update)
  useEffect(() => {
    if (selected) {
      const updated = logs.find(l => l.id === selected.id);
      if (updated) setSelected(updated);
      else setSelected(null);
    }
  }, [logs]);

  return (
    <>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:GAP, padding:GAP }}>
        {logs.map(log => {
          const vp = VERDICT_PILL_STYLE(log.verdict);
          const ss = getSubtypeStyle(log.media_type);
          return (
            <div key={log.id}
              onClick={() => setSelected(log)}
              style={{ position:"relative", aspectRatio:"1", cursor:"pointer",
                borderRadius:3, overflow:"hidden", background:"#0f0f0f" }}>

              {/* Artwork */}
              <ArtworkTile log={log}/>

              {/* Bottom gradient */}
              <div style={{ position:"absolute", inset:0,
                background:"linear-gradient(to bottom,transparent 30%,rgba(0,0,0,0.92) 100%)",
                pointerEvents:"none" }}/>

              {/* Verdict stripe — left edge */}
              <div style={{ position:"absolute", top:0, left:0, bottom:0, width:3,
                background:VERDICT_BAND(log.verdict), pointerEvents:"none" }}/>

              {/* Content */}
              <div style={{ position:"absolute", bottom:0, left:0, right:0,
                padding:"0 7px 7px 10px", pointerEvents:"none" }}>
                <div style={{ fontFamily:"'Unbounded',sans-serif", fontSize:6,
                  color:"rgba(255,255,255,0.3)", letterSpacing:"0.12em",
                  textTransform:"uppercase", marginBottom:3, lineHeight:1 }}>
                  {ss.icon} {log.media_type}
                </div>
                <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:11,
                  color:"#fff", lineHeight:1.2, marginBottom:4,
                  display:"-webkit-box", WebkitLineClamp:2,
                  WebkitBoxOrient:"vertical", overflow:"hidden" }}>
                  {log.title}
                </div>
                <div style={{ display:"inline-flex", alignItems:"center", gap:3,
                  padding:"2px 6px", borderRadius:2,
                  background:vp.bg, border:`1px solid ${vp.border}` }}>
                  <div style={{ width:4, height:4, borderRadius:"50%",
                    background:vp.color, flexShrink:0 }}/>
                  <span style={{ fontFamily:"'Unbounded',sans-serif", fontSize:6,
                    fontWeight:700, letterSpacing:"0.06em", color:vp.color }}>
                    {vp.label.split(" ")[1]}
                  </span>
                </div>
              </div>

              {/* Notes indicator */}
              {log.notes && (
                <div style={{ position:"absolute", top:6, right:6, width:5, height:5,
                  borderRadius:"50%", background:"rgba(255,255,255,0.45)",
                  boxShadow:"0 0 5px rgba(255,255,255,0.3)", pointerEvents:"none" }}/>
              )}
            </div>
          );
        })}
      </div>

      {selected && (
        <ExpandPanel
          log={selected}
          darkMode={darkMode}
          onClose={() => setSelected(null)}
          onEdit={onEdit}
          onDelete={(id) => { onDelete(id); setSelected(null); }}
          onNotesUpdate={onNotesUpdate}
        />
      )}
    </>
  );
};

// ─── VIEW TOGGLE BUTTON ───────────────────────────────────────────────────────
// Drop this wherever you need the editorial/grid switcher
export const ViewToggle = ({ view, onChange, theme }) => (
  <div style={{ display:"flex", background: theme?.input || "rgba(255,255,255,0.06)",
    borderRadius:10, padding:3, gap:2,
    border:`1px solid ${theme?.border || "rgba(255,255,255,0.08)"}` }}>
    <button onClick={() => onChange("editorial")}
      title="Editorial view"
      style={{ padding:"6px 10px", borderRadius:7, border:"none", cursor:"pointer",
        background: view==="editorial" ? (theme?.card || "rgba(255,255,255,0.12)") : "none",
        color: view==="editorial" ? (theme?.text || "#fff") : (theme?.subtext || "rgba(255,255,255,0.3)"),
        fontSize:14, transition:"all 0.15s", lineHeight:1 }}>
      ▤
    </button>
    <button onClick={() => onChange("compact")}
      title="Grid view"
      style={{ padding:"6px 10px", borderRadius:7, border:"none", cursor:"pointer",
        background: view==="compact" ? (theme?.card || "rgba(255,255,255,0.12)") : "none",
        color: view==="compact" ? (theme?.text || "#fff") : (theme?.subtext || "rgba(255,255,255,0.3)"),
        fontSize:14, transition:"all 0.15s", lineHeight:1 }}>
      ⊞
    </button>
  </div>
);
