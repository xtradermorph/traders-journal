'use client'

import { useEffect, useRef, useState } from 'react'

interface TurnstileProps {
  siteKey: string
  onVerify: (token: string) => void
  onError?: (error: string) => void
  onExpire?: () => void
  theme?: 'light' | 'dark' | 'auto'
  size?: 'normal' | 'compact' | 'flexible'
  className?: string
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

  useEffect(() => {
    if (!containerRef.current) return

    try {
      // Create iframe with Turnstile
      const iframe = document.createElement('iframe')
      iframe.src = `https://challenges.cloudflare.com/turnstile/v0/iframe?sitekey=${siteKey}&theme=${theme}&size=${size}`
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
      setError(null)

      return () => {
        window.removeEventListener('message', handleMessage)
      }
    } catch (err) {
      setError('Failed to load security check')
      onError?.('Failed to load security check')
    }
  }, [siteKey, theme, size, onVerify, onError, onExpire])

  const retry = () => {
    setError(null)
    setIsLoaded(false)
    // Force re-render
    window.location.reload()
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