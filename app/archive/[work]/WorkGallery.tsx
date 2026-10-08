"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

export default function WorkGallery({
  images,
  work,
  title,
}: {
  images: string[];
  work: string;
  title: string;
}) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // While the enlarged image is open: Escape closes it, and the page
  // behind it doesn't scroll.
  useEffect(() => {
    if (!selectedImage) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedImage(null);
    };

    window.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [selectedImage]);

  return (
    <>
      {/* Image Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: "2rem",
          maxWidth: "700px",
          margin: "0 auto",
        }}
      >
        {images.map((image, index) => {
          const imagePath = `/archive/${work}/${image}`;

          return (
            // A button instead of a div, so the images can also be
            // opened with the keyboard.
            <button
              key={image}
              type="button"
              onClick={() => setSelectedImage(imagePath)}
              aria-label={`Enlarge ${title}, image ${index + 1}`}
              style={{
                position: "relative",
                display: "block",
                width: "100%",
                height: "200px",
                padding: 0,
                border: "none",
                background: "none",
                cursor: "pointer",
              }}
            >
              <Image
                src={imagePath}
                alt={`${title}, image ${index + 1}`}
                fill
                sizes="(max-width: 700px) 50vw, 350px"
                style={{
                  objectFit: "contain",
                }}
              />
            </button>
          );
        })}
      </div>

      {/* Enlarged Image */}
      {selectedImage && (
        <div
          onClick={() => setSelectedImage(null)}
          role="dialog"
          aria-modal="true"
          aria-label={title}
          style={{
            position: "fixed",
            inset: 0,
            // Above the back link (100) and the Ekolod sound control (50).
            zIndex: 200,
            backgroundColor: "rgba(0, 0, 0, 0.95)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: "3rem",
            boxSizing: "border-box",
            cursor: "pointer",
          }}
        >
          <div
            style={{
              position: "relative",
              // Fill the padded area instead of 90vw x 90vh, which was
              // larger than the space available and got cut off.
              width: "100%",
              height: "100%",
            }}
          >
            <Image
              src={selectedImage}
              alt={title}
              fill
              sizes="100vw"
              style={{
                objectFit: "contain",
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}