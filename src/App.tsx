import { Environment, OrbitControls } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { VRMLoaderPlugin } from "@pixiv/three-vrm";
import type { VRM } from "@pixiv/three-vrm";
import { BackgroundEffects } from "./components/BackgroundEffects";
import { ThinkingIndicator } from "./components/ThinkingIndicator";
import { useAvatarChat } from "./hooks/useAvatarChat";
import { useAvatarSpeechRecognition } from "./hooks/useAvatarSpeechRecognition";
import { useAvatarSpeechSynthesis } from "./hooks/useAvatarSpeechSynthesis";
import { useTypedText } from "./hooks/useTypedText";


type AvatarProps = {
  isSpeaking: boolean;
  onLoaded: () => void;
};

type BoneRestPose = {
  rotation: THREE.Euler;
};

function damp(current: number, target: number, lambda: number, delta: number) {
  return THREE.MathUtils.lerp(current, target, 1 - Math.exp(-lambda * delta));
}

function poseRelaxedArms(vrm: VRM) {
  const leftUpperArm = vrm.humanoid.getNormalizedBoneNode("leftUpperArm");
  const rightUpperArm = vrm.humanoid.getNormalizedBoneNode("rightUpperArm");
  const leftLowerArm = vrm.humanoid.getNormalizedBoneNode("leftLowerArm");
  const rightLowerArm = vrm.humanoid.getNormalizedBoneNode("rightLowerArm");
  const leftHand = vrm.humanoid.getNormalizedBoneNode("leftHand");
  const rightHand = vrm.humanoid.getNormalizedBoneNode("rightHand");

  if (leftUpperArm) {
    leftUpperArm.rotation.z += Math.PI * 0.42;
    leftUpperArm.rotation.x -= 0.08;
  }

  if (rightUpperArm) {
    rightUpperArm.rotation.z -= Math.PI * 0.42;
    rightUpperArm.rotation.x -= 0.08;
  }

  if (leftLowerArm) {
    leftLowerArm.rotation.z += 0.1;
    leftLowerArm.rotation.y += 0.06;
  }

  if (rightLowerArm) {
    rightLowerArm.rotation.z -= 0.1;
    rightLowerArm.rotation.y -= 0.06;
  }

  if (leftHand) {
    leftHand.rotation.z += 0.04;
  }

  if (rightHand) {
    rightHand.rotation.z -= 0.04;
  }
}

