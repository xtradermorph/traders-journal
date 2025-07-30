'use client'

import Script from 'next/script'

interface CloudflareAnalyticsProps {
  token: string
}

export function CloudflareAnalytics({ token }: CloudflareAnalyticsProps) {
  return (
    <Script
      defer
      src="https://static.cloudflareinsights.com/beacon.min.js"
      data-cf-beacon={`{"token": "${token}"}`}
      strategy="afterInteractive"
    />
  )
} 