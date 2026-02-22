import { useState, useEffect, useCallback, useRef } from "react";

export const useVoice = () => {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [supported, setSupported] = useState(false);
  const recRef = useRef(null);

  useEffect(() => {
    setSupported(!!(window.SpeechRecognition || window.webkitSpeechRecognition));
  }, []);

  const start = useCallback((onResult, onEnd) => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;

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
    rec.onerror = () => { setListening(false); setInterim(""); };
    rec.start();
    setListening(true);
  }, []);

  const stop = useCallback(() => {
    recRef.current?.stop();
    setListening(false);
    setInterim("");
  }, []);

  return { listening, interim, supported, start, stop };
};
