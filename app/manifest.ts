import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Avinya HRMS",
    short_name: "Avinya HRMS",
    description: "Reinventing the Way You Work – Streamline your workforce with Avinya HRMS",
    start_url: "/user/dashboard/mobile",
    display: "standalone",
    display_override: ["window-controls-overlay", "standalone"],
    background_color: "#ffffff",
    theme_color: "#026D94",
    orientation: "portrait-primary",
    scope: "/",
    categories: ["business", "productivity"],
    lang: "en",
    dir: "ltr",
    prefer_related_applications: false,
    icons: [
      { src: "/icons/icon-48x48.png", sizes: "48x48", type: "image/png" },
      { src: "/icons/icon-72x72.png", sizes: "72x72", type: "image/png" },
      { src: "/icons/icon-96x96.png", sizes: "96x96", type: "image/png" },
      { src: "/icons/icon-144x144.png", sizes: "144x144", type: "image/png" },
      { src: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      {
        name: "Dashboard",
        short_name: "Home",
        url: "/user/dashboard/mobile",
        icons: [{ src: "/icons/icon-96x96.png", sizes: "96x96", type: "image/png" }],
      },
      {
        name: "Attendance",
        short_name: "Attendance",
        url: "/user/dashboard/mobile/attendance",
        icons: [{ src: "/icons/icon-96x96.png", sizes: "96x96", type: "image/png" }],
      },
      {
        name: "Leave",
        short_name: "Leave",
        url: "/user/dashboard/mobile/leave",
        icons: [{ src: "/icons/icon-96x96.png", sizes: "96x96", type: "image/png" }],
      },
    ],
  };
}
