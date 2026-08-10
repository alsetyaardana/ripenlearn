/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone", // penting untuk Dockerfile multi-stage runner
  reactStrictMode: true,
  // edge-tts-ts uses dynamic requires internally; keep it external so the
  // standalone trace includes the whole package under .next/standalone/node_modules
  serverExternalPackages: ["edge-tts-ts"],
};

module.exports = nextConfig;
