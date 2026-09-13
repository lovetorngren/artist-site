import fs from "fs";
import path from "path";
import Link from "next/link";

import WorkGallery from "./WorkGallery";
import EkolodSound from "./EkolodSound";

const workTitles: {
  [key: string]: string;
} = {
  "tunnels-under-gods-skin": "Tunnels Under Gods Skin",
  backslope: "Backslope",
  "heat-exchanges": "Heat Exchanges",
  "how-i-open-up-is-a-sign-of-restraint":
    "How I open up is a sign of restraint",
  "bronze-shell-sensor": "Bronze Shell Sensor",
  ekolod: "Ekolod",
  bell: "Bell",
};

export default async function WorkPage({
  params,
}: {
  params: Promise<{ work: string }>;
}) {
  const { work } = await params;

  const workFolder = path.join(
    process.cwd(),
    "public",
    "archive",
    work
  );

  const title =
    workTitles[work] ||
    work
      .replace(/-/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());

  let description = "";

  try {
    const descriptionPath = path.join(
      workFolder,
      "description.txt"
    );

    if (fs.existsSync(descriptionPath)) {
      description = fs.readFileSync(
        descriptionPath,
        "utf8"
      ).trim();
    }
  } catch (error) {
    console.error(
      "Could not read description:",
      error
    );
  }

  let images: string[] = [];

  try {
    images = fs
      .readdirSync(workFolder)
      .filter((file) =>
        /\.(jpg|jpeg|png|webp|gif)$/i.test(file)
      )
      .sort();
  } catch (error) {
    console.error(
      "Could not read images:",
      error
    );
  }

  let videoFile: string | null = null;

  try {
    const video = fs
      .readdirSync(workFolder)
      .find((file) =>
        /\.(mp4|webm|mov)$/i.test(file)
      );

    if (video) {
      videoFile = video;
    }
  } catch (error) {
    console.error(
      "Could not read video:",
      error
    );
  }

  const isEkolod =
    work.toLowerCase() === "ekolod";

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
      {isEkolod && <EkolodSound />}

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
          {title}
        </h1>

        {description && (
          <p
            style={{
              margin: "1.5rem 0 0 0",
              fontSize: "1rem",
              lineHeight: 1.8,
              opacity: 0.85,
            }}
          >
            {description}
          </p>
        )}
      </div>

      {videoFile && (
        <div
          style={{
            width: "100%",
            maxWidth: "350px",
            margin: "0 auto 4rem auto",
          }}
        >
          <video
            src={`/archive/${work}/${videoFile}`}
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

      <WorkGallery
        images={images}
        work={work}
        title={title}
      />
    </div>
  );
}