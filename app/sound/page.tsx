import fs from "fs";
import path from "path";
import SoundPageClient from "./SoundPageClient";

export default function SoundPage() {
  const soundFolder = path.join(
    process.cwd(),
    "public",
    "sound"
  );

  let sounds: string[] = [];

  try {
    sounds = fs
      .readdirSync(soundFolder)
      .filter(
        (file) =>
          /\.(wav|mp3|ogg|m4a)$/i.test(file) &&
          file.toLowerCase() !== "metronome.mp3"
      )
      .sort();
  } catch (error) {
    console.error(
      "Could not read sound folder:",
      error
    );
  }

  const soundData = sounds.map((sound) => {
    const baseName = sound.replace(
      /\.[^/.]+$/,
      ""
    );

    const textFile = `${baseName}.txt`;
    const textPath = path.join(
      soundFolder,
      textFile
    );

    let description = "";

    try {
      if (fs.existsSync(textPath)) {
        description = fs.readFileSync(
          textPath,
          "utf8"
        );
      }
    } catch (error) {
      console.error(
        `Could not read description for ${sound}:`,
        error
      );
    }

    return {
      sound,
      description,
    };
  });

  return (
    <SoundPageClient
      sounds={soundData}
    />
  );
}