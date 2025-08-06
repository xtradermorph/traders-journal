// Force dynamic rendering to prevent static generation errors
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import SocialForumClient from './social-forum-client'

export default function SocialForumPage() {
  return <SocialForumClient />
}
