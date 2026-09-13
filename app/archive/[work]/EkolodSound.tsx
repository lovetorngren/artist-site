"use client";

import { useEffect, useRef, useState } from "react";

export default function EkolodSound() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [volume, setVolume] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [hasInteracted, setHasInteracted] =
    useState(false);

  const width = 600;
  const height = 120;
  const padding = 15;

  const getPointOnWave = (value: number) => {
    const x =
      padding +
      value * (width - padding * 2);

    const waveHeight = 38;
    const cycles = 2.2;

    const y =
      height / 2 +
      Math.sin(
        value * Math.PI * 2 * cycles
      ) *
        waveHeight;

    return { x, y };
  };

  const updateVolume = (clientX: number) => {
    const element = document.getElementById(
      "ekolod-volume-control"
    );

    if (!element) return 0;

    const rect =
      element.getBoundingClientRect();

    let value =
      (clientX - rect.left) /
      rect.width;

    value = Math.max(
      0,
      Math.min(1, value)
    );

    setVolume(value);

    if (audioRef.current) {
      audioRef.current.volume = value;

      if (value === 0) {
        audioRef.current.pause();
      }
    }

    return value;
  };

  useEffect(() => {
    const handlePointerMove = (
      event: PointerEvent
    ) => {
      if (!dragging) return;

      event.preventDefault();

      updateVolume(event.clientX);
    };

    const handlePointerUp = () => {
      setDragging(false);
      document.body.style.userSelect = "";
    };

    window.addEventListener(
      "pointermove",
      handlePointerMove,
      { passive: false }
    );

    window.addEventListener(
      "pointerup",
      handlePointerUp
    );

    return () => {
      window.removeEventListener(
        "pointermove",
        handlePointerMove
      );

      window.removeEventListener(
        "pointerup",
        handlePointerUp
      );

      document.body.style.userSelect = "";
    };
  }, [dragging]);

  const sliderPoint =
    getPointOnWave(volume);

  const wavePoints = Array.from(
    { length: 201 },
    (_, i) => {
      const value = i / 200;
      const point =
        getPointOnWave(value);

      return {
        x: Number(
          point.x.toFixed(4)
        ),
        y: Number(
          point.y.toFixed(4)
        ),
      };
    }
  );

  const wavePath = wavePoints
    .map((point, index) => {
      return `${index === 0 ? "M" : "L"} ${
        point.x
      } ${point.y}`;
    })
    .join(" ");

  return (
    <div
      style={{
        position: "fixed",
        top: "2rem",
        left: "50%",
        transform:
          "translateX(-50%)",
        zIndex: 50,
        userSelect: "none",
      }}
    >
      <audio
        ref={audioRef}
        src="/archive/ekolod/ekolod.mp3"
        loop
        preload="auto"
      />

      <div
        id="ekolod-volume-control"
        onPointerDown={(event) => {
          event.preventDefault();

          document.body.style.userSelect =
            "none";

          setDragging(true);

          // Hide the hint after first interaction
          setHasInteracted(true);

          const newVolume =
            updateVolume(
              event.clientX
            );

          /*
            Start the audio directly from
            the pointer interaction.
          */
          if (
            audioRef.current &&
            newVolume > 0
          ) {
            audioRef.current.volume =
              newVolume;

            const playPromise =
              audioRef.current.play();

            if (
              playPromise !== undefined
            ) {
              playPromise.catch((error) => {
                console.log(
                  "Could not start audio:",
                  error
                );
              });
            }
          }
        }}
        style={{
          width: `${width}px`,
          height: `${height}px`,
          position: "relative",
          cursor: dragging
            ? "grabbing"
            : "grab",
          touchAction: "none",
          userSelect: "none",
        }}
      >
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          style={{
            display: "block",
            overflow: "visible",
            userSelect: "none",
          }}
        >
          {/* Sine wave */}
          <path
            d={wavePath}
            fill="none"
            stroke="rgba(255,255,255,0.65)"
            strokeWidth="2"
          />

          {/* Faint instructional dot */}
          {!hasInteracted && (
            <circle
              cx={
                Number(
                  sliderPoint.x.toFixed(4)
                ) + 24
              }
              cy={Number(
                sliderPoint.y.toFixed(4)
              )}
              r="6"
              fill="white"
              className="hint-dot"
            />
          )}

          {/* Real slider dot */}
          <circle
            cx={Number(
              sliderPoint.x.toFixed(4)
            )}
            cy={Number(
              sliderPoint.y.toFixed(4)
            )}
            r="8"
            fill="white"
          />
        </svg>
      </div>

      <style jsx>{`
        .hint-dot {
          animation: pulse 1.8s
            ease-in-out infinite;
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
      `}</style>
    </div>
  );
}