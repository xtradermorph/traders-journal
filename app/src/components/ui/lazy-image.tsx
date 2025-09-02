'use client'

import React, { useState, useRef, useEffect } from 'react'
import { cn } from "@/lib/utils"
import { Skeleton } from "./skeleton"
import { useLazyImage, useProgressiveImage } from "../../lib/image-optimization"

interface LazyImageProps {
  src: string
  alt: string
  placeholder?: string
  lowResSrc?: string
  className?: string
  width?: number
  height?: number
  priority?: boolean
  onLoad?: () => void
  onError?: () => void
  fallback?: string
  showSkeleton?: boolean
  skeletonClassName?: string
}

export function LazyImage({
  src,
  alt,
  placeholder,
  lowResSrc,
  className,
  width,
  height,
  priority = false,
  onLoad,
  onError,
  fallback,
  showSkeleton = true,
  skeletonClassName
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [currentSrc, setCurrentSrc] = useState(placeholder || src)
  const imageRef = useRef<HTMLImageElement>(null)

  // Use progressive loading if low-res source is provided
  const progressiveImage = useProgressiveImage(
    lowResSrc || placeholder || src,
    src
  )

  // Use lazy loading if not priority
  const lazyImage = useLazyImage(
    src,
    placeholder || lowResSrc
  )

  const finalSrc = lowResSrc ? progressiveImage.currentSrc : lazyImage.imageSrc
  const finalRef = lowResSrc ? imageRef : lazyImage.setImageRef

  useEffect(() => {
    if (priority) {
      setCurrentSrc(src)
    }
  }, [priority, src])

  const handleLoad = () => {
    setIsLoaded(true)
    onLoad?.()
  }

  const handleError = () => {
    setHasError(true)
    if (fallback && currentSrc !== fallback) {
      setCurrentSrc(fallback)
      setHasError(false)
    } else {
      onError?.()
    }
  }

  const handleImageRef = (ref: HTMLImageElement | null) => {
    if (typeof finalRef === 'function') {
      finalRef(ref)
    }
    if (ref) {
      imageRef.current = ref
    }
  }

  // Show skeleton while loading
  if (showSkeleton && !isLoaded && !hasError) {
    return (
      <div className={cn("relative", className)}>
        <Skeleton 
          className={cn(
            "w-full h-full rounded-md",
            skeletonClassName
          )}
          style={{
            width: width || '100%',
            height: height || 'auto',
            minHeight: height || 200
          }}
        />
        <img
          ref={handleImageRef}
          src={finalSrc}
          alt={alt}
          width={width}
          height={height}
          className="absolute inset-0 opacity-0"
          onLoad={handleLoad}
          onError={handleError}
          loading={priority ? 'eager' : 'lazy'}
        />
      </div>
    )
  }

  return (
    <div className={cn("relative", className)}>
      <img
        ref={handleImageRef}
        src={currentSrc}
        alt={alt}
        width={width}
        height={height}
        className={cn(
          "transition-opacity duration-300",
          isLoaded ? "opacity-100" : "opacity-0"
        )}
        onLoad={handleLoad}
        onError={handleError}
        loading={priority ? 'eager' : 'lazy'}
      />
      
      {/* Loading indicator */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/20">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        </div>
      )}
      
      {/* Error state */}
      {hasError && !fallback && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/20 rounded-md">
          <div className="text-center text-muted-foreground">
            <div className="text-2xl mb-2">📷</div>
            <div className="text-sm">Image failed to load</div>
          </div>
        </div>
      )}
    </div>
  )
}

// Optimized Image Component with WebP Support
interface OptimizedImageProps extends Omit<LazyImageProps, 'src'> {
  src: string
  webpSrc?: string
  sizes?: string
  srcSet?: string
  quality?: number
}

export function OptimizedImage({
  src,
  webpSrc,
  sizes,
  srcSet,
  quality = 80,
  className,
  ...props
}: OptimizedImageProps) {
  const [supportsWebP, setSupportsWebP] = useState(true)

  useEffect(() => {
    // Check WebP support
    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 1
    
    try {
      const isSupported = canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0
      setSupportsWebP(isSupported)
    } catch {
      setSupportsWebP(false)
    }
  }, [])

  const finalSrc = supportsWebP && webpSrc ? webpSrc : src

  return (
    <picture className={cn("block", className)}>
      {webpSrc && (
        <source
          srcSet={webpSrc}
          type="image/webp"
          sizes={sizes}
        />
      )}
      <LazyImage
        src={finalSrc}
        className="w-full h-full object-cover"
        {...props}
      />
    </picture>
  )
}

// Responsive Image Component
interface ResponsiveImageProps extends Omit<LazyImageProps, 'src'> {
  src: string
  srcSet: Record<string, string>
  sizes: string
  aspectRatio?: number
}

export function ResponsiveImage({
  src,
  srcSet,
  sizes,
  aspectRatio,
  className,
  ...props
}: ResponsiveImageProps) {
  const srcSetString = Object.entries(srcSet)
    .map(([size, url]) => `${url} ${size}`)
    .join(', ')

  return (
    <div 
      className={cn("relative", className)}
      style={{
        aspectRatio: aspectRatio ? `${aspectRatio}` : undefined
      }}
    >
      <img
        src={src}
        srcSet={srcSetString}
        sizes={sizes}
        alt={props.alt}
        className="w-full h-full object-cover"
        loading="lazy"
        onLoad={props.onLoad}
        onError={props.onError}
      />
    </div>
  )
}

// Avatar Image Component
interface AvatarImageProps extends Omit<LazyImageProps, 'src'> {
  src: string
  fallback?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

export function AvatarImage({
  src,
  fallback,
  size = 'md',
  className,
  ...props
}: AvatarImageProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  }

  return (
    <LazyImage
      src={src}
      fallback={fallback}
      className={cn(
        "rounded-full object-cover",
        sizeClasses[size],
        className
      )}
      showSkeleton={false}
      {...props}
    />
  )
}

// Trade Image Component
interface TradeImageProps extends Omit<LazyImageProps, 'src'> {
  src: string
  tradeId: string
  showOptimization?: boolean
}

export function TradeImage({
  src,
  tradeId,
  showOptimization = true,
  className,
  ...props
}: TradeImageProps) {
  return (
    <div className={cn("relative group", className)}>
      <LazyImage
        src={src}
        className="w-full h-full object-cover rounded-lg"
        showSkeleton={true}
        {...props}
      />
      
      {showOptimization && (
        <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
          Optimized
        </div>
      )}
    </div>
  )
}
