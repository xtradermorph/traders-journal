# Supabase Data Cleanup Guide

## Overview

This document outlines the comprehensive data cleanup system implemented for the Trader's Journal app to ensure proper removal of all user data and related assets when users delete their accounts or trade setups.

## Current Supabase Setup

### ✅ **What's Already Implemented:**

1. **Database Tables**: All necessary tables exist for social features:
   - `trade_setups` - Main trade setup data
   - `trade_setup_comments` - Comments on setups
   - `trade_setup_likes` - Likes on setups
   - `trade_setup_tags` - Tags for setups
   - `profiles` - User profiles
   - `user_presence` - Online status
   - `messages` - Direct messages
   - `friend_requests` - Friend requests
   - `trader_friends` - Friend relationships
   - `user_blocks` - User blocking
   - `support_requests` - Support tickets
   - `trades` - Individual trades

2. **Storage Buckets**: Proper storage buckets exist:
   - `setup-images` - For trade setup chart images
   - `trade-setup-images` - Alternative bucket for setup images
   - `trade-images` - For trade images
   - `avatars` - For user avatars
   - `shared-assets` - For shared assets

3. **RLS Policies**: All tables have proper Row Level Security policies

## Data Cleanup System

### 1. User Account Deletion

When a user deletes their account, the following cleanup occurs:

**Database Cleanup:**
- All messages (sent and received)
- All friend requests (sent and received)
- All friend relationships
- All user blocks
- All trade setup likes by the user
- All trade setup comments by the user
- All trade setups by the user (and their related data)
- All individual trades by the user
- All support requests by the user
- User presence data
- User settings
- User profile

**Storage Cleanup:**
- User's avatar image
- All chart images for user's trade setups
- All setup images in both `setup-images` and `trade-setup-images` buckets

**API Endpoint:** `/api/auth/delete-account`

### 2. Trade Setup Deletion

When a user deletes a trade setup, the following cleanup occurs:

**Database Cleanup:**
- All comments on the trade setup
- All likes on the trade setup
- All tags for the trade setup
- The trade setup itself

**Storage Cleanup:**
- Chart image for the trade setup
- All setup images in both `setup-images` and `trade-setup-images` buckets

**API Endpoint:** `/api/social/trade-setup/delete`

### 3. Automatic Cleanup Functions

**Database Functions:**
- `cleanup_user_data(user_id_param UUID)` - Comprehensive user data cleanup
- `cleanup_trade_setup(setup_id_param UUID)` - Trade setup cleanup
- `handle_deleted_user()` - Trigger function for auth user deletion

**Storage Functions:**
- `cleanupTradeSetupStorage(setupId, chartImageUrl)` - Setup image cleanup
- `cleanupAvatarStorage(avatarUrl)` - Avatar cleanup
- `cleanupOrphanedStorage()` - Cleanup orphaned files

## Implementation Files

### 1. Database Cleanup Procedures
**File:** `supabase/migrations/20250603_cleanup_procedures.sql`
- Contains all database cleanup functions and triggers
- Handles cascading deletes for related data

### 2. Application Cleanup Functions
**File:** `app/lib/database-cleanup.ts`
- Comprehensive cleanup functions with storage handling
- Error handling and logging
- Orphaned file cleanup utilities

### 3. API Endpoints
**Files:** 
- `app/api/auth/delete-account/route.ts` - Account deletion
- `app/api/social/trade-setup/delete/route.ts` - Trade setup deletion

### 4. Frontend Integration
**File:** `app/src/components/SocialForumContent.tsx`
- Updated to use proper deletion API with storage cleanup

## Required Database Changes

### CASCADE DELETE Constraints

Run the SQL commands in `add_cascade_delete_constraints.sql` in your Supabase SQL editor to add proper foreign key constraints with CASCADE DELETE:

```sql
-- This ensures automatic cleanup when parent records are deleted
ALTER TABLE trade_setup_comments 
ADD CONSTRAINT trade_setup_comments_trade_setup_id_fkey 
FOREIGN KEY (trade_setup_id) REFERENCES trade_setups(id) ON DELETE CASCADE;
```

## Storage Bucket Configuration

Ensure your Supabase storage buckets have the following policies:

### setup-images bucket
```sql
-- Allow authenticated users to upload setup images
CREATE POLICY "Allow authenticated uploads" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'setup-images' AND auth.role() = 'authenticated');

-- Allow users to delete their own setup images
CREATE POLICY "Allow users to delete own setup images" ON storage.objects
FOR DELETE USING (bucket_id = 'setup-images' AND auth.uid()::text = (storage.foldername(name))[1]);
```

### avatars bucket
```sql
-- Allow authenticated users to upload avatars
CREATE POLICY "Allow authenticated avatar uploads" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');

-- Allow users to delete their own avatars
CREATE POLICY "Allow users to delete own avatars" ON storage.objects
FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
```

## Testing the Cleanup System

### 1. Test User Account Deletion
1. Create a test user account
2. Upload an avatar
3. Create trade setups with images
4. Add comments and likes
5. Delete the account
6. Verify all data and storage files are removed

### 2. Test Trade Setup Deletion
1. Create a trade setup with images
2. Add comments and likes
3. Delete the trade setup
4. Verify all related data and storage files are removed

### 3. Test Orphaned File Cleanup
1. Manually upload files to storage buckets
2. Run `cleanupOrphanedStorage()` function
3. Verify orphaned files are removed

## Monitoring and Maintenance

### 1. Regular Cleanup Jobs
Consider setting up periodic jobs to:
- Clean up orphaned storage files
- Remove soft-deleted records
- Archive old audit logs

### 2. Monitoring
Monitor the following:
- Storage bucket sizes
- Database table sizes
- Cleanup function execution logs
- Error rates in cleanup operations

## Security Considerations

1. **Service Role Key**: Cleanup functions use service role key for admin operations
2. **Authorization**: All deletion operations verify user ownership
3. **Audit Logging**: Consider implementing audit logs for all deletion operations
4. **Backup Strategy**: Ensure proper backups before running bulk cleanup operations

## Troubleshooting

### Common Issues

1. **Storage Files Not Deleted**
   - Check bucket permissions
   - Verify file paths are correct
   - Ensure service role key has storage access

2. **Database Constraints Errors**
   - Run the CASCADE DELETE constraints script
   - Check for existing foreign key constraints
   - Verify table relationships

3. **Permission Denied Errors**
   - Verify RLS policies
   - Check user authentication
   - Ensure proper role assignments

### Debug Commands

```sql
-- Check foreign key constraints
SELECT * FROM information_schema.referential_constraints 
WHERE constraint_schema = 'public';

-- Check storage bucket contents
SELECT * FROM storage.objects WHERE bucket_id = 'setup-images';

-- Check orphaned files
SELECT * FROM storage.objects 
WHERE bucket_id = 'setup-images' 
AND name NOT IN (SELECT chart_image_url FROM trade_setups WHERE chart_image_url IS NOT NULL);
```

## Conclusion

This comprehensive cleanup system ensures that when users delete their accounts or trade setups, all related data and storage files are properly removed, maintaining data integrity and preventing storage bloat. The system is designed to be robust, secure, and maintainable. 