'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

interface TurnstileProps {
  siteKey: string
  onVerify: (token: string) => void
  onError?: (error: string) => void
  onExpire?: () => void
  theme?: 'light' | 'dark' | 'auto'
  size?: 'normal' | 'compact' | 'invisible'
  className?: string
}

declare global {
  interface Window {
    turnstile: {
      render: (container: string | HTMLElement, options: any) => string
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
  theme = 'auto',
  size = 'normal',
  className = ''
}: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [widgetId, setWidgetId] = useState<string | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const scriptLoadedRef = useRef(false)

  // Memoize callback functions to prevent unnecessary re-renders
  const handleVerify = useCallback((token: string) => {
    onVerify(token)
    setError(null)
  }, [onVerify])

  const handleError = useCallback((errorMsg: string) => {
    setError(errorMsg)
    onError?.(errorMsg)
  }, [onError])

  const handleExpire = useCallback(() => {
    const errorMsg = 'Security check expired. Please try again.'
    setError(errorMsg)
    onExpire?.()
  }, [onExpire])

  // Cleanup function to properly remove widget
  const cleanupWidget = useCallback(() => {
    if (widgetId && window.turnstile) {
      try {
        window.turnstile.remove(widgetId)
      } catch (err) {
        // Ignore cleanup errors - widget might already be removed
        console.debug('[Turnstile] Cleanup error (ignored):', err)
      }
    }
    setWidgetId(null)
    setIsLoaded(false)
    setIsInitialized(false)
  }, [widgetId])

  useEffect(() => {
    let mounted = true

    // Prevent multiple initializations
    if (isInitialized) return

    const loadTurnstile = async () => {
      try {
        // Check if Turnstile is already loaded globally
        if (!window.turnstile) {
          // Check if script is already in the document
          const existingScript = document.querySelector('script[src*="turnstile/v0/api.js"]')
          if (!existingScript && !scriptLoadedRef.current) {
            scriptLoadedRef.current = true
            const script = document.createElement('script')
            script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
            script.async = true
            script.defer = true
            
            await new Promise<void>((resolve, reject) => {
              script.onload = () => resolve()
              script.onerror = () => reject(new Error('Failed to load Turnstile'))
              document.head.appendChild(script)
            })
          } else if (existingScript && !scriptLoadedRef.current) {
            // Wait for existing script to load
            await new Promise(resolve => setTimeout(resolve, 500))
          }
        }

        if (!mounted || !containerRef.current) return

        // Wait for Turnstile to be ready
        let attempts = 0
        while (!window.turnstile && attempts < 10) {
          await new Promise(resolve => setTimeout(resolve, 100))
          attempts++
        }

        if (!window.turnstile) {
          throw new Error('Turnstile not available')
        }

        // Check if widget already exists in this container
        const existingWidget = containerRef.current.querySelector('.cf-turnstile')
        if (existingWidget) {
          console.warn('[Cloudflare Turnstile] Widget already exists in container, skipping render')
          return
        }

        // Clear container to ensure clean state
        if (containerRef.current) {
          containerRef.current.innerHTML = ''
        }

        // Render the widget with error handling
        let id: string
        try {
          id = window.turnstile.render(containerRef.current, {
            sitekey: siteKey,
            theme: theme,
            size: size,
            callback: (token: string) => {
              if (mounted) {
                handleVerify(token)
              }
            },
            'error-callback': () => {
              if (mounted) {
                handleError('Security check failed. Please try again.')
              }
            },
            'expired-callback': () => {
              if (mounted) {
                handleExpire()
              }
            }
          })
        } catch (renderError) {
          console.error('[Turnstile] Render error:', renderError)
          throw new Error('Failed to render security check')
        }

        if (mounted) {
          setWidgetId(id)
          setIsLoaded(true)
          setError(null)
          setIsInitialized(true)
        }
      } catch (err) {
        if (mounted) {
          const errorMsg = 'Failed to load security check. Please refresh the page.'
          setError(errorMsg)
          handleError(errorMsg)
        }
      }
    }

    loadTurnstile()

    return () => {
      mounted = false
      cleanupWidget()
    }
  }, [siteKey, theme, size, handleVerify, handleError, handleExpire, isInitialized, cleanupWidget])

  const retry = useCallback(() => {
    setError(null)
    cleanupWidget()
    
    // Clear container
    if (containerRef.current) {
      containerRef.current.innerHTML = ''
    }
  }, [cleanupWidget])

  return (
    <div className={`turnstile-wrapper ${className}`}>
      {error && (
        <div className="text-red-600 text-sm mb-2 p-2 bg-red-50 border border-red-200 rounded text-center">
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
        className="turnstile-container flex justify-center"
        style={{ 
          minHeight: size === 'compact' ? '65px' : '85px',
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