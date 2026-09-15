"use client";

import { useEffect, useRef } from "react";

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

export default function DeepSeaLogicPage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvasElement = canvasRef.current;

    if (canvasElement === null) {
      return;
    }

    const contextElement = canvasElement.getContext("2d");

    if (contextElement === null) {
      return;
    }

    const canvas: HTMLCanvasElement = canvasElement;
    const ctx: CanvasRenderingContext2D = contextElement;

    const rippleSound = new Audio("/deepripple.wav");
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

    const ripples: Ripple[] = [];
    const entranceTime = performance.now();

    const particles: Particle[] = [];
    const particleCount = 15000;

    for (let i = 0; i < particleCount; i++) {
      const position = Math.random();

      const angle = Math.random() * Math.PI * 2;

      const radius =
        0.08 +
        Math.pow(1 - position, 0.72) * 1.15;

      const irregularity =
        1 +
        Math.sin(angle * 7 + position * 20) * 0.035 +
        (Math.random() - 0.5) * 0.08;

      const finalRadius = radius * irregularity;

      particles.push({
        x: (position - 0.5) * 2.7,
        y: Math.cos(angle) * finalRadius,
        z: Math.sin(angle) * finalRadius,
        size: 0.35 + Math.random() * 0.9,
        brightness: 0.35 + Math.random() * 0.65,
        angle,
        position,
        radius: finalRadius,
      });
    }

    function resize() {
      const rect = canvas.getBoundingClientRect();

      const devicePixelRatio = Math.min(
        window.devicePixelRatio || 1,
        2
      );

      width = rect.width;
      height = rect.height;

      canvas.width = width * devicePixelRatio;
      canvas.height = height * devicePixelRatio;

      ctx.setTransform(
        devicePixelRatio,
        0,
        0,
        devicePixelRatio,
        0,
        0
      );
    }

    function rotatePoint(
      x: number,
      y: number,
      z: number
    ) {
      const cosY = Math.cos(rotationY);
      const sinY = Math.sin(rotationY);

      const x1 = x * cosY - z * sinY;
      const z1 = x * sinY + z * cosY;

      const cosX = Math.cos(rotationX);
      const sinX = Math.sin(rotationX);

      const y2 = y * cosX - z1 * sinX;
      const z2 = y * sinX + z1 * cosX;

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
      let difference = angleA - angleB;

      while (difference > Math.PI) {
        difference -= Math.PI * 2;
      }

      while (difference < -Math.PI) {
        difference += Math.PI * 2;
      }

      return Math.abs(difference);
    }

    function findClickedParticle(
      mouseX: number,
      mouseY: number,
      projected: ProjectedParticle[]
    ) {
      let closest: ProjectedParticle | null = null;
      let closestDistance = Infinity;

      for (const particle of projected) {
        const dx = particle.x - mouseX;
        const dy = particle.y - mouseY;

        const distance = dx * dx + dy * dy;

        if (distance < closestDistance) {
          closestDistance = distance;
          closest = particle;
        }
      }

      return closest;
    }

    function drawEntranceBall(now: number) {
      const elapsed = now - entranceTime;

      const fallDuration = 2500;
      const stayDuration = 700;
      const shrinkDuration = 200;

      const totalDuration =
        fallDuration +
        stayDuration +
        shrinkDuration;

      if (elapsed >= totalDuration) {
        return;
      }

      const startY = -30;
      const endY = height / 2;

      let ballY = endY;
      let radius = 6;

      if (elapsed < fallDuration) {
        const progress = elapsed / fallDuration;

        const easedProgress =
          1 - Math.pow(1 - progress, 3);

        ballY =
          startY +
          (endY - startY) * easedProgress;
      } else if (
        elapsed <
        fallDuration + stayDuration
      ) {
        ballY = endY;
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

      if (radius <= 0) {
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

      ctx.fillStyle = "rgba(255,255,255,1)";
      ctx.fill();
    }

    function draw() {
      ctx.fillStyle = "#000000";

      ctx.fillRect(
        0,
        0,
        width,
        height
      );

      rotationY +=
        (targetRotationY - rotationY) * 0.08;

      rotationX +=
        (targetRotationX - rotationX) * 0.08;

      zoom +=
        (targetZoom - zoom) * 0.1;

      const now = performance.now();

      for (
        let i = ripples.length - 1;
        i >= 0;
        i--
      ) {
        if (
          now -
            ripples[i].startTime >
          6000
        ) {
          ripples.splice(i, 1);
        }
      }

      const projected: ProjectedParticle[] = [];

      for (const particle of particles) {
        const rotated = rotatePoint(
          particle.x,
          particle.y,
          particle.z
        );

        const cameraDistance = 3.4;

        const perspective =
          cameraDistance /
          (cameraDistance + rotated.z);

        const scale =
          Math.min(width, height) *
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
            (0.75 + perspective * 0.65),
          particle,
        });
      }

      projected.sort(
        (a, b) => a.z - b.z
      );

      for (
        const projectedParticle of projected
      ) {
        const particle =
          projectedParticle.particle;

        let rippleBrightness = 0;
        let displacement = 0;

        for (const ripple of ripples) {
          const age =
            now - ripple.startTime;

          const waveSpeed = 0.000575;

          const waveRadius =
            age * waveSpeed;

          const longitudinalDistance =
            Math.abs(
              particle.x - ripple.x
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

          const waveWidth = 0.09;

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
                1 - age / 6000
              );

            const wave =
              strength * fade;

            rippleBrightness =
              Math.max(
                rippleBrightness,
                wave
              );

            displacement += wave;
          }
        }

        const brightness =
          rippleBrightness *
          particle.brightness;

        const size =
          Math.max(
            0.35,
            projectedParticle.size +
              rippleBrightness * 4.8
          );

        let drawX =
          projectedParticle.x;

        let drawY =
          projectedParticle.y;

        if (displacement > 0) {
          const outward =
            0.025 * displacement;

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

          const cameraDistance = 3.4;

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
          drawX > width + 10 ||
          drawY < -10 ||
          drawY > height + 10
        ) {
          continue;
        }

        if (brightness <= 0) {
          continue;
        }

        ctx.fillStyle =
          `rgba(255,255,255,${brightness})`;

        ctx.fillRect(
          drawX - size / 2,
          drawY - size / 2,
          size,
          size
        );
      }

      drawEntranceBall(now);

      animationFrame =
        requestAnimationFrame(draw);
    }

    function handleMouseDown(
      event: MouseEvent
    ) {
      dragging = true;

      previousMouseX =
        event.clientX;

      previousMouseY =
        event.clientY;

      const projected: ProjectedParticle[] = [];

      for (const particle of particles) {
        const rotated = rotatePoint(
          particle.x,
          particle.y,
          particle.z
        );

        const cameraDistance = 3.4;

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

        projected.push({
          x:
            width / 2 +
            rotated.x *
              scale *
              perspective,
          y:
            height / 2 +
            rotated.y *
              scale *
              perspective,
          z: rotated.z,
          size:
            particle.size *
            perspective *
            zoom,
          brightness:
            particle.brightness,
          particle,
        });
      }

      const clicked =
        findClickedParticle(
          event.clientX,
          event.clientY,
          projected
        );

      if (clicked !== null) {
        ripples.push({
          x: clicked.particle.x,
          angle: clicked.particle.angle,
          radius: clicked.particle.radius,
          startTime: performance.now(),
        });

        rippleSound.pause();
        rippleSound.currentTime = 0;

        void rippleSound.play();
      }

      canvas.style.cursor = "grabbing";
    }

    function handleMouseMove(
      event: MouseEvent
    ) {
      if (!dragging) {
        return;
      }

      const deltaX =
        event.clientX -
        previousMouseX;

      const deltaY =
        event.clientY -
        previousMouseY;

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

      canvas.style.cursor = "grab";
    }

    function handleWheel(
      event: WheelEvent
    ) {
      event.preventDefault();

      targetZoom +=
        -event.deltaY * 0.0015;

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

    canvas.style.cursor = "grab";

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
      requestAnimationFrame(draw);

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
  }, []);

  return (
    <main
      style={{
        width: "100%",
        height: "100vh",
        background: "#000000",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <button
        type="button"
        onClick={() => {
          window.history.back();
        }}
        style={{
          position: "absolute",
          top: "24px",
          left: "24px",
          zIndex: 10,
          background: "transparent",
          border: "none",
          color: "#ffffff",
          fontSize: "14px",
          fontFamily: "inherit",
          cursor: "pointer",
          padding: "8px",
        }}
      >
          ← Back
      </button>

      <canvas
        ref={canvasRef}
        style={{
          display: "block",
          width: "100%",
          height: "100%",
        }}
      />
    </main>
  );
}