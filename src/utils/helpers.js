import React from "react";
import { CATEGORIES, SUBTYPE_TO_CAT, SUBTYPE_ICONS, COLL_COLORS } from "./constants.js";

// ─── CATEGORY / SUBTYPE HELPERS ───────────────────────────────────────────────
export const getCat = t => SUBTYPE_TO_CAT[t] || "Watched";

export const getSubtypeStyle = t => ({
  color: CATEGORIES[getCat(t)]?.color || "#95a5a6",
  icon: SUBTYPE_ICONS[t] || "📎",
  cat: getCat(t),
});

export const VERDICT_MAP_COLOR = v => ({
  "I loved it":"#f1c40f",
  "I liked it":"#4caf50",
  "Meh":"#ff9800",
  "I didn't like it":"#e74c3c",
  "Want to go":"#9b59b6",
}[v] || "#888");

// ─── COLLECTIONS ──────────────────────────────────────────────────────────────
export const collAccent = name => {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return COLL_COLORS[Math.abs(h) % COLL_COLORS.length];
};

// ─── SEARCH HIGHLIGHT ─────────────────────────────────────────────────────────
export const hl = (content, term) => {
  if (!term || !content) return content;
  const ht = term.replace(/^"|"$/g, "");
  if (!ht) return content;
  const esc = ht.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return content.toString()
    .split(new RegExp("(" + esc + ")", "gi"))
    .map((p, i) =>
      p.toLowerCase() === ht.toLowerCase()
        ? <mark key={i} style={{ backgroundColor:"#f1c40f", color:"#000", borderRadius:"2px", padding:"0 2px" }}>{p}</mark>
        : p
    );
};

// ─── COVER GRADIENT (for books without artwork) ───────────────────────────────
export const generateCoverGradient = title => {
  let hash = 0;
  for (let i = 0; i < title.length; i++) hash = title.charCodeAt(i) + ((hash << 5) - hash);
  const h1 = Math.abs(hash) % 360;
  const h2 = (h1 + 40 + (Math.abs(hash >> 8) % 80)) % 360;
  return { color1: `hsl(${h1},50%,35%)`, color2: `hsl(${h2},60%,20%)` };
};

// ─── IMAGE COMPRESSION ────────────────────────────────────────────────────────
export const compressImage = (file, maxWidth = 800, quality = 0.72) =>
  new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let w = img.width, h = img.height;
        if (w > maxWidth) { h = Math.round(h * maxWidth / w); w = maxWidth; }
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });

// ─── GEOCODING ────────────────────────────────────────────────────────────────
export const geocodeVenue = async query => {
  if (!query || query.length < 3) return [];
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1`,
      { headers: { "Accept-Language": "en", "User-Agent": "DidILikeIt/1.0" } }
    );
    const data = await r.json();
    return data.map(d => ({
      display: d.display_name,
      short: [
        d.address?.amenity || d.address?.tourism || d.address?.leisure || d.name,
        d.address?.city || d.address?.town || d.address?.village || d.address?.county,
        d.address?.country,
      ].filter(Boolean).join(", "),
      lat: parseFloat(d.lat),
      lng: parseFloat(d.lon),
      city: d.address?.city || d.address?.town || d.address?.village || d.address?.county || "",
      venue: d.address?.amenity || d.address?.tourism || d.address?.leisure || d.name || "",
    }));
  } catch { return []; }
};

// ─── HOME SCREEN HELPERS ──────────────────────────────────────────────────────
export const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 5)  return "Still up?";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Evening";
};

export const getInsight = (logs, customName) => {
  const finished = logs.filter(l =>
    ["I loved it","I liked it","Meh","I didn't like it"].includes(l.verdict)
  );
  if (finished.length === 0) return "Start logging to see your taste stats here.";

  const hitRate = Math.round(
    (finished.filter(l => ["I loved it","I liked it"].includes(l.verdict)).length / finished.length) * 100
  );
  const year = new Date().getFullYear();
  const thisYear = finished.filter(l => new Date(l.logged_at).getFullYear() === year);
  const loved = finished.filter(l => l.verdict === "I loved it").length;
  const recentLog = [...finished].sort((a, b) => new Date(b.logged_at) - new Date(a.logged_at))[0];
  const daysSince = recentLog
    ? Math.floor((Date.now() - new Date(recentLog.logged_at)) / (1000 * 60 * 60 * 24))
    : 999;

  const insights = [];
  if (hitRate >= 70) insights.push(`You've loved or liked ${hitRate}% of everything you've logged.`);
  if (thisYear.length > 0) insights.push(`${thisYear.length} thing${thisYear.length === 1 ? "" : "s"} logged so far this year.`);
  if (loved > 0) insights.push(`${loved} thing${loved === 1 ? "" : "s"} you've truly loved.`);
  if (daysSince === 0) insights.push("You logged something today — keep it going.");
  else if (daysSince === 1) insights.push("Last logged yesterday. What's next?");
  else if (daysSince <= 7) insights.push(`Last logged ${daysSince} days ago.`);
  const expLogs = finished.filter(l => getCat(l.media_type) === "Experienced");
  if (expLogs.length >= 3) insights.push(`${expLogs.length} real-world experiences logged.`);

  if (insights.length === 0) return `${finished.length} things logged and counted.`;
  return insights[Math.floor(Date.now() / 60000) % insights.length];
};

