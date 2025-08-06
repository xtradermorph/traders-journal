// Force dynamic rendering to prevent static generation errors
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import DashboardClient from './dashboard-client'

export default function DashboardPage() {
  return <DashboardClient />
}