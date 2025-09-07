/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: []
  },
  webpack: (config, { isServer }) => {
    // Fix pdf-parse build issues
    if (isServer) {
      config.externals.push({
        'pdf-parse': 'commonjs pdf-parse'
      });
    }
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
    };
    return config;
  },
};

export default nextConfig;