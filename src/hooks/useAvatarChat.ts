import { useCallback, useEffect, useRef, useState } from "react";
import { generateAvatarResponse } from "../services/openai.js";

export function useAvatarChat() {
  const abortControllerRef = useRef<AbortController | null>(null);
  const [aiResponse, setAiResponse] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const hasApiKey = Boolean(import.meta.env.VITE_OPENAI_API_KEY);

  const sendTranscript = useCallback(async (transcript: string) => {
    const message = transcript.trim();

    if (!message) {
      setErrorMessage("Record or type a transcript before sending it to AI.");
      return;
    }

    abortControllerRef.current?.abort();
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setIsGenerating(true);
    setErrorMessage("");

    try {
      const response = await generateAvatarResponse(message, {
        signal: abortController.signal,
      });
      setAiResponse(response);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setErrorMessage(error instanceof Error ? error.message : "Could not generate an AI response.");
    } finally {
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
        setIsGenerating(false);
      }
    }
  }, []);

  const clearResponse = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setAiResponse("");
    setErrorMessage("");
    setIsGenerating(false);
  }, []);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  return {
    aiResponse,
    isGenerating,
    errorMessage,
    hasApiKey,
    sendTranscript,
    clearResponse,
  };
}
