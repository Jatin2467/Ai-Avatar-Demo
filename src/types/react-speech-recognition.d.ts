declare module "react-speech-recognition" {
  export type StartListeningOptions = {
    continuous?: boolean;
    language?: string;
  };

  export type SpeechRecognitionHookResult = {
    transcript: string;
    interimTranscript: string;
    finalTranscript: string;
    listening: boolean;
    resetTranscript: () => void;
    browserSupportsSpeechRecognition: boolean;
    browserSupportsContinuousListening: boolean;
    isMicrophoneAvailable: boolean;
  };

  const SpeechRecognition: {
    startListening: (options?: StartListeningOptions) => Promise<void> | void;
    stopListening: () => Promise<void> | void;
    abortListening: () => Promise<void> | void;
    browserSupportsSpeechRecognition: () => boolean;
  };

  export function useSpeechRecognition(): SpeechRecognitionHookResult;

  export default SpeechRecognition;
}
