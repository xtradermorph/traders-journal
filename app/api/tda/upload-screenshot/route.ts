import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get auth session
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const analysisId = formData.get('analysisId') as string;
    const timeframe = formData.get('timeframe') as string;
    
    if (!file || !analysisId || !timeframe) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify the user owns this analysis
    const { data: analysis, error: fetchError } = await supabase
      .from('top_down_analyses')
      .select('user_id')
      .eq('id', analysisId)
      .single();

    if (fetchError || !analysis) {
      return NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
    }

    if (analysis.user_id !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/heic'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: 'Invalid file type. Only JPG, JPEG, PNG, and HEIC files are allowed.' 
      }, { status: 400 });
    }

    // Validate file size (3MB = 3 * 1024 * 1024 bytes)
    const maxSize = 3 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: 'File too large. Maximum size is 3MB.' 
      }, { status: 400 });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop();
    const fileName = `${analysisId}-${timeframe}-${timestamp}.${fileExtension}`;

    // Upload file to Supabase storage
    const { error: uploadError } = await supabase.storage
      .from('tda-screenshots')
      .upload(fileName, file, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Error uploading file:', uploadError);
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('tda-screenshots')
      .getPublicUrl(fileName);

    // Save screenshot record to database
    const { data: screenshotRecord, error: dbError } = await supabase
      .from('tda_screenshots')
      .insert({
        analysis_id: analysisId,
        timeframe: timeframe,
        file_url: publicUrl,
        file_name: file.name,
        file_size: file.size
      })
      .select()
      .single();

    if (dbError) {
      console.error('Error saving screenshot record:', dbError);
      // Try to delete the uploaded file if database save fails
      await supabase.storage
        .from('tda-screenshots')
        .remove([fileName]);
      
      return NextResponse.json({ error: 'Failed to save screenshot record' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      screenshot: screenshotRecord,
      message: 'Screenshot uploaded successfully' 
    });

  } catch (error) {
    console.error('Error uploading screenshot:', error);
    return NextResponse.json({ 
      error: 'Failed to upload screenshot' 
    }, { status: 500 });
  }
} 