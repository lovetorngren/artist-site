"use client";

import {
  useEffect,
  useRef,
} from "react";
import { useRouter } from "next/navigation";

type Particle = {
  x: number;
  y: number;
  z: number;
  size: number;
  brightness: number;
  angle: number;
  position: number;
  radius: number;
};

type ProjectedParticle = {
  x: number;
  y: number;
  z: number;
  size: number;
  brightness: number;
  particle: Particle;
};

type Ripple = {
  x: number;
  angle: number;
  radius: number;
  startTime: number;
};

type FinalPhase = "crack";

export default function DeepSeaLogicPage() {
  const canvasRef =
    useRef<HTMLCanvasElement | null>(null);

  const homepagePortalRef =
    useRef<HTMLDivElement | null>(null);

  const homepageIframeRef =
    useRef<HTMLIFrameElement | null>(null);

  const router =
    useRouter();

  useEffect(() => {
    const canvasElement =
      canvasRef.current;

    if (canvasElement === null) {
      return;
    }

    const contextElement =
      canvasElement.getContext("2d");

    if (contextElement === null) {
      return;
    }

    const canvas: HTMLCanvasElement =
      canvasElement;

    const ctx: CanvasRenderingContext2D =
      contextElement;

    const homepagePortal =
      homepagePortalRef.current;

    const homepageIframe =
      homepageIframeRef.current;

    const rippleSound =
      new Audio("/deepripple.wav");

    rippleSound.preload = "auto";

    let width = 0;
    let height = 0;
    let animationFrame = 0;

    let rotationY = 0;
    let rotationX = -0.15;

    let targetRotationY = 0;
    let targetRotationX = -0.15;

    let zoom = 0.4;
    let targetZoom = 0.4;

    let dragging = false;
    let previousMouseX = 0;
    let previousMouseY = 0;

    let dragStarted = false;
    let hasClickedOnce = false;

    let maximumZoomReachedTime:
      number | null = null;

    let readyForFinalClick = false;

    let finalState = false;

    let finalClickX = 0;
    let finalClickY = 0;

    let finalTransitionStart:
      number | null = null;

    let finalPhase:
      FinalPhase = "crack";

    /*
     * The crack follows the mouse after the final
     * click. These coordinates are initially set
     * to the location of that click.
     */
    let crackX = 0;
    let crackY = 0;

    let crackTargetX = 0;
    let crackTargetY = 0;

    /*
     * Separate zoom for the crack itself.
     * Scrolling in the final state makes the crack
     * wider, as if zooming into the opening.
     */
    let crackZoom = 1;

    let clickCount = 0;
    let colorTransitionStart = 0;

    const ripples: Ripple[] = [];

    const entranceTime =
      performance.now();

    const particles: Particle[] = [];
    const particleCount = 15000;

    /*
     * Fixed random field for the final pixel
     * dissolution. Kept here because the rest
     * of the particle system remains unchanged.
     */
    const dissolveGridSize = 5;

    const dissolveNoise: number[] = [];

    let dissolveColumns = 0;
    let dissolveRows = 0;

    function rebuildDissolveNoise() {
      dissolveColumns =
        Math.ceil(
          width /
            dissolveGridSize
        );

      dissolveRows =
        Math.ceil(
          height /
            dissolveGridSize
        );

      dissolveNoise.length = 0;

      for (
        let y = 0;
        y < dissolveRows;
        y++
      ) {
        for (
          let x = 0;
          x < dissolveColumns;
          x++
        ) {
          const value =
            Math.sin(
              x * 12.9898 +
                y * 78.233
            ) *
            43758.5453;

          dissolveNoise.push(
            value -
              Math.floor(value)
          );
        }
      }
    }

    for (
      let i = 0;
      i < particleCount;
      i++
    ) {
      const position =
        Math.random();

      const angle =
        Math.random() *
        Math.PI *
        2;

      const radius =
        0.08 +
        Math.pow(
          1 - position,
          0.72
        ) *
          1.15;

      const irregularity =
        1 +
        Math.sin(
          angle * 7 +
            position * 20
        ) *
          0.035 +
        (Math.random() - 0.5) *
          0.08;

      const finalRadius =
        radius *
        irregularity;

      particles.push({
        x:
          (position - 0.5) *
          2.7,

        y:
          Math.cos(angle) *
          finalRadius,

        z:
          Math.sin(angle) *
          finalRadius,

        size:
          0.35 +
          Math.random() * 0.9,

        brightness:
          0.35 +
          Math.random() * 0.65,

        angle,

        position,

        radius:
          finalRadius,
      });
    }

    function resize() {
      const rect =
        canvas.getBoundingClientRect();

      const devicePixelRatio =
        Math.min(
          window.devicePixelRatio || 1,
          2
        );

      width = rect.width;
      height = rect.height;

      canvas.width =
        width *
        devicePixelRatio;

      canvas.height =
        height *
        devicePixelRatio;

      ctx.setTransform(
        devicePixelRatio,
        0,
        0,
        devicePixelRatio,
        0,
        0
      );

      rebuildDissolveNoise();
    }

    function rotatePoint(
      x: number,
      y: number,
      z: number
    ) {
      const cosY =
        Math.cos(rotationY);

      const sinY =
        Math.sin(rotationY);

      const x1 =
        x * cosY -
        z * sinY;

      const z1 =
        x * sinY +
        z * cosY;

      const cosX =
        Math.cos(rotationX);

      const sinX =
        Math.sin(rotationX);

      const y2 =
        y * cosX -
        z1 * sinX;

      const z2 =
        y * sinX +
        z1 * cosX;

      return {
        x: x1,
        y: y2,
        z: z2,
      };
    }

    function getAngleDifference(
      angleA: number,
      angleB: number
    ) {
      let difference =
        angleA - angleB;

      while (
        difference >
        Math.PI
      ) {
        difference -=
          Math.PI * 2;
      }

      while (
        difference <
        -Math.PI
      ) {
        difference +=
          Math.PI * 2;
      }

      return Math.abs(
        difference
      );
    }

    function findClickedParticle(
      mouseX: number,
      mouseY: number,
      projected: ProjectedParticle[]
    ) {
      let closest:
        ProjectedParticle | null =
        null;

      let closestDistance =
        Infinity;

      for (
        const particle of projected
      ) {
        const dx =
          particle.x -
          mouseX;

        const dy =
          particle.y -
          mouseY;

        const distance =
          dx * dx +
          dy * dy;

        if (
          distance <
          closestDistance
        ) {
          closestDistance =
            distance;

          closest =
            particle;
        }
      }

      return closest;
    }

    function projectParticles() {
      const projected:
        ProjectedParticle[] = [];

      for (
        const particle of particles
      ) {
        const rotated =
          rotatePoint(
            particle.x,
            particle.y,
            particle.z
          );

        const cameraDistance =
          3.4;

        const perspective =
          cameraDistance /
          (cameraDistance +
            rotated.z);

        const scale =
          Math.min(
            width,
            height
          ) *
          0.45 *
          zoom;

        const screenX =
          width / 2 +
          rotated.x *
            scale *
            perspective;

        const screenY =
          height / 2 +
          rotated.y *
            scale *
            perspective;

        projected.push({
          x: screenX,
          y: screenY,
          z: rotated.z,

          size:
            particle.size *
            perspective *
            zoom,

          brightness:
            particle.brightness *
            (0.75 +
              perspective *
                0.65),

          particle,
        });
      }

      projected.sort(
        (a, b) =>
          a.z - b.z
      );

      return projected;
    }

    function getParticleColor(
      now: number
    ) {
      if (
        colorTransitionStart === 0
      ) {
        return {
          r: 255,
          g: 255,
          b: 255,
        };
      }

      const initialShiftDuration =
        1800;

      const elapsed =
        now -
        colorTransitionStart;

      if (
        elapsed <
        initialShiftDuration
      ) {
        const progress =
          Math.max(
            0,
            Math.min(
              1,
              elapsed /
                initialShiftDuration
            )
          );

        const easedProgress =
          0.5 -
          0.5 *
            Math.cos(
              progress *
                Math.PI
            );

        const startColor = {
          r: 255,
          g: 255,
          b: 255,
        };

        const iceColor = {
          r: 205,
          g: 242,
          b: 250,
        };

        return {
          r:
            startColor.r +
            (iceColor.r -
              startColor.r) *
              easedProgress,

          g:
            startColor.g +
            (iceColor.g -
              startColor.g) *
              easedProgress,

          b:
            startColor.b +
            (iceColor.b -
              startColor.b) *
              easedProgress,
        };
      }

      const colorDuration =
        15000;

      const colors = [
        {
          r: 175,
          g: 200,
          b: 255,
        },
        {
          r: 135,
          g: 194,
          b: 207,
        },
        {
          r: 145,
          g: 151,
          b: 195,
        },
        {
          r: 218,
          g: 208,
          b: 157,
        },
        {
          r: 190,
          g: 157,
          b: 76,
        },
        {
          r: 255,
          g: 255,
          b: 255,
        },
      ];

      const cycleElapsed =
        elapsed -
        initialShiftDuration;

      const totalCycleDuration =
        colorDuration *
        colors.length;

      const cycleTime =
        cycleElapsed %
        totalCycleDuration;

      const currentIndex =
        Math.floor(
          cycleTime /
            colorDuration
        );

      const nextIndex =
        (currentIndex + 1) %
        colors.length;

      const localProgress =
        (cycleTime %
          colorDuration) /
        colorDuration;

      const easedProgress =
        0.5 -
        0.5 *
          Math.cos(
            localProgress *
              Math.PI
          );

      const currentColor =
        colors[currentIndex];

      const nextColor =
        colors[nextIndex];

      return {
        r:
          currentColor.r +
          (nextColor.r -
            currentColor.r) *
            easedProgress,

        g:
          currentColor.g +
          (nextColor.g -
            currentColor.g) *
            easedProgress,

        b:
          currentColor.b +
          (nextColor.b -
            currentColor.b) *
            easedProgress,
      };
    }

    function drawEntranceBall(
      now: number
    ) {
      const elapsed =
        now -
        entranceTime;

      const fallDuration =
        2500;

      const stayDuration =
        700;

      const shrinkDuration =
        200;

      const totalDuration =
        fallDuration +
        stayDuration +
        shrinkDuration;

      if (
        elapsed >=
        totalDuration
      ) {
        return;
      }

      const startY =
        -30;

      const endY =
        height / 2;

      let ballY =
        endY;

      let radius = 6;

      if (
        elapsed <
        fallDuration
      ) {
        const progress =
          elapsed /
          fallDuration;

        const easedProgress =
          1 -
          Math.pow(
            1 - progress,
            3
          );

        ballY =
          startY +
          (endY - startY) *
            easedProgress;
      } else if (
        elapsed <
        fallDuration +
          stayDuration
      ) {
        ballY =
          endY;
      } else {
        const shrinkProgress =
          (elapsed -
            fallDuration -
            stayDuration) /
          shrinkDuration;

        radius =
          6 *
          Math.max(
            0,
            1 - shrinkProgress
          );
      }

      if (
        radius <= 0
      ) {
        return;
      }

      ctx.beginPath();

      ctx.arc(
        width / 2,
        ballY,
        radius,
        0,
        Math.PI * 2
      );

      ctx.fillStyle =
        "rgba(255,255,255,1)";

      ctx.fill();
    }

    /*
     * The homepage is a full-size static world
     * behind the black surface.
     *
     * Only the crack-shaped clip region is visible.
     * The iframe itself never moves.
     */
    function updateHomepageCrack(
      now: number
    ) {
      if (
        homepagePortal === null ||
        homepageIframe === null
      ) {
        return;
      }

      if (
        !finalState
      ) {
        homepagePortal.style.display =
          "none";

        return;
      }

      if (
        finalTransitionStart ===
        null
      ) {
        homepagePortal.style.display =
          "none";

        return;
      }

      const elapsed =
        now -
        finalTransitionStart;

      const openingDuration =
        900;

      const progress =
        Math.max(
          0,
          Math.min(
            1,
            elapsed /
              openingDuration
          )
        );

      /*
       * Smoothly open the crack from the final
       * click position.
       */
      const easedProgress =
        0.5 -
        0.5 *
          Math.cos(
            progress *
              Math.PI
          );

      const baseCrackWidth =
        9;

      const maxCrackHeight =
        height;

      const openingWidth =
        0.75 +
        (baseCrackWidth -
          0.75) *
          easedProgress;

      const crackWidth =
        openingWidth *
        crackZoom;

      const crackHeight =
        maxCrackHeight;

      /*
       * The crack follows the mouse horizontally.
       * Its vertical position stays fixed because
       * the crack spans the entire screen height.
       */
      if (
        progress < 1
      ) {
        crackX =
          finalClickX;

        crackY =
          height / 2;
      } else {
        crackX +=
          (crackTargetX -
            crackX) *
          0.18;

        crackY =
          height / 2;
      }

      const left =
        crackX -
        crackWidth / 2;

      const right =
        crackX +
        crackWidth / 2;

      const top = 0;

      const bottom = height;

      /*
       * A straight vertical slit.
       *
       * The tiny offsets keep it from looking
       * perfectly computer-generated while still
       * reading as a straight crack.
       */
      const edgeOffset =
        Math.min(
          1.2,
          crackWidth * 0.2
        );

      const clipPath =
        `polygon(
          ${left}px ${top}px,
          ${right}px ${top + edgeOffset}px,
          ${right - edgeOffset}px ${bottom}px,
          ${left + edgeOffset}px ${bottom - edgeOffset}px
        )`;

      homepagePortal.style.display =
        "block";

      homepagePortal.style.left =
        "0px";

      homepagePortal.style.top =
        "0px";

      homepagePortal.style.width =
        `${width}px`;

      homepagePortal.style.height =
        `${height}px`;

      homepagePortal.style.clipPath =
        clipPath;

      homepageIframe.style.width =
        `${width}px`;

      homepageIframe.style.height =
        `${height}px`;

      homepageIframe.style.left =
        "0px";

      homepageIframe.style.top =
        "0px";

      homepageIframe.style.transform =
        "none";
    }

    function drawRipples(
      now: number,
      projected: ProjectedParticle[],
      rippleList: Ripple[]
    ) {
      for (
        let i =
          rippleList.length - 1;
        i >= 0;
        i--
      ) {
        if (
          now -
            rippleList[i]
              .startTime >
          6000
        ) {
          rippleList.splice(
            i,
            1
          );
        }
      }

      for (
        const projectedParticle of projected
      ) {
        const particle =
          projectedParticle.particle;

        let rippleBrightness =
          0;

        let displacement = 0;

        for (
          const ripple of rippleList
        ) {
          const age =
            now -
            ripple.startTime;

          const waveSpeed =
            0.000575;

          const waveRadius =
            age *
            waveSpeed;

          const longitudinalDistance =
            Math.abs(
              particle.x -
                ripple.x
            );

          const angleDifference =
            getAngleDifference(
              particle.angle,
              ripple.angle
            );

          const averageRadius =
            (particle.radius +
              ripple.radius) /
            2;

          const circumferentialDistance =
            angleDifference *
            averageRadius;

          const surfaceDistance =
            Math.sqrt(
              longitudinalDistance *
                longitudinalDistance +
                circumferentialDistance *
                  circumferentialDistance
            );

          const distanceFromWave =
            Math.abs(
              surfaceDistance -
                waveRadius
            );

          const waveWidth =
            0.09;

          if (
            distanceFromWave <
            waveWidth
          ) {
            const strength =
              1 -
              distanceFromWave /
                waveWidth;

            const fade =
              Math.max(
                0,
                1 -
                  age /
                    6000
              );

            const wave =
              strength *
              fade;

            rippleBrightness =
              Math.max(
                rippleBrightness,
                wave
              );

            displacement +=
              wave;
          }
        }

        if (
          rippleBrightness <=
          0
        ) {
          continue;
        }

        const size =
          Math.max(
            0.35,
            projectedParticle.size +
              rippleBrightness *
                4.8
          );

        let drawX =
          projectedParticle.x;

        let drawY =
          projectedParticle.y;

        if (
          displacement > 0
        ) {
          const outward =
            0.025 *
            displacement;

          const displaced =
            rotatePoint(
              particle.x,
              particle.y +
                Math.cos(
                  particle.angle
                ) *
                  outward,
              particle.z +
                Math.sin(
                  particle.angle
                ) *
                  outward
            );

          const cameraDistance =
            3.4;

          const perspective =
            cameraDistance /
            (cameraDistance +
              displaced.z);

          const scale =
            Math.min(
              width,
              height
            ) *
            0.45 *
            zoom;

          drawX =
            width / 2 +
            displaced.x *
              scale *
              perspective;

          drawY =
            height / 2 +
            displaced.y *
              scale *
              perspective;
        }

        if (
          drawX < -10 ||
          drawX >
            width + 10 ||
          drawY < -10 ||
          drawY >
            height + 10
        ) {
          continue;
        }

        const brightness =
          rippleBrightness *
          particle.brightness;

        if (
          brightness <=
          0
        ) {
          continue;
        }

        const color =
          getParticleColor(
            now
          );

        ctx.fillStyle =
          `rgba(${color.r},${color.g},${color.b},${brightness})`;

        ctx.fillRect(
          drawX -
            size / 2,
          drawY -
            size / 2,
          size,
          size
        );
      }
    }

    function draw() {
      const now =
        performance.now();

      if (
        finalState
      ) {
        /*
         * The black surface remains completely
         * static. The homepage is exposed only
         * through the moving crack.
         */
        ctx.fillStyle =
          "#000000";

        ctx.fillRect(
          0,
          0,
          width,
          height
        );

        updateHomepageCrack(
          now
        );

        animationFrame =
          requestAnimationFrame(
            draw
          );

        return;
      }

      /*
       * Make sure the live homepage is hidden
       * before the final sequence begins.
       */
      if (
        homepagePortal !== null
      ) {
        homepagePortal.style.display =
          "none";
      }

      ctx.fillStyle =
        "#000000";

      ctx.fillRect(
        0,
        0,
        width,
        height
      );

      rotationY +=
        (targetRotationY -
          rotationY) *
        0.08;

      rotationX +=
        (targetRotationX -
          rotationX) *
        0.08;

      zoom +=
        (targetZoom -
          zoom) *
        0.1;

      /*
       * The final click only becomes available
       * after:
       *
       * 1. Initial click
       * 2. Actual drag
       * 3. Maximum zoom
       * 4. Three seconds at maximum zoom
       */
      if (
        hasClickedOnce &&
        dragStarted &&
        targetZoom >=
          3.99 &&
        zoom >=
          3.99
      ) {
        if (
          maximumZoomReachedTime ===
          null
        ) {
          maximumZoomReachedTime =
            now;
        } else if (
          now -
            maximumZoomReachedTime >=
          3000
        ) {
          readyForFinalClick =
            true;
        }
      } else {
        maximumZoomReachedTime =
          null;

        readyForFinalClick =
          false;
      }

      const projected =
        projectParticles();

      drawRipples(
        now,
        projected,
        ripples
      );

      drawEntranceBall(
        now
      );

      animationFrame =
        requestAnimationFrame(
          draw
        );
    }

    function handleMouseDown(
      event: MouseEvent
    ) {
      if (
        finalState
      ) {
        return;
      }

      /*
       * This is the only place where the final
       * crack can be triggered.
       */
      if (
        readyForFinalClick &&
        targetZoom >=
          3.99 &&
        zoom >=
          3.99
      ) {
        finalState = true;

        finalClickX =
          event.clientX;

        finalClickY =
          event.clientY;

        crackX =
          finalClickX;

        crackY =
          height / 2;

        crackTargetX =
          finalClickX;

        crackTargetY =
          height / 2;

        crackZoom = 1;

        finalTransitionStart =
          performance.now();

        finalPhase =
          "crack";

        dragging = false;

        canvas.style.cursor =
          "default";

        return;
      }

      hasClickedOnce =
        true;

      dragging = true;

      previousMouseX =
        event.clientX;

      previousMouseY =
        event.clientY;

      const projected =
        projectParticles();

      const clicked =
        findClickedParticle(
          event.clientX,
          event.clientY,
          projected
        );

      if (
        clicked !== null
      ) {
        clickCount += 1;

        if (
          clickCount === 10
        ) {
          colorTransitionStart =
            performance.now();
        }

        ripples.push({
          x:
            clicked.particle.x,

          angle:
            clicked.particle.angle,

          radius:
            clicked.particle.radius,

          startTime:
            performance.now(),
        });

        rippleSound.pause();

        rippleSound.currentTime =
          0;

        void rippleSound.play();
      }

      canvas.style.cursor =
        "grabbing";
    }

    function handleMouseMove(
      event: MouseEvent
    ) {
      /*
       * Once the final crack exists, the mouse
       * controls the crack position instead of
       * rotating the particle world.
       */
      if (
        finalState
      ) {
        crackTargetX =
          event.clientX;

        crackTargetY =
          height / 2;

        return;
      }

      if (!dragging) {
        return;
      }

      const deltaX =
        event.clientX -
        previousMouseX;

      const deltaY =
        event.clientY -
        previousMouseY;

      if (
        Math.abs(deltaX) > 0 ||
        Math.abs(deltaY) > 0
      ) {
        dragStarted = true;
      }

      previousMouseX =
        event.clientX;

      previousMouseY =
        event.clientY;

      targetRotationY +=
        deltaX * 0.006;

      targetRotationX +=
        deltaY * 0.006;

      targetRotationX =
        Math.max(
          -1.3,
          Math.min(
            1.3,
            targetRotationX
          )
        );
    }

    function handleMouseUp() {
      dragging = false;

      if (
        !finalState
      ) {
        canvas.style.cursor =
          "grab";
      }
    }

    function handleWheel(
      event: WheelEvent
    ) {
      if (
        finalState
      ) {
        event.preventDefault();

        crackZoom +=
          -event.deltaY *
          0.003;

        crackZoom =
          Math.max(
            1,
            Math.min(
              8,
              crackZoom
            )
          );

        return;
      }

      event.preventDefault();

      targetZoom +=
        -event.deltaY *
        0.0015;

      targetZoom =
        Math.max(
          0.35,
          Math.min(
            4,
            targetZoom
          )
        );
    }

    resize();

    canvas.style.cursor =
      "grab";

    if (
      homepagePortal !== null
    ) {
      homepagePortal.style.display =
        "none";

      homepagePortal.style.pointerEvents =
        "none";
    }

    if (
      homepageIframe !== null
    ) {
      homepageIframe.src =
        "/";
    }

    window.addEventListener(
      "resize",
      resize
    );

    canvas.addEventListener(
      "mousedown",
      handleMouseDown
    );

    window.addEventListener(
      "mousemove",
      handleMouseMove
    );

    window.addEventListener(
      "mouseup",
      handleMouseUp
    );

    canvas.addEventListener(
      "wheel",
      handleWheel,
      { passive: false }
    );

    animationFrame =
      requestAnimationFrame(
        draw
      );

    return () => {
      cancelAnimationFrame(
        animationFrame
      );

      window.removeEventListener(
        "resize",
        resize
      );

      canvas.removeEventListener(
        "mousedown",
        handleMouseDown
      );

      window.removeEventListener(
        "mousemove",
        handleMouseMove
      );

      window.removeEventListener(
        "mouseup",
        handleMouseUp
      );

      canvas.removeEventListener(
        "wheel",
        handleWheel
      );
    };
  }, [router]);

  return (
    <main
      style={{
        width: "100%",
        height: "100vh",
        background:
          "#000000",
        overflow:
          "hidden",
        position:
          "relative",
      }}
    >
      <button
        onClick={() =>
          router.back()
        }
        style={{
          position:
            "absolute",

          top:
            "24px",

          left:
            "28px",

          zIndex:
            10,

          background:
            "transparent",

          border:
            "none",

          color:
            "rgba(255,255,255,0.7)",

          fontSize:
            "14px",

          fontFamily:
            "inherit",

          fontWeight:
            400,

          padding:
            "6px 8px",

          cursor:
            "pointer",
        }}
      >
        ← Back
      </button>

      <canvas
        ref={canvasRef}
        style={{
          display:
            "block",

          width:
            "100%",

          height:
            "100%",
        }}
      />

      {/*
       * The REAL homepage, rendered live at its
       * normal full-screen size.
       *
       * The iframe never moves.
       *
       * The parent clip-path creates the crack,
       * meaning the black canvas remains in front
       * everywhere except inside the narrow slit.
       *
       * Pointer events stay disabled, so the crack
       * can never be clicked into.
       */}
      <div
        ref={homepagePortalRef}
        style={{
          position:
            "absolute",

          left:
            "0px",

          top:
            "0px",

          width:
            "0px",

          height:
            "0px",

          overflow:
            "hidden",

          display:
            "none",

          pointerEvents:
            "none",

          zIndex:
            20,

          clipPath:
            "polygon(0 0, 0 0, 0 0, 0 0)",
        }}
      >
        <iframe
          ref={homepageIframeRef}
          src="/"
          title="Homepage"
          scrolling="no"
          style={{
            position:
              "absolute",

            left:
              "0px",

            top:
              "0px",

            width:
              "100vw",

            height:
              "100vh",

            border:
              "none",

            display:
              "block",

            pointerEvents:
              "none",

            transformOrigin:
              "top left",
          }}
        />
      </div>
    </main>
  );
}