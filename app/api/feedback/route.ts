// app/api/feedback/route.ts
// API endpoint for collecting user feedback on ML analysis results

import { NextRequest, NextResponse } from 'next/server';
import { mlConfidenceScoring, type MLFeatures } from '@/lib/services/mlConfidenceScoring';
import { supabaseAdmin } from '@/lib/supabase';
import type { PartyPerspective } from '@/types';

interface FeedbackRequest {
  ruleId: string;
  clauseId: string;
  reviewId: string;
  documentId: string;
  action: 'accepted' | 'rejected' | 'modified';
  comment?: string;
  suggestion?: string;
  confidenceRating?: number;
  
  // Analysis context
  detectedText: string;
  confidenceAtPrediction: number;
  detectionMethod: 'semantic' | 'keyword' | 'hierarchical' | 'hybrid';
  mlConfidence?: number;
  partyPerspective: PartyPerspective;
  
  // ML features (extracted from analysis)
  features: MLFeatures;
  
  // User context
  userExperienceLevel?: 'beginner' | 'intermediate' | 'expert';
  documentType?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: FeedbackRequest = await request.json();
    
    // Validate required fields
    if (!body.ruleId || !body.action || !body.confidenceAtPrediction) {
      return NextResponse.json(
        { error: 'Missing required fields: ruleId, action, confidenceAtPrediction' },
        { status: 400 }
      );
    }
    
    // Store feedback in database
    const { data: feedbackRecord, error: feedbackError } = await supabaseAdmin
      .from('user_feedback')
      .insert({
        document_id: body.documentId || crypto.randomUUID(),
        clause_id: body.clauseId,
        predicted_rule_id: body.ruleId,
        user_action: body.action,
        user_correction: body.suggestion || body.comment,
        confidence_at_prediction: body.confidenceAtPrediction,
        detection_method: body.detectionMethod,
        processing_time_ms: 0, // Would be passed from frontend
        session_id: `feedback-${Date.now()}`,
        user_feedback: JSON.stringify({
          comment: body.comment,
          suggestion: body.suggestion,
          confidence_rating: body.confidenceRating,
          ml_confidence: body.mlConfidence,
          user_experience_level: body.userExperienceLevel || 'intermediate'
        })
      })
      .select('id')
      .single();
      
    if (feedbackError) {
      console.error('Database error storing feedback:', feedbackError);
      return NextResponse.json(
        { error: 'Failed to store feedback' },
        { status: 500 }
      );
    }
    
    // Record training data for ML system
    try {
      await mlConfidenceScoring.recordTrainingData(
        body.ruleId,
        body.features,
        body.action,
        body.confidenceAtPrediction,
        {
          partyPerspective: body.partyPerspective,
          documentType: body.documentType || 'nda',
          userExperienceLevel: body.userExperienceLevel || 'intermediate'
        }
      );
    } catch (mlError) {
      console.error('ML training data recording failed:', mlError);
      // Don't fail the request if ML recording fails
    }
    
    // Update rule performance metrics immediately for high-impact feedback
    if (body.action === 'rejected' || (body.confidenceRating && body.confidenceRating <= 2)) {
      try {
        await updateRulePerformanceImmediate(body.ruleId, body.action, body.confidenceAtPrediction);
      } catch (perfError) {
        console.error('Rule performance update failed:', perfError);
      }
    }
    
    // Create audit trail
    await supabaseAdmin
      .from('audit_trail')
      .insert({
        event_type: 'user_feedback',
        document_id: body.documentId,
        clause_id: body.clauseId,
        rule_id: body.ruleId,
        action: body.action,
        details: {
          feedback_type: body.action,
          confidence_at_prediction: body.confidenceAtPrediction,
          user_rating: body.confidenceRating,
          detection_method: body.detectionMethod,
          has_comment: !!body.comment,
          has_suggestion: !!body.suggestion
        },
        confidence_score: body.confidenceAtPrediction,
        processing_time_ms: 0
      });
    
