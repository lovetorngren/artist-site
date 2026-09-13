import fs from "fs";
import path from "path";
import Link from "next/link";

import WorkGallery from "./WorkGallery";
import EkolodSound from "./EkolodSound";

const workInfo: {
  [key: string]: {
    title: string;
    description: string;
  };
} = {
  "tunnels-under-gods-skin": {
    title: "Tunnels Under Gods Skin",
    description:
      "Presented at Gallery Verkligheten, Umeå, 12 April 2024. Dance performance with Hampus Bergenheim, Jasmine Skog, Emelie Sandén, Olivia Gilbertson and Ebba Svanberg.",
  },

  backslope: {
    title: "Backslope",
    description:
      "Performed by Rasmus Johansson at Umeå Academy of Fine Arts, 10 May 2025.",
  },

  "heat-exchanges": {
    title: "Heat Exchanges",
    description:
      "Performance, 2025, at Bildmuseet, Umeå.",
  },

  "how-i-open-up-is-a-sign-of-restraint": {
    title: "How I open up is a sign of restraint",
    description: "Performance, 2023, Umeå Academy of Fine Arts.",
  },

  "bronze-shell-sensor": {
    title: "Bronze Shell Sensor",
    description: "Gallery Alva.",
  },

  ekolod: {
    title: "Ekolod",
    description: "Centrum för fotografi (CFF), Stockholm, 2026.",
  },

  bell: {
    title: "Bell",
    description: "2023",
  },
};

export default async function WorkPage({
  params,
}: {
  params: Promise<{ work: string }>;
}) {
  const { work } = await params;

  const info = workInfo[work] || {
    title: work
      .replace(/-/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase()),
    description: "your description here",
  };

  const isTunnels = work === "tunnels-under-gods-skin";
  const isBackslope = work === "backslope";
  const isHeatExchanges = work === "heat-exchanges";
  const isEkolod = work.toLowerCase() === "ekolod";

  const workFolder = path.join(
    process.cwd(),
    "public",
    "archive",
    work
  );

  let images: string[] = [];

  try {
    images = fs
      .readdirSync(workFolder)
      .filter((file) =>
        /\.(jpg|jpeg|png|webp|gif)$/i.test(file)
      )
      .sort();
  } catch (error) {
    console.error("Could not read images:", error);
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        backgroundColor: "#000",
        color: "#fff",
        padding: "3rem",
        paddingBottom: "8rem",
        boxSizing: "border-box",
      }}
    >
      {/* Ekolod Sound Control */}
      {isEkolod && <EkolodSound />}

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
          href="/archive"
          style={{
            color: "#ffffff",
            textDecoration: "none",
            opacity: 1,
          }}
        >
          ← back
        </Link>
      </nav>

      {/* Title and Description */}
      <div
        style={{
          maxWidth: "700px",
          margin: "7rem auto 4rem auto",
          textAlign: "center",
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: "1.4rem",
            fontWeight: 400,
            letterSpacing: "0.08em",
          }}
        >
          {info.title}
        </h1>

        <p
          style={{
            margin: "1.5rem 0 0 0",
            fontSize: "1rem",
            lineHeight: 1.8,
            opacity: 0.85,
          }}
        >
          {info.description}
        </p>
      </div>

      {/* Tunnels Under Gods Skin */}
      {isTunnels && (
        <>
          <div
            style={{
              width: "100%",
              maxWidth: "350px",
              margin: "0 auto 4rem auto",
            }}
          >
            <video
              src="/archive/tunnels-under-gods-skin/video.mp4"
              autoPlay
              loop
              muted
              playsInline
              controls
              style={{
                width: "100%",
                height: "auto",
                display: "block",
              }}
            />
          </div>

          <WorkGallery
            images={images}
            work={work}
            title={info.title}
          />
        </>
      )}

      {/* Backslope */}
      {isBackslope && (
        <>
          <div
            style={{
              width: "100%",
              maxWidth: "350px",
              margin: "0 auto 4rem auto",
            }}
          >
            <video
              src="/archive/backslope/video.mp4"
              autoPlay
              loop
              muted
              playsInline
              controls
              style={{
                width: "100%",
                height: "auto",
                display: "block",
              }}
            />
          </div>

          <WorkGallery
            images={images}
            work={work}
            title={info.title}
          />
        </>
      )}

      {/* Heat Exchanges */}
      {isHeatExchanges && (
        <div
          style={{
            width: "100%",
            maxWidth: "350px",
            margin: "0 auto",
          }}
        >
          <video
            src="/archive/heat-exchanges/video.mp4"
            autoPlay
            loop
            muted
            playsInline
            controls
            style={{
              width: "100%",
              height: "auto",
              display: "block",
            }}
          />
        </div>
      )}

      {/* All Other Works */}
      {!isTunnels &&
        !isBackslope &&
        !isHeatExchanges && (
          <WorkGallery
            images={images}
            work={work}
            title={info.title}
          />
        )}
    </div>
  );
}