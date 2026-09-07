import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Home Base",
    short_name: "Home Base",
    description: "No matter where we are, we meet here.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#192f3a",
    theme_color: "#192f3a",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
