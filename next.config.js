import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
    esmExternals: 'loose'
  }
}

export default nextConfig