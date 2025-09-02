import { useState, useEffect, useCallback } from 'react'

interface ProgressiveLoadingOptions {
  initialDelay?: number
  progressiveDelay?: number
  maxSteps?: number
}

interface LoadingStep {
  id: string
  label: string
  completed: boolean
  error?: string
}

export function useProgressiveLoading(
  steps: string[],
  options: ProgressiveLoadingOptions = {}
) {
  const {
    initialDelay = 100,
    progressiveDelay = 200,
    maxSteps = steps.length
  } = options

  const [loadingSteps, setLoadingSteps] = useState<LoadingStep[]>([])
  const [currentStep, setCurrentStep] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [overallProgress, setOverallProgress] = useState(0)

  // Initialize loading steps
  useEffect(() => {
    const initialSteps = steps.slice(0, maxSteps).map(step => ({
      id: step.toLowerCase().replace(/\s+/g, '-'),
      label: step,
      completed: false
    }))
    setLoadingSteps(initialSteps)
  }, [steps, maxSteps])

  // Start progressive loading
  const startLoading = useCallback(async () => {
    setIsLoading(true)
    setCurrentStep(0)
    setOverallProgress(0)

    // Initial delay before starting
    await new Promise(resolve => setTimeout(resolve, initialDelay))

    for (let i = 0; i < Math.min(steps.length, maxSteps); i++) {
      setCurrentStep(i)
      
      // Simulate step completion
      await new Promise(resolve => setTimeout(resolve, progressiveDelay))
      
      setLoadingSteps(prev => 
        prev.map((step, index) => 
          index === i ? { ...step, completed: true } : step
        )
      )
      
      setOverallProgress(((i + 1) / Math.min(steps.length, maxSteps)) * 100)
    }

    setIsLoading(false)
  }, [steps, maxSteps, initialDelay, progressiveDelay])

  // Complete a specific step
  const completeStep = useCallback((stepId: string) => {
    setLoadingSteps(prev => 
      prev.map(step => 
        step.id === stepId ? { ...step, completed: true } : step
      )
    )
    
    const completedCount = loadingSteps.filter(step => step.completed).length + 1
    setOverallProgress((completedCount / loadingSteps.length) * 100)
  }, [loadingSteps])

  // Mark a step as failed
  const failStep = useCallback((stepId: string, error: string) => {
    setLoadingSteps(prev => 
      prev.map(step => 
        step.id === stepId ? { ...step, error } : step
      )
    )
  }, [])

  // Reset loading state
  const reset = useCallback(() => {
    setLoadingSteps(prev => prev.map(step => ({ ...step, completed: false, error: undefined })))
    setCurrentStep(0)
    setOverallProgress(0)
    setIsLoading(false)
  }, [])

  // Get current step info
  const getCurrentStep = useCallback(() => {
    return loadingSteps[currentStep] || null
  }, [loadingSteps, currentStep])

  // Check if all steps are completed
  const isAllCompleted = useCallback(() => {
    return loadingSteps.every(step => step.completed)
  }, [loadingSteps])

  // Get step by ID
  const getStepById = useCallback((stepId: string) => {
    return loadingSteps.find(step => step.id === stepId)
  }, [loadingSteps])

  return {
    // State
    loadingSteps,
    currentStep,
    isLoading,
    overallProgress,
    
    // Actions
    startLoading,
    completeStep,
    failStep,
    reset,
    
    // Getters
    getCurrentStep,
    isAllCompleted,
    getStepById,
    
    // Computed values
    totalSteps: loadingSteps.length,
    completedSteps: loadingSteps.filter(step => step.completed).length,
    failedSteps: loadingSteps.filter(step => step.error).length
  }
}

// Specialized hook for AI analysis loading
export function useAILoading() {
  const steps = [
    'Analyzing trading data',
    'Processing market information',
    'Generating insights',
    'Creating recommendations',
    'Finalizing analysis'
  ]

  return useProgressiveLoading(steps, {
    initialDelay: 150,
    progressiveDelay: 300,
    maxSteps: 5
  })
}

// Specialized hook for data fetching loading
export function useDataLoading() {
  const steps = [
    'Connecting to database',
    'Fetching data',
    'Processing results',
    'Updating interface'
  ]

  return useProgressiveLoading(steps, {
    initialDelay: 50,
    progressiveDelay: 150,
    maxSteps: 4
  })
}

// Specialized hook for image processing loading
export function useImageProcessingLoading() {
  const steps = [
    'Uploading image',
    'Processing format',
    'Optimizing size',
    'Applying filters',
    'Saving to storage'
  ]

  return useProgressiveLoading(steps, {
    initialDelay: 100,
    progressiveDelay: 250,
    maxSteps: 5
  })
}
