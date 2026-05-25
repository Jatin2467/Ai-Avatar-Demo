import { useCallback, useEffect, useMemo, useState } from "react";
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";

type SpeechStatus = "ready" | "unsupported" | "blocked" | "listening" | "starting" | "stopping";

export function useAvatarSpeechRecognition() {
  const {
    transcript,
    interimTranscript,
    finalTranscript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
    browserSupportsContinuousListening,
    isMicrophoneAvailable,
  } = useSpeechRecognition();
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const startListening = useCallback(async () => {
    if (!browserSupportsSpeechRecognition || !isMicrophoneAvailable || listening || isStarting) return;

    setErrorMessage("");
    setIsStarting(true);

    try {
      await SpeechRecognition.startListening({
        continuous: browserSupportsContinuousListening,
        language: "en-US",
      });
    } catch {
      setErrorMessage("Microphone access could not be started. Check browser permissions and try again.");
    } finally {
      setIsStarting(false);
    }
  }, [
    browserSupportsContinuousListening,
    browserSupportsSpeechRecognition,
    isMicrophoneAvailable,
    isStarting,
    listening,
  ]);

  const stopListening = useCallback(async () => {
    if (!listening || isStopping) return;

    setIsStopping(true);

    try {
      await SpeechRecognition.stopListening();
    } catch {
      setErrorMessage("Speech recognition could not be stopped cleanly. It has been reset.");
      await SpeechRecognition.abortListening();
    } finally {
      setIsStopping(false);
    }
  }, [isStopping, listening]);

  const reset = useCallback(() => {
    resetTranscript();
    setErrorMessage("");
  }, [resetTranscript]);

  const status: SpeechStatus = useMemo(() => {
    if (!browserSupportsSpeechRecognition) return "unsupported";
    if (!isMicrophoneAvailable) return "blocked";
    if (isStarting) return "starting";
    if (isStopping) return "stopping";
    if (listening) return "listening";
    return "ready";
  }, [browserSupportsSpeechRecognition, isMicrophoneAvailable, isStarting, isStopping, listening]);

  useEffect(() => {
    return () => {
      void SpeechRecognition.abortListening();
    };
  }, []);

  return {
    transcript,
    interimTranscript,
    finalTranscript,
    listening,
    isStarting,
    isStopping,
    status,
    errorMessage,
    canUseSpeech: browserSupportsSpeechRecognition && isMicrophoneAvailable,
    supportsContinuousListening: browserSupportsContinuousListening,
    startListening,
    stopListening,
    resetTranscript: reset,
  };
}
