/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    typedRoutes: false
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "www.congress.gov" },
      { protocol: "https", hostname: "congress.gov" }
    ]
  }
};

export default nextConfig;