function Avatar({ isSpeaking, onLoaded }: AvatarProps) {
  const groupRef = useRef<THREE.Group>(null);
  const vrmRef = useRef<VRM | null>(null);
  const headRef = useRef<THREE.Object3D | null>(null);
  const chestRef = useRef<THREE.Object3D | null>(null);
  const headRestRef = useRef<BoneRestPose | null>(null);
  const chestRestRef = useRef<BoneRestPose | null>(null);
  const speakingRef = useRef(isSpeaking);

  useEffect(() => {
    speakingRef.current = isSpeaking;
  }, [isSpeaking]);

  useEffect(() => {
    const avatarGroup = groupRef.current;
    if (!avatarGroup) return;

    let loadedScene: THREE.Object3D | null = null;
    let isCancelled = false;
    const loader = new GLTFLoader();

    loader.register((parser) => new VRMLoaderPlugin(parser));

    loader.load("/avatar.vrm", (gltf) => {
      if (isCancelled) return;

      const vrm = gltf.userData.vrm as VRM;
      const vrmScene = vrm.scene;
      loadedScene = vrmScene;
      vrmRef.current = vrm;
      headRef.current = vrm.humanoid.getNormalizedBoneNode("head");
      chestRef.current = vrm.humanoid.getNormalizedBoneNode("chest") ?? vrm.humanoid.getNormalizedBoneNode("spine");
      headRestRef.current = headRef.current ? { rotation: headRef.current.rotation.clone() } : null;
      chestRestRef.current = chestRef.current ? { rotation: chestRef.current.rotation.clone() } : null;
      poseRelaxedArms(vrm);
      vrmScene.rotation.y = Math.PI;
      avatarGroup.add(vrmScene);
      onLoaded();
    });

    return () => {
      isCancelled = true;
      vrmRef.current?.expressionManager?.setValue("aa", 0);
      vrmRef.current?.expressionManager?.setValue("ih", 0);
      vrmRef.current?.expressionManager?.setValue("ou", 0);
      if (loadedScene) {
        avatarGroup.remove(loadedScene);
      }
      vrmRef.current = null;
      headRef.current = null;
      chestRef.current = null;
    };
  }, []);

  useFrame(({ clock }, delta) => {
    const group = groupRef.current;
    const vrm = vrmRef.current;
    const elapsed = clock.getElapsedTime();
    const speaking = speakingRef.current;

    if (group) {
      const idleFloat = Math.sin(elapsed * 1.15) * 0.018;
      const speakingFloat = speaking ? Math.sin(elapsed * 2.2) * 0.012 : 0;
      group.position.y = damp(group.position.y, -0.82 + idleFloat + speakingFloat, 5.5, delta);
      group.rotation.z = damp(group.rotation.z, Math.sin(elapsed * 0.8) * 0.006, 4, delta);
      const breathScale = 1 + Math.sin(elapsed * 1.25) * 0.003;
      group.scale.setScalar(damp(group.scale.x, breathScale, 3.2, delta));
    }

    const head = headRef.current;
    const headRest = headRestRef.current;
    if (head && headRest) {
      const speakEnergy = speaking ? 1 : 0;
      const targetX = headRest.rotation.x + Math.sin(elapsed * 2.4) * 0.018 + Math.sin(elapsed * 6.1) * 0.012 * speakEnergy;
      const targetY = headRest.rotation.y + Math.sin(elapsed * 1.35) * 0.026 + Math.sin(elapsed * 4.7) * 0.018 * speakEnergy;
      const targetZ = headRest.rotation.z + Math.sin(elapsed * 1.8) * 0.012 * speakEnergy;

      head.rotation.x = damp(head.rotation.x, targetX, 6, delta);
      head.rotation.y = damp(head.rotation.y, targetY, 6, delta);
      head.rotation.z = damp(head.rotation.z, targetZ, 6, delta);
    }

    const chest = chestRef.current;
    const chestRest = chestRestRef.current;
    if (chest && chestRest) {
      const breath = Math.sin(elapsed * 1.25) * 0.012;
      chest.rotation.x = damp(chest.rotation.x, chestRest.rotation.x + breath, 4, delta);
      chest.rotation.z = damp(chest.rotation.z, chestRest.rotation.z + Math.sin(elapsed * 0.9) * 0.004, 4, delta);
    }

    if (vrm?.expressionManager) {
      const mouthPulse =
        speaking
          ? THREE.MathUtils.clamp(
            0.22 + Math.sin(elapsed * 13) * 0.18 + Math.sin(elapsed * 21.7) * 0.1,
            0.04,
            0.58,
          )
          : 0;

      vrm.expressionManager.setValue("aa", mouthPulse);
      vrm.expressionManager.setValue("ih", mouthPulse * 0.22);
      vrm.expressionManager.setValue("ou", mouthPulse * 0.12);
    }

    vrm?.update(delta);
  });

  return <group ref={groupRef} position={[0, -0.82, 0]} />;
}

