const particles = Array.from({ length: 22 }, (_, index) => ({
  id: index,
  left: `${(index * 37) % 100}%`,
  top: `${(index * 53) % 100}%`,
  delay: `${(index % 9) * 0.65}s`,
  duration: `${9 + (index % 6)}s`,
  size: `${2 + (index % 3)}px`,
}));

export function BackgroundEffects() {
  return (
    <>
      <div className="background-grid" />
      <div className="gradient-mesh" />
      <div className="aurora aurora-one" />
      <div className="aurora aurora-two" />
      <div className="particle-field" aria-hidden="true">
        {particles.map((particle) => (
          <span
            key={particle.id}
            style={{
              "--particle-left": particle.left,
              "--particle-top": particle.top,
              "--particle-delay": particle.delay,
              "--particle-duration": particle.duration,
              "--particle-size": particle.size,
            } as CSSProperties}
          />
        ))}
      </div>
    </>
  );
}
import type { CSSProperties } from "react";
