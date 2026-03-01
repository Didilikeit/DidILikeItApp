import { useState, useEffect, useCallback, useRef } from "react";

export const useVoice = () => {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [supported, setSupported] = useState(false);
  const recRef = useRef(null);

  useEffect(() => {
    setSupported(!!(window.SpeechRecognition || window.webkitSpeechRecognition));
    // Stop recording if the component unmounts while active
    return () => {
      if (recRef.current) {
        recRef.current.onresult = null;
        recRef.current.onend = null;
        recRef.current.onerror = null;
        try { recRef.current.stop(); } catch { /* already stopped */ }
        recRef.current = null;
      }
    };
  }, []);

  const start = useCallback((onResult, onEnd) => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;

    // Stop any existing session before starting a new one
    if (recRef.current) {
      try { recRef.current.stop(); } catch { /* already stopped */ }
    }

    const rec = new SR();
    recRef.current = rec;
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-GB";

    let final = "";
    rec.onresult = e => {
      let interimStr = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript;
        else interimStr += e.results[i][0].transcript;
      }
      setInterim(interimStr);
      if (final) onResult(final);
    };
    rec.onend  = () => { setListening(false); setInterim(""); onEnd?.(); };
    rec.onerror = e => {
      if (e.error !== "aborted") console.warn("SpeechRecognition error:", e.error);
      setListening(false);
      setInterim("");
    };
    rec.start();
    setListening(true);
  }, []);

  const stop = useCallback(() => {
    if (recRef.current) {
      try { recRef.current.stop(); } catch { /* already stopped */ }
    }
    setListening(false);
    setInterim("");
  }, []);

  return { listening, interim, supported, start, stop };
};
