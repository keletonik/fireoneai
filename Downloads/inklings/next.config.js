/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.huggingface.co",
      },
    ],
  },
};

module.exports = nextConfig;
