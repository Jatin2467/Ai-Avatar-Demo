import { motion } from "framer-motion";

type SpeechControlsProps = {
  canUseSpeech: boolean;
  isStarting: boolean;
  isStopping: boolean;
  listening: boolean;
  onStart: () => void;
  onStop: () => void;
  onReset: () => void;
};

export function SpeechControls({
  canUseSpeech,
  isStarting,
  isStopping,
  listening,
  onStart,
  onStop,
  onReset,
}: SpeechControlsProps) {
  return (
    <div className="speech-controls" aria-label="Speech recognition controls">
      <motion.button
        className="control-button control-button-primary"
        type="button"
        disabled={!canUseSpeech || listening || isStarting}
        onClick={onStart}
        whileHover={{ y: canUseSpeech && !listening ? -2 : 0 }}
        whileTap={{ scale: canUseSpeech ? 0.97 : 1 }}
      >
        {isStarting ? "Starting..." : "Start listening"}
      </motion.button>

      <motion.button
        className="control-button"
        type="button"
        disabled={!listening || isStopping}
        onClick={onStop}
        whileHover={{ y: listening ? -2 : 0 }}
        whileTap={{ scale: listening ? 0.97 : 1 }}
      >
        {isStopping ? "Stopping..." : "Stop listening"}
      </motion.button>

      <motion.button
        className="control-button control-button-ghost"
        type="button"
        onClick={onReset}
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.97 }}
      >
        Clear
      </motion.button>
    </div>
  );
}
