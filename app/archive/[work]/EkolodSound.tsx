"use client";

import { useEffect, useRef, useState } from "react";

const WIDTH = 600;
const HEIGHT = 120;
const PADDING = 15;
const WAVE_HEIGHT = 38;
const CYCLES = 2.2;

function getPointOnWave(value: number) {
  const x = PADDING + value * (WIDTH - PADDING * 2);
  const y =
    HEIGHT / 2 +
    Math.sin(value * Math.PI * 2 * CYCLES) * WAVE_HEIGHT;

  return {
    x: Number(x.toFixed(4)),
    y: Number(y.toFixed(4)),
  };
}

// The wave never changes, so build it once instead of on every
// render (which happened on every pointer move while dragging).
const WAVE_PATH = Array.from({ length: 201 }, (_, i) => {
  const { x, y } = getPointOnWave(i / 200);
  return `${i === 0 ? "M" : "L"} ${x} ${y}`;
}).join(" ");

export default function EkolodSound({ src }: { src: string }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const controlRef = useRef<HTMLDivElement | null>(null);

  const [volume, setVolume] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  // Turns a pointer position into 0..1, matching where the dot is drawn
  // (the wave starts and ends PADDING in from the edges) and working at
  // any rendered size.
  const volumeFromPointer = (clientX: number) => {
    const element = controlRef.current;
    if (!element) return 0;

    const rect = element.getBoundingClientRect();
    const scale = rect.width / WIDTH;
    const value =
      (clientX - rect.left - PADDING * scale) /
      (rect.width - PADDING * 2 * scale);

    return Math.max(0, Math.min(1, value));
  };

  const applyVolume = (value: number) => {
    setVolume(value);

    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = value; // Ignored on iPhone/iPad, see note below.
    audio.muted = value === 0;

    if (value === 0) {
      audio.pause();
    } else if (audio.paused) {
      // Resumes when dragging back up from zero, which didn't
      // happen before.
      audio.play().catch((error) => {
        console.log("Could not start audio:", error);
      });
    }
  };

  // Browsers (Safari especially) only allow audio to start inside a
  // click/tap/key handler. Calling play() here, even muted, unlocks the
  // element so later drags can start it too.
  const unlockAudio = () => {
    const audio = audioRef.current;
    if (audio && audio.paused) {
      audio.muted = true;
      audio.play().catch(() => {});
    }
  };

  useEffect(() => {
    if (!dragging) return;

    const handlePointerMove = (event: PointerEvent) => {
      event.preventDefault();
      applyVolume(volumeFromPointer(event.clientX));
    };

    const stopDragging = () => {
      setDragging(false);
      document.body.style.userSelect = "";
    };

    window.addEventListener("pointermove", handlePointerMove, {
      passive: false,
    });
    window.addEventListener("pointerup", stopDragging);
    // Fires when a touch is interrupted (e.g. a system gesture);
    // without it the slider could stay stuck in "dragging".
    window.addEventListener("pointercancel", stopDragging);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopDragging);
      window.removeEventListener("pointercancel", stopDragging);
      document.body.style.userSelect = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging]);

  // Stop the sound when leaving the page.
  useEffect(() => {
    const audio = audioRef.current;
    return () => audio?.pause();
  }, []);

  const sliderPoint = getPointOnWave(volume);

  return (
    <div
      className="ekolod-wrap"
      style={{
        position: "fixed",
        top: "2rem",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 50,
        // Shrinks on screens narrower than 600px instead of overflowing.
        width: "min(600px, calc(100vw - 2rem))",
        userSelect: "none",
      }}
    >
      <audio
        ref={audioRef}
        src={src}
        loop
        // Don't download the mp3 until someone actually uses the slider.
        preload="none"
      />

      <div
        ref={controlRef}
        className="ekolod-control"
        role="slider"
        tabIndex={0}
        aria-label="Sound volume"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(volume * 100)}
        onPointerDown={(event) => {
          event.preventDefault();
          document.body.style.userSelect = "none";
          setDragging(true);
          setHasInteracted(true);
          unlockAudio();
          applyVolume(volumeFromPointer(event.clientX));
        }}
        onKeyDown={(event) => {
          const step =
            event.key === "ArrowRight" || event.key === "ArrowUp"
              ? 0.05
              : event.key === "ArrowLeft" || event.key === "ArrowDown"
              ? -0.05
              : 0;
          if (!step) return;

          event.preventDefault();
          setHasInteracted(true);
          unlockAudio();
          applyVolume(Math.max(0, Math.min(1, volume + step)));
        }}
        style={{
          width: "100%",
          position: "relative",
          cursor: dragging ? "grabbing" : "grab",
          touchAction: "none",
          userSelect: "none",
        }}
      >
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          style={{
            display: "block",
            width: "100%",
            height: "auto",
            overflow: "visible",
            userSelect: "none",
          }}
        >
          {/* Sine wave */}
          <path
            d={WAVE_PATH}
            fill="none"
            stroke="rgba(255,255,255,0.65)"
            strokeWidth="2"
          />

          {/* Faint instructional dot */}
          {!hasInteracted && (
            <circle
              cx={sliderPoint.x + 24}
              cy={sliderPoint.y}
              r="6"
              fill="white"
              className="hint-dot"
            />
          )}

          {/* Real slider dot */}
          <circle
            cx={sliderPoint.x}
            cy={sliderPoint.y}
            r="8"
            fill="white"
          />
        </svg>
      </div>

      <style jsx>{`
        .hint-dot {
          animation: pulse 1.8s ease-in-out infinite;
        }

        @keyframes pulse {
          0% {
            opacity: 0.15;
          }

          50% {
            opacity: 0.65;
          }

          100% {
            opacity: 0.15;
          }
        }

        /* Focus ring only for keyboard users, not on click. */
        .ekolod-control:focus:not(:focus-visible) {
          outline: none;
        }

        /* On narrow screens, sit below the back link instead of on it. */
        @media (max-width: 800px) {
          .ekolod-wrap {
            top: 5rem !important;
          }
        }
      `}</style>
    </div>
  );
}