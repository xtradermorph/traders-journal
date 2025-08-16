"use client"

import LandingPage from './src/pages/LandingPage'
import ErrorBoundary from './src/components/ErrorBoundary'

// Force dynamic rendering to prevent static generation errors
export const dynamic = 'force-dynamic';

export default function Home() {
  return (
    <ErrorBoundary>
      <LandingPage />
    </ErrorBoundary>
  );
}