export default function App() {
  const speech = useAvatarSpeechRecognition();
  const chat = useAvatarChat();
  const voice = useAvatarSpeechSynthesis();
  const [typedQuestion, setTypedQuestion] = useState("");
  const [isAvatarLoaded, setIsAvatarLoaded] = useState(false);
  const lastSubmittedTranscriptRef = useRef("");
  const wasListeningRef = useRef(false);
  const { speak } = voice;
  const { sendTranscript } = chat;
  const transcriptText = speech.transcript.trim();
  const interimText = speech.interimTranscript.trim();
  const typedAiResponse = useTypedText(chat.aiResponse, Boolean(chat.aiResponse));
  const hasTranscript = transcriptText.length > 0 || interimText.length > 0;
  const voiceOutputStatus = voice.canSpeak ? (voice.isSpeaking ? "Speaking" : "Ready") : "Unsupported";

  const handleStartListening = () => {
    lastSubmittedTranscriptRef.current = "";
    speech.resetTranscript();
    void speech.startListening();
  };

  const submitVoiceTranscript = useCallback(
    (transcript = transcriptText) => {
      const message = transcript.trim();

      if (!message || message === lastSubmittedTranscriptRef.current) return;

      lastSubmittedTranscriptRef.current = message;
      void sendTranscript(message);
    },
    [sendTranscript, transcriptText],
  );

  const handleSendToAi = () => {
    lastSubmittedTranscriptRef.current = "";
    submitVoiceTranscript();
  };

  const handleTypedSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const message = typedQuestion.trim();

    if (!message) return;

    void chat.sendTranscript(message);
  };

  useEffect(() => {
    const justStoppedListening = wasListeningRef.current && !speech.listening;
    wasListeningRef.current = speech.listening;

    if (justStoppedListening) {
      submitVoiceTranscript();
    }
  }, [speech.listening, submitVoiceTranscript]);

  useEffect(() => {
    if (chat.aiResponse) {
      speak(chat.aiResponse);
    }
  }, [chat.aiResponse, speak]);

  return (
    <main className="app-shell">
      <BackgroundEffects />

      <section className="demo-layout">
        <motion.aside
          className="left-stack"
          initial={{ opacity: 0, x: -28 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, delay: 0.1, ease: "easeOut" }}
        >
          <div className="glass-panel transcript-panel">
            <div className="panel-title-row">
              <div>
                <span className="panel-kicker">Transcript</span>
                <h2>Live microphone stream</h2>
              </div>
              <span className={`live-chip ${speech.listening ? "live-chip-active" : ""}`}>
                {speech.listening ? "Listening" : "Standby"}
              </span>
            </div>

            {speech.errorMessage ? <p className="speech-alert">{speech.errorMessage}</p> : null}
            {!speech.canUseSpeech ? (
              <p className="speech-alert">
                {speech.status === "unsupported"
                  ? "This browser does not support Web Speech recognition. Try Chrome or Edge for the demo."
                  : "Microphone permission is blocked. Enable microphone access to use live transcription."}
              </p>
            ) : null}

            <div className="transcript-live-card">
              <div>
                <b>Client voice</b>
                <span>{speech.listening ? "Capturing audio" : "Auto-submit on stop"}</span>
              </div>
              <p className={hasTranscript ? "" : "transcript-placeholder"}>
                {transcriptText || "Press Start listening and speak. Stop listening to ask the avatar automatically."}
                {interimText ? <span className="interim-transcript"> {interimText}</span> : null}
              </p>
            </div>

            <div className="ai-action-row">
              <motion.button
                className="control-button control-button-primary"
                type="button"
                disabled={!transcriptText || chat.isGenerating}
                onClick={handleSendToAi}
                whileHover={{ y: transcriptText && !chat.isGenerating ? -2 : 0 }}
                whileTap={{ scale: transcriptText && !chat.isGenerating ? 0.97 : 1 }}
              >
                {chat.isGenerating ? "Generating..." : "Send again"}
              </motion.button>
              <motion.button
                className="control-button control-button-ghost"
                type="button"
                onClick={chat.clearResponse}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.97 }}
              >
                Clear response
              </motion.button>
            </div>

            <form className="typed-chat-form" onSubmit={handleTypedSubmit}>
              <label htmlFor="typed-question">Typed question</label>
              <textarea
                id="typed-question"
                value={typedQuestion}
                onChange={(event) => setTypedQuestion(event.target.value)}
                placeholder="Type a question for the avatar..."
                rows={3}
              />
              <motion.button
                className="control-button control-button-primary"
                type="submit"
                disabled={!typedQuestion.trim() || chat.isGenerating}
                whileHover={{ y: typedQuestion.trim() && !chat.isGenerating ? -2 : 0 }}
                whileTap={{ scale: typedQuestion.trim() && !chat.isGenerating ? 0.97 : 1 }}
              >
                {chat.isGenerating ? "Generating..." : "Ask avatar"}
              </motion.button>
            </form>
          </div>
        </motion.aside>

        <motion.section
          className="avatar-stage glass-panel"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.18, ease: "easeOut" }}
        >
          <div className="stage-header">
            <div>
              <span className="panel-kicker">Avatar</span>
              <h2>Real-time presence</h2>
            </div>
            <div className="stage-actions">

              <motion.button
                className="top-mic-button"
                type="button"
                disabled={!speech.canUseSpeech || speech.listening || speech.isStarting || speech.isStopping}
                onClick={handleStartListening}
                whileHover={{ y: speech.canUseSpeech && !speech.listening ? -2 : 0 }}
                whileTap={{ scale: speech.canUseSpeech && !speech.listening ? 0.96 : 1 }}
                aria-label="Start listening"
              >
                <span className="mic-icon" />
                <span>{speech.isStarting ? "Starting" : "Ask"}</span>
              </motion.button>

              {speech.listening ? (
                <motion.button
                  className="top-stop-button"
                  type="button"
                  disabled={speech.isStopping}
                  onClick={() => void speech.stopListening()}
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.96 }}
                >
                  {speech.isStopping ? "Stopping" : "Stop"}
                </motion.button>
              ) : null}
            </div>
          </div>

          <div className="canvas-wrap">
            <AnimatePresence>
              {!isAvatarLoaded && (
                <motion.div
                  className="avatar-loader-overlay"
                  initial={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.6, ease: "easeInOut" }}
                >
                  <div className="loader-ring-wrapper">
                    <div className="loader-ring loader-ring-outer" />
                    <div className="loader-ring loader-ring-middle" />
                    <div className="loader-ring loader-ring-inner" />
                    <div className="loader-center-glow" />
                  </div>
                  <div className="loader-text-container">
                    <h3 className="loader-title">Synthesizing Presence</h3>
                    <p className="loader-subtitle">Configuring neural avatar engine...</p>
                  </div>
                  <div className="loader-progress-bar">
                    <motion.div
                      className="loader-progress-fill"
                      initial={{ width: "0%" }}
                      animate={{ width: "100%" }}
                      transition={{ duration: 2.8, ease: "easeInOut", repeat: Infinity }}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <Canvas camera={{ position: [0, 1.12, 1.75], fov: 27 }}>
              <ambientLight intensity={1.35} />
              <directionalLight position={[2, 3, 2]} intensity={1.4} />
              <Avatar isSpeaking={voice.isSpeaking} onLoaded={() => setIsAvatarLoaded(true)} />
              <Environment preset="city" />
              <OrbitControls enablePan={false} target={[0, 0.78, 0]} minDistance={1.25} maxDistance={2.5} />
            </Canvas>
            <div className="stage-glow" />
          </div>

          <div className={`stage-listening-chip ${speech.listening ? "stage-listening-chip-active" : ""}`}>
            <span className={`status-dot ${speech.listening ? "status-dot-active" : ""}`} />
            {speech.listening ? "Listening now" : "Tap Ask to speak"}
          </div>
        </motion.section>

        <motion.aside
          className="right-stack"
          initial={{ opacity: 0, x: 28 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, delay: 0.15, ease: "easeOut" }}
        >
          <div className="glass-panel response-panel">
            <div className="panel-title-row">
              <div>
                <span className="panel-kicker">AI Response</span>
                <h2>{chat.isGenerating ? "Generating reply" : "Generated reply"}</h2>
              </div>
              <span className="live-chip">
                <span className={`status-dot ${chat.isGenerating || voice.isSpeaking ? "status-dot-active" : ""}`} />
                {chat.isGenerating ? "Thinking" : voice.isSpeaking ? "Speaking" : "Ready"}
              </span>
            </div>
            <div className={`response-copy ${chat.isGenerating ? "response-copy-loading" : ""}`}>
              {chat.isGenerating ? (
                <ThinkingIndicator />
              ) : (
                <p className={chat.aiResponse ? "typed-response" : "response-placeholder"}>
                  {typedAiResponse ||
                    "Speak, then stop listening to get an automatic avatar reply. You can also type a question."}
                  {chat.aiResponse && typedAiResponse.length < chat.aiResponse.length ? (
                    <span className="typing-caret" />
                  ) : null}
                </p>
              )}
            </div>
            {chat.errorMessage ? <p className="speech-alert response-alert">{chat.errorMessage}</p> : null}
            {voice.errorMessage ? <p className="speech-alert response-alert">{voice.errorMessage}</p> : null}
            {!chat.hasApiKey ? (
              <p className="speech-alert response-alert">
                Demo mode is active. Add VITE_OPENAI_API_KEY to your .env file and restart Vite for live OpenAI responses.
              </p>
            ) : null}
            <div className="voice-output-card">
              <div>
                <span>Voice output</span>
                <strong>{voiceOutputStatus}</strong>
              </div>
              <small>{voice.canSpeak ? voice.selectedVoiceName : "speechSynthesis unavailable"}</small>
            </div>
            <div className="voice-action-row">
              <motion.button
                className="control-button"
                type="button"
                disabled={!chat.aiResponse || !voice.canSpeak || voice.isSpeaking}
                onClick={() => voice.speak(chat.aiResponse)}
                whileHover={{ y: chat.aiResponse && voice.canSpeak && !voice.isSpeaking ? -2 : 0 }}
                whileTap={{ scale: chat.aiResponse && voice.canSpeak ? 0.97 : 1 }}
              >
                Speak again
              </motion.button>
              <motion.button
                className="control-button control-button-ghost"
                type="button"
                disabled={!voice.isSpeaking}
                onClick={voice.stopSpeaking}
                whileHover={{ y: voice.isSpeaking ? -2 : 0 }}
                whileTap={{ scale: voice.isSpeaking ? 0.97 : 1 }}
              >
                Stop speaking
              </motion.button>
            </div>
            <div className="response-footer">
              <span>OpenAI</span>
              <strong>{chat.isGenerating ? "Loading" : chat.hasApiKey ? "Ready" : "Demo mode"}</strong>
            </div>
          </div>
        </motion.aside>
      </section>
    </main>
  );
}
