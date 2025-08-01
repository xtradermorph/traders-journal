"use client"

import App from '@/src/App'
import ErrorBoundary from '@/src/components/ErrorBoundary'

export default function Home() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}