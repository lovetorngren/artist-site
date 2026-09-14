"use client";

import Link from "next/link";

export default function LandingPage() {
  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        position: "fixed",
        top: 0,
        left: 0,
        overflow: "hidden",
        display: "flex",
      }}
    >
      {/* Video background */}
      <video
        src="/landing.mp4"
        autoPlay
        loop
        muted
        playsInline
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          objectFit: "cover",
          top: 0,
          left: 0,
          zIndex: 0,
          filter: "brightness(0.5)",
        }}
      />

      {/* Navigation */}
      <nav
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.7rem",
          position: "absolute",
          left: "3rem",
          top: "50%",
          transform: "translateY(-50%)",
          fontSize: "0.95rem",
          letterSpacing: "0.12em",
          textTransform: "lowercase",
          zIndex: 2,
        }}
      >
        <Link href="/archive" className="navlink">
          archive
        </Link>

        <Link href="/deep-sea-logic" className="navlink">
          Deep-sea Logic
        </Link>

        <Link href="/sound" className="navlink">
          sound
        </Link>

        <Link href="/contact" className="navlink">
          contact
        </Link>
      </nav>

      {/* Global styles */}
      <style jsx global>{`
        .navlink {
          color: rgba(255, 255, 255, 0.65);
          text-decoration: none;
          transition: opacity 0.6s ease, letter-spacing 0.6s ease;
        }

        .navlink:hover {
          opacity: 1;
          letter-spacing: 0.18em;
        }
      `}</style>
    </div>
  );
}