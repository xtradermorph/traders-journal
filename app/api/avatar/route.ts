import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import sharp from 'sharp';

export async function POST(request: Request) {
  try {
    // Get the authenticated user from the request
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get the user's current profile to find the old avatar URL
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('avatar_url')
      .eq('id', session.user.id)
      .single();
    
    // Parse the form data from the request
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }
    
    // Validate file size (5MB limit)
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size must be less than 5MB. Your file is ${(file.size / (1024 * 1024)).toFixed(2)}MB` },
        { status: 400 }
      );
    }
    
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Only image files (JPG, JPEG, PNG, GIF, WEBP) are allowed' },
        { status: 400 }
      );
    }
    
    // Create a unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${session.user.id}-${Date.now()}.${fileExt}`;
    
    // Create a Supabase client with the service role key
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://oweimywvzmqoizsyotrt.supabase.co',
      process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im93ZWlteXd2em1xb2l6c3lvdHJ0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTI4NDU3NCwiZXhwIjoyMDY0ODYwNTc0fQ.5sC0t0GshmS2_vy3X-w82jcRCFvvxjILGgb6phOWXwE'
    );
    
    // Convert the file to an ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);
    
    // Resize the image to 200x200 and make it a circle with transparent background
    const resizedBuffer = await sharp(buffer)
      .resize(200, 200, { fit: 'cover' }) // Resize to 200x200 with cover fit
      .toBuffer();
    
    // Use the resized image for upload
    
    // Upload the file to Supabase Storage
    const { data, error: uploadError } = await supabaseAdmin.storage
      .from('avatars')
      .upload(fileName, resizedBuffer, {
        cacheControl: '3600',
        upsert: true,
        contentType: 'image/jpeg' // We're converting to JPEG for consistency
      });
    
    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return NextResponse.json(
        { error: `Failed to upload file: ${uploadError.message}` },
        { status: 500 }
      );
    }
    
    // Get the public URL
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('avatars')
      .getPublicUrl(fileName);
    
    // Delete the old avatar file if it exists
    if (userProfile?.avatar_url) {
      try {
        // Extract the file path from the URL
        const oldAvatarUrl = userProfile.avatar_url;
        console.log('Old avatar URL:', oldAvatarUrl);

        let oldFileName = null;
        try {
          // Try to extract filename from the URL path (works for public and signed URLs)
          const urlObj = new URL(oldAvatarUrl);
          const pathParts = urlObj.pathname.split('/');
          oldFileName = pathParts[pathParts.length - 1];
        } catch (e) {
          // Fallback: try to extract from string if not a valid URL
          const match = oldAvatarUrl.match(/avatars\/([^?&]+)/);
          if (match && match[1]) {
            oldFileName = match[1];
          }
        }

        if (oldFileName && oldFileName !== fileName) {
          // Delete the old file
          const { error: deleteError } = await supabaseAdmin.storage
            .from('avatars')
            .remove([oldFileName]);
          if (deleteError) {
            console.log('Error deleting old avatar:', deleteError);
          } else {
            console.log('Successfully deleted old avatar:', oldFileName);
          }
        } else {
          // Fallback: list all files and delete all for this user except the new one
          const { data: files } = await supabaseAdmin.storage.from('avatars').list();
          if (files) {
            const userFiles = files.filter(file =>
              file.name.startsWith(`${session.user.id}-`) &&
              file.name !== fileName
            );
            if (userFiles.length > 0) {
              const filesToDelete = userFiles.map(file => file.name);
              const { error: batchDeleteError } = await supabaseAdmin.storage
                .from('avatars')
                .remove(filesToDelete);
              if (batchDeleteError) {
                console.log('Error batch deleting old avatars:', batchDeleteError);
              } else {
                console.log('Successfully deleted old avatars:', filesToDelete);
              }
            }
          }
        }
      } catch (error) {
        console.log('Error processing old avatar:', error);
        // Continue even if there's an error with the old avatar
      }
    }
    
    // Update the user's profile with the avatar URL
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        avatar_url: publicUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', session.user.id);
    
    if (updateError) {
      console.error('Profile update error:', updateError);
      return NextResponse.json(
        { error: `Failed to update profile: ${updateError.message}` },
        { status: 500 }
      );
    }
    
    // Return the public URL
    return NextResponse.json({ 
      avatarUrl: publicUrl,
      message: 'Avatar uploaded successfully'
    });
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
