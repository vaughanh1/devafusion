import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Devafusion",
    short_name: "Devafusion",
    description:
      "A technical laboratory exploring software engineering, cloud architecture and modern web development.",
    start_url: "/",
    display: "standalone",
    background_color: "#05070b",
    theme_color: "#8b1e14",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
      {
        src: "/favicon.ico",
        sizes: "48x48",
        type: "image/x-icon",
      },
      {
        src: "/apple-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
