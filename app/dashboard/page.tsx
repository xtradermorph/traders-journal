'use client'

import { useAuth } from '@/src/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import DashboardContent from '@/src/pages/Dashboard'
import Layout from '@/src/components/Layout'
import { LoadingPage } from '../components/ui/loading-spinner'

export default function DashboardPage() {
  const router = useRouter()
  const { loading, isAuthenticated, user } = useAuth()

  // Debug authentication state
  useEffect(() => {
    console.log('Dashboard auth state:', { loading, isAuthenticated, user })
  }, [loading, isAuthenticated, user])

  // Use useEffect for navigation to avoid React state updates during render
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      console.log('Not authenticated, redirecting to login')
      router.push('/login')
    }
  }, [loading, isAuthenticated, router])

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