import React, { useState, useEffect, useRef } from "react";
import { useApiSearch } from "../hooks/useApiSearch.js";
import { CATEGORIES, API_TYPES } from "../utils/constants.js";
import { getSubtypeStyle } from "../utils/helpers.js";

// Inject fonts
if (!document.getElementById("quicklog-fonts")) {
  const l = document.createElement("link");
  l.id = "quicklog-fonts";
  l.rel = "stylesheet";
  l.href = "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Serif+Display:ital@0;1&display=swap";
  document.head.appendChild(l);
}

const VERDICTS = [
  { v: "I loved it",       emoji: "⭐", color: "#f1c40f", bg: "rgba(241,196,15,0.12)",  border: "rgba(241,196,15,0.3)"  },
  { v: "I liked it",       emoji: "🟢", color: "#4caf50", bg: "rgba(76,175,80,0.12)",   border: "rgba(76,175,80,0.3)"   },
  { v: "Meh",              emoji: "🟡", color: "#ff9800", bg: "rgba(255,152,0,0.12)",   border: "rgba(255,152,0,0.3)"   },
  { v: "I didn't like it", emoji: "🔴", color: "#e74c3c", bg: "rgba(231,76,60,0.12)",   border: "rgba(231,76,60,0.3)"   },
];

// Flat list of all subtypes for quick picking
const ALL_TYPES = Object.entries(CATEGORIES).flatMap(([cat, def]) =>
  def.subtypes.map(sub => ({ sub, cat, catColor: def.color, catIcon: def.icon }))
);

const COMMON_TYPES = ["Movie", "TV Series", "Book", "Album", "Podcast", "Restaurant / Food", "Gig / Concert"];

