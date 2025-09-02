import sharp from 'sharp'

export interface ImageOptimizationOptions {
  quality?: number
  format?: 'webp' | 'jpeg' | 'png'
  width?: number
  height?: number
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside'
  compression?: 'mozjpeg' | 'jpeg' | 'webp'
  progressive?: boolean
  metadata?: boolean
}

export interface OptimizedImage {
  buffer: Buffer
  format: string
  size: number
  dimensions: { width: number; height: number }
  mimeType: string
}

export class ImageOptimizer {
  private static readonly DEFAULT_OPTIONS: ImageOptimizationOptions = {
    quality: 80,
    format: 'webp',
    fit: 'cover',
    compression: 'webp',
    progressive: true,
    metadata: false
  }

  /**
   * Optimize an image buffer with the specified options
   */
  static async optimize(
    inputBuffer: Buffer,
    options: ImageOptimizationOptions = {}
  ): Promise<OptimizedImage> {
    const opts = { ...this.DEFAULT_OPTIONS, ...options }
    
    try {
      let pipeline = sharp(inputBuffer)

      // Resize if dimensions are specified
      if (opts.width || opts.height) {
        pipeline = pipeline.resize(opts.width, opts.height, {
          fit: opts.fit,
          withoutEnlargement: true
        })
      }

      // Apply format-specific optimizations
      switch (opts.format) {
        case 'webp':
          pipeline = pipeline.webp({
            quality: opts.quality,
            effort: 6, // Higher effort = better compression
            nearLossless: opts.quality === 100
          })
          break

        case 'jpeg':
          pipeline = pipeline.jpeg({
            quality: opts.quality,
            progressive: opts.progressive,
            mozjpeg: opts.compression === 'mozjpeg'
          })
          break

        case 'png':
          pipeline = pipeline.png({
            quality: opts.quality,
            progressive: opts.progressive,
            compressionLevel: 9
          })
          break
      }

      // Remove metadata if not needed
      if (!opts.metadata) {
        pipeline = pipeline.removeMetadata()
      }

      const optimizedBuffer = await pipeline.toBuffer()
      const metadata = await sharp(optimizedBuffer).metadata()

      return {
        buffer: optimizedBuffer,
        format: opts.format || 'webp',
        size: optimizedBuffer.length,
        dimensions: {
          width: metadata.width || 0,
          height: metadata.height || 0
        },
        mimeType: this.getMimeType(opts.format || 'webp')
      }
    } catch (error) {
      console.error('Image optimization failed:', error)
      throw new Error(`Image optimization failed: ${error}`)
    }
  }

  /**
   * Create multiple optimized versions of an image
   */
  static async createResponsiveVersions(
    inputBuffer: Buffer,
    sizes: number[],
    options: ImageOptimizationOptions = {}
  ): Promise<Record<string, OptimizedImage>> {
    const results: Record<string, OptimizedImage> = {}

    for (const size of sizes) {
      const sizeKey = `${size}w`
      results[sizeKey] = await this.optimize(inputBuffer, {
        ...options,
        width: size,
        height: size
      })
    }

    return results
  }

  /**
   * Create a thumbnail version of an image
   */
  static async createThumbnail(
    inputBuffer: Buffer,
    size: number = 150,
    options: ImageOptimizationOptions = {}
  ): Promise<OptimizedImage> {
    return this.optimize(inputBuffer, {
      ...options,
      width: size,
      height: size,
      fit: 'cover',
      quality: 70
    })
  }

  /**
   * Create a preview version of an image
   */
  static async createPreview(
    inputBuffer: Buffer,
    width: number = 800,
    options: ImageOptimizationOptions = {}
  ): Promise<OptimizedImage> {
    return this.optimize(inputBuffer, {
      ...options,
      width,
      height: undefined,
      fit: 'inside',
      quality: 85
    })
  }

  /**
   * Get MIME type for the specified format
   */
  private static getMimeType(format: string): string {
    switch (format) {
      case 'webp':
        return 'image/webp'
      case 'jpeg':
        return 'image/jpeg'
      case 'png':
        return 'image/png'
      default:
        return 'image/webp'
    }
  }

