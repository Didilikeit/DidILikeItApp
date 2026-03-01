import React, { useEffect, useRef, useState } from "react";

// ─── TOAST ────────────────────────────────────────────────────────────────────
// Renders a non-blocking notification at the bottom of the screen.
// Replaces all alert() calls throughout the app.
export const Toast = ({ message, type = "info", onDismiss }) => {
  useEffect(() => {
    const t = setTimeout(onDismiss, 3500);
    return () => clearTimeout(t);
  }, [message, onDismiss]);

  const bg = type === "error" ? "#c0392b"
    : type === "success" ? "#27ae60"
    : "#1a1a2e";

  return (
    <>
      <style>{`
        @keyframes toastSlideUp {
          from { transform: translateY(20px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
      <div
        onClick={onDismiss}
        style={{
          position: "fixed", bottom: 90, left: 16, right: 16, zIndex: 9999,
          background: bg, color: "#fff",
          padding: "14px 18px", borderRadius: 14,
          fontWeight: 600, fontSize: 14, lineHeight: 1.4,
          boxShadow: "0 6px 24px rgba(0,0,0,0.5)",
          animation: "toastSlideUp 0.2s ease",
          cursor: "pointer",
        }}
      >
        {message}
      </div>
    </>
  );
};

// ─── CONFIRM MODAL ────────────────────────────────────────────────────────────
// Replaces window.confirm(). Calls onConfirm() or onCancel() depending on choice.
export const ConfirmModal = ({ message, confirmLabel = "Confirm", danger = false, onConfirm, onCancel }) => (
  <>
    <style>{`
      @keyframes confirmFadeIn { from { opacity:0; transform:scale(0.95); } to { opacity:1; transform:scale(1); } }
    `}</style>
    <div
      onClick={onCancel}
      style={{
        position: "fixed", inset: 0, zIndex: 9998,
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "24px",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "#1a1a2e", borderRadius: 20, padding: "28px 24px",
          maxWidth: 340, width: "100%", textAlign: "center",
          border: "1px solid rgba(255,255,255,0.1)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
          animation: "confirmFadeIn 0.2s ease",
        }}
      >
        <div style={{ fontSize: 15, color: "#e0e0e0", lineHeight: 1.6, marginBottom: 24 }}>
          {message}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1, padding: "12px", borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "none", color: "rgba(255,255,255,0.5)",
              fontSize: 14, fontWeight: 600, cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              flex: 1, padding: "12px", borderRadius: 12,
              border: "none",
              background: danger ? "#c0392b" : "#3498db",
              color: "#fff",
              fontSize: 14, fontWeight: 700, cursor: "pointer",
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  </>
);

// ─── PROMPT MODAL ─────────────────────────────────────────────────────────────
// Replaces window.prompt(). Resolves with the entered value or null on cancel.
export const PromptModal = ({ message, placeholder = "", type = "text", onSubmit, onCancel }) => {
  const [value, setValue] = useState("");
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleSubmit = e => {
    e.preventDefault();
    if (value.trim()) onSubmit(value.trim());
  };

  return (
    <>
      <style>{`
        @keyframes promptFadeIn { from { opacity:0; transform:scale(0.95); } to { opacity:1; transform:scale(1); } }
      `}</style>
      <div
        onClick={onCancel}
        style={{
          position: "fixed", inset: 0, zIndex: 9998,
          background: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "24px",
        }}
      >
        <form
          onClick={e => e.stopPropagation()}
          onSubmit={handleSubmit}
          style={{
            background: "#1a1a2e", borderRadius: 20, padding: "28px 24px",
            maxWidth: 340, width: "100%",
            border: "1px solid rgba(255,255,255,0.1)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
            animation: "promptFadeIn 0.2s ease",
          }}
        >
          <div style={{ fontSize: 15, color: "#e0e0e0", lineHeight: 1.6, marginBottom: 16 }}>
            {message}
          </div>
          <input
            ref={inputRef}
            type={type}
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder={placeholder}
            style={{
              width: "100%", padding: "12px 14px", borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.15)",
              background: "rgba(255,255,255,0.05)",
              color: "#fff", fontSize: 14, outline: "none",
              boxSizing: "border-box", marginBottom: 16,
            }}
          />
          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              onClick={onCancel}
              style={{
                flex: 1, padding: "12px", borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "none", color: "rgba(255,255,255,0.5)",
                fontSize: 14, fontWeight: 600, cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!value.trim()}
              style={{
                flex: 1, padding: "12px", borderRadius: 12,
                border: "none", background: value.trim() ? "#3498db" : "rgba(52,152,219,0.3)",
                color: "#fff", fontSize: 14, fontWeight: 700, cursor: value.trim() ? "pointer" : "default",
              }}
            >
              Submit
            </button>
          </div>
        </form>
      </div>
    </>
  );
};

// ─── useDialogs HOOK ──────────────────────────────────────────────────────────
// Central dialog manager. Mount <DialogLayer /> once at the app root and call
// the returned helpers anywhere:
//
//   const { toast, confirm, prompt } = useDialogs();
//   toast("Saved!", "success");
//   const ok = await confirm("Delete this?", { danger: true });
//   const pw = await prompt("Enter new password", { type: "password" });
//
export const useDialogs = () => {
  const [toastState, setToastState] = useState(null);   // { message, type }
  const [confirmState, setConfirmState] = useState(null); // { message, confirmLabel, danger, resolve }
  const [promptState, setPromptState] = useState(null);   // { message, placeholder, type, resolve }

  const toast = (message, type = "info") => {
    setToastState({ message, type });
  };

  const confirm = (message, { confirmLabel = "Confirm", danger = false } = {}) =>
    new Promise(resolve => {
      setConfirmState({ message, confirmLabel, danger, resolve });
    });

  const prompt = (message, { placeholder = "", type = "text" } = {}) =>
    new Promise(resolve => {
      setPromptState({ message, placeholder, type, resolve });
    });

  const DialogLayer = () => (
    <>
      {toastState && (
        <Toast
          message={toastState.message}
          type={toastState.type}
          onDismiss={() => setToastState(null)}
        />
      )}
      {confirmState && (
        <ConfirmModal
          message={confirmState.message}
          confirmLabel={confirmState.confirmLabel}
          danger={confirmState.danger}
          onConfirm={() => { confirmState.resolve(true);  setConfirmState(null); }}
          onCancel={() =>  { confirmState.resolve(false); setConfirmState(null); }}
        />
      )}
      {promptState && (
        <PromptModal
          message={promptState.message}
          placeholder={promptState.placeholder}
          type={promptState.type}
          onSubmit={v => { promptState.resolve(v);    setPromptState(null); }}
          onCancel={() => { promptState.resolve(null); setPromptState(null); }}
        />
      )}
    </>
  );

  return { toast, confirm, prompt, DialogLayer };
};
