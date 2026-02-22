import React, { useState, useEffect, useRef } from "react";
import { getCat, getSubtypeStyle } from "../utils/helpers.js";
import { CATEGORIES } from "../utils/constants.js";

// Inject fonts once
if (!document.getElementById("taste-intel-fonts")) {
  const l = document.createElement("link");
  l.id = "taste-intel-fonts";
  l.rel = "stylesheet";
  l.href = "https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,600;0,9..144,900;1,9..144,300;1,9..144,600&display=swap";
  document.head.appendChild(l);
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const serif = "'Fraunces', 'Georgia', serif";

const verdictColor = v => ({
  "I loved it":      "#f1c40f",
  "I liked it":      "#4caf50",
  "Meh":             "#ff9800",
  "I didn't like it":"#e74c3c",
}[v] || "#888");

// Compute all the stats we need
const computeTaste = (logs, yearFilter) => {
  const finished = logs.filter(l => {
    if (yearFilter !== "All" && new Date(l.logged_at).getFullYear().toString() !== yearFilter) return false;
    return ["I loved it","I liked it","Meh","I didn't like it"].includes(l.verdict);
  });

  const total = finished.length;
  if (total === 0) return null;

  // By category
  const byCat = {};
  Object.keys(CATEGORIES).forEach(k => {
    byCat[k] = { loved:0, liked:0, meh:0, bad:0, total:0 };
  });
  finished.forEach(l => {
    const c = getCat(l.media_type);
    if (!byCat[c]) return;
    byCat[c].total++;
    if (l.verdict === "I loved it")       byCat[c].loved++;
    else if (l.verdict === "I liked it")  byCat[c].liked++;
    else if (l.verdict === "Meh")         byCat[c].meh++;
    else if (l.verdict === "I didn't like it") byCat[c].bad++;
  });

  // Top creator
  const creatorCounts = {};
  finished.forEach(l => { if (l.creator) creatorCounts[l.creator] = (creatorCounts[l.creator]||0)+1; });
  const topCreatorEntry = Object.entries(creatorCounts).sort((a,b)=>b[1]-a[1])[0];

  // Top genre
  const genreCounts = {};
  finished.forEach(l => { if (l.genre) genreCounts[l.genre] = (genreCounts[l.genre]||0)+1; });
  const topGenreEntry = Object.entries(genreCounts).sort((a,b)=>b[1]-a[1])[0];

  // Hit rate
  const hitCount = finished.filter(l => l.verdict==="I loved it"||l.verdict==="I liked it").length;
  const hitRate  = Math.round(hitCount/total*100);

  // Radar axes — score 0-100 based on volume + quality
  const radarAxes = Object.entries(CATEGORIES).map(([cat, def]) => {
    const s = byCat[cat];
    if (!s || s.total === 0) return { cat, def, score:0 };
    const quality = Math.round(((s.loved*1 + s.liked*0.7 + s.meh*0.3) / s.total) * 100);
    const volume  = Math.min(100, Math.round((s.total / Math.max(...Object.values(byCat).map(x=>x.total), 1)) * 100));
    return { cat, def, score: Math.round((quality * 0.6 + volume * 0.4)), quality, volume, total: s.total };
  });

  // Oracle — generate personality insights
  const oracle = [];
  const topCat  = Object.entries(byCat).sort((a,b)=>b[1].total-a[1].total)[0];
  const bestCat = Object.entries(byCat)
    .filter(([,s])=>s.total>=3)
    .map(([k,s])=>({ k, rate:Math.round((s.loved+s.liked)/Math.max(s.total,1)*100) }))
    .sort((a,b)=>b.rate-a.rate)[0];
  const worstCat = Object.entries(byCat)
    .filter(([,s])=>s.total>=3)
    .map(([k,s])=>({ k, rate:Math.round((s.loved+s.liked)/Math.max(s.total,1)*100) }))
    .sort((a,b)=>a.rate-b.rate)[0];
  const lovedCount = finished.filter(l=>l.verdict==="I loved it").length;

  if (topCat && topCat[1].total > 0)
    oracle.push(`You are, above all else, a **${topCat[0].toLowerCase()} person** — it's where you spend most of your cultural life.`);
  if (bestCat && bestCat.rate >= 70)
    oracle.push(`**${bestCat.k}** is your sweet spot — a ${bestCat.rate}% hit rate says your taste is sharp here.`);
  if (worstCat && worstCat.rate < 55 && worstCat.k !== bestCat?.k)
    oracle.push(`**${worstCat.k}** is where your instincts falter most. Only ${worstCat.rate}% land.`);
  if (topCreatorEntry && topCreatorEntry[1] >= 3)
    oracle.push(`You keep returning to **${topCreatorEntry[0]}**. ${topCreatorEntry[1]} entries — that's not a coincidence.`);
  if (topGenreEntry && topGenreEntry[1] >= 3)
    oracle.push(`**${topGenreEntry[0]}** shows up more than anything else in your log. It tells a story about you.`);
  if (hitRate >= 80)
    oracle.push(`A ${hitRate}% hit rate means you're either lucky, well-read, or both.`);
  else if (hitRate < 45)
    oracle.push(`${hitRate}% hit rate. You take risks. Some pay off, many don't.`);
  if (lovedCount >= 10)
    oracle.push(`**${lovedCount} things** you've truly loved. That's a proper list to be proud of.`);

  // Fallback
  if (oracle.length < 2)
    oracle.push(`**${total} entries** and counting. The picture gets clearer every time you log.`);

  return { finished, total, byCat, hitRate, topCreatorEntry, topGenreEntry, radarAxes, oracle };
};

// Render bold markdown-style **text**
const RichText = ({ text, color="#fff", size=13, style={} }) => {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return (
    <span style={{ fontSize:size, lineHeight:1.65, color:`rgba(255,255,255,0.55)`, ...style }}>
      {parts.map((p,i) =>
        i % 2 === 1
          ? <strong key={i} style={{ color, fontWeight:700, fontStyle:"normal" }}>{p}</strong>
          : p
      )}
    </span>
  );
};


// ─── THE GENOME ───────────────────────────────────────────────────────────────
const Genome = ({ byCat, theme, darkMode }) => {
  const maxTotal = Math.max(...Object.values(byCat).map(s=>s.total), 1);

  return (
    <div style={{
      background: darkMode ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)",
      border: `1px solid ${theme.border}`,
      borderRadius: "16px",
      overflow: "hidden",
      marginBottom: "10px",
    }}>
      {/* Header */}
      <div style={{ padding:"14px 16px 10px", borderBottom:`1px solid ${theme.border}` }}>
        <div style={{ fontSize:"9px", fontWeight:"700", letterSpacing:"0.15em", textTransform:"uppercase", color:theme.subtext, marginBottom:"4px" }}>Taste Genome</div>
        <div style={{ fontFamily:serif, fontSize:"18px", color:theme.text, lineHeight:1.1 }}>
          Your cultural <em style={{ color: darkMode?"rgba(255,255,255,0.5)":"rgba(0,0,0,0.4)" }}>fingerprint</em>
        </div>
      </div>

      {/* Tracks */}
      <div style={{ padding:"12px 16px 8px", display:"flex", flexDirection:"column", gap:"10px" }}>
        {Object.entries(CATEGORIES).map(([cat, def]) => {
          const s = byCat[cat] || { loved:0, liked:0, meh:0, bad:0, total:0 };
          if (s.total === 0) return null;
          const trackW = Math.max(20, Math.round((s.total / maxTotal) * 100));

          return (
            <div key={cat} style={{ display:"flex", alignItems:"center", gap:"10px" }}>
              {/* Label */}
              <div style={{ width:"76px", flexShrink:0, textAlign:"right" }}>
                <div style={{ fontSize:"9px", fontWeight:"700", letterSpacing:"0.1em", textTransform:"uppercase", color:def.color, opacity:0.8 }}>{def.icon} {cat}</div>
              </div>

              {/* Track */}
              <div style={{ flex:1, height:"24px", borderRadius:"3px", background: darkMode?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.04)", position:"relative", overflow:"hidden" }}>
                {/* Fill bar — proportional to volume */}
                <div style={{ position:"absolute", top:0, left:0, bottom:0, width:`${trackW}%`, display:"flex" }}>
                  {s.loved > 0 && <div style={{ flex:s.loved, background:`linear-gradient(to bottom,rgba(241,196,15,0.85),rgba(241,196,15,0.45))` }}/>}
                  {s.liked > 0 && <div style={{ flex:s.liked, background:`linear-gradient(to bottom,rgba(76,175,80,0.75),rgba(76,175,80,0.35))` }}/>}
                  {s.meh   > 0 && <div style={{ flex:s.meh,   background:`linear-gradient(to bottom,rgba(255,152,0,0.6),rgba(255,152,0,0.25))` }}/>}
                  {s.bad   > 0 && <div style={{ flex:s.bad,   background:`linear-gradient(to bottom,rgba(231,76,60,0.6),rgba(231,76,60,0.25))` }}/>}
                </div>
                {/* Scan lines */}
                <div style={{ position:"absolute", inset:0, backgroundImage:"repeating-linear-gradient(90deg,transparent,transparent 3px,rgba(0,0,0,0.12) 3px,rgba(0,0,0,0.12) 4px)", pointerEvents:"none" }}/>
              </div>

              {/* Count */}
              <div style={{ width:"22px", flexShrink:0, fontFamily:"'Space Mono',monospace", fontSize:"9px", color:theme.subtext, textAlign:"right" }}>{s.total}</div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{ padding:"8px 16px 12px", display:"flex", gap:"14px", borderTop:`1px solid ${theme.border}` }}>
        {[["#f1c40f","Loved"],["#4caf50","Liked"],["#ff9800","Meh"],["#e74c3c","Didn't"]].map(([c,l]) => (
          <div key={l} style={{ display:"flex", alignItems:"center", gap:"4px" }}>
            <div style={{ width:"8px", height:"8px", borderRadius:"1px", background:c, flexShrink:0 }}/>
            <span style={{ fontSize:"9px", color:theme.subtext, fontWeight:"600" }}>{l}</span>
          </div>
        ))}
      </div>
    </div>
  );
};


// ─── THE RADAR ────────────────────────────────────────────────────────────────
const Radar = ({ radarAxes, theme, darkMode }) => {
  const cx = 140, cy = 140, r = 100;
  const axes = radarAxes.filter(a => a.score > 0);
  if (axes.length < 3) return null;

  // Polygon points from scores
  const toPoint = (score, idx, total) => {
    const angle = (idx / total) * 2 * Math.PI - Math.PI / 2;
    const d = (score / 100) * r;
    return { x: cx + d * Math.cos(angle), y: cy + d * Math.sin(angle) };
  };

  const pts = axes.map((a, i) => toPoint(a.score, i, axes.length));
  const ptsStr = pts.map(p => `${p.x},${p.y}`).join(" ");

  // Grid rings
  const gridRings = [25, 50, 75, 100];

  // Axis label positions (slightly outside)
  const labelR = r + 20;
  const labelPts = axes.map((a, i) => {
    const angle = (i / axes.length) * 2 * Math.PI - Math.PI / 2;
    return { x: cx + labelR * Math.cos(angle), y: cy + labelR * Math.sin(angle), ...a };
  });

  const accentColor = darkMode ? "#7c6cff" : "#5a4aff";

  return (
    <div style={{
      background: darkMode ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)",
      border: `1px solid ${theme.border}`,
      borderRadius: "16px",
      overflow: "hidden",
      marginBottom: "10px",
    }}>
      <div style={{ padding:"14px 16px 10px", borderBottom:`1px solid ${theme.border}` }}>
        <div style={{ fontSize:"9px", fontWeight:"700", letterSpacing:"0.15em", textTransform:"uppercase", color:theme.subtext, marginBottom:"4px" }}>Taste Radar</div>
        <div style={{ fontFamily:serif, fontSize:"18px", color:theme.text, lineHeight:1.1 }}>
          Where you <em style={{ color: darkMode?"rgba(255,255,255,0.5)":"rgba(0,0,0,0.4)" }}>shine</em>
        </div>
      </div>

      <div style={{ padding:"16px", display:"flex", justifyContent:"center" }}>
        <svg width="280" height="280" viewBox="0 0 280 280">
          <defs>
            <radialGradient id="radarFill" cx="50%" cy="50%">
              <stop offset="0%" stopColor={accentColor} stopOpacity="0.25"/>
              <stop offset="100%" stopColor={accentColor} stopOpacity="0.04"/>
            </radialGradient>
          </defs>

          {/* Grid rings */}
          {gridRings.map(pct => (
            <circle key={pct} cx={cx} cy={cy} r={(pct/100)*r}
              fill="none" stroke={darkMode?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.06)"} strokeWidth="1"/>
          ))}

          {/* Axis lines */}
          {axes.map((a, i) => {
            const angle = (i / axes.length) * 2 * Math.PI - Math.PI / 2;
            return (
              <line key={i}
                x1={cx} y1={cy}
                x2={cx + r * Math.cos(angle)} y2={cy + r * Math.sin(angle)}
                stroke={darkMode?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.06)"} strokeWidth="1"/>
            );
          })}

          {/* Score polygon */}
          <polygon points={ptsStr}
            fill="url(#radarFill)"
            stroke={accentColor}
            strokeWidth="1.5"
            strokeLinejoin="round"
            opacity="0.9"
          />

          {/* Data point dots */}
          {pts.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r="3.5"
              fill={accentColor} opacity="0.9"
              stroke={darkMode?"rgba(10,10,20,0.8)":"rgba(255,255,255,0.8)"} strokeWidth="1.5"/>
          ))}

          {/* Axis labels */}
          {labelPts.map((lp, i) => (
            <text key={i} x={lp.x} y={lp.y}
              textAnchor="middle" dominantBaseline="middle"
              fill={darkMode?"rgba(255,255,255,0.3)":"rgba(0,0,0,0.35)"}
              fontSize="9" fontFamily="'Sora',sans-serif" fontWeight="600"
              letterSpacing="0.04em">
              {lp.def?.icon} {lp.cat.toUpperCase()}
            </text>
          ))}
        </svg>
      </div>

      {/* Breakdown mini cards */}
      <div style={{ padding:"0 12px 14px", display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px" }}>
        {axes.sort((a,b)=>b.score-a.score).slice(0,4).map(a => (
          <div key={a.cat} style={{
            background: darkMode?"rgba(255,255,255,0.02)":"rgba(0,0,0,0.03)",
            border:`1px solid ${theme.border}`,
            borderRadius:"10px", padding:"10px 12px",
            position:"relative", overflow:"hidden",
          }}>
            <div style={{ position:"absolute", top:0, left:0, right:0, height:"2px", background:`linear-gradient(90deg,${a.def?.color || accentColor},transparent)` }}/>
            <div style={{ fontSize:"8px", fontWeight:"700", letterSpacing:"0.12em", textTransform:"uppercase", color:theme.subtext, marginBottom:"5px" }}>{a.def?.icon} {a.cat}</div>
            <div style={{ fontFamily:serif, fontSize:"20px", color:theme.text, lineHeight:1.0, marginBottom:"2px" }}>{a.score}</div>
            <div style={{ fontSize:"9px", color:theme.subtext }}>{a.total} logged · {a.quality}% hit</div>
            <div style={{ marginTop:"6px", height:"2px", background:theme.border, borderRadius:"2px", overflow:"hidden" }}>
              <div style={{ height:"100%", width:`${a.score}%`, background:a.def?.color || accentColor, borderRadius:"2px" }}/>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};


// ─── THE ORACLE ───────────────────────────────────────────────────────────────
const Oracle = ({ oracle, total, hitRate, lovedCount, topCreatorEntry, theme, darkMode }) => {
  const [activeIdx, setActiveIdx] = useState(0);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (oracle.length <= 1) return;
    intervalRef.current = setInterval(() => {
      setActiveIdx(i => (i + 1) % oracle.length);
    }, 6000);
    return () => clearInterval(intervalRef.current);
  }, [oracle.length]);

  const accentColor = darkMode ? "rgba(124,108,255,0.8)" : "rgba(90,74,220,0.9)";
  const accentBg    = darkMode ? "rgba(124,108,255,0.06)" : "rgba(90,74,220,0.04)";
  const accentBd    = darkMode ? "rgba(124,108,255,0.15)" : "rgba(90,74,220,0.12)";

  return (
    <div style={{
      background: darkMode
        ? "radial-gradient(ellipse at 50% 0%, rgba(80,40,160,0.1) 0%, rgba(255,255,255,0.02) 60%)"
        : "radial-gradient(ellipse at 50% 0%, rgba(80,40,160,0.05) 0%, rgba(0,0,0,0.02) 60%)",
      border: `1px solid ${theme.border}`,
      borderRadius: "16px",
      overflow: "hidden",
      marginBottom: "10px",
    }}>
      {/* Header */}
      <div style={{ padding:"16px 16px 12px", textAlign:"center", borderBottom:`1px solid ${theme.border}` }}>
        <div style={{ fontSize:"22px", marginBottom:"6px", filter:`drop-shadow(0 0 8px ${accentColor})` }}>🔮</div>
        <div style={{ fontSize:"9px", fontWeight:"700", letterSpacing:"0.25em", textTransform:"uppercase", color:darkMode?"rgba(124,108,255,0.5)":"rgba(90,74,220,0.6)", marginBottom:"4px" }}>The Oracle</div>
        <div style={{ fontFamily:serif, fontSize:"18px", color:theme.text, lineHeight:1.1 }}>
          Your taste, <em style={{ color: darkMode?"rgba(124,108,255,0.7)":"rgba(90,74,220,0.8)" }}>revealed</em>
        </div>
      </div>

      {/* Rotating reading */}
      <div style={{ padding:"18px 16px 14px", background:accentBg, borderBottom:`1px solid ${accentBd}`, minHeight:"90px", display:"flex", flexDirection:"column", justifyContent:"center" }}>
        <div style={{ fontSize:"9px", fontWeight:"700", letterSpacing:"0.2em", textTransform:"uppercase", color:accentColor, marginBottom:"10px", opacity:0.7 }}>
          // reading {activeIdx + 1} of {oracle.length}
        </div>
        <div style={{ fontFamily:serif, fontSize:"16px", lineHeight:1.6, color:theme.text }}>
          <RichText text={oracle[activeIdx]} color={theme.text} size={16} style={{ color:darkMode?"rgba(255,255,255,0.55)":"rgba(0,0,0,0.55)", lineHeight:1.65 }}/>
        </div>
        {/* Dot indicators */}
        {oracle.length > 1 && (
          <div style={{ display:"flex", gap:"5px", marginTop:"12px", justifyContent:"center" }}>
            {oracle.map((_, i) => (
              <div key={i}
                onClick={() => { setActiveIdx(i); clearInterval(intervalRef.current); }}
                style={{ width: i===activeIdx?"16px":"5px", height:"4px", borderRadius:"3px", background: i===activeIdx ? accentColor : (darkMode?"rgba(255,255,255,0.1)":"rgba(0,0,0,0.1)"), transition:"width 0.3s ease", cursor:"pointer" }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Stat orbs */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"0", borderBottom:`1px solid ${theme.border}` }}>
        {[
          { num:total, label:"logged" },
          { num:`${hitRate}%`, label:"hit rate" },
          { num:lovedCount, label:"loved" },
          { num:topCreatorEntry ? topCreatorEntry[0].split(" ").slice(-1)[0] : "–", label:"fav creator" },
        ].map((orb, i) => (
          <div key={i} style={{
            padding:"12px 6px",
            textAlign:"center",
            borderRight: i < 3 ? `1px solid ${theme.border}` : "none",
            background:"none",
          }}>
            <div style={{ fontFamily:serif, fontSize:"18px", color:theme.text, lineHeight:1.0, marginBottom:"3px" }}>{orb.num}</div>
            <div style={{ fontSize:"8px", fontWeight:"600", letterSpacing:"0.1em", textTransform:"uppercase", color:theme.subtext }}>{orb.label}</div>
          </div>
        ))}
      </div>

      {/* All prophecies as a list */}
      <div style={{ padding:"12px 14px 14px", display:"flex", flexDirection:"column", gap:"6px" }}>
        {oracle.map((text, i) => (
          <div key={i}
            onClick={() => setActiveIdx(i)}
            style={{
              padding:"10px 12px",
              borderRadius:"8px",
              border:`1px solid ${i===activeIdx ? accentBd : theme.border}`,
              borderLeft:`2px solid ${i===activeIdx ? accentColor : theme.border}`,
              background: i===activeIdx ? accentBg : "none",
              cursor:"pointer",
              transition:"all 0.2s ease",
            }}>
            <RichText text={text} color={theme.text} size={12}/>
          </div>
        ))}
      </div>
    </div>
  );
};


// ─── MAIN EXPORT ─────────────────────────────────────────────────────────────
export const TasteIntelligence = ({ logs, theme, darkMode, statYearFilter }) => {
  const data = computeTaste(logs, statYearFilter);
  if (!data) return null;

  const { byCat, total, hitRate, radarAxes, oracle, topCreatorEntry, topGenreEntry, finished } = data;
  const lovedCount = finished.filter(l=>l.verdict==="I loved it").length;

  return (
    <>
      {/* GENOME — after hit rate section */}
      <Genome byCat={byCat} theme={theme} darkMode={darkMode}/>

      {/* RADAR — after category breakdown */}
      <Radar radarAxes={radarAxes} theme={theme} darkMode={darkMode}/>

      {/* ORACLE — at the bottom */}
      <Oracle
        oracle={oracle} total={total} hitRate={hitRate}
        lovedCount={lovedCount} topCreatorEntry={topCreatorEntry}
        theme={theme} darkMode={darkMode}
      />
    </>
  );
};

// Export individual pieces too so App.jsx can place them separately
export const TasteGenome  = ({ logs, theme, darkMode, statYearFilter }) => {
  const data = computeTaste(logs, statYearFilter);
  if (!data) return null;
  return <Genome byCat={data.byCat} theme={theme} darkMode={darkMode}/>;
};

export const TasteRadar = ({ logs, theme, darkMode, statYearFilter }) => {
  const data = computeTaste(logs, statYearFilter);
  if (!data || data.radarAxes.filter(a=>a.score>0).length < 3) return null;
  return <Radar radarAxes={data.radarAxes} theme={theme} darkMode={darkMode}/>;
};

export const TasteOracle = ({ logs, theme, darkMode, statYearFilter }) => {
  const data = computeTaste(logs, statYearFilter);
  if (!data) return null;
  const lovedCount = data.finished.filter(l=>l.verdict==="I loved it").length;
  return (
    <Oracle
      oracle={data.oracle} total={data.total} hitRate={data.hitRate}
      lovedCount={lovedCount} topCreatorEntry={data.topCreatorEntry}
      theme={theme} darkMode={darkMode}
    />
  );
};
