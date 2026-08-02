/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone", // penting untuk Dockerfile multi-stage runner
  reactStrictMode: true,
};

module.exports = nextConfig;
