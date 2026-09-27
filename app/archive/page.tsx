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

export default function ArchivePage() {
  const archiveFolder = path.join(
    process.cwd(),
    "public",
    "archive"
  );

  let works: string[] = [];

  try {
    const existingFolders = fs
      .readdirSync(archiveFolder, {
        withFileTypes: true,
      })
      .filter((item) => item.isDirectory())
      .map((item) => item.name);

    // Use the order above, but only include
    // folders that actually exist.
    works = workOrder.filter((work) =>
      existingFolders.includes(work)
    );

    // Automatically include any new folders
    // that haven't been added to workOrder yet.
    const unorderedWorks = existingFolders.filter(
      (work) => !workOrder.includes(work)
    );

    works = [
      ...works,
      ...unorderedWorks,
    ];
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
        width: "100vw",
        minHeight: "100vh",
        position: "relative",
        backgroundColor: "#000",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        paddingTop: "3rem",
        paddingBottom: "3rem",
        paddingLeft: "120px",
        paddingRight: "3rem",
        overflowY: "auto",
      }}
    >
      {/* Responsive layout */}
      <style>{`
        @media (max-width: 700px) {
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
            grid-template-columns: 1fr !important;
            width: 100% !important;
            max-width: 100% !important;
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
          “Through my collaborative works in dance and performance I am trying to convey a specific sense of longing. A type of solitude that I think originates in my inability to become my own art works. To fully coincide with them. But that is not a longing supposed to be resolved, instead it functions as the main driver, the visual and emotional inspiration in my work."
          <br />
          <br />
        </p>
      </div>

      {/* Archive Grid */}
      <div
        className="archive-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: "2rem",
          maxWidth: "900px",
          width: "100%",
        }}
      >
        {works.map((work) => {
          const workPath = path.join(
            archiveFolder,
            work
          );

          const files = fs.readdirSync(workPath);

          // Video takes priority over images
          const videoFile = files.find(
            (file) =>
              /\.(mp4|webm|mov)$/i.test(file)
          );

          // If there is no video, use 01.jpg
          const imageFile = files.find(
            (file) =>
              file.toLowerCase() === "01.jpg"
          );

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
                  autoPlay
                  loop
                  muted
                  playsInline
                  preload="metadata"
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