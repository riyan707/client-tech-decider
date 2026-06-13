/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "fdn2.gsmarena.com" },
      { protocol: "https", hostname: "fdn.gsmarena.com" },
      { protocol: "https", hostname: "i.rtings.com" },
      { protocol: "https", hostname: "images.samsung.com" },
      { protocol: "https", hostname: "media.currys.biz" },
    ],
  },
};

export default nextConfig;
