import { supabase } from './index'

// Auth state management
export async function checkAuth() {
  try {
    const { data: { session }, error } = await supabase.auth.getSession()
    if (error) throw new Error(error.message || 'Failed to check authentication')
    return !!session
  } catch (error) {
    console.error('Auth Check Error:', error)
    throw new Error('Failed to check authentication')
  }
}

export async function logout() {
  try {
    const { error } = await supabase.auth.signOut()
    if (error) throw new Error(error.message || 'Failed to logout')
  } catch (error) {
    console.error('Logout Error:', error)
    throw new Error('Failed to logout')
  }
}

export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export async function getUser() {
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error) throw new Error(error.message || 'Failed to get user')
    return user
  } catch (error) {
    console.error('User Error:', error)
    throw new Error('Failed to get user')
  }
} 