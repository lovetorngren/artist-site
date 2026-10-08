import fs from "fs";
import path from "path";
import Link from "next/link";

const workOrder = [
  "tunnels-under-gods-skin",
  "backslope",
  "heat-exchanges",
  "how-i-open-up-is-a-sign-of-restraint",
  "bronze-shell-sensor",
  "Ekolod",
];

// Browser-friendly video formats first. .mov is a last resort because
// Chrome and Firefox often can't play it (HEVC/ProRes encodes).
const VIDEO_PRIORITY = [/\.mp4$/i, /\.webm$/i, /\.mov$/i];

function pickVideo(files: string[]) {
  // A file named "thumb.*" wins, so a folder can hold a full-length
  // video without that becoming the grid thumbnail.
  const thumb = files.find((f) => /^thumb\.(mp4|webm|mov)$/i.test(f));
  if (thumb) return thumb;
  for (const pattern of VIDEO_PRIORITY) {
    const match = files.find((f) => pattern.test(f));
    if (match) return match;
  }
  return undefined;
}

function pickImage(files: string[]) {
  // Prefer 01.jpg, otherwise fall back to the first image in the folder.
  return (
    files.find((f) => f.toLowerCase() === "01.jpg") ??
    files
      .filter((f) => /\.(jpe?g|png|webp|avif)$/i.test(f))
      .sort()[0]
  );
}

export default function ArchivePage() {
  const archiveFolder = path.join(
    process.cwd(),
    "public",
    "archive"
  );

  let works: { name: string; video?: string; image?: string }[] = [];

  try {
    const existingFolders = fs
      .readdirSync(archiveFolder, {
        withFileTypes: true,
      })
      .filter((item) => item.isDirectory() && !item.name.startsWith("."))
      .map((item) => item.name);

    // Use the order above, but only include
    // folders that actually exist.
    const ordered = workOrder.filter((work) =>
      existingFolders.includes(work)
    );

    // Automatically include any new folders
    // that haven't been added to workOrder yet.
    const unorderedWorks = existingFolders.filter(
      (work) => !workOrder.includes(work)
    );

    works = [...ordered, ...unorderedWorks].map((name) => {
      const files = fs.readdirSync(path.join(archiveFolder, name));
      return { name, video: pickVideo(files), image: pickImage(files) };
    });
  } catch (error) {
    console.error(
      "Could not read archive:",
      error
    );
  }

  return (
    <div
      className="archive-container"
      style={{
        width: "100%",
        minHeight: "100vh",
        position: "relative",
        backgroundColor: "#000",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        paddingTop: "3rem",
        paddingBottom: "3rem",
        // 3rem (quote offset) + 300px (quote width) + 3rem gap,
        // so the fixed quote never sits on top of the grid.
        paddingLeft: "calc(300px + 6rem)",
        paddingRight: "3rem",
        boxSizing: "border-box",
      }}
    >
      {/* Responsive layout */}
      <style>{`
        @media (max-width: 1000px) {
          .archive-container {
            flex-direction: column !important;
            padding-left: 1.5rem !important;
            padding-right: 1.5rem !important;
            padding-top: 1.5rem !important;
          }

          .archive-quote {
            position: relative !important;
            left: auto !important;
            top: auto !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 5rem auto 3rem auto !important;
          }

          .archive-grid {
            width: 100% !important;
            max-width: 100% !important;
          }
        }

        @media (max-width: 700px) {
          .archive-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

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

      {/* Archive Quote */}
      <div
        className="archive-quote"
        style={{
          position: "fixed",
          left: "3rem",
          top: "7rem",
          width: "300px",
          color: "#ffffff",
          fontSize: "0.9rem",
          lineHeight: "1.5",
          fontStyle: "italic",
          opacity: 0.9,
        }}
      >
        <p style={{ margin: 0 }}>
          “Through my collaborative works in dance and performance I am trying to convey a specific sense of longing. A type of solitude that I think originates in my inability to become my own art works. To fully coincide with them. But that is not a longing supposed to be resolved, instead it functions as the main driver, the visual and emotional inspiration in my work.”
        </p>
      </div>

      {/* Archive Grid */}
      <div
        className="archive-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: "3rem 2rem",
          maxWidth: "900px",
          width: "100%",
        }}
      >
        {works.map(({ name: work, video: videoFile, image: imageFile }) => {
          return (
            <Link
              key={work}
              href={`/archive/${work}`}
              style={{
                display: "block",
                position: "relative",
                width: "100%",
                height: "300px",
              }}
            >
              {/* Video thumbnail */}
              {videoFile && (
                <video
                  src={`/archive/${work}/${videoFile}`}
                  poster={imageFile ? `/archive/${work}/${imageFile}` : undefined}
                  autoPlay
                  loop
                  muted
                  playsInline
                  preload="metadata"
                  aria-hidden="true"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    borderRadius: "8px",
                    display: "block",
                    pointerEvents: "none",
                  }}
                />
              )}

              {/* Image thumbnail */}
              {!videoFile && imageFile && (
                <img
                  src={`/archive/${work}/${imageFile}`}
                  alt={work.replace(/-/g, " ")}
                  loading="lazy"
                  decoding="async"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    borderRadius: "8px",
                    display: "block",
                  }}
                />
              )}

              {/* Work title */}
              <div
                style={{
                  position: "absolute",
                  left: "0",
                  right: "0",
                  bottom: "-2rem",
                  textAlign: "center",
                  color: "#ffffff",
                  fontSize: "0.95rem",
                  letterSpacing: "0.08em",
                }}
              >
                {work
                  .replace(/-/g, " ")
                  .replace(
                    /\b\w/g,
                    (letter) => letter.toUpperCase()
                  )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}