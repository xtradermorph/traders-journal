import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
  // Completely disable static generation
  output: 'standalone',
  trailingSlash: true,
  skipTrailingSlashRedirect: true,
  // Force all pages to be dynamic
  generateBuildId: async () => {
    return 'build-' + Date.now()
  },
  // Disable static generation globally
  staticPageGenerationTimeout: 0,
  // Force dynamic rendering for all pages
  generateStaticParams: async () => {
    return []
  },

  webpack: (config, { isServer }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, './app/src'),
      '@shared': path.resolve(__dirname, './shared')
    }
    config.externals = [...config.externals, { 'supabase/functions': 'commonjs supabase/functions' }]
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
    cpus: 1
  }
}

export default nextConfig