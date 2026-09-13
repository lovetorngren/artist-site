"use client";

import Image from "next/image";
import { useState } from "react";

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
        {images.map((image) => {
          const imagePath = `/archive/${work}/${image}`;

          return (
            <div
              key={image}
              onClick={() => setSelectedImage(imagePath)}
              style={{
                position: "relative",
                width: "100%",
                height: "200px",
                cursor: "pointer",
              }}
            >
              <Image
                src={imagePath}
                alt={`${title} ${image}`}
                fill
                sizes="350px"
                style={{
                  objectFit: "contain",
                }}
              />
            </div>
          );
        })}
      </div>

      {/* Enlarged Image */}
      {selectedImage && (
        <div
          onClick={() => setSelectedImage(null)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            backgroundColor: "rgba(0, 0, 0, 0.95)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: "3rem",
            cursor: "pointer",
          }}
        >
          <div
            style={{
              position: "relative",
              width: "90vw",
              height: "90vh",
            }}
          >
            <Image
              src={selectedImage}
              alt={title}
              fill
              sizes="90vw"
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