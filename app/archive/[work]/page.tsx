import fs from "fs";
import path from "path";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import WorkGallery from "./WorkGallery";
import EkolodSound from "./EkolodSound";

const archiveFolder = path.join(process.cwd(), "public", "archive");

// Keys are lowercase; lookups lowercase the folder name, so "Ekolod"
// and "ekolod" both match.
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

function getTitle(work: string) {
  return (
    workTitles[work.toLowerCase()] ||
    work
      .replace(/-/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase())
  );
}

function getWorkFolders() {
  try {
    return fs
      .readdirSync(archiveFolder, { withFileTypes: true })
      .filter((item) => item.isDirectory() && !item.name.startsWith("."))
      .map((item) => item.name);
  } catch (error) {
    console.error("Could not read archive:", error);
    return [];
  }
}

// Build every work page at build time. Pages are then plain static files:
// faster, and they don't depend on the server being able to read /public.
export function generateStaticParams() {
  return getWorkFolders().map((work) => ({ work }));
}

// Any /archive/<something> that isn't a real folder gets a proper 404.
export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ work: string }>;
}): Promise<Metadata> {
  const { work } = await params;
  return { title: getTitle(work) };
}

export default async function WorkPage({
  params,
}: {
  params: Promise<{ work: string }>;
}) {
  const { work } = await params;

  // Belt and braces: only ever read folders that really exist in the archive.
  if (!getWorkFolders().includes(work)) {
    notFound();
  }

  const workFolder = path.join(archiveFolder, work);
  const title = getTitle(work);

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

  // Blank lines in description.txt become separate paragraphs.
  const paragraphs = description
    .split(/\r?\n\s*\r?\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  let files: string[] = [];

  try {
    files = fs.readdirSync(workFolder);
  } catch (error) {
    console.error(
      "Could not read work folder:",
      error
    );
  }

  // Numeric sort, so 2.jpg comes before 10.jpg.
  const images = files
    .filter((file) =>
      /\.(jpg|jpeg|png|webp|gif)$/i.test(file)
    )
    .sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true })
    );

  // Skip thumb.* (the short grid loop) and prefer browser-friendly formats.
  const videos = files.filter(
    (file) =>
      /\.(mp4|webm|mov)$/i.test(file) &&
      !/^thumb\./i.test(file)
  );
  const videoFile =
    videos.find((f) => /\.mp4$/i.test(f)) ??
    videos.find((f) => /\.webm$/i.test(f)) ??
    videos[0] ??
    null;

  const posterFile =
    images.find((f) => f.toLowerCase() === "01.jpg") ?? images[0];

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
      {/* Path built from the real folder name, so upper/lowercase always matches. */}
      {isEkolod && <EkolodSound src={`/archive/${work}/ekolod.mp3`} />}

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

        {paragraphs.map((paragraph, i) => (
          <p
            key={i}
            style={{
              margin: i === 0 ? "1.5rem 0 0 0" : "1rem 0 0 0",
              fontSize: "1rem",
              lineHeight: 1.8,
              opacity: 0.85,
            }}
          >
            {paragraph}
          </p>
        ))}
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
            poster={posterFile ? `/archive/${work}/${posterFile}` : undefined}
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