export const QuickLog = ({ theme, darkMode, onSave, onClose, onExpandFull }) => {
  const [step, setStep] = useState("type"); // type | search | verdict | done
  const [mediaType, setMediaType] = useState("");
  const [title, setTitle] = useState("");
  const [creator, setCreator] = useState("");
  const [artwork, setArtwork] = useState("");
  const [year, setYear] = useState("");
  const [genre, setGenre] = useState("");
  const [verdict, setVerdict] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showAllTypes, setShowAllTypes] = useState(false);
  const inputRef = useRef(null);

  const { searchResults, setSearchResults, selectResult } = useApiSearch(
    step === "search" ? title : "",
    mediaType
  );

  // Auto-focus input when entering search step
  useEffect(() => {
    if (step === "search") setTimeout(() => inputRef.current?.focus(), 80);
  }, [step]);

  const handleTypeSelect = (sub) => {
    setMediaType(sub);
    setStep("search");
  };

  const handleSelectResult = async (item) => {
    await selectResult(item, mediaType, {
      setTitle, setCreator, setYear, setGenre, setArtwork,
    });
    setSearchResults([]);
    setStep("verdict");
  };

  const handleSearchNext = () => {
    if (!title.trim()) return;
    setSearchResults([]);
    setStep("verdict");
  };

  const handleVerdictSelect = async (v) => {
    setVerdict(v);
    setSaving(true);
    await onSave({
      title: title.trim(),
      creator: creator.trim(),
      artwork: artwork || null,
      year_released: year || null,
      genre: genre || null,
      media_type: mediaType,
      verdict: v,
    });
    setSaving(false);
    setStep("done");
  };

  const ss = mediaType ? getSubtypeStyle(mediaType) : null;
  const displayTypes = showAllTypes ? ALL_TYPES.map(t => t.sub) : COMMON_TYPES;

  const overlay = {
    position: "fixed", inset: 0, zIndex: 500,
    background: "rgba(0,0,0,0.75)",
    backdropFilter: "blur(6px)",
    display: "flex", alignItems: "flex-end", justifyContent: "center",
  };

  const sheet = {
    width: "100%", maxWidth: "500px",
    background: darkMode ? "#0a0a0a" : "#fff",
    borderRadius: "24px 24px 0 0",
    border: `1px solid ${darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
    borderBottom: "none",
    overflow: "hidden",
    animation: "qlSlideUp 0.3s cubic-bezier(0.32, 0.72, 0, 1)",
    maxHeight: "92vh",
    display: "flex",
    flexDirection: "column",
  };

  return (
    <div style={overlay} onClick={onClose}>
      <style>{`
        @keyframes qlSlideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes qlFadeIn  { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .ql-type-btn:active { transform: scale(0.95); }
        .ql-verdict-btn:active { transform: scale(0.97); }
      `}</style>

      <div style={sheet} onClick={e => e.stopPropagation()}>
        {/* Handle */}
        <div style={{ width: 40, height: 4, background: darkMode ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)", borderRadius: 2, margin: "12px auto 0", flexShrink: 0 }} />

        {/* ── STEP: TYPE ── */}
        {step === "type" && (
          <div style={{ padding: "16px 20px 32px", animation: "qlFadeIn 0.2s ease" }}>
            <div style={{ fontFamily: "'Bebas Neue', monospace", fontSize: 28, letterSpacing: "0.05em", color: theme.text, marginBottom: 4 }}>
              Quick Log
            </div>
            <div style={{ fontSize: 12, color: theme.subtext, marginBottom: 20 }}>What are you logging?</div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
              {displayTypes.map(sub => {
                const info = ALL_TYPES.find(t => t.sub === sub);
                const s = getSubtypeStyle(sub);
                return (
                  <button key={sub} className="ql-type-btn"
                    onClick={() => handleTypeSelect(sub)}
                    style={{
                      padding: "8px 14px", borderRadius: 20,
                      border: `1px solid ${darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.12)"}`,
                      background: darkMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
                      color: s.color, fontSize: 13, fontWeight: 600, cursor: "pointer",
                      display: "flex", alignItems: "center", gap: 5,
                      transition: "all 0.15s",
                    }}>
                    <span>{s.icon}</span>{sub}
                  </button>
                );
              })}
            </div>
            <button onClick={() => setShowAllTypes(v => !v)}
              style={{ background: "none", border: "none", color: theme.subtext, fontSize: 12, fontWeight: 600, cursor: "pointer", padding: "4px 0" }}>
              {showAllTypes ? "↑ Show fewer" : "↓ More types…"}
            </button>
          </div>
        )}

        {/* ── STEP: SEARCH ── */}
        {step === "search" && (
          <div style={{ padding: "16px 20px 32px", animation: "qlFadeIn 0.2s ease", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <button onClick={() => setStep("type")}
                style={{ background: "none", border: `1px solid ${theme.border}`, borderRadius: "50%", width: 30, height: 30, color: theme.subtext, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>←</button>
              <div>
                <div style={{ fontFamily: "'Bebas Neue', monospace", fontSize: 24, letterSpacing: "0.05em", color: ss?.color || theme.text }}>
                  {ss?.icon} {mediaType}
                </div>
              </div>
            </div>

            <div style={{ position: "relative" }}>
              <input
                ref={inputRef}
                value={title}
                onChange={e => setTitle(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleSearchNext(); }}
                placeholder={API_TYPES[mediaType] ? `Search for a ${mediaType.toLowerCase()}…` : `Title…`}
                style={{
                  width: "100%", padding: "14px 16px", borderRadius: 14,
                  border: `1px solid ${darkMode ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)"}`,
                  background: darkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
                  color: theme.text, fontSize: 16, outline: "none", boxSizing: "border-box",
                  fontFamily: "inherit",
                }}
              />

              {/* API results dropdown */}
              {searchResults.length > 0 && (
                <div style={{
                  position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 10,
                  background: darkMode ? "#111" : "#fff",
                  border: `1px solid ${theme.border}`,
                  borderRadius: 14, overflow: "hidden",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                  maxHeight: 240, overflowY: "auto",
                }}>
                  {searchResults.slice(0, 5).map((item, i) => {
                    const at = API_TYPES[mediaType];
                    let t = "", sub = "", thumb = null;
                    if (at === "tmdb_movie") { t = item.title; sub = item.release_date?.split("-")[0] || ""; thumb = item.poster_path ? `https://image.tmdb.org/t/p/w92${item.poster_path}` : null; }
                    else if (at === "tmdb_tv") { t = item.name; sub = item.first_air_date?.split("-")[0] || ""; thumb = item.poster_path ? `https://image.tmdb.org/t/p/w92${item.poster_path}` : null; }
                    else if (at === "books") { t = item.volumeInfo?.title || ""; sub = item.volumeInfo?.authors?.join(", ") || ""; const il = item.volumeInfo?.imageLinks; thumb = (il?.thumbnail || il?.smallThumbnail || "").replace("http://", "https://") || null; }
                    else { t = item.name; sub = item.artist; thumb = item.image?.[3]?.["#text"] || null; }
                    return (
                      <div key={i} onClick={() => handleSelectResult(item)}
                        style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", cursor: "pointer", borderBottom: `1px solid ${theme.border}` }}>
                        <div style={{ width: 32, height: 44, borderRadius: 5, overflow: "hidden", flexShrink: 0, background: darkMode ? "#1a1a1a" : "#eee", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          {thumb ? <img src={thumb} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: 14 }}>{ss?.icon}</span>}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 13, color: theme.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t}</div>
                          <div style={{ fontSize: 11, color: theme.subtext }}>{sub}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {title.trim().length > 0 && searchResults.length === 0 && (
              <button onClick={handleSearchNext}
                style={{ marginTop: 12, padding: "12px", borderRadius: 12, border: "none", background: darkMode ? "#fff" : "#111", color: darkMode ? "#000" : "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                Continue with "{title.trim()}" →
              </button>
            )}
          </div>
        )}

        {/* ── STEP: VERDICT ── */}
        {step === "verdict" && (
          <div style={{ padding: "16px 20px 36px", animation: "qlFadeIn 0.2s ease" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <button onClick={() => setStep("search")}
                style={{ background: "none", border: `1px solid ${theme.border}`, borderRadius: "50%", width: 30, height: 30, color: theme.subtext, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>←</button>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 18, color: theme.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</div>
                {creator && <div style={{ fontSize: 11, color: theme.subtext }}>{creator}</div>}
              </div>
              {artwork && <img src={artwork} alt="" style={{ width: 36, height: 50, borderRadius: 6, objectFit: "cover", flexShrink: 0 }} onError={e => e.target.style.display = "none"} />}
            </div>

            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: theme.subtext, marginBottom: 12 }}>Did you like it?</div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {VERDICTS.map(({ v, emoji, color, bg, border }) => (
                <button key={v} className="ql-verdict-btn"
                  onClick={() => handleVerdictSelect(v)}
                  disabled={saving}
                  style={{
                    padding: "16px 20px", borderRadius: 14,
                    border: `1px solid ${border}`,
                    background: bg,
                    color, fontWeight: 700, fontSize: 15, cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 10,
                    transition: "all 0.15s",
                    opacity: saving ? 0.5 : 1,
                    textAlign: "left",
                  }}>
                  <span style={{ fontSize: 20 }}>{emoji}</span>
                  <span>{v}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── STEP: DONE ── */}
        {step === "done" && (
          <div style={{ padding: "24px 24px 40px", animation: "qlFadeIn 0.25s ease", textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
            <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, color: theme.text, marginBottom: 6 }}>Logged!</div>
            <div style={{ fontSize: 13, color: theme.subtext, marginBottom: 28 }}>
              <em>{title}</em> saved to your history.
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={onClose}
                style={{ flex: 1, padding: "13px", borderRadius: 12, border: `1px solid ${theme.border}`, background: "none", color: theme.text, fontWeight: 600, fontSize: 14, cursor: "pointer" }}>
                Done
              </button>
              <button onClick={onExpandFull}
                style={{ flex: 2, padding: "13px", borderRadius: 12, border: "none", background: darkMode ? "#fff" : "#111", color: darkMode ? "#000" : "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                Add more detail →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
