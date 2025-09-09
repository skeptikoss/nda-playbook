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
    
    // Fix @xenova/transformers ONNX runtime build issues
    config.externals.push({
      'onnxruntime-node': 'commonjs onnxruntime-node',
      '@xenova/transformers': isServer ? 'commonjs @xenova/transformers' : '@xenova/transformers'
    });
    
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
    };
    
    // Ignore native binaries in client bundle
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        'onnxruntime-node': false
      };
    }
    
    return config;
  },
};

export default nextConfig;