import { supabase } from './supabase';

// TDA Cleanup Functions
export const cleanupTDAAnnouncements = async (analysisId: string) => {
  try {
    const { error } = await supabase
      .from('tda_announcements')
      .delete()
      .eq('analysis_id', analysisId);
    
    if (error) {
      console.error('Error cleaning up TDA announcements:', error);
      throw error;
    }
    
    console.log(`Cleaned up TDA announcements for analysis: ${analysisId}`);
  } catch (error) {
    console.error('Failed to cleanup TDA announcements:', error);
    throw error;
  }
};

export const cleanupTDAScreenshots = async (analysisId: string) => {
  try {
    // First get all screenshot records to delete files from storage
    const { data: screenshots, error: fetchError } = await supabase
      .from('tda_screenshots')
      .select('file_url, file_name')
      .eq('analysis_id', analysisId);
    
    if (fetchError) {
      console.error('Error fetching TDA screenshots for cleanup:', fetchError);
      throw fetchError;
    }
    
    // Delete files from storage
    if (screenshots && screenshots.length > 0) {
      const filePaths = screenshots.map(screenshot => {
        // Extract file path from URL
        const urlParts = screenshot.file_url.split('/');
        return urlParts.slice(-2).join('/'); // Get bucket/filename
      });
      
      const { error: storageError } = await supabase.storage
        .from('tda-screenshots')
        .remove(filePaths);
      
      if (storageError) {
        console.error('Error deleting TDA screenshot files from storage:', storageError);
        // Continue with database cleanup even if storage cleanup fails
      }
    }
    
    // Delete database records
    const { error: deleteError } = await supabase
      .from('tda_screenshots')
      .delete()
      .eq('analysis_id', analysisId);
    
    if (deleteError) {
      console.error('Error cleaning up TDA screenshot records:', deleteError);
      throw deleteError;
    }
    
    console.log(`Cleaned up TDA screenshots for analysis: ${analysisId}`);
  } catch (error) {
    console.error('Failed to cleanup TDA screenshots:', error);
    throw error;
  }
};

export const cleanupTDAAnswers = async (analysisId: string) => {
  try {
    const { error } = await supabase
      .from('tda_answers')
      .delete()
      .eq('analysis_id', analysisId);
    
    if (error) {
      console.error('Error cleaning up TDA answers:', error);
      throw error;
    }
    
    console.log(`Cleaned up TDA answers for analysis: ${analysisId}`);
  } catch (error) {
    console.error('Failed to cleanup TDA answers:', error);
    throw error;
  }
};

export const cleanupTDATimeframeAnalyses = async (analysisId: string) => {
  try {
    const { error } = await supabase
      .from('tda_timeframe_analyses')
      .delete()
      .eq('analysis_id', analysisId);
    
    if (error) {
      console.error('Error cleaning up TDA timeframe analyses:', error);
      throw error;
    }
    
    console.log(`Cleaned up TDA timeframe analyses for analysis: ${analysisId}`);
  } catch (error) {
    console.error('Failed to cleanup TDA timeframe analyses:', error);
    throw error;
  }
};

export const cleanupCompleteTDA = async (analysisId: string) => {
  try {
    console.log(`Starting complete TDA cleanup for analysis: ${analysisId}`);
    
    // Clean up all related data in parallel
    await Promise.all([
      cleanupTDAAnnouncements(analysisId),
      cleanupTDAScreenshots(analysisId),
      cleanupTDAAnswers(analysisId),
      cleanupTDATimeframeAnalyses(analysisId)
    ]);
    
    // Finally delete the main analysis record
    const { error } = await supabase
      .from('top_down_analyses')
      .delete()
      .eq('id', analysisId);
    
    if (error) {
      console.error('Error deleting TDA analysis record:', error);
      throw error;
    }
    
    console.log(`Complete TDA cleanup finished for analysis: ${analysisId}`);
  } catch (error) {
    console.error('Failed to cleanup complete TDA:', error);
    throw error;
  }
};

export const cleanupUserTDA = async (userId: string) => {
  try {
    console.log(`Starting TDA cleanup for user: ${userId}`);
    
    // Get all TDA analyses for the user
    const { data: analyses, error: fetchError } = await supabase
      .from('top_down_analyses')
      .select('id')
      .eq('user_id', userId);
    
    if (fetchError) {
      console.error('Error fetching user TDA analyses:', fetchError);
      throw fetchError;
    }
    
    if (analyses && analyses.length > 0) {
      // Clean up each analysis
      await Promise.all(
        analyses.map(analysis => cleanupCompleteTDA(analysis.id))
      );
    }
    
    console.log(`TDA cleanup completed for user: ${userId}`);
  } catch (error) {
    console.error('Failed to cleanup user TDA:', error);
    throw error;
  }
}; 