"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

export type SoundPlayerHandle = {
  play: () => Promise<void>;
  pause: () => void;
  moveBy: (amount: number) => void;
};

const DECLICK_FADE_SECONDS = 0.008;

function positionToFrequency(position: number) {
  const maxFrequency = 20000;
  const minFrequency = 80;

  return (
    maxFrequency *
    Math.pow(
      minFrequency / maxFrequency,
      position
    )
  );
}

function positionToHighpassFrequency(
  position: number
) {
  const minFrequency = 20;
  const maxFrequency = 15000;

  return (
    minFrequency *
    Math.pow(
      maxFrequency / minFrequency,
      position
    )
  );
}

const SoundPlayer = forwardRef<
  SoundPlayerHandle,
  {
    src: string;
    volume: number;
    audioContext: AudioContext | null;

    /*
      This is the GLOBAL low-pass node.
    */
    filterNode: BiquadFilterNode | null;

    /*
      These are the individual track EQ positions.
    */
    lowpassPosition?: number;
    highpassPosition?: number;

    showPlayButton?: boolean;
    opacity?: number;
  }
>(function SoundPlayer(
  {
    src,
    volume,
    audioContext,
    filterNode,
    lowpassPosition = 0,
    highpassPosition = 0,
    showPlayButton = true,
    opacity = 1,
  },
  ref
) {
  const audioRef =
    useRef<HTMLAudioElement | null>(
      null
    );

  const sourceNodeRef =
    useRef<MediaElementAudioSourceNode | null>(
      null
    );

  const gainNodeRef =
    useRef<GainNode | null>(null);

  /*
    INDIVIDUAL TRACK FILTERS
  */

  const trackLowpassRef =
    useRef<BiquadFilterNode | null>(
      null
    );

  const trackHighpassRef =
    useRef<BiquadFilterNode | null>(
      null
    );

  /*
    DECLOCK
  */

  const declickTimeoutRef =
    useRef<number | null>(null);

  const declickFallbackTimeoutRef =
    useRef<number | null>(null);

  const declickSeekedListenerRef =
    useRef<(() => void) | null>(
      null
    );

  const [playing, setPlaying] =
    useState(false);

  const [progress, setProgress] =
    useState(0);

  const [ready, setReady] =
    useState(false);

  const dragging =
    useRef(false);

  /*
    ==================================================
    VOLUME
    ==================================================
  */

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume =
        volume;
    }
  }, [volume]);

  /*
    ==================================================
    WEB AUDIO CONNECTION
    ==================================================

    Audio
      ↓
    Gain
      ↓
    Individual Low Pass
      ↓
    Individual High Pass
      ↓
    GLOBAL Low Pass
      ↓
    GLOBAL High Pass
      ↓
    Output
  */

  useEffect(() => {
    const audio =
      audioRef.current;

    if (
      !audio ||
      !audioContext ||
      !filterNode
    ) {
      return;
    }

    if (!sourceNodeRef.current) {
      try {
        sourceNodeRef.current =
          audioContext.createMediaElementSource(
            audio
          );
      } catch (error) {
        console.error(
          "Could not create audio source:",
          error
        );

        return;
      }
    }

    if (!gainNodeRef.current) {
      const gain =
        audioContext.createGain();

      gain.gain.value = 1;

      gainNodeRef.current =
        gain;
    }

    if (!trackLowpassRef.current) {
      const lowpass =
        audioContext.createBiquadFilter();

      lowpass.type =
        "lowpass";

      lowpass.Q.value = 0;

      lowpass.frequency.value =
        20000;

      trackLowpassRef.current =
        lowpass;
    }

    if (!trackHighpassRef.current) {
      const highpass =
        audioContext.createBiquadFilter();

      highpass.type =
        "highpass";

      highpass.Q.value = 0;

      highpass.frequency.value =
        20;

      trackHighpassRef.current =
        highpass;
    }

    const source =
      sourceNodeRef.current;

    const gain =
      gainNodeRef.current;

    const lowpass =
      trackLowpassRef.current;

    const highpass =
      trackHighpassRef.current;

    if (
      !source ||
      !gain ||
      !lowpass ||
      !highpass
    ) {
      return;
    }

    try {
      source.disconnect();
    } catch {}

    try {
      gain.disconnect();
    } catch {}

    try {
      lowpass.disconnect();
    } catch {}

    try {
      highpass.disconnect();
    } catch {}

    /*
      Rebuild the chain.
    */

    source.connect(gain);

    gain.connect(lowpass);

    lowpass.connect(highpass);

    highpass.connect(filterNode);

    return () => {
      try {
        source.disconnect();
      } catch {}

      try {
        gain.disconnect();
      } catch {}

      try {
        lowpass.disconnect();
      } catch {}

      try {
        highpass.disconnect();
      } catch {}
    };
  }, [
    audioContext,
    filterNode,
  ]);

  /*
    ==================================================
    INDIVIDUAL LOW PASS
    ==================================================
  */

  useEffect(() => {
    const filter =
      trackLowpassRef.current;

    if (!filter) return;

    const frequency =
      positionToFrequency(
        lowpassPosition
      );

    filter.frequency.setTargetAtTime(
      frequency,
      filter.context.currentTime,
      0.01
    );
  }, [
    lowpassPosition,
  ]);

  /*
    ==================================================
    INDIVIDUAL HIGH PASS
    ==================================================
  */

  useEffect(() => {
    const filter =
      trackHighpassRef.current;

    if (!filter) return;

    const frequency =
      positionToHighpassFrequency(
        highpassPosition
      );

    filter.frequency.setTargetAtTime(
      frequency,
      filter.context.currentTime,
      0.01
    );
  }, [
    highpassPosition,
  ]);

  /*
    ==================================================
    PROGRESS / METADATA
    ==================================================
  */

  useEffect(() => {
    const audio =
      audioRef.current;

    if (!audio) return;

    const handleLoadedMetadata =
      () => {
        setReady(true);
      };

    const updateProgress =
      () => {
        if (
          !audio.duration ||
          !isFinite(
            audio.duration
          )
        ) {
          return;
        }

        setProgress(
          audio.currentTime /
            audio.duration
        );
      };

    const handleEnded = () => {
      setPlaying(false);
      setProgress(0);
    };

    audio.addEventListener(
      "loadedmetadata",
      handleLoadedMetadata
    );

    audio.addEventListener(
      "timeupdate",
      updateProgress
    );

    audio.addEventListener(
      "ended",
      handleEnded
    );

    if (audio.readyState >= 1) {
      setReady(true);
    }

    return () => {
      audio.removeEventListener(
        "loadedmetadata",
        handleLoadedMetadata
      );

      audio.removeEventListener(
        "timeupdate",
        updateProgress
      );

      audio.removeEventListener(
        "ended",
        handleEnded
      );
    };
  }, []);

  /*
    ==================================================
    DECLOCK CLEANUP
    ==================================================
  */

  useEffect(() => {
    return () => {
      if (
        declickTimeoutRef.current !==
        null
      ) {
        window.clearTimeout(
          declickTimeoutRef.current
        );

        declickTimeoutRef.current =
          null;
      }

      if (
        declickFallbackTimeoutRef.current !==
        null
      ) {
        window.clearTimeout(
          declickFallbackTimeoutRef.current
        );

        declickFallbackTimeoutRef.current =
          null;
      }

      const audio =
        audioRef.current;

      if (
        audio &&
        declickSeekedListenerRef.current
      ) {
        audio.removeEventListener(
          "seeked",
          declickSeekedListenerRef.current
        );

        declickSeekedListenerRef.current =
          null;
      }
    };
  }, []);

  /*
    ==================================================
    CLEAR DECLOCK
    ==================================================
  */

  const clearPendingDeclick =
    () => {
      if (
        declickTimeoutRef.current !==
        null
      ) {
        window.clearTimeout(
          declickTimeoutRef.current
        );

        declickTimeoutRef.current =
          null;
      }

      if (
        declickFallbackTimeoutRef.current !==
        null
      ) {
        window.clearTimeout(
          declickFallbackTimeoutRef.current
        );

        declickFallbackTimeoutRef.current =
          null;
      }

      const audio =
        audioRef.current;

      if (
        audio &&
        declickSeekedListenerRef.current
      ) {
        audio.removeEventListener(
          "seeked",
          declickSeekedListenerRef.current
        );

        declickSeekedListenerRef.current =
          null;
      }
    };

  /*
    ==================================================
    GAIN RAMP
    ==================================================
  */

  const rampGainTo = (
    target: number
  ) => {
    const gainNode =
      gainNodeRef.current;

    if (
      !audioContext ||
      !gainNode
    ) {
      return;
    }

    const gainParam =
      gainNode.gain;

    const now =
      audioContext.currentTime;

    gainParam.cancelScheduledValues(
      now
    );

    gainParam.setValueAtTime(
      gainParam.value,
      now
    );

    gainParam.linearRampToValueAtTime(
      target,
      now +
        DECLICK_FADE_SECONDS
    );
  };

  /*
    ==================================================
    DECLOCKED JUMP
    ==================================================
  */

  const declickJump = (
    jump: () => void
  ) => {
    const gainNode =
      gainNodeRef.current;

    const audio =
      audioRef.current;

    if (
      !audioContext ||
      !gainNode ||
      !audio
    ) {
      jump();
      return;
    }

    clearPendingDeclick();

    rampGainTo(0);

    declickTimeoutRef.current =
      window.setTimeout(() => {
        declickTimeoutRef.current =
          null;

        jump();

        const finishFadeIn =
          () => {
            clearPendingDeclick();
            rampGainTo(1);
          };

        declickSeekedListenerRef.current =
          finishFadeIn;

        audio.addEventListener(
          "seeked",
          finishFadeIn,
          { once: true }
        );

        declickFallbackTimeoutRef.current =
          window.setTimeout(
            finishFadeIn,
            120
          );
      },
      DECLICK_FADE_SECONDS *
        1000);
  };

  /*
    ==================================================
    IMPERATIVE HANDLE
    ==================================================
  */

  useImperativeHandle(
    ref,
    () => ({
      play: async () => {
        const audio =
          audioRef.current;

        if (!audio) return;

        if (
          audioContext &&
          audioContext.state ===
            "suspended"
        ) {
          try {
            await audioContext.resume();
          } catch (err) {
            console.error(
              "Could not resume AudioContext:",
              err
            );
          }
        }

        try {
          audio.volume =
            volume;

          await audio.play();

          setPlaying(true);
        } catch (error) {
          console.error(
            "Could not play audio:",
            error
          );
        }
      },

      pause: () => {
        const audio =
          audioRef.current;

        if (!audio) return;

        audio.pause();

        setPlaying(false);
      },

      moveBy: (
        amount: number
      ) => {
        const audio =
          audioRef.current;

        if (
          !audio ||
          !ready ||
          !audio.duration ||
          !isFinite(
            audio.duration
          )
        ) {
          return;
        }

        const current =
          audio.currentTime /
          audio.duration;

        const newProgress =
          Math.max(
            0,
            Math.min(
              1,
              current + amount
            )
          );

        declickJump(() => {
          audio.currentTime =
            newProgress *
            audio.duration;

          setProgress(
            newProgress
          );
        });
      },
    }),
    [
      volume,
      audioContext,
      ready,
    ]
  );

  /*
    ==================================================
    INDIVIDUAL PLAYHEAD
    ==================================================
  */

  const updatePosition = (
    clientX: number,
    element: HTMLDivElement
  ) => {
    const audio =
      audioRef.current;

    if (
      !audio ||
      !ready ||
      !audio.duration ||
      !isFinite(
        audio.duration
      )
    ) {
      return;
    }

    const rect =
      element.getBoundingClientRect();

    const position =
      Math.max(
        0,
        Math.min(
          1,
          (clientX -
            rect.left) /
            rect.width
        )
      );

    declickJump(() => {
      audio.currentTime =
        position *
        audio.duration;

      setProgress(position);
    });
  };

  const handlePointerDown = (
    event: React.PointerEvent<HTMLDivElement>
  ) => {
    event.preventDefault();

    dragging.current =
      true;

    updatePosition(
      event.clientX,
      event.currentTarget
    );

    event.currentTarget.setPointerCapture(
      event.pointerId
    );
  };

  const handlePointerMove = (
    event: React.PointerEvent<HTMLDivElement>
  ) => {
    if (!dragging.current)
      return;

    updatePosition(
      event.clientX,
      event.currentTarget
    );
  };

  const handlePointerUp = (
    event: React.PointerEvent<HTMLDivElement>
  ) => {
    dragging.current =
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
    PLAY / PAUSE
    ==================================================
  */

  const togglePlay = async () => {
    const audio =
      audioRef.current;

    if (!audio) return;

    if (
      audioContext &&
      audioContext.state ===
        "suspended"
    ) {
      try {
        await audioContext.resume();
      } catch (err) {
        console.error(
          "Could not resume AudioContext:",
          err
        );
      }
    }

    if (audio.paused) {
      try {
        audio.volume =
          volume;

        await audio.play();

        setPlaying(true);
      } catch (error) {
        console.error(
          "Could not play audio:",
          error
        );
      }
    } else {
      audio.pause();

      setPlaying(false);
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
        display: "flex",
        alignItems: "center",
        gap: "1rem",
        opacity,
      }}
    >
      <audio
        ref={audioRef}
        src={src}
        preload="auto"
        loop
      />

      {showPlayButton ? (
        <button
          onClick={togglePlay}
          aria-label={
            playing
              ? "Pause"
              : "Play"
          }
          style={{
            width: "18px",
            height: "18px",
            padding: 0,
            border: "none",
            background: "none",
            color: "#fff",
            cursor: "pointer",
            display: "flex",
            alignItems:
              "center",
            justifyContent:
              "center",
          }}
        >
          {playing ? (
            <span
              style={{
                display: "block",
                width: "2px",
                height: "11px",
                backgroundColor:
                  "#fff",
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
      ) : (
        <div
          style={{
            width: "18px",
            height: "18px",
          }}
        />
      )}

      <div
        onPointerDown={
          handlePointerDown
        }
        onPointerMove={
          handlePointerMove
        }
        onPointerUp={
          handlePointerUp
        }
        style={{
          position:
            "relative",
          height: "20px",
          flex: 1,
          cursor:
            dragging.current
              ? "grabbing"
              : "grab",
          touchAction:
            "none",
          display: "flex",
          alignItems:
            "center",
        }}
      >
        <div
          style={{
            position:
              "absolute",
            left: 0,
            right: 0,
            height: "1px",
            backgroundColor:
              "rgba(255,255,255,0.45)",
          }}
        />

        <div
          style={{
            position:
              "absolute",
            left: `${
              progress * 100
            }%`,
            top: "50%",
            transform:
              "translate(-50%, -50%)",
            width: "7px",
            height: "7px",
            borderRadius:
              "50%",
            backgroundColor:
              "#fff",
            pointerEvents:
              "none",
          }}
        />
      </div>
    </div>
  );
});

export default SoundPlayer;