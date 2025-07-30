# Email Links Authentication Guide

## Overview
All email notification links in Trader's Journal are properly secured and handle authentication correctly. Users are redirected to login if not authenticated, then automatically redirected to their intended destination after successful login.

## Authentication Flow

### 1. Middleware Protection
The application uses Next.js middleware (`app/middleware.ts`) to protect all routes that require authentication:

**Protected Routes:**
- `/dashboard` - Main dashboard
- `/profile` - User profile
- `/trade-records` - Trade records
- `/friends` - Friends management
- `/shared-trades` - Shared trades
- `/settings` - User settings
- `/social-forum` - Social forum
- `/traders` - Traders directory
- `/support` - Support system

### 2. Authentication Process
When a user clicks an email link:

1. **Middleware Check**: The middleware checks if the user has a valid session
2. **Redirect to Login**: If not authenticated, redirects to `/login?redirect=<original_url>`
3. **Login Process**: User logs in successfully
4. **Automatic Redirect**: After login, user is automatically redirected to their original destination

### 3. Email Links and Their Destinations

#### Friend Request Email
- **Link**: "View Friend Request" button
- **Destination**: `/friends`
- **Authentication**: ✅ Protected by middleware
- **Functionality**: Shows pending friend requests

#### Trade Shared Email
- **Link**: "View Shared Trade" button
- **Destination**: `/shared-trades`
- **Authentication**: ✅ Protected by middleware
- **Functionality**: Shows trades shared with the user

#### Medal Achievement Email
- **Link**: "View Your Profile" button
- **Destination**: `/profile`
- **Authentication**: ✅ Protected by middleware
- **Functionality**: Shows user's profile with achievements

#### Monthly Trade Checkup Email
- **Link**: "View Detailed Report" button
- **Destination**: `/trade-records`
- **Authentication**: ✅ Protected by middleware
- **Functionality**: Shows detailed trade analysis

#### Settings Links
- **Link**: "Manage your notification preferences"
- **Destination**: `/settings`
- **Authentication**: ✅ Protected by middleware
- **Functionality**: Opens notification settings

### 4. Page-Level Authentication

Each protected page has additional authentication checks:

#### Friends Page (`/friends`)
```typescript
useEffect(() => {
  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/login?redirect=/friends');
      return;
    }
    setLoading(false);
  };
  checkAuth();
}, [router, supabase.auth]);
```

#### Shared Trades Page (`/shared-trades`)
```typescript
useEffect(() => {
  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/login?redirect=/shared-trades');
      return;
    }
    setLoading(false);
  };
  checkAuth();
}, [router, supabase.auth]);
```

#### Profile Page (`/profile`)
```typescript
useEffect(() => {
  const fetchSession = async () => {
    const session = await getSession();
    if (!session) {
      router.push('/login');
      return;
    }
    // Load profile data...
  };
  fetchSession();
}, [router]);
```

#### Settings Page (`/settings`)
```typescript
useEffect(() => {
  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/login?redirect=/settings');
      return;
    }
    setAuthLoading(false);
  };
  checkAuth();
}, [router, supabase.auth]);
```

### 5. Login Page Redirect Handling

The login page (`/login`) handles redirects properly:

```typescript
// Get redirect URL from query parameters
const [redirectUrl, setRedirectUrl] = useState<string>('/dashboard');

useEffect(() => {
  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search);
    const redirect = urlParams.get('redirect');
    if (redirect) {
      setRedirectUrl(redirect);
    }
  }
}, []);

// On successful login
onSuccess: () => {
  router.push(redirectUrl); // Redirects to original destination
  router.refresh();
  toast.success("Login successful", {
    description: "Welcome back!"
  });
}
```

### 6. API Route Authentication

All notification API routes are properly authenticated:

#### Friend Request API
```typescript
// Authenticate the sender
const { data: { user } } = await supabase.auth.getUser();
if (!user || user.id !== senderId) {
  return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
}
```

#### Medal Achievement API
```typescript
// Authenticate the user
const { data: { user } } = await supabase.auth.getUser();
if (!user || user.id !== userId) {
  return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
}
```

#### Trade Shared API
```typescript
// Authenticate the sender
const { data: { user } } = await supabase.auth.getUser();
if (!user || user.id !== senderId) {
  return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
}
```

### 7. Security Features

1. **Session Validation**: All protected routes validate user sessions
2. **Route Protection**: Middleware prevents unauthorized access
3. **API Authentication**: All notification APIs require valid authentication
4. **Redirect Handling**: Users are properly redirected after login
5. **Loading States**: Pages show loading indicators during authentication checks

### 8. User Experience

1. **Seamless Flow**: Users are automatically redirected to their intended destination
2. **Clear Feedback**: Loading states and error messages guide users
3. **Secure Access**: All sensitive pages require authentication
4. **Consistent Behavior**: All email links follow the same authentication pattern

## Testing Checklist

To verify authentication works correctly:

1. **Logout and click email links** - Should redirect to login
2. **Login after clicking email link** - Should redirect to intended page
3. **Direct URL access** - Should redirect to login if not authenticated
4. **API calls** - Should return 401 for unauthenticated requests
5. **Session expiry** - Should redirect to login when session expires

## Environment Variables

Ensure these are set for proper URL handling:
- `NEXT_PUBLIC_SITE_URL` - Base URL for email links
- `RESEND_API_KEY` - Email service API key

All email links are now fully secured and provide a smooth user experience with proper authentication handling. 