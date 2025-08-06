import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Completely disable static generation
  distDir: '.next',
  // Force all pages to be dynamic
  generateStaticParams: async () => {
    return []
  },
  // Disable static generation completely
  staticPageGenerationTimeout: 0,
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

  // Disable static optimization completely
  images: {
    unoptimized: true
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
    // Completely disable static optimization
    staticPageGenerationTimeout: 0,
    // Force all pages to be dynamic
    isrMemoryCacheSize: 0,
    // Disable static generation entirely
    workerThreads: false,
    cpus: 1,
    // Disable static generation completely
    staticGenerationAsyncStorage: false,
    // Force dynamic rendering
    dynamicImports: true
  }
}

export default nextConfig