import React, { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

// Environment Variables - Make sure these are set in Vercel/CodeSandbox
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

function App() {
  const [items, setItems] = useState([]);
  const [title, setTitle] = useState("");
  const [type, setType] = useState("Movie");
  const [liked, setLiked] = useState("Yes");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchItems();
  }, []);

  async function fetchItems() {
    setLoading(true);
    const { data, error } = await supabase
      .from("media_entries")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) console.error("Error fetching:", error);
    else setItems(data || []);
    setLoading(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title) return;

    const { error } = await supabase
      .from("media_entries")
      .insert([{ title, type, liked }]);

    if (error) {
      alert("Error saving to database!");
    } else {
      setTitle("");
      fetchItems();
    }
  }

  return (
    <div
      style={{
        padding: "40px",
        maxWidth: "500px",
        margin: "0 auto",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      }}
    >
      <h1 style={{ textAlign: "center", color: "#333" }}>Did I Like It?</h1>

      <form
        onSubmit={handleSubmit}
        style={{
          marginBottom: "40px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        <input
          placeholder="Title (e.g. Abbey Road)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{
            padding: "12px",
            fontSize: "16px",
            borderRadius: "8px",
            border: "1px solid #ccc",
          }}
        />

        <div style={{ display: "flex", gap: "10px" }}>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            style={{ flex: 1, padding: "10px", borderRadius: "8px" }}
          >
            <option value="Movie">Movie</option>
            <option value="Book">Book</option>
            <option value="Album">Album</option>
          </select>

          <select
            value={liked}
            onChange={(e) => setLiked(e.target.value)}
            style={{ flex: 1, padding: "10px", borderRadius: "8px" }}
          >
            <option value="Yes">👍 Liked it</option>
            <option value="No">👎 Not for me</option>
            <option value="Meh">😐 It was okay</option>
          </select>
        </div>

        <button
          type="submit"
          style={{
            padding: "12px",
            background: "#0070f3",
            color: "white",
            border: "none",
            borderRadius: "8px",
            fontSize: "16px",
            fontWeight: "bold",
            cursor: "pointer",
          }}
        >
          Add to My Diary
        </button>
      </form>

      <hr
        style={{
          border: "0",
          borderTop: "1px solid #eee",
          marginBottom: "30px",
        }}
      />

      <h2 style={{ fontSize: "1.2rem", color: "#666", marginBottom: "20px" }}>
        My History
      </h2>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {items.map((item) => (
            <li
              key={item.id}
              style={{
                padding: "16px 0",
                borderBottom: "1px solid #f0f0f0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span
                  style={{
                    fontSize: "1.1rem",
                    fontWeight: "600",
                    color: "#222",
                  }}
                >
                  {item.title}
                </span>
                <span
                  style={{
                    fontSize: "0.75rem",
                    color: "#888",
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                    marginTop: "4px",
                    fontWeight: "bold",
                  }}
                >
                  {item.type}
                </span>
              </div>
              <span style={{ fontSize: "1.5rem" }}>
                {item.liked === "Yes"
                  ? "✅"
                  : item.liked === "No"
                  ? "❌"
                  : "🤷"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default App;
