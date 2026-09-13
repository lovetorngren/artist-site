"use client";

import Link from "next/link";

export default function ContactPage() {
  return (
    <div
      style={{
        width: "100vw",
        minHeight: "100vh",
        backgroundColor: "#000",
        display: "flex",
        justifyContent: "flex-start",
        alignItems: "flex-start",
        paddingTop: "3rem",
        paddingLeft: "5rem",
        paddingRight: "3rem",
        paddingBottom: "3rem",
        color: "#fff",
        fontFamily: "sans-serif",
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

      {/* Contact Info */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
          maxWidth: "400px",
          marginTop: "4rem",
        }}
      >
        <h1
          style={{
            margin: 0,
            fontWeight: "300",
          }}
        >
          Contact
        </h1>

        <a
          href="mailto:love.torngren@gmail.com"
          style={{
            color: "#ffffff",
            textDecoration: "none",
          }}
        >
          love.torngren@gmail.com
        </a>

        <a
          href="https://instagram.com/ettutkik"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: "#ffffff",
            textDecoration: "none",
          }}
        >
          instagram
        </a>

        {/* Add more social links if needed */}
      </div>
    </div>
  );
}