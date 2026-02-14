import { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

// --- KEEP YOUR KEYS HERE ---
const SUPABASE_URL = "https://gfqmbvaierdvlfwzyzlj.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_3QrJ82zuDQi8sxoWmxi0MA_mWZ98OOk";
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
  const [searchTerm, setSearchTerm] = useState("");
  const [editingId, setEditingId] = useState(null);

  // 1. IMPROVED AUTH LISTENER
  useEffect(() => {
    const getInitialSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setLoading(false);
    };

    getInitialSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 2. AGGRESSIVE LOGIN ACTION
  const handleLogin = async () => {
    if (!email || !password) return alert("Enter email and password!");
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert("Login error: " + error.message);
      setLoading(false);
    } else {
      // Manually set the user to force the UI to flip immediately
      setUser(data.user);
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) alert(error.message);
    else alert("Sign up successful! Now try logging in.");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setLogs([]);
  };

  // 3. DATA FETCHING
  const fetchLogs = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("logs")
      .select("*")
      .order("logged_at", { ascending: false });
    if (!error) setLogs(data || []);
  }, [user]);

  useEffect(() => {
    if (user) fetchLogs();
  }, [user, fetchLogs]);

  // 4. SAVE ACTION
  const handleSave = async () => {
    if (!title || !verdict) return alert("Title and Verdict required!");
    const logData = {
      title,
      creator,
      notes,
      media_type: mediaType,
      verdict,
      year_released: year || null,
      user_id: user.id,
    };
    if (editingId) {
      await supabase.from("logs").update(logData).eq("id", editingId);
    } else {
      await supabase.from("logs").insert([logData]);
    }
    setTitle("");
    setCreator("");
    setNotes("");
    setYear("");
    setVerdict("");
    setEditingId(null);
    fetchLogs();
  };

  const deleteLog = async (id) => {
    if (confirm("Delete forever?")) {
      await supabase.from("logs").delete().eq("id", id);
      fetchLogs();
    }
  };

  const startEdit = (log) => {
    setEditingId(log.id);
    setTitle(log.title);
    setCreator(log.creator || "");
    setNotes(log.notes || "");
    setYear(log.year_released || "");
    setVerdict(log.verdict);
    setMediaType(log.media_type);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const filteredLogs = logs.filter((log) => {
    const searchable = [log.title, log.creator, log.notes, log.year_released]
      .join(" ")
      .toLowerCase();
    return searchable.includes(searchTerm.toLowerCase());
  });

  if (loading)
    return (
      <div
        style={{
          textAlign: "center",
          padding: "50px",
          fontFamily: "sans-serif",
        }}
      >
        Loading...
      </div>
    );

  // --- LOGIN SCREEN ---
  if (!user) {
    return (
      <div
        style={{
          padding: "40px 20px",
          maxWidth: "400px",
          margin: "auto",
          textAlign: "center",
          fontFamily: "sans-serif",
        }}
      >
        <h1 style={{ fontSize: "50px", marginBottom: "10px" }}>🤔</h1>
        <h2 style={{ marginBottom: "30px" }}>Did I Like It?</h2>
        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={inputStyle}
        />
        <input
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={inputStyle}
        />
        <button onClick={handleLogin} style={primaryBtn}>
          Login
        </button>
        <button
          onClick={handleSignUp}
          style={{
            ...primaryBtn,
            background: "#eee",
            color: "#000",
            marginTop: "10px",
          }}
        >
          Create Account
        </button>
      </div>
    );
  }

  // --- MAIN APP ---
  return (
    <div
      style={{
        padding: "20px",
        maxWidth: "500px",
        margin: "auto",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "10px",
        }}
      >
        <button
          onClick={handleLogout}
          style={{
            background: "none",
            border: "none",
            color: "#888",
            cursor: "pointer",
          }}
        >
          Logout
        </button>
        <h2 style={{ margin: 0 }}>🤔 Did I Like It?</h2>
        <div style={{ width: "50px" }}></div>
      </div>

      <div
        style={{
          background: "#fff",
          padding: "20px",
          borderRadius: "15px",
          border: "2px solid #000",
          marginBottom: "30px",
          boxShadow: "5px 5px 0px #000",
        }}
      >
        <div style={{ display: "flex", gap: "5px", marginBottom: "15px" }}>
          {["Book", "Movie", "Album"].map((t) => (
            <button
              key={t}
              onClick={() => setMediaType(t)}
              style={{
                flex: 1,
                padding: "10px",
                borderRadius: "8px",
                border: "none",
                background: mediaType === t ? "#000" : "#eee",
                color: mediaType === t ? "#fff" : "#000",
                fontWeight: "bold",
              }}
            >
              {t}
            </button>
          ))}
        </div>
        <input
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={inputStyle}
        />
        <div style={{ display: "flex", gap: "10px" }}>
          <input
            placeholder={
              mediaType === "Book"
                ? "Author"
                : mediaType === "Movie"
                ? "Director"
                : "Artist"
            }
            value={creator}
            onChange={(e) => setCreator(e.target.value)}
            style={{ ...inputStyle, flex: 2 }}
          />
          <input
            placeholder="Year"
            value={year}
            type="number"
            onChange={(e) => setYear(e.target.value)}
            style={{ ...inputStyle, flex: 1 }}
          />
        </div>
        <textarea
          placeholder="My thoughts..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          style={{ ...inputStyle, height: "60px", resize: "none" }}
        />
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {["Liked", "Kind of", "Didn't Like"].map((v) => (
            <button
              key={v}
              onClick={() => setVerdict(v)}
              style={{
                ...verdictBtn,
                background:
                  verdict === v
                    ? v === "Liked"
                      ? "#4caf50"
                      : v === "Kind of"
                      ? "#ff9800"
                      : "#f44336"
                    : "#fff",
                color: verdict === v ? "#fff" : "#000",
              }}
            >
              {v === "Liked"
                ? "🟢 I liked it"
                : v === "Kind of"
                ? "🟡 It was ok"
                : "🔴 I didn't like it"}
            </button>
          ))}
        </div>
        <button
          onClick={handleSave}
          style={{ ...primaryBtn, marginTop: "20px" }}
        >
          {editingId ? "UPDATE ENTRY" : "SAVE TO LOG"}
        </button>
      </div>

      <input
        placeholder="🔍 Search..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        style={{ ...inputStyle, borderRadius: "30px" }}
      />

      <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
        {filteredLogs.map((log) => (
          <div
            key={log.id}
            style={{ padding: "15px 0", borderBottom: "1px solid #eee" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "18px", fontWeight: "bold" }}>
                  {log.title}{" "}
                  {log.year_released && (
                    <span style={{ fontWeight: "normal", color: "#888" }}>
                      ({log.year_released})
                    </span>
                  )}
                </div>
                <div style={{ color: "#444" }}>{log.creator}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <span style={{ fontSize: "20px" }}>
                  {log.verdict === "Liked"
                    ? "🟢"
                    : log.verdict === "Kind of"
                    ? "🟡"
                    : "🔴"}
                </span>
                <div style={{ display: "flex", gap: "10px", marginTop: "5px" }}>
                  <button onClick={() => startEdit(log)} style={smallBtn}>
                    Edit
                  </button>
                  <button
                    onClick={() => deleteLog(log.id)}
                    style={{ ...smallBtn, color: "red" }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
            {log.notes && (
              <div
                style={{
                  marginTop: "10px",
                  padding: "10px",
                  background: "#f9f9f9",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontStyle: "italic",
                }}
              >
                "{log.notes}"
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: "12px",
  marginBottom: "10px",
  borderRadius: "8px",
  border: "1px solid #ddd",
  boxSizing: "border-box",
  fontSize: "16px",
};
const primaryBtn = {
  width: "100%",
  padding: "15px",
  background: "#000",
  color: "#fff",
  borderRadius: "8px",
  border: "none",
  fontWeight: "bold",
  cursor: "pointer",
  fontSize: "16px",
};
const verdictBtn = {
  padding: "12px",
  borderRadius: "8px",
  border: "1px solid #ddd",
  cursor: "pointer",
  textAlign: "left",
  fontWeight: "500",
};
const smallBtn = {
  background: "none",
  border: "none",
  fontSize: "12px",
  cursor: "pointer",
  color: "#0070f3",
  padding: 0,
};
