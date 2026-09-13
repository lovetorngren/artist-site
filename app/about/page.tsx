"use client";

import Link from "next/link";

export default function AboutPage() {
  return (
    <div
      style={{
        width: "100vw",
        minHeight: "100vh",
        backgroundColor: "#000",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "3rem",
        color: "rgba(255, 255, 255, 0.85)",
        textAlign: "center",
      }}
    >
      {/* Back Link */}
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
            color: "#ffffff",
            textDecoration: "none",
            opacity: 1,
          }}
        >
          ← back
        </Link>
      </nav>

      {/* Centered About Text */}
      <p
        style={{
          fontSize: "1.2rem",
          lineHeight: "1.8",
          maxWidth: "600px",
        }}
      >
        your text here
      </p>
    </div>
  );
}