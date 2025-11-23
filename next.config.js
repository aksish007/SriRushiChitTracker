/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable static export for IIS deployment with API routes
  // output: 'export',
  
  // Image optimization settings
  images: {
    unoptimized: false,
  },
  
  // Set trailing slash for IIS compatibility (optional for non-static export)
  // trailingSlash: true,
  
  // Disable ESLint and TypeScript checking during build for deployment
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Disable server-side features that don't work with static export
  experimental: {
    // Disable features that require server-side rendering
  },
  
  // Transpile d3 for Next.js compatibility
  transpilePackages: ['d3'],
  
  // Configure for IIS hosting (root deployment)
  // assetPrefix: process.env.NODE_ENV === 'production' ? '/ChitReferralTracker' : '',
  // basePath: process.env.NODE_ENV === 'production' ? '/ChitReferralTracker' : '',
  
  // Disable dynamic features that require server
  skipTrailingSlashRedirect: true,
  skipMiddlewareUrlNormalize: true,
  
  // Webpack configuration for IIS compatibility
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Ensure client-side only features work properly
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    // Ensure d3 is properly resolved
    config.resolve.alias = {
      ...config.resolve.alias,
    };
    // Externalize d3 for client-side only (if needed)
    if (!isServer) {
      config.externals = config.externals || [];
    }
    return config;
  },
  
  // Environment variables for production
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  

};

module.exports = nextConfig;
