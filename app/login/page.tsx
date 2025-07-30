import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import Login from '@/src/components/auth/Login';

export default async function LoginPage() {
  // Get cookies
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get('sb:session');

  // If we have a session cookie, redirect to dashboard
  if (sessionCookie) {
    redirect('/dashboard');
  }

  return <Login />;
}