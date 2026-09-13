import { Cormorant_Garamond } from "next/font/google";

const font = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400"],
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={font.className}
        style={{
          backgroundColor: "#000",
          color: "#eee",
          margin: 0,
          padding: 0,
        }}
      >
        {/* Page content */}
        <div
          style={{
            position: "relative",
            zIndex: 2,
          }}
        >
          {children}
        </div>
      </body>
    </html>
  );
}