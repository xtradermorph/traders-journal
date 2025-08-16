"use client"

import LandingPage from './src/pages/LandingPage'
import ErrorBoundary from './src/components/ErrorBoundary'
import Layout from './src/components/Layout'
import { usePathname } from 'next/navigation'

// Force dynamic rendering to prevent static generation errors
export const dynamic = 'force-dynamic';

export default function Home() {
  const pathname = usePathname();
  
  return (
    <ErrorBoundary>
      <Layout pathname={pathname}>
        <LandingPage />
      </Layout>
    </ErrorBoundary>
  );
}