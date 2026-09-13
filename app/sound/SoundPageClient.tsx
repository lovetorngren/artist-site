"use client";

import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
} from "react";
import SoundPlayer, {
  SoundPlayerHandle,
} from "./SoundPlayer";

function formatTitle(filename: string) {
  return filename
    .replace(/\.[^/.]+$/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function positionToFrequency(position: number) {
  const maxFrequency = 20000;
  const minFrequency = 80;

  return (
    maxFrequency *
    Math.pow(minFrequency / maxFrequency, position)
  );
}

function positionToHighpassFrequency(position: number) {
  const minFrequency = 20;
  const maxFrequency = 15000;

  return (
    minFrequency *
    Math.pow(maxFrequency / minFrequency, position)
  );
}

export default function SoundPageClient({
  sounds,
}: {
  sounds: {
    sound: string;
    description: string;
  }[];
}) {
  /*
    ==================================================
    VOLUME
    ==================================================
  */

  const [volume, setVolume] = useState(0.75);
  const [muted, setMuted] = useState(false);
  const [previousVolume, setPreviousVolume] = useState(0.75);

  /*
    ==================================================
    PLAYER REFS
    ==================================================
  */

  const playerRefs = useRef<Map<string, SoundPlayerHandle>>(new Map());

  /*
    ==================================================
    GLOBAL PLAYHEAD
    ==================================================
  */

  const [globalProgress, setGlobalProgress] = useState(0);
  const globalProgressRef = useRef(0);
  const [globalPlaying, setGlobalPlaying] = useState(false);

  const globalDragging = useRef(false);
  const globalStartY = useRef(0);
  const globalStartPosition = useRef(0);

  /*
    ==================================================
    MULTIPLIERS
    ==================================================
  */

  const [multipliers, setMultipliers] = useState<number[]>(() =>
    sounds.map(() => 1)
  );

  const cycleMultiplier = (index: number) => {
    setMultipliers((prev) => {
      const next = [...prev];
      const oldValue = next[index];

      next[index] = oldValue >= 4 ? 1 : oldValue + 1;

      return next;
    });
  };

  /*
    ==================================================
    WEB AUDIO
    ==================================================
  */

  const audioContextRef = useRef<AudioContext | null>(null);

  const filterNodeRef =
    useRef<BiquadFilterNode | null>(null);

  const highpassNodeRef =
    useRef<BiquadFilterNode | null>(null);

  const [audioContext, setAudioContext] =
    useState<AudioContext | null>(null);

  const [filterNode, setFilterNode] =
    useState<BiquadFilterNode | null>(null);

  const [filterPosition, setFilterPosition] = useState(0);
  const [highpassPosition, setHighpassPosition] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const context = new AudioContext();

    const filter = context.createBiquadFilter();

    filter.type = "lowpass";
    filter.Q.value = 0;
    filter.frequency.value = 20000;

    const highpass = context.createBiquadFilter();

    highpass.type = "highpass";
    highpass.Q.value = 0;
    highpass.frequency.value = 20;

    filter.connect(highpass);
    highpass.connect(context.destination);

    audioContextRef.current = context;
    filterNodeRef.current = filter;
    highpassNodeRef.current = highpass;

    setAudioContext(context);
    setFilterNode(filter);

    return () => {
      context.close();
    };
  }, []);

  /*
    ==================================================
    GLOBAL LOW PASS
    ==================================================
  */

  useEffect(() => {
    const filter = filterNodeRef.current;

    if (!filter) return;

    const frequency =
      positionToFrequency(filterPosition);

    filter.frequency.setTargetAtTime(
      frequency,
      filter.context.currentTime,
      0.01
    );
  }, [filterPosition]);

  /*
    ==================================================
    GLOBAL HIGH PASS
    ==================================================
  */

  useEffect(() => {
    const highpass = highpassNodeRef.current;

    if (!highpass) return;

    const frequency =
      positionToHighpassFrequency(highpassPosition);

    highpass.frequency.setTargetAtTime(
      frequency,
      highpass.context.currentTime,
      0.01
    );
  }, [highpassPosition]);

  /*
    ==================================================
    INDIVIDUAL TRACK EQ
    ==================================================
  */

  const [trackLowpass, setTrackLowpass] =
    useState<number[]>(() =>
      sounds.map(() => 0)
    );

  const [trackHighpass, setTrackHighpass] =
    useState<number[]>(() =>
      sounds.map(() => 0)
    );

  const updateTrackLowpass = (
    index: number,
    position: number
  ) => {
    setTrackLowpass((prev) => {
      const next = [...prev];
      next[index] = position;
      return next;
    });
  };

  const updateTrackHighpass = (
    index: number,
    position: number
  ) => {
    setTrackHighpass((prev) => {
      const next = [...prev];
      next[index] = position;
      return next;
    });
  };

  /*
    ==================================================
    SAMPLE & HOLD
    ==================================================
  */

  const [sampleHold, setSampleHold] = useState(false);
  const [sampleBpm, setSampleBpm] = useState(120);

  const sampleBpmRef = useRef(120);

  const [sampleRangeSize, setSampleRangeSize] =
    useState(0.35);

  const sampleTimer =
    useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    sampleBpmRef.current = sampleBpm;
  }, [sampleBpm]);

  /*
    ==================================================
    METRONOME
    ==================================================
  */

  const [metronomeOn, setMetronomeOn] = useState(false);

  const metronomeAudioRef =
    useRef<HTMLAudioElement | null>(null);

  const metronomeTimer =
    useRef<ReturnType<typeof setTimeout> | null>(null);

  const metronomePlayCount =
    useRef(0);

  const metronomeSilentCount =
    useRef(0);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const audio = new Audio("/sound/metronome.wav");

    audio.preload = "auto";

    metronomeAudioRef.current = audio;

    return () => {
      if (metronomeTimer.current) {
        clearTimeout(metronomeTimer.current);
        metronomeTimer.current = null;
      }

      audio.pause();
      audio.src = "";
      metronomeAudioRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!metronomeOn) {
      if (metronomeTimer.current) {
        clearTimeout(metronomeTimer.current);
        metronomeTimer.current = null;
      }

      metronomePlayCount.current = 0;
      metronomeSilentCount.current = 0;

      return;
    }

    const tick = () => {
      const audio = metronomeAudioRef.current;

      /*
        48 metronome plays
        followed by
        8 silent beats.
      */

      if (metronomePlayCount.current < 48) {
        if (audio) {
          audio.currentTime = 0;

          audio
            .play()
            .catch(() => {});
        }

        metronomePlayCount.current += 1;
      } else {
        metronomeSilentCount.current += 1;

        if (metronomeSilentCount.current >= 8) {
          metronomePlayCount.current = 0;
          metronomeSilentCount.current = 0;
        }
      }

      /*
        Metronome is half the S&H speed.

        S&H:
        60000 / BPM

        Metronome:
        2 × S&H interval
      */

      const interval =
        (60000 / sampleBpmRef.current) * 2;

      metronomeTimer.current =
        setTimeout(tick, interval);
    };

    /*
      Start immediately when enabled.
    */

    metronomePlayCount.current = 0;
    metronomeSilentCount.current = 0;

    tick();

    return () => {
      if (metronomeTimer.current) {
        clearTimeout(metronomeTimer.current);
        metronomeTimer.current = null;
      }
    };
  }, [metronomeOn]);

  /*
    Restart metronome timing when BPM changes.

    The 48 / 8 cycle is preserved.
  */

  useEffect(() => {
    if (!metronomeOn) return;

    if (metronomeTimer.current) {
      clearTimeout(metronomeTimer.current);
      metronomeTimer.current = null;
    }

    const interval =
      (60000 / sampleBpmRef.current) * 2;

    const continueMetronome = () => {
      const audio = metronomeAudioRef.current;

      if (metronomePlayCount.current < 48) {
        if (audio) {
          audio.currentTime = 0;

          audio
            .play()
            .catch(() => {});
        }

        metronomePlayCount.current += 1;
      } else {
        metronomeSilentCount.current += 1;

        if (metronomeSilentCount.current >= 8) {
          metronomePlayCount.current = 0;
          metronomeSilentCount.current = 0;
        }
      }

      metronomeTimer.current =
        setTimeout(
          continueMetronome,
          (60000 / sampleBpmRef.current) * 2
        );
    };

    /*
      Do not immediately play again here.
      Wait for the next metronome beat.
    */

    metronomeTimer.current =
      setTimeout(
        continueMetronome,
        interval
      );

    return () => {
      if (metronomeTimer.current) {
        clearTimeout(metronomeTimer.current);
        metronomeTimer.current = null;
      }
    };
  }, [sampleBpm]);

  /*
    ==================================================
    GLOBAL VOLUME
    ==================================================
  */

  const handleVolumeChange = (
    event: React.PointerEvent<HTMLDivElement>
  ) => {
    const rect =
      event.currentTarget.getBoundingClientRect();

    const position =
      (event.clientY - rect.top) / rect.height;

    const newVolume =
      Math.max(0, Math.min(1, 1 - position));

    setVolume(newVolume);

    if (muted) {
      setMuted(false);
    }
  };

  const toggleMute = (
    event: React.PointerEvent
  ) => {
    event.stopPropagation();

    if (muted) {
      setVolume(previousVolume);
      setMuted(false);
    } else {
      setPreviousVolume(volume);
      setMuted(true);
    }
  };

  const effectiveVolume =
    muted ? 0 : volume;

  /*
    ==================================================
    GLOBAL PLAY / PAUSE
    ==================================================
  */

  const toggleGlobalPlay = async () => {
    if (
      audioContext &&
      audioContext.state === "suspended"
    ) {
      await audioContext.resume();
    }

    const allPlayers =
      Array.from(playerRefs.current.values());

    if (globalPlaying) {
      allPlayers.forEach((player) =>
        player.pause()
      );

      setGlobalPlaying(false);

      return;
    }

    await Promise.all(
      allPlayers.map((player) =>
        player.play()
      )
    );

    setGlobalPlaying(true);
  };

  /*
    ==================================================
    MOVE GLOBAL PLAYHEAD
    ==================================================
  */

  const moveGlobalTo = (
    newPosition: number
  ) => {
    const delta =
      newPosition -
      globalProgressRef.current;

    Array.from(
      playerRefs.current.values()
    ).forEach((player) => {
      player.moveBy(delta);
    });

    globalProgressRef.current =
      newPosition;

    setGlobalProgress(newPosition);
  };

  /*
    ==================================================
    GLOBAL POINTER
    ==================================================
  */

  const handleGlobalPointerDown = (
    event: React.PointerEvent<HTMLDivElement>
  ) => {
    event.preventDefault();

    const rect =
      event.currentTarget.getBoundingClientRect();

    const clickedPosition =
      Math.max(
        0,
        Math.min(
          1,
          (event.clientY - rect.top) /
            rect.height
        )
      );

    moveGlobalTo(clickedPosition);

    globalDragging.current = true;
    globalStartY.current =
      event.clientY;

    globalStartPosition.current =
      clickedPosition;

    event.currentTarget.setPointerCapture(
      event.pointerId
    );
  };

  const handleGlobalPointerMove = (
    event: React.PointerEvent<HTMLDivElement>
  ) => {
    if (!globalDragging.current) return;

    const rect =
      event.currentTarget.getBoundingClientRect();

    const delta =
      (event.clientY -
        globalStartY.current) /
      rect.height;

    const newGlobalPosition =
      Math.max(
        0,
        Math.min(
          1,
          globalStartPosition.current +
            delta
        )
      );

    moveGlobalTo(newGlobalPosition);

    globalStartPosition.current =
      newGlobalPosition;

    globalStartY.current =
      event.clientY;
  };

  const handleGlobalPointerUp = (
    event: React.PointerEvent<HTMLDivElement>
  ) => {
    globalDragging.current = false;

    if (
      event.currentTarget.hasPointerCapture(
        event.pointerId
      )
    ) {
      event.currentTarget.releasePointerCapture(
        event.pointerId
      );
    }
  };

  /*
    ==================================================
    S&H RANDOM SAMPLING
    ==================================================
  */

  useEffect(() => {
    if (!sampleHold) {
      if (sampleTimer.current) {
        clearTimeout(sampleTimer.current);
        sampleTimer.current = null;
      }

      return;
    }

    const sample = () => {
      const center =
        globalProgressRef.current;

      const half =
        sampleRangeSize / 2;

      const min =
        Math.max(0, center - half);

      const max =
        Math.min(1, center + half);

      const randomPosition =
        min +
        Math.random() *
          (max - min);

      const currentPosition =
        globalProgressRef.current;

      const delta =
        randomPosition -
        currentPosition;

      Array.from(
        playerRefs.current.values()
      ).forEach((player) => {
        player.moveBy(delta);
      });

      globalProgressRef.current =
        randomPosition;

      setGlobalProgress(
        randomPosition
      );

      const bpm =
        sampleBpmRef.current;

      const interval =
        60000 / bpm;

      sampleTimer.current =
        setTimeout(
          sample,
          interval
        );
    };

    const initialInterval =
      60000 /
      sampleBpmRef.current;

    sampleTimer.current =
      setTimeout(
        sample,
        initialInterval
      );

    return () => {
      if (sampleTimer.current) {
        clearTimeout(
          sampleTimer.current
        );

        sampleTimer.current = null;
      }
    };
  }, [
    sampleHold,
    sampleRangeSize,
  ]);

  /*
    ==================================================
    S&H SPEED
    ==================================================
  */

  const sampleDragging =
    useRef(false);

  const handleSampleSpeed = (
    event: React.PointerEvent<HTMLDivElement>
  ) => {
    event.preventDefault();

    const rect =
      event.currentTarget.getBoundingClientRect();

    const position =
      Math.max(
        0,
        Math.min(
          1,
          1 -
            (event.clientY -
              rect.top) /
              rect.height
        )
      );

    const bpm =
      70 +
      position *
        (300 - 70);

    setSampleBpm(
      Math.round(bpm)
    );

    event.currentTarget.setPointerCapture(
      event.pointerId
    );

    sampleDragging.current =
      true;
  };

  const handleSampleSpeedMove = (
    event: React.PointerEvent<HTMLDivElement>
  ) => {
    if (!sampleDragging.current) return;

    const rect =
      event.currentTarget.getBoundingClientRect();

    const position =
      Math.max(
        0,
        Math.min(
          1,
          1 -
            (event.clientY -
              rect.top) /
              rect.height
        )
      );

    const bpm =
      70 +
      position *
        (300 - 70);

    setSampleBpm(
      Math.round(bpm)
    );
  };

  const handleSampleSpeedUp = (
    event: React.PointerEvent<HTMLDivElement>
  ) => {
    sampleDragging.current =
      false;

    if (
      event.currentTarget.hasPointerCapture(
        event.pointerId
      )
    ) {
      event.currentTarget.releasePointerCapture(
        event.pointerId
      );
    }
  };

  /*
    ==================================================
    S&H RANGE
    ==================================================
  */

  const rangeDragging =
    useRef(false);

  const handleRangeSize = (
    event: React.PointerEvent<HTMLDivElement>
  ) => {
    event.preventDefault();

    const rect =
      event.currentTarget.getBoundingClientRect();

    const position =
      Math.max(
        0,
        Math.min(
          1,
          1 -
            (event.clientY -
              rect.top) /
              rect.height
        )
      );

    setSampleRangeSize(
      position
    );

    event.currentTarget.setPointerCapture(
      event.pointerId
    );

    rangeDragging.current =
      true;
  };

  const handleRangeSizeMove = (
    event: React.PointerEvent<HTMLDivElement>
  ) => {
    if (!rangeDragging.current) return;

    const rect =
      event.currentTarget.getBoundingClientRect();

    const position =
      Math.max(
        0,
        Math.min(
          1,
          1 -
            (event.clientY -
              rect.top) /
              rect.height
        )
      );

    setSampleRangeSize(
      position
    );
  };

  const handleRangeSizeUp = (
    event: React.PointerEvent<HTMLDivElement>
  ) => {
    rangeDragging.current =
      false;

    if (
      event.currentTarget.hasPointerCapture(
        event.pointerId
      )
    ) {
      event.currentTarget.releasePointerCapture(
        event.pointerId
      );
    }
  };

  /*
    ==================================================
    GLOBAL LOW PASS
    ==================================================
  */

  const filterDragging =
    useRef(false);

  const updateFilterPosition = (
    clientY: number,
    element: HTMLDivElement
  ) => {
    const rect =
      element.getBoundingClientRect();

    const position =
      Math.max(
        0,
        Math.min(
          1,
          (clientY - rect.top) /
            rect.height
        )
      );

    setFilterPosition(
      position
    );
  };

  const handleFilterPointerDown = (
    event: React.PointerEvent<HTMLDivElement>
  ) => {
    event.preventDefault();

    filterDragging.current =
      true;

    updateFilterPosition(
      event.clientY,
      event.currentTarget
    );

    event.currentTarget.setPointerCapture(
      event.pointerId
    );
  };

  const handleFilterPointerMove = (
    event: React.PointerEvent<HTMLDivElement>
  ) => {
    if (!filterDragging.current) return;

    updateFilterPosition(
      event.clientY,
      event.currentTarget
    );
  };

  const handleFilterPointerUp = (
    event: React.PointerEvent<HTMLDivElement>
  ) => {
    filterDragging.current =
      false;

    if (
      event.currentTarget.hasPointerCapture(
        event.pointerId
      )
    ) {
      event.currentTarget.releasePointerCapture(
        event.pointerId
      );
    }
  };

  /*
    ==================================================
    GLOBAL HIGH PASS
    ==================================================
  */

  const highpassDragging =
    useRef(false);

  const updateHighpassPosition = (
    clientY: number,
    element: HTMLDivElement
  ) => {
    const rect =
      element.getBoundingClientRect();

    const position =
      Math.max(
        0,
        Math.min(
          1,
          (clientY - rect.top) /
            rect.height
        )
      );

    setHighpassPosition(
      position
    );
  };

  const handleHighpassPointerDown = (
    event: React.PointerEvent<HTMLDivElement>
  ) => {
    event.preventDefault();

    highpassDragging.current =
      true;

    updateHighpassPosition(
      event.clientY,
      event.currentTarget
    );

    event.currentTarget.setPointerCapture(
      event.pointerId
    );
  };

  const handleHighpassPointerMove = (
    event: React.PointerEvent<HTMLDivElement>
  ) => {
    if (!highpassDragging.current) return;

    updateHighpassPosition(
      event.clientY,
      event.currentTarget
    );
  };

  const handleHighpassPointerUp = (
    event: React.PointerEvent<HTMLDivElement>
  ) => {
    highpassDragging.current =
      false;

    if (
      event.currentTarget.hasPointerCapture(
        event.pointerId
      )
    ) {
      event.currentTarget.releasePointerCapture(
        event.pointerId
      );
    }
  };

  /*
    ==================================================
    SMALL TRACK EQ SLIDER
    ==================================================
  */

  const trackLowDragging =
    useRef<number | null>(null);

  const trackHighDragging =
    useRef<number | null>(null);

  const getVerticalPosition = (
    clientY: number,
    element: HTMLDivElement
  ) => {
    const rect =
      element.getBoundingClientRect();

    return Math.max(
      0,
      Math.min(
        1,
        (clientY - rect.top) /
          rect.height
      )
    );
  };

  const handleTrackLowDown = (
    index: number,
    event: React.PointerEvent<HTMLDivElement>
  ) => {
    event.preventDefault();

    trackLowDragging.current =
      index;

    updateTrackLowpass(
      index,
      getVerticalPosition(
        event.clientY,
        event.currentTarget
      )
    );

    event.currentTarget.setPointerCapture(
      event.pointerId
    );
  };

  const handleTrackLowMove = (
    index: number,
    event: React.PointerEvent<HTMLDivElement>
  ) => {
    if (
      trackLowDragging.current !==
      index
    ) {
      return;
    }

    updateTrackLowpass(
      index,
      getVerticalPosition(
        event.clientY,
        event.currentTarget
      )
    );
  };

  const handleTrackLowUp = (
    event: React.PointerEvent<HTMLDivElement>
  ) => {
    trackLowDragging.current =
      null;

    if (
      event.currentTarget.hasPointerCapture(
        event.pointerId
      )
    ) {
      event.currentTarget.releasePointerCapture(
        event.pointerId
      );
    }
  };

  const handleTrackHighDown = (
    index: number,
    event: React.PointerEvent<HTMLDivElement>
  ) => {
    event.preventDefault();

    trackHighDragging.current =
      index;

    updateTrackHighpass(
      index,
      getVerticalPosition(
        event.clientY,
        event.currentTarget
      )
    );

    event.currentTarget.setPointerCapture(
      event.pointerId
    );
  };

  const handleTrackHighMove = (
    index: number,
    event: React.PointerEvent<HTMLDivElement>
  ) => {
    if (
      trackHighDragging.current !==
      index
    ) {
      return;
    }

    updateTrackHighpass(
      index,
      getVerticalPosition(
        event.clientY,
        event.currentTarget
      )
    );
  };

  const handleTrackHighUp = (
    event: React.PointerEvent<HTMLDivElement>
  ) => {
    trackHighDragging.current =
      null;

    if (
      event.currentTarget.hasPointerCapture(
        event.pointerId
      )
    ) {
      event.currentTarget.releasePointerCapture(
        event.pointerId
      );
    }
  };

  /*
    ==================================================
    RENDER
    ==================================================
  */

  return (
    <div
      style={{
        width: "100vw",
        minHeight: "100vh",
        backgroundColor: "#000",
        color: "#fff",
        padding: "3rem",
        paddingBottom: "8rem",
        boxSizing: "border-box",
      }}
    >
      {/* BACK */}

      <nav
        style={{
          position: "fixed",
          left: "3rem",
          top: "3rem",
          zIndex: 100,
          fontSize: "0.95rem",
          letterSpacing: "0.12em",
          textTransform: "lowercase",
        }}
      >
        <Link
          href="/"
          style={{
            color: "#fff",
            textDecoration: "none",
          }}
        >
          ← back
        </Link>
      </nav>

      {/* ==================================================
          LEFT GLOBAL CONTROLS
          ================================================== */}

      <div
        style={{
          position: "fixed",
          left: "3rem",
          top: "50%",
          transform: "translateY(-50%)",
          zIndex: 100,
          display: "flex",
          gap: "2rem",
          alignItems: "center",
          userSelect: "none",
        }}
      >
        {/* GLOBAL */}

        <div
          style={{
            width: "30px",
            height: "260px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <button
            onClick={toggleGlobalPlay}
            aria-label={
              globalPlaying
                ? "Pause all"
                : "Play all"
            }
            style={{
              width: "20px",
              height: "20px",
              padding: 0,
              border: "none",
              background: "none",
              color: "#fff",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {globalPlaying ? (
              <span
                style={{
                  display: "block",
                  width: "2px",
                  height: "11px",
                  backgroundColor: "#fff",
                  boxShadow:
                    "5px 0 0 #fff",
                }}
              />
            ) : (
              <span
                style={{
                  display: "block",
                  width: 0,
                  height: 0,
                  borderTop:
                    "6px solid transparent",
                  borderBottom:
                    "6px solid transparent",
                  borderLeft:
                    "8px solid #fff",
                  marginLeft: "2px",
                }}
              />
            )}
          </button>

          <div
            onPointerDown={
              handleGlobalPointerDown
            }
            onPointerMove={
              handleGlobalPointerMove
            }
            onPointerUp={
              handleGlobalPointerUp
            }
            style={{
              position: "relative",
              width: "20px",
              height: "200px",
              marginTop: "0.8rem",
              cursor: "grab",
              touchAction: "none",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                left: "50%",
                transform:
                  "translateX(-50%)",
                width: "1px",
                backgroundColor:
                  "rgba(255,255,255,0.65)",
              }}
            />

            <div
              style={{
                position: "absolute",
                left: "50%",
                top: `${
                  globalProgress * 100
                }%`,
                transform:
                  "translate(-50%, -50%)",
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor: "#fff",
                pointerEvents: "none",
              }}
            />
          </div>

          <div
            style={{
              marginTop: "0.8rem",
              fontSize: "0.7rem",
              letterSpacing: "0.12em",
              opacity: 0.7,
            }}
          >
            global
          </div>
        </div>

        {/* GLOBAL LOW PASS */}

        <div
          style={{
            width: "30px",
            height: "260px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <div
            onPointerDown={
              handleFilterPointerDown
            }
            onPointerMove={
              handleFilterPointerMove
            }
            onPointerUp={
              handleFilterPointerUp
            }
            style={{
              position: "relative",
              width: "20px",
              height: "200px",
              marginTop: "2rem",
              cursor: "grab",
              touchAction: "none",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                left: "50%",
                transform:
                  "translateX(-50%)",
                width: "1px",
                backgroundColor:
                  "rgba(255,255,255,0.65)",
              }}
            />

            <div
              style={{
                position: "absolute",
                left: "50%",
                top: `${
                  filterPosition * 100
                }%`,
                transform:
                  "translate(-50%, -50%)",
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor: "#fff",
              }}
            />
          </div>

          <div
            style={{
              marginTop: "0.8rem",
              fontSize: "0.7rem",
              letterSpacing: "0.12em",
              opacity: 0.7,
            }}
          >
            low pass
          </div>
        </div>

        {/* GLOBAL HIGH PASS */}

        <div
          style={{
            width: "30px",
            height: "260px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <div
            onPointerDown={
              handleHighpassPointerDown
            }
            onPointerMove={
              handleHighpassPointerMove
            }
            onPointerUp={
              handleHighpassPointerUp
            }
            style={{
              position: "relative",
              width: "20px",
              height: "200px",
              marginTop: "2rem",
              cursor: "grab",
              touchAction: "none",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                left: "50%",
                transform:
                  "translateX(-50%)",
                width: "1px",
                backgroundColor:
                  "rgba(255,255,255,0.65)",
              }}
            />

            <div
              style={{
                position: "absolute",
                left: "50%",
                top: `${
                  highpassPosition * 100
                }%`,
                transform:
                  "translate(-50%, -50%)",
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor: "#fff",
              }}
            />
          </div>

          <div
            style={{
              marginTop: "0.8rem",
              fontSize: "0.7rem",
              letterSpacing: "0.12em",
              opacity: 0.7,
            }}
          >
            high pass
          </div>
        </div>

        {/* S&H */}

        <div
          style={{
            width: "50px",
            height: "260px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <button
            onClick={() =>
              setSampleHold(
                !sampleHold
              )
            }
            style={{
              marginTop: "0.5rem",
              border: "none",
              background: "none",
              color: "#fff",
              padding: 0,
              cursor: "pointer",
              fontSize: "0.7rem",
              letterSpacing: "0.12em",
              opacity:
                sampleHold ? 1 : 0.55,
            }}
          >
            S&H{" "}
            {sampleHold ? "ON" : "OFF"}
          </button>

          {/* RANGE */}

          <div
            onPointerDown={
              handleRangeSize
            }
            onPointerMove={
              handleRangeSizeMove
            }
            onPointerUp={
              handleRangeSizeUp
            }
            style={{
              position: "relative",
              width: "20px",
              height: "70px",
              marginTop: "0.8rem",
              cursor: "ns-resize",
              touchAction: "none",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                left: "50%",
                transform:
                  "translateX(-50%)",
                width: "1px",
                backgroundColor:
                  "rgba(255,255,255,0.35)",
              }}
            />

            <div
              style={{
                position: "absolute",
                left: "50%",
                top: `${
                  (1 -
                    sampleRangeSize) *
                  100
                }%`,
                transform:
                  "translate(-50%, -50%)",
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                backgroundColor: "#fff",
              }}
            />
          </div>

          <div
            style={{
              marginTop: "0.4rem",
              fontSize: "0.6rem",
              opacity: 0.5,
            }}
          >
            range
          </div>

          {/* SPEED */}

          <div
            onPointerDown={
              handleSampleSpeed
            }
            onPointerMove={
              handleSampleSpeedMove
            }
            onPointerUp={
              handleSampleSpeedUp
            }
            style={{
              position: "relative",
              width: "20px",
              height: "70px",
              marginTop: "0.8rem",
              cursor: "ns-resize",
              touchAction: "none",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                left: "50%",
                transform:
                  "translateX(-50%)",
                width: "1px",
                backgroundColor:
                  "rgba(255,255,255,0.35)",
              }}
            />

            <div
              style={{
                position: "absolute",
                left: "50%",
                top: `${
                  100 -
                  ((sampleBpm - 70) /
                    (300 - 70)) *
                    100
                }%`,
                transform:
                  "translate(-50%, -50%)",
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                backgroundColor: "#fff",
              }}
            />
          </div>

          <div
            style={{
              marginTop: "0.4rem",
              fontSize: "0.6rem",
              opacity: 0.5,
              whiteSpace: "nowrap",
            }}
          >
            {sampleBpm} bpm
          </div>

          {/* METRONOME */}

          <button
            onClick={() =>
              setMetronomeOn(
                !metronomeOn
              )
            }
            style={{
              marginTop: "0.8rem",
              border: "none",
              background: "none",
              color: "#fff",
              padding: 0,
              cursor: "pointer",
              fontSize: "0.6rem",
              letterSpacing: "0.08em",
              opacity:
                metronomeOn ? 1 : 0.45,
              whiteSpace: "nowrap",
            }}
          >
            MET {metronomeOn ? "ON" : "OFF"}
          </button>
        </div>
      </div>

      {/* ==================================================
          GLOBAL VOLUME
          ================================================== */}

      <div
        style={{
          position: "fixed",
          right: "3rem",
          top: "3rem",
          zIndex: 100,
          width: "30px",
          height: "150px",
          userSelect: "none",
        }}
      >
        <div
          onPointerDown={
            handleVolumeChange
          }
          onPointerMove={(event) => {
            if (event.buttons === 1) {
              handleVolumeChange(
                event
              );
            }
          }}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "30px",
            height: "120px",
            cursor: "ns-resize",
            touchAction: "none",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: "5px",
              bottom: "5px",
              left: "50%",
              transform:
                "translateX(-50%)",
              width: "1px",
              backgroundColor:
                "rgba(255,255,255,0.5)",
            }}
          />

          <div
            style={{
              position: "absolute",
              left: "50%",
              top: `${
                5 +
                (1 -
                  effectiveVolume) *
                  110
              }px`,
              transform:
                "translate(-50%, -50%)",
              width: "7px",
              height: "7px",
              borderRadius: "50%",
              backgroundColor: "#fff",
            }}
          />
        </div>

        <button
          onPointerDown={
            toggleMute
          }
          aria-label={
            muted
              ? "Unmute sound"
              : "Mute sound"
          }
          style={{
            position: "absolute",
            bottom: 0,
            left: "50%",
            transform:
              "translateX(-50%)",
            width: "24px",
            height: "24px",
            padding: 0,
            border: "none",
            background: "none",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 18 18"
            fill="none"
          >
            <path
              d="M3 7H6L10 3V15L6 11H3V7Z"
              stroke="white"
              strokeWidth="1"
            />

            {!muted ? (
              <>
                <path
                  d="M12 6C13.2 7.2 13.2 10.8 12 12"
                  stroke="white"
                  strokeWidth="1"
                />

                <path
                  d="M14 4.5C16 6.5 16 11.5 14 13.5"
                  stroke="white"
                  strokeWidth="1"
                />
              </>
            ) : (
              <>
                <path
                  d="M12 6L16 12"
                  stroke="white"
                  strokeWidth="1"
                />

                <path
                  d="M16 6L12 12"
                  stroke="white"
                  strokeWidth="1"
                />
              </>
            )}
          </svg>
        </button>
      </div>

      {/* ==================================================
          CONTENT
          ================================================== */}

      <main
        style={{
          maxWidth: "700px",
          margin: "7rem auto 0 auto",
        }}
      >
        <h1
          style={{
            margin: "0 0 5rem 0",
            fontSize: "1.4rem",
            fontWeight: 400,
            letterSpacing: "0.08em",
            textAlign: "center",
          }}
        >
          Sound
        </h1>

        {sounds
          .filter(
            ({ sound }) =>
              sound.toLowerCase() !==
              "metronome.wav"
          )
          .map(
            (
              { sound, description },
              trackIndex
            ) => {
              const multiplier =
                multipliers[
                  trackIndex
                ] || 1;

              const extraLayers =
                multiplier - 1;

              const originalGain =
                Math.pow(
                  10,
                  (-1 *
                    extraLayers) /
                    20
                );

              const layerVolumes = [
                originalGain * 1.0,
                originalGain * 0.95,
                originalGain * 0.9,
                originalGain * 0.85,
              ];

              const layerOpacities = [
                1,
                0.8,
                0.6,
                0.4,
              ];

              const lowPosition =
                trackLowpass[
                  trackIndex
                ] || 0;

              const highPosition =
                trackHighpass[
                  trackIndex
                ] || 0;

              return (
                <div
                  key={sound}
                  style={{
                    marginBottom: "4rem",
                  }}
                >
                  {/* TRACK */}

                  <div
                    style={{
                      display: "flex",
                      alignItems: "stretch",
                      gap: "1.2rem",
                    }}
                  >
                    {/* MAIN TRACK */}

                    <div
                      style={{
                        flex: 1,
                        minWidth: 0,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems:
                            "baseline",
                          gap: "1rem",
                          marginBottom:
                            "1.2rem",
                        }}
                      >
                        <h2
                          style={{
                            margin: 0,
                            fontSize:
                              "1.05rem",
                            fontWeight: 400,
                            letterSpacing:
                              "0.06em",
                          }}
                        >
                          {formatTitle(
                            sound
                          )}
                        </h2>

                        <button
                          onClick={() =>
                            cycleMultiplier(
                              trackIndex
                            )
                          }
                          style={{
                            border: "none",
                            background:
                              "none",
                            color:
                              "#fff",
                            padding: 0,
                            cursor:
                              "pointer",
                            fontSize:
                              "0.8rem",
                            letterSpacing:
                              "0.08em",
                            opacity: 0.7,
                          }}
                        >
                          x{multiplier}
                        </button>
                      </div>

                      {Array.from({
                        length:
                          multiplier,
                      }).map(
                        (
                          _,
                          layerIndex
                        ) => {
                          const playerKey =
                            `${sound}-${layerIndex}`;

                          return (
                            <div
                              key={
                                playerKey
                              }
                              style={{
                                marginBottom:
                                  layerIndex <
                                  multiplier -
                                    1
                                    ? "0.6rem"
                                    : 0,
                              }}
                            >
                              <SoundPlayer
                                ref={(
                                  player
                                ) => {
                                  if (
                                    player
                                  ) {
                                    playerRefs.current.set(
                                      playerKey,
                                      player
                                    );
                                  } else {
                                    playerRefs.current.delete(
                                      playerKey
                                    );
                                  }
                                }}
                                src={`/sound/${sound}`}
                                volume={
                                  effectiveVolume *
                                  layerVolumes[
                                    layerIndex
                                  ]
                                }
                                audioContext={
                                  audioContext
                                }
                                filterNode={
                                  filterNode
                                }
                                lowpassPosition={
                                  lowPosition
                                }
                                highpassPosition={
                                  highPosition
                                }
                                opacity={
                                  layerOpacities[
                                    layerIndex
                                  ]
                                }
                              />
                            </div>
                          );
                        }
                      )}

                      {description.trim() && (
                        <p
                          style={{
                            marginTop:
                              "1.2rem",
                            marginBottom:
                              0,
                            fontSize:
                              "0.9rem",
                            lineHeight:
                              1.7,
                            opacity:
                              0.7,
                            whiteSpace:
                              "pre-line",
                          }}
                        >
                          {description.trim()}
                        </p>
                      )}
                    </div>

                    {/* INDIVIDUAL EQ */}

                    <div
                      style={{
                        width:
                          "48px",
                        flexShrink: 0,
                        display:
                          "flex",
                        alignItems:
                          "flex-start",
                        justifyContent:
                          "center",
                        gap:
                          "0.65rem",
                        paddingTop:
                          "0.15rem",
                      }}
                    >
                      {/* LOW */}

                      <div
                        style={{
                          width:
                            "14px",
                          display:
                            "flex",
                          flexDirection:
                            "column",
                          alignItems:
                            "center",
                        }}
                      >
                        <div
                          onPointerDown={(
                            event
                          ) =>
                            handleTrackLowDown(
                              trackIndex,
                              event
                            )
                          }
                          onPointerMove={(
                            event
                          ) =>
                            handleTrackLowMove(
                              trackIndex,
                              event
                            )
                          }
                          onPointerUp={
                            handleTrackLowUp
                          }
                          style={{
                            position:
                              "relative",
                            width:
                              "14px",
                            height:
                              "100px",
                            cursor:
                              "ns-resize",
                            touchAction:
                              "none",
                          }}
                        >
                          <div
                            style={{
                              position:
                                "absolute",
                              top: 0,
                              bottom:
                                0,
                              left:
                                "50%",
                              transform:
                                "translateX(-50%)",
                              width:
                                "1px",
                              backgroundColor:
                                "rgba(255,255,255,0.4)",
                            }}
                          />

                          <div
                            style={{
                              position:
                                "absolute",
                              left:
                                "50%",
                              top: `${
                                lowPosition *
                                100
                              }%`,
                              transform:
                                "translate(-50%, -50%)",
                              width:
                                "6px",
                              height:
                                "6px",
                              borderRadius:
                                "50%",
                              backgroundColor:
                                "#fff",
                              pointerEvents:
                                "none",
                            }}
                          />
                        </div>

                        <div
                          style={{
                            marginTop:
                              "0.45rem",
                            fontSize:
                              "0.45rem",
                            letterSpacing:
                              "0.04em",
                            opacity:
                              0.45,
                            writingMode:
                              "vertical-rl",
                            transform:
                              "rotate(180deg)",
                          }}
                        >
                          LP
                        </div>
                      </div>

                      {/* HIGH */}

                      <div
                        style={{
                          width:
                            "14px",
                          display:
                            "flex",
                          flexDirection:
                            "column",
                          alignItems:
                            "center",
                        }}
                      >
                        <div
                          onPointerDown={(
                            event
                          ) =>
                            handleTrackHighDown(
                              trackIndex,
                              event
                            )
                          }
                          onPointerMove={(
                            event
                          ) =>
                            handleTrackHighMove(
                              trackIndex,
                              event
                            )
                          }
                          onPointerUp={
                            handleTrackHighUp
                          }
                          style={{
                            position:
                              "relative",
                            width:
                              "14px",
                            height:
                              "100px",
                            cursor:
                              "ns-resize",
                            touchAction:
                              "none",
                          }}
                        >
                          <div
                            style={{
                              position:
                                "absolute",
                              top: 0,
                              bottom:
                                0,
                              left:
                                "50%",
                              transform:
                                "translateX(-50%)",
                              width:
                                "1px",
                              backgroundColor:
                                "rgba(255,255,255,0.4)",
                            }}
                          />

                          <div
                            style={{
                              position:
                                "absolute",
                              left:
                                "50%",
                              top: `${
                                highPosition *
                                100
                              }%`,
                              transform:
                                "translate(-50%, -50%)",
                              width:
                                "6px",
                              height:
                                "6px",
                              borderRadius:
                                "50%",
                              backgroundColor:
                                "#fff",
                              pointerEvents:
                                "none",
                            }}
                          />
                        </div>

                        <div
                          style={{
                            marginTop:
                              "0.45rem",
                            fontSize:
                              "0.45rem",
                            letterSpacing:
                              "0.04em",
                            opacity:
                              0.45,
                            writingMode:
                              "vertical-rl",
                            transform:
                              "rotate(180deg)",
                          }}
                        >
                          HP
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            }
          )}

        <div
          style={{
            width: "100%",
            height: "1px",
            backgroundColor:
              "rgba(255,255,255,0.2)",
            marginTop: "2rem",
            marginBottom: "5rem",
          }}
        />

        <section>
          <h2
            style={{
              margin:
                "0 0 3rem 0",
              fontSize:
                "1.2rem",
              fontWeight: 400,
              letterSpacing:
                "0.08em",
            }}
          >
            Released Music
          </h2>
        </section>
      </main>
    </div>
  );
}