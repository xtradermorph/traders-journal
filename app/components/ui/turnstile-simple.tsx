'use client'

import { useEffect, useRef, useState } from 'react'

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

  useEffect(() => {
    let mounted = true

    const loadTurnstile = async () => {
      try {
        // Load Turnstile script if not already loaded
        if (!window.turnstile) {
          const script = document.createElement('script')
          script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
          script.async = true
          script.defer = true
          
          await new Promise<void>((resolve, reject) => {
            script.onload = () => resolve()
            script.onerror = () => reject(new Error('Failed to load Turnstile'))
            document.head.appendChild(script)
          })
        }

        if (!mounted || !containerRef.current) return

        // Wait a bit for Turnstile to be ready
        await new Promise(resolve => setTimeout(resolve, 100))

        if (!window.turnstile) {
          throw new Error('Turnstile not available')
        }

        // Render the widget
        const id = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          theme: theme,
          size: size,
          callback: (token: string) => {
            if (mounted) {
              onVerify(token)
              setError(null)
            }
          },
          'error-callback': () => {
            if (mounted) {
              const errorMsg = 'Security check failed. Please try again.'
              setError(errorMsg)
              onError?.(errorMsg)
            }
          },
          'expired-callback': () => {
            if (mounted) {
              const errorMsg = 'Security check expired. Please try again.'
              setError(errorMsg)
            onExpire?.()
          }
        }
        })

        if (mounted) {
          setWidgetId(id)
      setIsLoaded(true)
      setError(null)
        }
      } catch (err) {
        if (mounted) {
          const errorMsg = 'Failed to load security check. Please refresh the page.'
          setError(errorMsg)
          onError?.(errorMsg)
        }
      }
    }

    loadTurnstile()

      return () => {
      mounted = false
      // Cleanup widget if it exists
      if (widgetId && window.turnstile) {
        try {
          window.turnstile.remove(widgetId)
        } catch (err) {
          // Ignore cleanup errors
        }
      }
    }
  }, [siteKey, theme, size, onVerify, onError, onExpire])

  const retry = () => {
    setError(null)
    setIsLoaded(false)
    setWidgetId(null)
    
    // Remove existing widget
    if (widgetId && window.turnstile) {
      try {
        window.turnstile.remove(widgetId)
      } catch (err) {
        // Ignore cleanup errors
      }
    }
    
    // Force re-render by updating the component
    const event = new Event('retry-turnstile')
    window.dispatchEvent(event)
  }

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