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
    const unorderedWorks =
      existingFolders.filter(
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

      {/* Archive Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(2, 1fr)",
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

          const files = fs.readdirSync(
            workPath
          );

          // Video takes priority over images
          const videoFile = files.find(
            (file) =>
              /\.(mp4|webm|mov)$/i.test(
                file
              )
          );

          // If there is no video, use 01.jpg
          const imageFile = files.find(
            (file) =>
              file.toLowerCase() ===
              "01.jpg"
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
                  }}
                />
              )}

              {/* Image thumbnail */}
              {!videoFile &&
                imageFile && (
                  <img
                    src={`/archive/${work}/${imageFile}`}
                    alt={work.replace(
                      /-/g,
                      " "
                    )}
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
                    (letter) =>
                      letter.toUpperCase()
                  )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}