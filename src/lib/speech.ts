import { useCallback, useEffect, useRef, useState } from "react";

// ---------- Vorlesen (Sprachausgabe) ----------

function getSynth(): SpeechSynthesis | null {
  if (typeof window === "undefined") return null;
  return window.speechSynthesis ?? null;
}

export function speak(text: string) {
  const synth = getSynth();
  if (!synth || !text) return;
  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "de-DE";
  utterance.rate = 0.9;
  utterance.pitch = 1;
  const voice = synth.getVoices().find((v) => v.lang.startsWith("de"));
  if (voice) utterance.voice = voice;
  synth.speak(utterance);
}

export function stopSpeaking() {
  getSynth()?.cancel();
}

/** Liest den Text automatisch vor, wenn er sich ändert (nur wenn aktiv). */
export function useAutoSpeak(text: string, enabled: boolean) {
  useEffect(() => {
    if (!enabled || !text) return;
    // kleine Verzögerung, damit die Stimmen geladen sind
    const id = setTimeout(() => speak(text), 250);
    return () => {
      clearTimeout(id);
      stopSpeaking();
    };
  }, [text, enabled]);
}

export function useSpeechSupported() {
  const [supported, setSupported] = useState(false);
  useEffect(() => {
    setSupported(Boolean(getSynth()));
  }, []);
  return supported;
}

// ---------- Zuhören (Spracheingabe) ----------

type RecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: any) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};

function getRecognitionCtor(): (new () => RecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, unknown>;
  return (w["SpeechRecognition"] ?? w["webkitSpeechRecognition"]) as
    | (new () => RecognitionLike)
    | null;
}

export function useDictation(onText: (text: string) => void) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<RecognitionLike | null>(null);
  const onTextRef = useRef(onText);
  onTextRef.current = onText;

  useEffect(() => {
    setSupported(Boolean(getRecognitionCtor()));
    return () => recognitionRef.current?.abort();
  }, []);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  const start = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;
    stopSpeaking();
    const recognition = new Ctor();
    recognitionRef.current = recognition;
    recognition.lang = "de-DE";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (event: any) => {
      const text: string = event?.results?.[0]?.[0]?.transcript ?? "";
      if (text) onTextRef.current(text.trim());
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    setListening(true);
    recognition.start();
  }, []);

  const toggle = useCallback(() => {
    if (listening) stop();
    else start();
  }, [listening, start, stop]);

  return { supported, listening, start, stop, toggle };
}
