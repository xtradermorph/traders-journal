import { NextResponse } from "next/server";
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/types/supabase';

// Force dynamic runtime to prevent static generation
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface AuditResults {
  timestamp: string;
  user_id: string;
  tables: Record<string, { exists: boolean; error?: string }>;
  data_counts: Record<string, number | { error: string }>;
  issues: string[];
  sample_data: {
    user_analyses?: unknown[];
    timeframe_analyses?: Record<string, unknown[]>;
    answers?: Record<string, unknown[]>;
    screenshots?: Record<string, unknown[]>;
    announcements?: Record<string, unknown[]>;
    questions?: unknown[];
  };
}

export async function GET() {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const auditResults: AuditResults = {
      timestamp: new Date().toISOString(),
      user_id: user.id,
      tables: {},
      data_counts: {},
      issues: [],
      sample_data: {}
    };

    // 1. Check if all TDA tables exist and get their structure
    const tablesToCheck = [
      'top_down_analyses',
      'tda_timeframe_analyses', 
      'tda_answers',
      'tda_questions',
      'tda_screenshots',
      'tda_announcements',
      'tda_analysis_history'
    ];

    for (const tableName of tablesToCheck) {
      try {
        // Check if table exists by trying to select from it
        const { error } = await supabase
          .from(tableName as keyof Database['public']['Tables'])
          .select('*')
          .limit(1);

        if (error) {
          auditResults.issues.push(`Table ${tableName} does not exist or is not accessible: ${error.message}`);
          auditResults.tables[tableName] = { exists: false, error: error.message };
        } else {
          auditResults.tables[tableName] = { exists: true };
          
          // Get count of records
          const { count, error: countError } = await supabase
            .from(tableName as keyof Database['public']['Tables'])
            .select('*', { count: 'exact', head: true });

          if (countError) {
            auditResults.data_counts[tableName] = { error: countError.message };
          } else {
            auditResults.data_counts[tableName] = count || 0;
          }
        }
      } catch (err) {
        auditResults.issues.push(`Error checking table ${tableName}: ${err}`);
        auditResults.tables[tableName] = { exists: false, error: String(err) };
      }
    }

    // 2. Get user's analyses
    const { data: userAnalyses, error: analysesError } = await supabase
      .from('top_down_analyses')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (analysesError) {
      auditResults.issues.push(`Error fetching user analyses: ${analysesError.message}`);
    } else {
      auditResults.sample_data.user_analyses = userAnalyses;
      
      // 3. For each analysis, get related data
      if (userAnalyses && userAnalyses.length > 0) {
        for (const analysis of userAnalyses.slice(0, 3)) { // Check first 3 analyses
          const analysisId = analysis.id;
          
          // Get timeframe analyses
          const { data: timeframeAnalyses, error: tfError } = await supabase
            .from('tda_timeframe_analyses')
            .select('*')
            .eq('analysis_id', analysisId);

          if (tfError) {
            auditResults.issues.push(`Error fetching timeframe analyses for ${analysisId}: ${tfError.message}`);
          } else {
            if (!auditResults.sample_data.timeframe_analyses) {
              auditResults.sample_data.timeframe_analyses = {};
            }
            auditResults.sample_data.timeframe_analyses[analysisId] = timeframeAnalyses;
          }

          // Get answers
          const { data: answers, error: answersError } = await supabase
            .from('tda_answers')
            .select('*')
            .eq('analysis_id', analysisId);

          if (answersError) {
            auditResults.issues.push(`Error fetching answers for ${analysisId}: ${answersError.message}`);
          } else {
            if (!auditResults.sample_data.answers) {
              auditResults.sample_data.answers = {};
            }
            auditResults.sample_data.answers[analysisId] = answers;
          }

          // Get screenshots
          const { data: screenshots, error: screenshotsError } = await supabase
            .from('tda_screenshots')
            .select('*')
            .eq('analysis_id', analysisId);

          if (screenshotsError) {
            auditResults.issues.push(`Error fetching screenshots for ${analysisId}: ${screenshotsError.message}`);
          } else {
            if (!auditResults.sample_data.screenshots) {
              auditResults.sample_data.screenshots = {};
            }
            auditResults.sample_data.screenshots[analysisId] = screenshots;
          }

          // Get announcements
          const { data: announcements, error: announcementsError } = await supabase
            .from('tda_announcements')
            .select('*')
            .eq('analysis_id', analysisId);

          if (announcementsError) {
            auditResults.issues.push(`Error fetching announcements for ${analysisId}: ${announcementsError.message}`);
          } else {
            if (!auditResults.sample_data.announcements) {
              auditResults.sample_data.announcements = {};
            }
            auditResults.sample_data.announcements[analysisId] = announcements;
          }
        }
      }
    }

    // 4. Get questions
    const { data: questions, error: questionsError } = await supabase
      .from('tda_questions')
      .select('*')
      .eq('is_active', true)
      .order('timeframe, order_index');

    if (questionsError) {
      auditResults.issues.push(`Error fetching questions: ${questionsError.message}`);
    } else {
      auditResults.sample_data.questions = questions;
    }

    // 5. Check for data consistency issues
    if (userAnalyses) {
      for (const analysis of userAnalyses) {
        if (analysis.status === 'COMPLETED') {
          // Check if completed analyses have all required data
          const hasTimeframeAnalyses = (auditResults.sample_data.timeframe_analyses?.[analysis.id]?.length || 0) > 0;
          const hasAnswers = (auditResults.sample_data.answers?.[analysis.id]?.length || 0) > 0;
          
          if (!hasTimeframeAnalyses) {
            auditResults.issues.push(`Completed analysis ${analysis.id} has no timeframe analyses`);
          }
          if (!hasAnswers) {
            auditResults.issues.push(`Completed analysis ${analysis.id} has no answers`);
          }
        }
      }
    }

    return NextResponse.json(auditResults);

  } catch (error) {
    console.error('TDA Database Audit error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 