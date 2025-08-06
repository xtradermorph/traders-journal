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
  }
}

// Global script loading state
let scriptLoadingPromise: Promise<void> | null = null

const loadTurnstileScript = (): Promise<void> => {
  if (window.turnstile) {
    return Promise.resolve()
  }

  if (scriptLoadingPromise) {
    return scriptLoadingPromise
  }

  scriptLoadingPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    script.async = true
    script.defer = true
    
    script.onload = () => {
      // Wait a bit for the script to initialize
      setTimeout(() => {
        if (window.turnstile) {
          resolve()
        } else {
          reject(new Error('Turnstile failed to initialize'))
        }
      }, 100)
    }
    
    script.onerror = () => {
      reject(new Error('Failed to load Turnstile script'))
    }
    
    document.head.appendChild(script)
  })

  return scriptLoadingPromise
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
    let mounted = true

    const initializeTurnstile = async () => {
      try {
        await loadTurnstileScript()
        
        if (!mounted) return
        
        setIsLoaded(true)
      } catch (err) {
        if (!mounted) return
        
        const errorMessage = 'Failed to load security check'
        setError(errorMessage)
        onError?.(errorMessage)
      }
    }

    initializeTurnstile()

    return () => {
      mounted = false
    }
  }, [onError])

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
            const errorMessage = `Security check failed: ${errorCode}`
            setError(errorMessage)
            onError?.(errorMessage)
          },
          'expired-callback': () => {
            setError('Security check expired')
            onExpire?.()
          },
          'timeout-callback': () => {
            setError('Security check timed out')
          },
          'unsupported-callback': () => {
            setError('Security check not supported in this browser')
          }
        })
        setWidgetId(id)
        setError(null)
      } catch (err) {
        const errorMessage = 'Failed to render security check'
        setError(errorMessage)
        onError?.(errorMessage)
      }
    }
  }, [isLoaded, siteKey, theme, size, appearance, action, cdata, onVerify, onError, onExpire, widgetId])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (widgetId && window.turnstile) {
        try {
          window.turnstile.remove(widgetId)
        } catch (err) {
          // Ignore cleanup errors
        }
      }
    }
  }, [widgetId])

  const reset = () => {
    if (widgetId && window.turnstile) {
      window.turnstile.reset(widgetId)
      setError(null)
    }
  }

  return (
    <div className={`turnstile-wrapper ${className}`}>
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
      <div 
        ref={containerRef} 
        className="turnstile-container"
        style={{ 
          minHeight: '65px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}
      />
      {!isLoaded && !error && (
        <div className="text-center text-sm text-gray-500 py-4">
          Loading security check...
        </div>
      )}
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