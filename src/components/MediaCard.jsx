import React, { useState } from "react";
import { NotesModal } from "./NotesModal.jsx";
import { MicButton } from "./MicButton.jsx";
import { hl, getSubtypeStyle, generateCoverGradient, collAccent, VERDICT_MAP_COLOR } from "../utils/helpers.js";
import { CATEGORIES } from "../utils/constants.js";

export const MediaCard = ({ log, theme, darkMode, getVerdictStyle, onEdit, onDelete, searchTerm, collection, onMapClick, onNotesUpdate }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const vs = getVerdictStyle(log.verdict);
  const ss = getSubtypeStyle(log.media_type);
  const isExp = ss.cat === "Experienced";
  const isRead = ss.cat === "Read";

  const getNotesPreview = (notes, term) => {
    if (!notes) return null;
    const words = notes.split(/\s+/);
    if (term?.length > 1) {
      const clean = term.replace(/^"|"$/g, "").toLowerCase();
      const nl = notes.toLowerCase();
      const idx = nl.search(new RegExp("(?<![a-z])" + clean.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
      if (idx !== -1) {
        const wb = notes.slice(0, idx).trim() === "" ? 0 : notes.slice(0, idx).trim().split(/\s+/).length;
        const s = Math.max(0, wb - 8), e = Math.min(words.length, wb + 12);
        return `${s > 0 ? "…" : ""}${words.slice(s, e).join(" ")}${e < words.length ? "…" : ""}`;
      }
    }
    return words.slice(0, 30).join(" ") + (words.length > 30 ? "…" : "");
  };

  const ArtworkFallback = () => {
    if (isExp) return (
      <div style={{ width:"100%", height:"100%", background:`linear-gradient(145deg,${ss.color}55,${ss.color}22)`, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:"8px", padding:"12px", textAlign:"center" }}>
        <span style={{ fontSize:"36px" }}>{ss.icon}</span>
        {log.location_venue && <div style={{ color:"rgba(255,255,255,0.9)", fontSize:"clamp(10px,2.5vw,12px)", fontWeight:"600", wordBreak:"break-word" }}>{log.location_venue}</div>}
        {log.location_city  && <div style={{ color:"rgba(255,255,255,0.6)", fontSize:"clamp(9px,2.2vw,11px)" }}>📍 {log.location_city}</div>}
      </div>
    );
    if (isRead) {
      const { color1, color2 } = generateCoverGradient(log.title || "");
      return (
        <div style={{ width:"100%", height:"100%", background:`linear-gradient(145deg,${color1},${color2})`, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"12px", boxSizing:"border-box", textAlign:"center", gap:"8px" }}>
          <div style={{ width:"30px", height:"2px", background:"rgba(255,255,255,0.4)", borderRadius:"2px" }}/>
          <div style={{ color:"#fff", fontSize:"11px", fontWeight:"bold", lineHeight:"1.3", wordBreak:"break-word", textShadow:"0 1px 3px rgba(0,0,0,0.4)", maxHeight:"60%", overflow:"hidden" }}>{log.title}</div>
          <div style={{ width:"20px", height:"1px", background:"rgba(255,255,255,0.3)", borderRadius:"2px" }}/>
          <div style={{ color:"rgba(255,255,255,0.75)", fontSize:"9px", fontStyle:"italic", letterSpacing:"0.05em", wordBreak:"break-word" }}>{log.creator}</div>
          <div style={{ width:"30px", height:"2px", background:"rgba(255,255,255,0.4)", borderRadius:"2px" }}/>
        </div>
      );
    }
    return <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center" }}><span style={{ fontSize:"40px" }}>{ss.icon}</span></div>;
  };

  const pill = (color, bg, border) => ({ color, background: bg, fontSize:"clamp(9px,2.2vw,10px)", fontWeight:"700", padding:"2px 7px", borderRadius:"20px", border:`1px solid ${border}`, letterSpacing:"0.03em", whiteSpace:"nowrap" });

  const MetaHeader = ({ showFlipBtn }) => (
    <div style={{ padding:"10px 10px 8px", display:"flex", flexDirection:"column", gap:"5px" }}>
      <div style={{ display:"flex", gap:"4px", flexWrap:"wrap", alignItems:"center", justifyContent: showFlipBtn ? "space-between" : "flex-start" }}>
        <div style={{ display:"flex", gap:"4px", flexWrap:"wrap" }}>
          <span style={pill(ss.color, "transparent", ss.color)}>{ss.icon} {log.media_type}</span>
          <span style={pill(vs.color, vs.bg, vs.border)}>{vs.emoji} {log.verdict}</span>
          {log.genre && <span style={pill(darkMode?"#aaa":"#555","transparent",darkMode?"#444":"#ccc")}>{log.genre}</span>}
          {collection && <span style={pill(collAccent(collection.name),"transparent",collAccent(collection.name))}>{collection.emoji} {collection.name}</span>}
        </div>
        {showFlipBtn && (
          <button onClick={() => setIsFlipped(false)} style={{ background:"none", border:"none", color:theme.subtext, fontSize:"16px", cursor:"pointer", lineHeight:1, padding:"0 2px" }}>↩</button>
        )}
      </div>
      <div style={{ fontWeight:"700", fontSize:"clamp(13px,3.5vw,15px)", color:theme.text, lineHeight:"1.3", wordBreak:"break-word" }}>{log.title}</div>
      <div style={{ fontSize:"clamp(11px,2.8vw,13px)", color:theme.subtext2 }}>{log.creator}{log.year_released ? ` · ${log.year_released}` : ""}</div>
      {(log.location_venue || log.location_city) && (
        <div style={{ display:"flex", alignItems:"center", gap:"4px" }}>
          <span style={{ fontSize:"clamp(10px,2.5vw,12px)", color:ss.color }}>📍 {[log.location_venue, log.location_city].filter(Boolean).join(", ")}</span>
          {log.lat && log.lng && onMapClick && (
            <button onClick={e => { e.stopPropagation(); onMapClick(log); }} style={{ background:"none", border:`1px solid ${ss.color}44`, borderRadius:"20px", color:ss.color, fontSize:"9px", fontWeight:"700", padding:"1px 6px", cursor:"pointer", whiteSpace:"nowrap" }}>🗺 Map</button>
          )}
        </div>
      )}
      {log.current_page && <div style={{ fontSize:"clamp(10px,2.5vw,12px)", color:theme.subtext }}>📄 Page {log.current_page}</div>}
    </div>
  );

  return (
    <>
      {showNotesModal && (
        <NotesModal
          log={log} theme={theme} darkMode={darkMode}
          onClose={() => setShowNotesModal(false)}
          onSave={text => { onNotesUpdate?.(log.id, text); setShowNotesModal(false); }}
        />
      )}
      <div style={{ perspective:"1000px" }}>
        <div style={{ position:"relative", width:"100%", transformStyle:"preserve-3d", transition:"transform 0.5s ease", transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)" }}>

          {/* ── FRONT ── */}
          <div style={{ backfaceVisibility:"hidden", WebkitBackfaceVisibility:"hidden", background:theme.card, borderRadius:"14px", overflow:"hidden", border:`1px solid ${theme.border}`, display:"flex", flexDirection:"column" }}>
            <MetaHeader showFlipBtn={false} />
            <div style={{ position:"relative", width:"100%", aspectRatio:"2/3", backgroundColor:darkMode?"#111":"#eee", overflow:"hidden" }}>
              {log.artwork ? (
                <>
                  <img
                    src={log.artwork} alt=""
                    style={{ width:"100%", height:"100%", objectFit:"cover" }}
                    onLoad={e => { if (e.target.naturalWidth < 128 && isRead) { e.target.style.display="none"; document.getElementById(`fb-${log.id}`)?.style?.setProperty("display","flex"); } }}
                    onError={e => { e.target.style.display="none"; document.getElementById(`fb-${log.id}`)?.style?.setProperty("display","flex"); }}
                  />
                  <div id={`fb-${log.id}`} style={{ display:"none", position:"absolute", top:0, left:0, width:"100%", height:"100%" }}><ArtworkFallback /></div>
                </>
              ) : <ArtworkFallback />}

              {log.notes && (
                <div
                  onClick={() => setIsFlipped(true)}
                  style={{ position:"absolute", bottom:0, left:0, right:0, background:"linear-gradient(transparent,rgba(0,0,0,0.92) 40%)", padding:"32px 10px 12px", cursor:"pointer" }}
                >
                  <div style={{ fontSize:"9px", fontWeight:"700", color:"rgba(255,255,255,0.5)", letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:"4px" }}>💭 My thoughts</div>
                  <div style={{ fontSize:"clamp(11px,2.8vw,13px)", color:"#fff", lineHeight:"1.5", fontStyle:"italic", display:"-webkit-box", WebkitLineClamp:4, WebkitBoxOrient:"vertical", overflow:"hidden" }}>
                    {hl(getNotesPreview(log.notes, searchTerm), searchTerm)}
                  </div>
                  <div style={{ fontSize:"9px", color:"rgba(255,255,255,0.4)", marginTop:"5px", textAlign:"right" }}>tap to read →</div>
                </div>
              )}
            </div>
            <div style={{ padding:"8px 10px", display:"flex", gap:"5px" }}>
              <button onClick={e => { e.stopPropagation(); onEdit(); }} style={{ flex:1, padding:"5px", borderRadius:"8px", border:`1px solid ${theme.border}`, background:"none", color:"#3498db", fontSize:"11px", fontWeight:"600", cursor:"pointer" }}>Edit</button>
              <button onClick={e => { e.stopPropagation(); onDelete(); }} style={{ flex:1, padding:"5px", borderRadius:"8px", border:`1px solid ${theme.border}`, background:"none", color:"#e74c3c", fontSize:"11px", fontWeight:"600", cursor:"pointer" }}>Delete</button>
            </div>
          </div>

          {/* ── BACK ── */}
          <div style={{ position:"absolute", top:0, left:0, right:0, bottom:0, backfaceVisibility:"hidden", WebkitBackfaceVisibility:"hidden", transform:"rotateY(180deg)", background:theme.card, borderRadius:"14px", border:`1px solid ${theme.border}`, display:"flex", flexDirection:"column", overflow:"hidden" }}>
            <MetaHeader showFlipBtn={true} />
            <div style={{ flex:1, overflowY:"auto", padding:"10px 12px", WebkitOverflowScrolling:"touch", minHeight:0 }}>
              <div style={{ fontSize:"12px", color:theme.text, lineHeight:"1.7", fontStyle:"italic", borderLeft:`3px solid ${darkMode?"#2a2a2a":"#eee"}`, paddingLeft:"10px", whiteSpace:"pre-wrap" }}>
                {hl(log.notes, searchTerm)}
              </div>
            </div>
            <div style={{ padding:"6px 8px", borderTop:`1px solid ${theme.border}`, display:"flex", gap:"5px", alignItems:"center", flexShrink:0 }}>
              <button onClick={() => setShowNotesModal(true)} style={{ flex:1, padding:"5px", borderRadius:"8px", border:`1px solid ${theme.border}`, background:"none", color:theme.subtext2, fontSize:"10px", fontWeight:"600", cursor:"pointer" }}>⛶ Expand</button>
              <MicButton
                currentText={log.notes || ""}
                onTextChange={text => onNotesUpdate?.(log.id, text)}
                theme={theme} darkMode={darkMode} size="small"
              />
            </div>
          </div>

        </div>
      </div>
    </>
  );
};
