import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Completely disable static generation
  distDir: '.next',
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Warning: This allows production builds to successfully complete even if
    // your project has type errors.
    ignoreBuildErrors: true,
  },
  // Completely disable static generation and force dynamic rendering
  output: 'standalone',
  trailingSlash: true,
  skipTrailingSlashRedirect: true,
  // Force all pages to be dynamic
  generateBuildId: async () => {
    return 'build-' + Date.now()
  },
  // Force dynamic rendering for all routes to prevent Netlify static generation issues
  experimental: {
    esmExternals: 'loose',
    // Force all pages to be dynamic
    workerThreads: false,
    cpus: 1,
    // Disable static generation completely
    staticPageGenerationTimeout: 0,
    // Force dynamic rendering
    dynamicImports: true
  }

  // Disable static optimization completely
  images: {
    unoptimized: true
  },
  // Force all API routes to be dynamic
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, must-revalidate'
          }
        ]
      }
    ]
  },

  webpack: (config, { isServer }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, './app/src'),
      '@shared': path.resolve(__dirname, './shared')
    }
    config.externals = [...config.externals, { 'supabase/functions': 'commonjs supabase/functions' }]
    
    // Disable static generation in webpack
    if (!isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: false,
        runtimeChunk: false
      }
    }
    
    return config
  },
  experimental: {
    esmExternals: 'loose',
    // Force all pages to be dynamic
    workerThreads: false,
    cpus: 1
  }
}

export default nextConfig