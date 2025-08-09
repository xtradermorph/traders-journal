'use client'

import { useAuth } from '../src/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import DashboardContent from '../src/pages/Dashboard'
import Layout from '../src/components/Layout'
import { LoadingPage } from '../components/ui/loading-spinner'
import ErrorBoundary from '../src/components/ErrorBoundary'

export default function DashboardClient() {
  const [isClient, setIsClient] = useState(false);
  const router = useRouter()
  const { loading, isAuthenticated, user } = useAuth()

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Handle navigation to login if not authenticated
  useEffect(() => {
    if (isClient && !loading && !isAuthenticated) {
      router.push('/login')
    }
  }, [loading, isAuthenticated, router, isClient])

  // Show loading state during SSR or before client initialization
  if (!isClient || loading) {
    return (
      <ErrorBoundary>
        <Layout pathname="/dashboard">
          <LoadingPage 
            title="Loading Dashboard" 
            description="Preparing your trading dashboard..." 
          />
        </Layout>
      </ErrorBoundary>
    )
  }

  // If not authenticated, show nothing while redirect happens
  if (!isAuthenticated) {
    return null
  }

  return (
    <ErrorBoundary>
      <Layout pathname="/dashboard">
        <DashboardContent />
      </Layout>
    </ErrorBoundary>
  )
} 