import React from 'react';
import { cn } from '@/src/lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  text?: string;
  variant?: 'default' | 'primary' | 'secondary';
}

export function LoadingSpinner({ 
  size = 'md', 
  className, 
  text = 'Loading...',
  variant = 'default' 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16'
  };

  const variantClasses = {
    default: 'border-gray-300 border-t-gray-600',
    primary: 'border-primary/20 border-t-primary',
    secondary: 'border-secondary/20 border-t-secondary'
  };

  return (
    <div className={cn('flex flex-col items-center justify-center space-y-3', className)}>
      <div
        className={cn(
          'animate-spin rounded-full border-2 border-solid',
          sizeClasses[size],
          variantClasses[variant]
        )}
      />
      {text && (
        <p className="text-sm text-muted-foreground animate-pulse">{text}</p>
      )}
    </div>
  );
}

interface LoadingPageProps {
  title?: string;
  description?: string;
  className?: string;
}

export function LoadingPage({ 
  title = 'Loading', 
  description = 'Please wait while we prepare your content...',
  className 
}: LoadingPageProps) {
  return (
    <div className={cn(
      'min-h-screen relative flex items-center justify-center bg-gradient-to-br from-background to-muted/40',
      className
    )}>
      {/* Glassmorphism background overlay */}
      <div className="absolute inset-0 bg-white/90 backdrop-blur-md z-0 pointer-events-none" />
      
      <div className="relative z-10 text-center space-y-6">
        <LoadingSpinner size="xl" variant="primary" />
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-foreground">{title}</h2>
          <p className="text-muted-foreground max-w-md mx-auto">{description}</p>
        </div>
      </div>
    </div>
  );
}

interface LoadingCardProps {
  title?: string;
  className?: string;
}

export function LoadingCard({ title = 'Loading...', className }: LoadingCardProps) {
  return (
    <div className={cn(
      'w-full max-w-[95vw] sm:max-w-[90vw] md:max-w-[85vw] lg:max-w-4xl xl:max-w-5xl mx-auto bg-card/90 rounded-2xl shadow-2xl border border-border p-6 md:p-8 lg:p-10',
      className
    )}>
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <LoadingSpinner size="lg" variant="primary" />
        <h3 className="text-lg font-medium text-foreground">{title}</h3>
      </div>
    </div>
  );
} 