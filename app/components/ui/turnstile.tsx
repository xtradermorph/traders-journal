'use client'

import { useEffect, useRef, useState } from 'react'

interface TurnstileProps {
  siteKey: string
  onVerify: (token: string) => void
  onError?: (error: string) => void
  onExpire?: () => void
  theme?: 'light' | 'dark' | 'auto'
  size?: 'normal' | 'compact' | 'flexible'
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
          theme?: 'light' | 'dark' | 'auto'
          size?: 'normal' | 'compact' | 'flexible'
          appearance?: 'always' | 'execute' | 'interaction-only'
          action?: string
          'c-data'?: string
          callback?: (token: string) => void
          'error-callback'?: (error: string) => void
          'expired-callback'?: () => void
          'timeout-callback'?: () => void
          'unsupported-callback'?: () => void
        }
      ) => string
      reset: (widgetId: string) => void
      remove: (widgetId: string) => void
      getResponse: (widgetId?: string) => string
      isExpired: (widgetId?: string) => boolean
      ready: (callback: () => void) => void
    }
    onloadTurnstileCallback?: () => void
  }
}

export function Turnstile({
  siteKey,
  onVerify,
  onError,
  onExpire,
  theme = 'auto',
  size = 'normal',
  appearance = 'interaction-only',
  action,
  cdata,
  className = ''
}: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [widgetId, setWidgetId] = useState<string | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Load Turnstile script with explicit rendering
    if (!window.turnstile) {
      const script = document.createElement('script')
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=onloadTurnstileCallback'
      script.async = true
      script.defer = true
      
      // Set up the callback
      window.onloadTurnstileCallback = () => {
        setIsLoaded(true)
      }
      
      script.onerror = () => {
        setError('Failed to load Turnstile script')
        console.error('Turnstile script failed to load')
      }
      
      document.head.appendChild(script)
    } else {
      setIsLoaded(true)
    }

    return () => {
      // Cleanup
      if (widgetId && window.turnstile) {
        window.turnstile.remove(widgetId)
      }
    }
  }, [widgetId])

  useEffect(() => {
    if (isLoaded && containerRef.current && !widgetId) {
      try {
        const id = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          theme,
          size,
          appearance,
          action,
          'c-data': cdata,
          callback: (token: string) => {
            onVerify(token)
          },
          'error-callback': (errorCode: string) => {
            const errorMessage = `Turnstile error: ${errorCode}`
            setError(errorMessage)
            onError?.(errorMessage)
          },
          'expired-callback': () => {
            setError('Turnstile token expired')
            onExpire?.()
          },
          'timeout-callback': () => {
            setError('Turnstile challenge timed out')
          },
          'unsupported-callback': () => {
            setError('Turnstile not supported in this browser')
          }
        })
        setWidgetId(id)
        setError(null)
      } catch (err) {
        const errorMessage = 'Failed to render Turnstile widget'
        setError(errorMessage)
        console.error('Turnstile render error:', err)
        onError?.(errorMessage)
      }
    }
  }, [isLoaded, siteKey, theme, size, appearance, action, cdata, onVerify, onError, onExpire, widgetId])

  const reset = () => {
    if (widgetId && window.turnstile) {
      window.turnstile.reset(widgetId)
      setError(null)
    }
  }

  const remove = () => {
    if (widgetId && window.turnstile) {
      window.turnstile.remove(widgetId)
      setWidgetId(null)
      setError(null)
    }
  }

  return (
    <div className={className}>
      {error && (
        <div className="text-red-600 text-sm mb-2 p-2 bg-red-50 border border-red-200 rounded">
          {error}
          <button 
            onClick={reset}
            className="ml-2 text-blue-600 hover:text-blue-800 underline"
          >
            Retry
          </button>
        </div>
      )}
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