    // Return success response
    return NextResponse.json({
      success: true,
      feedbackId: feedbackRecord.id,
      message: 'Feedback recorded successfully',
      learningQueued: true,
      metadata: {
        action: body.action,
        confidenceImprovement: await calculateConfidenceImprovement(body.ruleId),
        nextSteps: getNextStepsForFeedback(body.action)
      }
    });
    
  } catch (error) {
    console.error('Feedback API error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ruleId = searchParams.get('ruleId');
    const timeframe = searchParams.get('timeframe') || '7d';
    
    if (!ruleId) {
      return NextResponse.json(
        { error: 'ruleId parameter required' },
        { status: 400 }
      );
    }
    
    // Calculate timeframe date
    const days = timeframe === '30d' ? 30 : timeframe === '7d' ? 7 : 1;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    
    // Get feedback analytics for this rule
    const { data: feedback, error } = await supabaseAdmin
      .from('user_feedback')
      .select('user_action, confidence_at_prediction, created_at, user_feedback')
      .eq('predicted_rule_id', ruleId)
      .gte('created_at', since)
      .order('created_at', { ascending: false });
      
    if (error) {
      return NextResponse.json({ error: 'Failed to fetch feedback' }, { status: 500 });
    }
    
    // Calculate analytics
    const totalFeedback = feedback?.length || 0;
    const acceptedCount = feedback?.filter(f => f.user_action === 'accepted').length || 0;
    const rejectedCount = feedback?.filter(f => f.user_action === 'rejected').length || 0;
    const modifiedCount = feedback?.filter(f => f.user_action === 'modified').length || 0;
    
    const avgConfidence = totalFeedback > 0 
      ? feedback.reduce((sum, f) => sum + (f.confidence_at_prediction || 0), 0) / totalFeedback
      : 0;
    
    const recentTrend = calculateTrend(feedback || []);
    
    return NextResponse.json({
      success: true,
      ruleId,
      timeframe,
      analytics: {
        totalFeedback,
        acceptanceRate: totalFeedback > 0 ? acceptedCount / totalFeedback : 0,
        rejectionRate: totalFeedback > 0 ? rejectedCount / totalFeedback : 0,
        modificationRate: totalFeedback > 0 ? modifiedCount / totalFeedback : 0,
        averageConfidence: avgConfidence,
        trend: recentTrend,
        breakdown: {
          accepted: acceptedCount,
          rejected: rejectedCount,
          modified: modifiedCount
        }
      },
      recentFeedback: feedback?.slice(0, 10).map(f => ({
        action: f.user_action,
        confidence: f.confidence_at_prediction,
        created_at: f.created_at,
        hasComment: !!(f.user_feedback && JSON.parse(f.user_feedback).comment)
      }))
    });
    
  } catch (error) {
    console.error('Feedback analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch feedback analytics' },
      { status: 500 }
    );
  }
}

// Helper functions

async function updateRulePerformanceImmediate(
  ruleId: string, 
  action: 'accepted' | 'rejected' | 'modified',
  confidence: number
): Promise<void> {
  const { data: current } = await supabaseAdmin
    .from('rule_performance')
    .select('*')
    .eq('rule_id', ruleId)
    .single();
  
  let updates = current || {
    rule_id: ruleId,
    true_positives: 0,
    false_positives: 0,
    true_negatives: 0,
    false_negatives: 0,
    calculation_sample_size: 0
  };
  
  // Update metrics based on feedback
  if (action === 'accepted') {
    updates.true_positives++;
  } else if (action === 'rejected') {
    if (confidence > 0.5) {
      updates.false_positives++;
    } else {
      updates.true_negatives++;
    }
  } else { // modified
    updates.false_positives++; // Treat as false positive
  }
  
  updates.calculation_sample_size++;
  
  await supabaseAdmin
    .from('rule_performance')
    .upsert(updates);
}

async function calculateConfidenceImprovement(ruleId: string): Promise<number> {
  try {
    const { data: recent } = await supabaseAdmin
      .from('user_feedback')
      .select('user_action, confidence_at_prediction')
      .eq('predicted_rule_id', ruleId)
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(10);
      
    if (!recent || recent.length < 5) return 0;
    
    const recentAccuracy = recent.filter(r => r.user_action === 'accepted').length / recent.length;
    return recentAccuracy - 0.7; // Compare to baseline of 70%
  } catch {
    return 0;
  }
}

function getNextStepsForFeedback(action: 'accepted' | 'rejected' | 'modified'): string[] {
  switch (action) {
    case 'accepted':
      return [
        'Confidence score will be increased for similar patterns',
        'This pattern will be reinforced in the ML model'
      ];
    case 'rejected':
      return [
        'Rule will be reviewed for accuracy',
        'Similar patterns will be flagged for manual review',
        'ML model will be updated to avoid this error'
      ];
    case 'modified':
      return [
        'Suggested improvements will be incorporated',
        'Rule confidence will be adjusted',
        'Pattern recognition will be refined'
      ];
    default:
      return [];
  }
}

function calculateTrend(feedback: any[]): 'improving' | 'declining' | 'stable' {
  if (feedback.length < 10) return 'stable';
  
  const recent = feedback.slice(0, 5);
  const older = feedback.slice(5, 10);
  
  const recentAccuracy = recent.filter(f => f.user_action === 'accepted').length / recent.length;
  const olderAccuracy = older.filter(f => f.user_action === 'accepted').length / older.length;
  
  const difference = recentAccuracy - olderAccuracy;
  
  if (difference > 0.1) return 'improving';
  if (difference < -0.1) return 'declining';
  return 'stable';
}