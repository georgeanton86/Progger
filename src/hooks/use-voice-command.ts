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
  const [listening, setListening] = useState(false); // active after wake word
  const [lastCommand, setLastCommand] = useState("");

  const onCommandRef = useRef(onCommand);
  useEffect(() => { onCommandRef.current = onCommand; }, [onCommand]);

  const listeningRef = useRef(false);

  const fire = useCallback((cmd: VoiceCommand, label: string) => {
    setLastCommand(label);
    onCommandRef.current(cmd);
    listeningRef.current = false;
    setListening(false);
    // Reset lastCommand display after 2s
    setTimeout(() => setLastCommand(""), 2000);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !enabled) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    setSupported(true);

    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.maxAlternatives = 1;

    let wakeTimeout: ReturnType<typeof setTimeout> | null = null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const transcript = Array.from(event.results as any[])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((r: any) => r[0].transcript.toLowerCase().trim())
        .join(" ");

      // Wake word detection
      if (
        transcript.includes("hello prognosx") ||
        transcript.includes("hey prognosx") ||
        transcript.includes("hello prognos") ||
        transcript.includes("hello pronos")
      ) {
        if (!listeningRef.current) {
          listeningRef.current = true;
          setListening(true);
          // Auto-cancel after 8s if no command
          if (wakeTimeout) clearTimeout(wakeTimeout);
          wakeTimeout = setTimeout(() => {
            listeningRef.current = false;
            setListening(false);
          }, 8000);
        }
        return;
      }

      if (!listeningRef.current) return;

      // Command matching
      if (transcript.includes("confirm all") || transcript.includes("confirm everything") || transcript.includes("accept all")) {
        fire("confirm-all", "Confirm All ✓");
      } else if (transcript.includes("sign and send") || transcript.includes("sign all") || transcript.includes("send all") || transcript.includes("sign it")) {
        fire("sign", "Sign & Send All ✓");
      } else if (transcript.includes("quick mode") || transcript.includes("quick confirm") || transcript.includes("speed mode")) {
        fire("quick-mode", "Quick Mode ✓");
      } else if (transcript.includes("go back") || transcript.includes("back to schedule") || transcript.includes("next patient")) {
        fire("back", "Going Back ✓");
      } else if (transcript.includes("regenerate") || transcript.includes("try again") || transcript.includes("redo chart")) {
        fire("regenerate", "Regenerating ✓");
      } else if (transcript.includes("reject assessment") || transcript.includes("decline assessment")) {
        fire("reject-assessment", "Assessment Rejected ✓");
      } else if (transcript.includes("reject diagnostics") || transcript.includes("decline labs")) {
        fire("reject-diagnostics", "Diagnostics Rejected ✓");
      } else if (transcript.includes("reject treatment") || transcript.includes("decline treatment")) {
        fire("reject-treatment", "Treatment Rejected ✓");
      }
    };

    recognition.onerror = () => { /* swallow mic errors silently */ };
    recognition.onend = () => {
      // Auto-restart for always-on listening
      try { recognition.start(); } catch { /* already started */ }
    };

    try { recognition.start(); } catch { /* not yet ready */ }

    return () => {
      if (wakeTimeout) clearTimeout(wakeTimeout);
      try { recognition.stop(); } catch { /* already stopped */ }
    };
  }, [enabled, fire]);

  return { supported, listening, lastCommand };
}
