"use client"

import App from './src/App'
import ErrorBoundary from './src/components/ErrorBoundary'

// Force dynamic rendering to prevent static generation errors
export const dynamic = 'force-dynamic';

export default function Home() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}