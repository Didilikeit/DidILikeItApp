import React, { useState } from "react";
import { VERDICT_MAP_COLOR, getSubtypeStyle } from "../utils/helpers.js";

export const NotesModal = ({ log, theme, darkMode, onClose, onSave }) => {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(log.notes || "");
  const color = VERDICT_MAP_COLOR(log.verdict);
  const ss = getSubtypeStyle(log.media_type);

  const handleCopy = () => {
    navigator.clipboard?.writeText(log.notes || "")
      .then(() => alert("Copied to clipboard!"))
      .catch(() => {});
  };

  return (
    <div
      onClick={onClose}
      style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.8)", zIndex:300, display:"flex", alignItems:"flex-end", justifyContent:"center" }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background:theme.card, borderRadius:"20px 20px 0 0", width:"100%", maxWidth:"500px", maxHeight:"92vh", display:"flex", flexDirection:"column", border:`1px solid ${theme.border2}` }}
      >
        <div style={{ width:"36px", height:"4px", background:theme.border2, borderRadius:"2px", margin:"12px auto 0", flexShrink:0 }}/>

        {/* Header */}
        <div style={{ padding:"14px 16px 12px", borderBottom:`1px solid ${theme.border}`, flexShrink:0 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:"10px" }}>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontWeight:"700", fontSize:"16px", color:theme.text, lineHeight:"1.3", marginBottom:"5px" }}>{log.title}</div>
              <div style={{ display:"flex", gap:"6px", alignItems:"center", flexWrap:"wrap" }}>
                <span style={{ fontSize:"10px", color:ss.color, fontWeight:"600" }}>{ss.icon} {log.media_type}</span>
                <span style={{ fontSize:"10px", color, fontWeight:"700" }}>· {log.verdict}</span>
                {log.creator && <span style={{ fontSize:"10px", color:theme.subtext }}>· {log.creator}</span>}
              </div>
            </div>
            <button
              onClick={onClose}
              style={{ background:"none", border:`1px solid ${theme.border}`, color:theme.subtext, borderRadius:"50%", width:"28px", height:"28px", cursor:"pointer", fontSize:"14px", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center" }}
            >✕</button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex:1, overflowY:"auto", padding:"18px 16px", WebkitOverflowScrolling:"touch" }}>
          {editing ? (
            <textarea
              value={editText}
              onChange={e => setEditText(e.target.value)}
              autoFocus
              style={{ width:"100%", minHeight:"220px", background:"none", border:`1px solid ${theme.border2}`, borderRadius:"10px", padding:"12px", fontSize:"15px", lineHeight:"1.8", color:theme.text, resize:"vertical", outline:"none", fontFamily:"inherit", boxSizing:"border-box" }}
            />
          ) : (
            <div style={{ fontSize:"16px", color:theme.text, lineHeight:"1.9", fontStyle:"italic", whiteSpace:"pre-wrap", wordBreak:"break-word" }}>
              {log.notes}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div style={{ padding:"12px 16px", borderTop:`1px solid ${theme.border}`, display:"flex", gap:"8px", flexShrink:0, paddingBottom:"calc(12px + env(safe-area-inset-bottom, 0px))" }}>
          {editing ? (
            <>
              <button onClick={() => { onSave(editText); setEditing(false); }} style={{ flex:1, padding:"11px", borderRadius:"10px", border:"none", background:darkMode?"#fff":"#111", color:darkMode?"#000":"#fff", fontWeight:"700", fontSize:"13px", cursor:"pointer" }}>Save</button>
              <button onClick={() => { setEditText(log.notes || ""); setEditing(false); }} style={{ padding:"11px 16px", borderRadius:"10px", border:`1px solid ${theme.border2}`, background:"none", color:theme.subtext, fontSize:"13px", cursor:"pointer" }}>Cancel</button>
            </>
          ) : (
            <>
              <button onClick={() => setEditing(true)} style={{ flex:1, padding:"11px", borderRadius:"10px", border:`1px solid ${theme.border2}`, background:"none", color:theme.text, fontWeight:"600", fontSize:"13px", cursor:"pointer" }}>✏️ Edit</button>
              <button onClick={handleCopy} style={{ flex:1, padding:"11px", borderRadius:"10px", border:`1px solid ${theme.border2}`, background:"none", color:theme.text, fontWeight:"600", fontSize:"13px", cursor:"pointer" }}>📋 Copy</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
