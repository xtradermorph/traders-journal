'use client'

import { useEffect, useRef, useState } from 'react'

interface TurnstileProps {
  siteKey: string
  onVerify: (token: string) => void
  onError?: (error: string) => void
  onExpire?: () => void
  theme?: 'light' | 'dark'
  size?: 'normal' | 'compact'
  appearance?: 'always' | 'execute' | 'interaction-only'
  action?: string
  cdata?: string
  className?: string
}

declare global {
  interface Window {
    turnstile: {
      render: (
        container: string | HTMLElement,
        options: {
          sitekey: string
          theme?: 'light' | 'dark'
          size?: 'normal' | 'compact'
          appearance?: 'always' | 'execute' | 'interaction-only'
          action?: string
          'c-data'?: string
          callback?: (token: string) => void
          'error-callback'?: (error: string) => void
          'expired-callback'?: () => void
        }
      ) => string
      reset: (widgetId: string) => void
      remove: (widgetId: string) => void
    }
  }
}

export function Turnstile({
  siteKey,
  onVerify,
  onError,
  onExpire,
  theme = 'light',
  size = 'normal',
  appearance = 'always',
  action,
  cdata,
  className = ''
}: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [widgetId, setWidgetId] = useState<string | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    // Load Turnstile script if not already loaded
    if (!window.turnstile) {
      const script = document.createElement('script')
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js'
      script.async = true
      script.defer = true
      script.onload = () => setIsLoaded(true)
      document.head.appendChild(script)
    } else {
      setIsLoaded(true)
    }
  }, [])

  useEffect(() => {
    if (isLoaded && containerRef.current && !widgetId) {
      const id = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        theme,
        size,
        appearance,
        action,
        'c-data': cdata,
        callback: onVerify,
        'error-callback': onError,
        'expired-callback': onExpire
      })
      setWidgetId(id)
    }
  }, [isLoaded, siteKey, theme, size, appearance, action, cdata, onVerify, onError, onExpire, widgetId])

  const reset = () => {
    if (widgetId && window.turnstile) {
      window.turnstile.reset(widgetId)
    }
  }

  const remove = () => {
    if (widgetId && window.turnstile) {
      window.turnstile.remove(widgetId)
      setWidgetId(null)
    }
  }

  return (
    <div className={className}>
      <div ref={containerRef} className="turnstile-container" />
    </div>
  )
}

// Hook for server-side validation
export async function verifyTurnstileToken(token: string, secretKey: string, remoteIp?: string) {
  const formData = new FormData()
  formData.append('secret', secretKey)
  formData.append('response', token)
  if (remoteIp) {
    formData.append('remoteip', remoteIp)
  }

  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData
    })

    const result = await response.json()
    return result
  } catch (error) {
    console.error('Turnstile verification error:', error)
    return { success: false, 'error-codes': ['internal-error'] }
  }
} 