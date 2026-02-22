import React, { useRef } from "react";
import { useVoice } from "../hooks/useVoice.js";

export const MicButton = ({ currentText, onTextChange, theme, darkMode, size = "normal" }) => {
  const { listening, interim, supported, start, stop } = useVoice();
  const finalRef = useRef("");

  if (!supported) return null;

  const handleToggle = () => {
    if (listening) { stop(); return; }
    finalRef.current = "";
    start(
      final => { finalRef.current = final; },
      () => {
        const transcript = finalRef.current.trim();
        if (!transcript) return;
        if (currentText?.trim()) {
          const addTo = window.confirm("You already have notes.\n\nOK = Add to existing\nCancel = Replace");
          onTextChange(addTo ? currentText.trim() + " " + transcript : transcript);
        } else {
          onTextChange(transcript);
        }
      }
    );
  };

  const sz = size === "small" ? 28 : 34;

  return (
    <button
      onClick={handleToggle}
      title={listening ? "Stop recording" : "Record voice note"}
      style={{
        width: `${sz}px`, height: `${sz}px`, borderRadius: "50%",
        border: `1.5px solid ${listening ? "#e74c3c" : theme.border2}`,
        background: listening ? "rgba(231,76,60,0.12)" : "none",
        color: listening ? "#e74c3c" : theme.subtext,
        fontSize: size === "small" ? "13px" : "15px",
        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0, transition: "all 0.2s", position: "relative",
        animation: listening ? "micpulse 1.2s infinite" : "none",
      }}
    >
      {listening ? "⏹" : "🎙"}
      {listening && interim && (
        <div style={{
          position: "absolute", bottom: "calc(100% + 6px)", left: "50%",
          transform: "translateX(-50%)", background: darkMode ? "#1a1a1a" : "#fff",
          border: `1px solid ${theme.border2}`, borderRadius: "8px",
          padding: "4px 8px", fontSize: "10px", color: theme.subtext2,
          whiteSpace: "nowrap", maxWidth: "180px", overflow: "hidden",
          textOverflow: "ellipsis", boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
          zIndex: 10, fontStyle: "italic",
        }}>
          {interim}
        </div>
      )}
      <style>{`@keyframes micpulse{0%,100%{box-shadow:0 0 0 0 rgba(231,76,60,0.4)}50%{box-shadow:0 0 0 6px rgba(231,76,60,0)}}`}</style>
    </button>
  );
};
