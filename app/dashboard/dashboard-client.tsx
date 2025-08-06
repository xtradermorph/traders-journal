'use client'

import { useAuth } from '@/src/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import DashboardContent from '@/src/pages/Dashboard'
import Layout from '@/src/components/Layout'
import { LoadingPage } from '../components/ui/loading-spinner'

export default function DashboardClient() {
  const [isClient, setIsClient] = useState(false);
  const router = useRouter()
  const { loading, isAuthenticated, user } = useAuth()

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Debug authentication state
  useEffect(() => {
    if (isClient) {
      console.log('Dashboard auth state:', { loading, isAuthenticated, user })
    }
  }, [loading, isAuthenticated, user, isClient])

  // Use useEffect for navigation to avoid React state updates during render
  useEffect(() => {
    if (isClient && !loading && !isAuthenticated) {
      console.log('Not authenticated, redirecting to login')
      router.push('/login')
    }
  }, [loading, isAuthenticated, router, isClient])

  // Show loading state during SSR
  if (!isClient) {
    return (
      <Layout pathname="/dashboard">
        <LoadingPage 
          title="Loading Dashboard" 
          description="Preparing your trading dashboard..." 
        />
      </Layout>
    )
  }

  // Handle loading state
  if (loading) {
    return (
      <Layout pathname="/dashboard">
        <LoadingPage 
          title="Loading Dashboard" 
          description="Preparing your trading dashboard..." 
        />
      </Layout>
    )
  }

  // If not authenticated and not loading, show nothing while redirect happens
  if (!isAuthenticated) {
    return null
  }

  return (
    <Layout pathname="/dashboard">
      <DashboardContent />
    </Layout>
  )
} 