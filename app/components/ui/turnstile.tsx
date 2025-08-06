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
    onTurnstileSuccess?: (token: string) => void
    onTurnstileError?: (error: string) => void
    onTurnstileExpire?: () => void
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
  const [useIframe, setUseIframe] = useState(false)

  // Set up global callbacks for iframe approach
  useEffect(() => {
    window.onTurnstileSuccess = (token: string) => {
      onVerify(token)
    }
    window.onTurnstileError = (error: string) => {
      setError(error)
      onError?.(error)
    }
    window.onTurnstileExpire = () => {
      setError('Security check expired')
      onExpire?.()
    }

    return () => {
      delete window.onTurnstileSuccess
      delete window.onTurnstileError
      delete window.onTurnstileExpire
    }
  }, [onVerify, onError, onExpire])

  useEffect(() => {
    let mounted = true
    let attempts = 0
    const maxAttempts = 3

    const tryStandardApproach = async () => {
      try {
        // Try to load Turnstile script
        if (!window.turnstile) {
          const script = document.createElement('script')
          script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
          script.async = true
          script.defer = true
          
          await new Promise<void>((resolve, reject) => {
            script.onload = () => {
              setTimeout(() => {
                if (window.turnstile) {
                  resolve()
                } else {
                  reject(new Error('Turnstile not initialized'))
                }
              }, 1000)
            }
            script.onerror = () => reject(new Error('Script load failed'))
            document.head.appendChild(script)
          })
        }

        if (!mounted) return

        // Try to render widget
        if (containerRef.current && window.turnstile) {
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
          setIsLoaded(true)
          setError(null)
          return true
        }
      } catch (err) {
        return false
      }
      return false
    }

    const tryIframeApproach = () => {
      if (!containerRef.current) return false

      try {
        // Create iframe with Turnstile
        const iframe = document.createElement('iframe')
        iframe.src = `https://challenges.cloudflare.com/turnstile/v0/iframe?sitekey=${siteKey}&theme=${theme}&size=${size}&appearance=${appearance}${action ? `&action=${action}` : ''}${cdata ? `&cdata=${cdata}` : ''}`
        iframe.width = size === 'compact' ? '300' : '400'
        iframe.height = size === 'compact' ? '65' : '85'
        iframe.frameBorder = '0'
        iframe.scrolling = 'no'
        iframe.style.border = 'none'
        iframe.style.borderRadius = '4px'
        iframe.style.width = '100%'
        iframe.style.maxWidth = '400px'
        iframe.style.margin = '0 auto'
        iframe.style.display = 'block'

        // Clear container and add iframe
        containerRef.current.innerHTML = ''
        containerRef.current.appendChild(iframe)

        // Set up message listener for iframe communication
        const handleMessage = (event: MessageEvent) => {
          if (event.origin !== 'https://challenges.cloudflare.com') return
          
          if (event.data && typeof event.data === 'object') {
            if (event.data.type === 'turnstile-success' && event.data.token) {
              onVerify(event.data.token)
            } else if (event.data.type === 'turnstile-error') {
              const errorMessage = `Security check failed: ${event.data.error || 'Unknown error'}`
              setError(errorMessage)
              onError?.(errorMessage)
            } else if (event.data.type === 'turnstile-expire') {
              setError('Security check expired')
              onExpire?.()
            }
          }
        }

        window.addEventListener('message', handleMessage)
        setIsLoaded(true)
        setUseIframe(true)
        setError(null)

        return true
      } catch (err) {
        return false
      }
    }

    const attemptLoad = async () => {
      if (attempts >= maxAttempts) {
        setError('Unable to load security check. Please try refreshing the page.')
        return
      }

      attempts++
      
      // Try standard approach first
      if (await tryStandardApproach()) {
        return
      }

      // If standard approach fails, try iframe approach
      if (tryIframeApproach()) {
        return
      }

      // If both fail, retry after delay
      setTimeout(() => {
        if (mounted) {
          attemptLoad()
        }
      }, 2000)
    }

    attemptLoad()

    return () => {
      mounted = false
    }
  }, [siteKey, theme, size, appearance, action, cdata, onVerify, onError, onExpire])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (widgetId && window.turnstile && !useIframe) {
        try {
          window.turnstile.remove(widgetId)
        } catch (err) {
          // Ignore cleanup errors
        }
      }
    }
  }, [widgetId, useIframe])

  const retry = () => {
    setError(null)
    setWidgetId(null)
    setIsLoaded(false)
    setUseIframe(false)
    
    // Force re-render by updating the component
    const event = new Event('retry-turnstile')
    window.dispatchEvent(event)
  }

  return (
    <div className={`turnstile-wrapper ${className}`}>
      {error && (
        <div className="text-red-600 text-sm mb-2 p-2 bg-red-50 border border-red-200 rounded">
          {error}
          <button 
            onClick={retry}
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
          minHeight: '85px',
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