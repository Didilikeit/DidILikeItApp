export const buildTheme = darkMode => ({
  bg:       darkMode ? "#080808" : "#f2f2f2",
  card:     darkMode ? "#111111" : "#ffffff",
  text:     darkMode ? "#e0e0e0" : "#111111",
  subtext:  darkMode ? "#707070" : "#999",
  subtext2: darkMode ? "#a0a0a0" : "#666",
  border:   darkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
  border2:  darkMode ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.14)",
  input:    darkMode ? "#111" : "#fff",
  tabBar:   darkMode ? "#0d0d0d" : "#ffffff",
});

export const getVerdictStyle = (v, darkMode) => {
  switch (v) {
    case "I loved it":
      return { bg: darkMode?"rgba(255,215,0,0.12)":"#fff9c4", color: darkMode?"#f1c40f":"#9a7d0a", border: darkMode?"rgba(241,196,15,0.3)":"#fbc02d", emoji:"⭐" };
    case "I liked it":
      return { bg: darkMode?"rgba(76,175,80,0.15)":"#e8f5e9", color: darkMode?"#81c784":"#2e7d32", border: darkMode?"rgba(76,175,80,0.3)":"#c8e6c9", emoji:"🟢" };
    case "Meh":
      return { bg: darkMode?"rgba(255,152,0,0.15)":"#fff3e0", color: darkMode?"#ffb74d":"#ef6c00", border: darkMode?"rgba(255,152,0,0.3)":"#ffe0b2", emoji:"🟡" };
    case "I didn't like it":
      return { bg: darkMode?"rgba(244,67,54,0.15)":"#ffebee", color: darkMode?"#e57373":"#c62828", border: darkMode?"rgba(244,67,54,0.3)":"#ffcdd2", emoji:"🔴" };
    case "Want to go":
      return { bg: darkMode?"rgba(155,89,182,0.15)":"#f3e5f5", color: darkMode?"#ce93d8":"#6a1b9a", border: darkMode?"rgba(155,89,182,0.3)":"#e1bee7", emoji:"📍" };
    default:
      if (v?.startsWith("Currently"))
        return { bg: darkMode?"rgba(3,169,244,0.15)":"#e1f5fe", color: darkMode?"#4fc3f7":"#01579b", border: darkMode?"rgba(3,169,244,0.3)":"#b3e5fc", emoji:"▶️" };
      if (v?.startsWith("Want to"))
        return { bg: darkMode?"rgba(156,39,176,0.15)":"#f3e5f5", color: darkMode?"#ce93d8":"#4a148c", border: darkMode?"rgba(156,39,176,0.3)":"#e1bee7", emoji:"⏳" };
      return { bg: darkMode?"#1a1a1a":"#f0f0f0", color: darkMode?"#bbb":"#555", border: darkMode?"#222":"#ddd", emoji:"⚪" };
  }
};
