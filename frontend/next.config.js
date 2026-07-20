/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // react-pdf ships a canvas fallback for Node that the browser build doesn't need.
    config.resolve.alias.canvas = false;
    return config;
  },
};

module.exports = nextConfig;
