/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  output: "export",
  // Optional: Add a trailing slash to all paths `/about` -> `/about/`
  // trailingSlash: true,
  distDir: 'build',
};

module.exports = nextConfig;
