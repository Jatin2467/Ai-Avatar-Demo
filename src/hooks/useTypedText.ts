import { useEffect, useState } from "react";

export function useTypedText(text: string, isActive = true) {
  const [displayText, setDisplayText] = useState("");

  useEffect(() => {
    if (!isActive || !text) {
      const timer = window.setTimeout(() => {
        setDisplayText(text);
      }, 0);

      return () => {
        window.clearTimeout(timer);
      };
    }

    const resetTimer = window.setTimeout(() => {
      setDisplayText("");
    }, 0);

    let timer: number | undefined;
    const startTimer = window.setTimeout(() => {
      let index = 0;
      const speed = Math.max(12, Math.min(26, 900 / text.length));
      timer = window.setInterval(() => {
        index += 1;
        setDisplayText(text.slice(0, index));

        if (index >= text.length && timer) {
          window.clearInterval(timer);
        }
      }, speed);
    }, 20);

    return () => {
      window.clearTimeout(resetTimer);
      window.clearTimeout(startTimer);
      if (timer) {
        window.clearInterval(timer);
      }
    };
  }, [isActive, text]);

  return displayText;
}
