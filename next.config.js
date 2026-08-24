/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // Scoped to the only external image host this app actually references (Cloudinary, used when
    // STORAGE_PROVIDER=cloudinary — see src/services/upload.service.ts). Not a wildcard: Next's
    // image optimizer will proxy-fetch from any host listed here for an <Image src>, so add hosts
    // deliberately rather than widening this back to "**".
    remotePatterns: [{ protocol: "https", hostname: "res.cloudinary.com" }],
  },
};

module.exports = nextConfig;
