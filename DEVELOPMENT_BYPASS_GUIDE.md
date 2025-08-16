# Development Bypass Guide

## Overview

This guide explains how the Turnstile verification bypass works in development mode to make local development easier.

## How It Works

### 1. **Development Mode Detection**

The app automatically detects development mode using multiple indicators:

- `NODE_ENV === 'development'`
- `NEXT_PUBLIC_VERCEL_ENV === 'development'` or `'preview'`
- `NEXT_PUBLIC_APP_ENV === 'development'`
- Hostname is `localhost`, `127.0.0.1`, or `0.0.0.0`

### 2. **Turnstile Bypass Logic**

When in development mode:
- ✅ Turnstile widget is **not displayed**
- ✅ Turnstile token is **not required** for login/register
- ✅ API routes **skip** captcha verification
- ✅ Clear visual indicator shows "Development Mode Active"

### 3. **Production Safety**

In production:
- ✅ Turnstile widget is **always displayed**
- ✅ Turnstile token is **required** for authentication
- ✅ API routes **enforce** captcha verification
- ✅ No development indicators are shown

## Files Modified

### Core Logic
- `app/lib/dev-utils.ts` - Development mode detection utilities
- `app/api/auth/login/route.ts` - Login API with conditional captcha
- `app/api/auth/register/route.ts` - Register API with conditional captcha

### UI Components
- `app/src/components/auth/Login.tsx` - Login form with development indicator
- `app/src/pages/Register.tsx` - Register form with development indicator

## Usage

### For Developers

1. **Start your development server:**
   ```bash
   npm run dev
   ```

2. **You'll see a blue development indicator** on login/register pages:
   ```
   🟦 Development Mode Active
   ✅ Turnstile verification bypassed for easier development
   🔧 You can now login without completing the security check
   ```

3. **Login/Register normally** - no Turnstile verification required

### For Production

1. **Deploy to production** - Turnstile will automatically be enabled
2. **No development indicators** will be shown
3. **Full security** with Turnstile verification required

## Debugging

### Check Development Status

Open browser console to see detailed logs:

```javascript
// Development mode check
🔧 Development Mode Check: {
  isDev: true,
  nodeEnv: "development",
  vercelEnv: undefined,
  appEnv: undefined,
  hostname: "localhost"
}

// Turnstile status
🛡️ Turnstile Status: {
  shouldEnable: false,
  isDev: true,
  hasTurnstileKey: true,
  turnstileKey: "Configured"
}
```

### Force Production Mode (for testing)

To test production behavior locally:

1. **Set environment variable:**
   ```bash
   export NODE_ENV=production
   ```

2. **Or modify the detection logic** in `app/lib/dev-utils.ts`

## Security Notes

- ✅ **Production is always secure** - Turnstile is enforced
- ✅ **Development bypass is safe** - Only affects local development
- ✅ **No security vulnerabilities** - Bypass only works in development
- ✅ **Environment detection is robust** - Multiple fallback checks

## Troubleshooting

### Turnstile Still Required in Development

1. **Check console logs** for development mode status
2. **Verify hostname** is `localhost` or `127.0.0.1`
3. **Check environment variables** are set correctly
4. **Clear browser cache** and restart dev server

### Development Indicator Not Showing

1. **Check browser console** for any errors
2. **Verify the component** is importing `dev-utils.ts` correctly
3. **Check if development mode** is being detected properly

### API Routes Still Requiring Captcha

1. **Verify API routes** are using the updated logic
2. **Check that `turnstileToken`** is not being passed when undefined
3. **Restart the development server** to pick up changes

## Environment Variables

### Required for Production
```env
NEXT_PUBLIC_TURNSTILE_SITE_KEY=your_turnstile_site_key
TURNSTILE_SECRET_KEY=your_turnstile_secret_key
```

### Optional for Development
```env
NODE_ENV=development  # Usually set automatically
NEXT_PUBLIC_APP_ENV=development  # Custom environment flag
```

## Summary

This development bypass system provides:
- 🚀 **Faster development** - No need to complete captcha every time
- 🔒 **Production security** - Full Turnstile protection in production
- 🎯 **Clear indicators** - Visual feedback about development mode
- 🛠️ **Easy debugging** - Console logs for troubleshooting
- 🔄 **Automatic detection** - No manual configuration needed

