import { useCallback, useEffect, useMemo, useRef, useState } from "react";

function scoreVoice(voice: SpeechSynthesisVoice) {
  const name = voice.name.toLowerCase();
  const lang = voice.lang.toLowerCase();
  let score = 0;

  if (lang.startsWith("en")) score += 12;
  if (voice.localService) score += 4;
  if (name.includes("natural")) score += 10;
  if (name.includes("neural")) score += 10;
  if (name.includes("premium")) score += 7;
  if (name.includes("google")) score += 5;
  if (name.includes("microsoft")) score += 5;
  if (name.includes("zira") || name.includes("aria") || name.includes("jenny") || name.includes("samantha")) score += 4;
  if (name.includes("compact") || name.includes("novelty")) score -= 5;

  return score;
}

function selectNaturalVoice(voices: SpeechSynthesisVoice[]) {
  return [...voices].sort((first, second) => scoreVoice(second) - scoreVoice(first))[0] ?? null;
}

export function useAvatarSpeechSynthesis() {
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const canSpeak = typeof window !== "undefined" && "speechSynthesis" in window;

  const selectedVoice = useMemo(() => selectNaturalVoice(voices), [voices]);

  const loadVoices = useCallback(() => {
    if (!canSpeak) return;
    setVoices(window.speechSynthesis.getVoices());
  }, [canSpeak]);

  const stopSpeaking = useCallback(() => {
    if (!canSpeak) return;

    window.speechSynthesis.cancel();
    utteranceRef.current = null;
    setIsSpeaking(false);
  }, [canSpeak]);

  const speak = useCallback(
    (text: string) => {
      const message = text.trim();

      if (!message) return;

      if (!canSpeak) {
        setErrorMessage("This browser does not support text-to-speech.");
        return;
      }

      stopSpeaking();
      setErrorMessage("");

      const utterance = new SpeechSynthesisUtterance(message);
      utterance.voice = selectedVoice;
      utterance.lang = selectedVoice?.lang ?? "en-US";
      utterance.rate = 0.96;
      utterance.pitch = 1;
      utterance.volume = 1;

      utterance.onstart = () => {
        setIsSpeaking(true);
      };

      utterance.onend = () => {
        if (utteranceRef.current === utterance) {
          utteranceRef.current = null;
          setIsSpeaking(false);
        }
      };

      utterance.onerror = () => {
        if (utteranceRef.current === utterance) {
          utteranceRef.current = null;
          setIsSpeaking(false);
          setErrorMessage("Voice playback was interrupted. Try speaking the response again.");
        }
      };

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    },
    [canSpeak, selectedVoice, stopSpeaking],
  );

  useEffect(() => {
    if (!canSpeak) return;

    const voiceLoadTimer = window.setTimeout(loadVoices, 0);
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);

    return () => {
      window.clearTimeout(voiceLoadTimer);
      window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
      window.speechSynthesis.cancel();
    };
  }, [canSpeak, loadVoices]);

  return {
    canSpeak,
    isSpeaking,
    selectedVoiceName: selectedVoice?.name ?? "Browser default",
    errorMessage,
    speak,
    stopSpeaking,
  };
}
