/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'i.imgur.com', // Existing hostname
      },
      {
        protocol: 'https',
        hostname: 'img.clerk.com', // Add this line
      },
    ],
  },
};

export default nextConfig;
