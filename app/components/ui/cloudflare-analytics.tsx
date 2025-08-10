'use client'

import Script from 'next/script'
import { useEffect, useState } from 'react'
import { isAnalyticsEnabled } from '../../src/lib/cookie-utils'

interface CloudflareAnalyticsProps {
  token: string
}

export function CloudflareAnalytics({ token }: CloudflareAnalyticsProps) {
  const [shouldLoad, setShouldLoad] = useState(false)

  useEffect(() => {
    // Check if analytics are enabled
    const analyticsEnabled = isAnalyticsEnabled()
    setShouldLoad(analyticsEnabled)
  }, [])

  if (!shouldLoad) {
    return null
  }

  return (
    <Script
      defer
      src="https://static.cloudflareinsights.com/beacon.min.js"
      data-cf-beacon={`{"token": "${token}"}`}
      strategy="afterInteractive"
    />
  )
} 