// ─── LOG FILTERING ────────────────────────────────────────────────────────────
export const filterLogs = (arr, term, catF, vF, month, sort, view) => {
  return arr.filter(log => {
    const isQueueV = log.verdict?.startsWith("Want to") || log.verdict === "Want to go";
    const isActive = log.verdict?.startsWith("Currently");
    const lmy = log.logged_at
      ? new Date(log.logged_at).toLocaleString("default", { month:"long", year:"numeric" })
      : "";

    let matchSearch = true;
    if (term) {
      const t = term.toLowerCase().trim();
      if (t.startsWith('"')) {
        const ph = t.replace(/^"|"$/g, "");
        matchSearch = [log.title, log.creator, log.notes, log.location_venue, log.location_city]
          .some(f => (f || "").toLowerCase().includes(ph));
      } else {
        const src = `${log.title} ${log.creator} ${log.notes} ${log.verdict} ${lmy} ${log.location_venue||""} ${log.location_city||""}`.toLowerCase();
        const parts = t.split(" ");
        const done = parts.slice(0, -1);
        const cur = parts[parts.length - 1];
        matchSearch = done.every(w => {
          if (!w) return true;
          const esc = w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          return new RegExp(`(?<![a-z])${esc}(?![a-z])`, "i").test(src);
        }) && (cur === "" || new RegExp(`(?<![a-z])${cur.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i").test(src));
      }
    }

    const matchCat   = catF === "All" || getCat(log.media_type) === catF;
    const matchV     = !vF || log.verdict === vF;
    const matchMonth = month === "All" || lmy === month;

    let matchView = true;
    if (!term && view) {
      if (view === "history") matchView = !isActive && !isQueueV;
      if (view === "queue")   matchView = isActive || isQueueV;
    }

    return matchSearch && matchCat && matchV && matchMonth && matchView;
  }).sort((a, b) => {
    if (sort === "Title")   return (a.title || "").localeCompare(b.title || "");
    if (sort === "Verdict") {
      const o = { "I loved it":0, "I liked it":1, "Meh":2, "I didn't like it":3 };
      return (o[a.verdict] ?? 99) - (o[b.verdict] ?? 99);
    }
    return new Date(b.logged_at) - new Date(a.logged_at);
  });
};

// ─── CSV EXPORT ───────────────────────────────────────────────────────────────
export const exportCSV = (logs, collections) => {
  const headers = ["Title","Creator","Type","Category","Verdict","Genre","Year","Venue","City","Lat","Lng","Collection","Notes","Date"];
  const rows = logs.map(l => {
    const coll = collections.find(c => c.id === l.collection_id);
    return [
      `"${l.title}"`, `"${l.creator||""}"`, l.media_type, getCat(l.media_type),
      l.verdict, l.genre||"", l.year_released||"", l.location_venue||"",
      l.location_city||"", l.lat||"", l.lng||"", coll?.name||"",
      `"${(l.notes||"").replace(/"/g, '""')}"`,
      new Date(l.logged_at).toLocaleDateString(),
    ];
  });
  const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = "my-culture-log.csv";
  a.click();
};
