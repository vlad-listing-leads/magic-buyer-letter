import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  generateBuildId: () => `build-${Date.now()}`,
  images: {
    remotePatterns: [
      // Supabase storage
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: '**.supabase.in' },
      // ImageKit (Listing Leads images)
      { protocol: 'https', hostname: 'ik.imagekit.io' },
      // Vercel Blob
      { protocol: 'https', hostname: '**.vercel-storage.com' },
    ],
  },
}

export default nextConfig
