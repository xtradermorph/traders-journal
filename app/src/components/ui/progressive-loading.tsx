'use client'

import React from 'react'
import { cn } from "@/lib/utils"
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react"

interface LoadingStep {
  id: string
  label: string
  completed: boolean
  error?: string
}

interface ProgressiveLoadingProps {
  steps: LoadingStep[]
  currentStep: number
  overallProgress: number
  isLoading: boolean
  className?: string
  showProgress?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function ProgressiveLoading({
  steps,
  currentStep,
  overallProgress,
  isLoading,
  className,
  showProgress = true,
  size = 'md'
}: ProgressiveLoadingProps) {
  const sizeClasses = {
    sm: {
      step: 'text-sm',
      icon: 'h-4 w-4',
      spacing: 'space-y-2'
    },
    md: {
      step: 'text-base',
      icon: 'h-5 w-5',
      spacing: 'space-y-3'
    },
    lg: {
      step: 'text-lg',
      icon: 'h-6 w-6',
      spacing: 'space-y-4'
    }
  }

  const currentSize = sizeClasses[size]

  return (
    <div className={cn("w-full", className)}>
      {/* Progress Bar */}
      {showProgress && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">
              Overall Progress
            </span>
            <span className="text-sm font-medium text-muted-foreground">
              {Math.round(overallProgress)}%
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Steps */}
      <div className={cn("space-y-3", currentSize.spacing)}>
        {steps.map((step, index) => {
          const isCurrent = index === currentStep
          const isCompleted = step.completed
          const hasError = step.error

          return (
            <div
              key={step.id}
              className={cn(
                "flex items-center space-x-3 p-3 rounded-lg border transition-all duration-200",
                isCurrent && "border-primary bg-primary/5",
                isCompleted && "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20",
                hasError && "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20"
              )}
            >
              {/* Step Icon */}
              <div className="flex-shrink-0">
                {hasError ? (
                  <AlertCircle className={cn("text-red-500", currentSize.icon)} />
                ) : isCompleted ? (
                  <CheckCircle className={cn("text-green-500", currentSize.icon)} />
                ) : isCurrent ? (
                  <Loader2 className={cn("text-primary animate-spin", currentSize.icon)} />
                ) : (
                  <div className={cn("rounded-full border-2 border-muted-foreground/30", currentSize.icon)} />
                )}
              </div>

              {/* Step Label */}
              <div className="flex-1 min-w-0">
                <span
                  className={cn(
                    "font-medium transition-colors duration-200",
                    currentSize.step,
                    isCurrent && "text-primary",
                    isCompleted && "text-green-700 dark:text-green-300",
                    hasError && "text-red-700 dark:text-red-300"
                  )}
                >
                  {step.label}
                </span>
                
                {/* Error Message */}
                {hasError && (
                  <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                    {step.error}
                  </p>
                )}
              </div>

              {/* Step Number */}
              <div className="flex-shrink-0">
                <span
                  className={cn(
                    "inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium transition-all duration-200",
                    isCurrent && "bg-primary text-primary-foreground",
                    isCompleted && "bg-green-500 text-white",
                    hasError && "bg-red-500 text-white",
                    !isCurrent && !isCompleted && !hasError && "bg-muted text-muted-foreground"
                  )}
                >
                  {index + 1}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Loading Status */}
      {isLoading && (
        <div className="mt-4 text-center">
          <p className="text-sm text-muted-foreground">
            Processing step {currentStep + 1} of {steps.length}...
          </p>
        </div>
      )}
    </div>
  )
}

// Specialized AI Analysis Loading Component
export function AIAnalysisLoading({ className }: { className?: string }) {
  const steps = [
    { id: 'analyzing', label: 'Analyzing trading data', completed: false },
    { id: 'processing', label: 'Processing market information', completed: false },
    { id: 'generating', label: 'Generating insights', completed: false },
    { id: 'creating', label: 'Creating recommendations', completed: false },
    { id: 'finalizing', label: 'Finalizing analysis', completed: false }
  ]

  return (
    <div className={cn("p-6 rounded-lg border bg-card", className)}>
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold mb-2">AI Analysis in Progress</h3>
        <p className="text-sm text-muted-foreground">
          Our AI is analyzing your trading data to provide personalized insights
        </p>
      </div>
      
      <ProgressiveLoading
        steps={steps}
        currentStep={0}
        overallProgress={0}
        isLoading={true}
        size="md"
      />
    </div>
  )
}

// Specialized Data Loading Component
export function DataLoading({ className }: { className?: string }) {
  const steps = [
    { id: 'connecting', label: 'Connecting to database', completed: false },
    { id: 'fetching', label: 'Fetching data', completed: false },
    { id: 'processing', label: 'Processing results', completed: false },
    { id: 'updating', label: 'Updating interface', completed: false }
  ]

  return (
    <div className={cn("p-4 rounded-lg border bg-card", className)}>
      <div className="text-center mb-4">
        <h4 className="font-medium mb-1">Loading Data</h4>
        <p className="text-sm text-muted-foreground">
          Please wait while we fetch your information
        </p>
      </div>
      
      <ProgressiveLoading
        steps={steps}
        currentStep={0}
        overallProgress={0}
        isLoading={true}
        size="sm"
        showProgress={false}
      />
    </div>
  )
}

// Specialized Image Processing Loading Component
export function ImageProcessingLoading({ className }: { className?: string }) {
  const steps = [
    { id: 'uploading', label: 'Uploading image', completed: false },
    { id: 'processing', label: 'Processing format', completed: false },
    { id: 'optimizing', label: 'Optimizing size', completed: false },
    { id: 'applying', label: 'Applying filters', completed: false },
    { id: 'saving', label: 'Saving to storage', completed: false }
  ]

  return (
    <div className={cn("p-4 rounded-lg border bg-card", className)}>
      <div className="text-center mb-4">
        <h4 className="font-medium mb-1">Processing Image</h4>
        <p className="text-sm text-muted-foreground">
          Optimizing your image for better performance
        </p>
      </div>
      
      <ProgressiveLoading
        steps={steps}
        currentStep={0}
        overallProgress={0}
        isLoading={true}
        size="sm"
      />
    </div>
  )
}