  /**
   * Calculate file size reduction percentage
   */
  static calculateReduction(originalSize: number, optimizedSize: number): number {
    return Math.round(((originalSize - optimizedSize) / originalSize) * 100)
  }

  /**
   * Check if WebP is supported by the browser
   */
  static isWebPSupported(): boolean {
    if (typeof window === 'undefined') return true // Server-side, assume support
    
    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 1
    
    try {
      return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0
    } catch {
      return false
    }
  }

  /**
   * Get the best format based on browser support and requirements
   */
  static getBestFormat(
    supportsWebP: boolean = true,
    requiresTransparency: boolean = false
  ): 'webp' | 'jpeg' | 'png' {
    if (requiresTransparency) {
      return supportsWebP ? 'webp' : 'png'
    }
    
    if (supportsWebP) {
      return 'webp'
    }
    
    return 'jpeg'
  }
}

/**
 * Lazy Loading Image Component Hook
 */
export function useLazyImage(src: string, placeholder?: string) {
  const [imageSrc, setImageSrc] = useState(placeholder || src)
  const [imageRef, setImageRef] = useState<HTMLImageElement | null>(null)

  useEffect(() => {
    let observer: IntersectionObserver
    let cancelled = false

    if (imageRef && imageSrc === placeholder) {
      if (IntersectionObserver) {
        observer = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting && !cancelled) {
                setImageSrc(src)
                observer.unobserve(imageRef)
              }
            })
          },
          {
            threshold: 0.01,
            rootMargin: '50px'
          }
        )
        observer.observe(imageRef)
      } else {
        // Fallback for older browsers
        setImageSrc(src)
      }
    }

    return () => {
      cancelled = true
      if (observer && observer.unobserve) {
        observer.unobserve(imageRef)
      }
    }
  }, [src, imageSrc, placeholder, imageRef])

  return { imageSrc, setImageRef }
}

/**
 * Progressive Image Loading Hook
 */
export function useProgressiveImage(
  lowResSrc: string,
  highResSrc: string
) {
  const [currentSrc, setCurrentSrc] = useState(lowResSrc)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    setCurrentSrc(lowResSrc)
    setIsLoaded(false)

    const img = new Image()
    img.src = highResSrc

    img.onload = () => {
      setCurrentSrc(highResSrc)
      setIsLoaded(true)
    }

    img.onerror = () => {
      // If high-res fails, keep low-res
      setIsLoaded(true)
    }
  }, [lowResSrc, highResSrc])

  return { currentSrc, isLoaded }
}

/**
 * Image Upload and Optimization Utility
 */
export class ImageUploader {
  /**
   * Upload and optimize an image file
   */
  static async uploadAndOptimize(
    file: File,
    options: ImageOptimizationOptions = {}
  ): Promise<{
    original: File
    optimized: OptimizedImage
    thumbnail: OptimizedImage
    preview: OptimizedImage
  }> {
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Create optimized versions
    const [optimized, thumbnail, preview] = await Promise.all([
      ImageOptimizer.optimize(buffer, options),
      ImageOptimizer.createThumbnail(buffer, 150, options),
      ImageOptimizer.createPreview(buffer, 800, options)
    ])

    return {
      original: file,
      optimized,
      thumbnail,
      preview
    }
  }

  /**
   * Validate image file
   */
  static validateFile(file: File): { isValid: boolean; error?: string } {
    const maxSize = 10 * 1024 * 1024 // 10MB
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']

    if (file.size > maxSize) {
      return { isValid: false, error: 'File size must be less than 10MB' }
    }

    if (!allowedTypes.includes(file.type)) {
      return { isValid: false, error: 'Only JPG, PNG, WebP, and GIF files are allowed' }
    }

    return { isValid: true }
  }

  /**
   * Get file size in human readable format
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes'
    
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }
}

// Import React hooks for the lazy loading functionality
import { useState, useEffect } from 'react'
