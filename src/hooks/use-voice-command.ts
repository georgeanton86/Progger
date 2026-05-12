"use client";
import { useState, useEffect, useRef, useCallback } from "react";

export type VoiceCommand =
  | "confirm-all"
  | "sign"
  | "quick-mode"
  | "back"
  | "regenerate"
  | "reject-assessment"
  | "reject-diagnostics"
  | "reject-treatment";

interface Options {
  onCommand: (cmd: VoiceCommand) => void;
  enabled?: boolean;
}

export function useVoiceCommand({ onCommand, enabled = true }: Options) {
  const [supported, setSupported] = useState(false);
  const [active, setActive] = useState(false);   // mic is on (tap-to-activate)
  const [listening, setListening] = useState(false); // wake word heard, awaiting command
  const [lastCommand, setLastCommand] = useState("");

  const onCommandRef = useRef(onCommand);
  useEffect(() => { onCommandRef.current = onCommand; }, [onCommand]);

  const recognitionRef = useRef<ReturnType<typeof createRecognition> | null>(null);
  const listeningRef = useRef(false);
  const autoOffRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fire = useCallback((cmd: VoiceCommand, label: string) => {
    setLastCommand(label);
    onCommandRef.current(cmd);
    listeningRef.current = false;
    setListening(false);
    setTimeout(() => setLastCommand(""), 2500);
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function createRecognition(SR: any, onResult: (t: string) => void) {
    const r = new SR();
    r.continuous = true;
    r.interimResults = true;
    r.lang = "en-US";
    r.maxAlternatives = 1;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    r.onresult = (event: any) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const transcript = Array.from(event.results as any[])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((res: any) => res[0].transcript.toLowerCase().trim())
        .join(" ");
      onResult(transcript);
    };
    r.onerror = () => { /* silent */ };
    return r;
  }

  useEffect(() => {
    if (typeof window === "undefined" || !enabled) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    setSupported(true);

    const handleTranscript = (transcript: string) => {
      // Wake word
      if (
        transcript.includes("hello prognosx") ||
        transcript.includes("hey prognosx") ||
        transcript.includes("hello prognos") ||
        transcript.includes("hello pronos")
      ) {
        if (!listeningRef.current) {
          listeningRef.current = true;
          setListening(true);
        }
        return;
      }

      if (!listeningRef.current) return;

      if (transcript.includes("confirm all") || transcript.includes("accept all")) {
        fire("confirm-all", "Confirm All ✓");
      } else if (transcript.includes("sign and send") || transcript.includes("sign all") || transcript.includes("sign it")) {
        fire("sign", "Sign & Send All ✓");
      } else if (transcript.includes("quick mode") || transcript.includes("speed mode")) {
        fire("quick-mode", "Quick Mode ✓");
      } else if (transcript.includes("go back") || transcript.includes("next patient")) {
        fire("back", "Going Back ✓");
      } else if (transcript.includes("regenerate") || transcript.includes("redo chart")) {
        fire("regenerate", "Regenerating ✓");
      } else if (transcript.includes("reject assessment")) {
        fire("reject-assessment", "Assessment Rejected ✓");
      } else if (transcript.includes("reject diagnostics") || transcript.includes("decline labs")) {
        fire("reject-diagnostics", "Diagnostics Rejected ✓");
      } else if (transcript.includes("reject treatment")) {
        fire("reject-treatment", "Treatment Rejected ✓");
      }
    };

    recognitionRef.current = createRecognition(SR, handleTranscript);
  }, [enabled, fire]);

  const toggle = useCallback(() => {
    const rec = recognitionRef.current;
    if (!rec) return;

    if (active) {
      // Turn off
      if (autoOffRef.current) clearTimeout(autoOffRef.current);
      rec.onend = null;
      try { rec.stop(); } catch { /* ok */ }
      setActive(false);
      setListening(false);
      listeningRef.current = false;
    } else {
      // Turn on — auto-off after 45s
      try { rec.start(); } catch { /* already running */ }
      rec.onend = () => {
        if (active) try { rec.start(); } catch { /* ok */ }
      };
      setActive(true);
      if (autoOffRef.current) clearTimeout(autoOffRef.current);
      autoOffRef.current = setTimeout(() => {
        rec.onend = null;
        try { rec.stop(); } catch { /* ok */ }
        setActive(false);
        setListening(false);
        listeningRef.current = false;
      }, 45000);
    }
  }, [active]);

  useEffect(() => {
    return () => {
      if (autoOffRef.current) clearTimeout(autoOffRef.current);
      const rec = recognitionRef.current;
      if (rec) { rec.onend = null; try { rec.stop(); } catch { /* ok */ } }
    };
  }, []);

  return { supported, active, listening, lastCommand, toggle };
}
