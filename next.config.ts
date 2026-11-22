import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PROTOTYPE (PER-464): let a phone on the LAN load the dev server's scripts.
  allowedDevOrigins: ["192.168.0.154"],
  // PROTOTYPE (PER-463): the dev badge sat on the desktop player's Play button.
  devIndicators: false,
};

export default nextConfig;
