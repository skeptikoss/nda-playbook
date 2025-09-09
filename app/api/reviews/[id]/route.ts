import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Force recompilation - development mode support added

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const reviewId = params.id;

    if (!reviewId) {
      return NextResponse.json(
        { error: 'Review ID is required' },
        { status: 400 }
      );
    }

    // Fetch review with analysis results (with development mode support)
    let review: any;
    
    if (reviewId.startsWith('dev-')) {
      // Development mode: return mock review and analysis data
      console.log('Development mode detected in reviews API - returning mock data for:', reviewId);
      
      review = {
        id: reviewId,
        client_name: 'Test Client',
        nda_title: 'Test NDA',
        file_path: `dev-mode/${reviewId}.txt`,
        original_text: 'Mock NDA text for development testing',
        party_perspective: 'receiving',
        status: 'completed',
        overall_score: 73,
        created_at: new Date().toISOString(),
        clause_analyses: [
          {
            id: `${reviewId}-analysis-1`,
            clause_id: 1,
            detected_text: 'All proprietary information, technical data, trade secrets...',
            match_type: 'fallback',
            confidence_score: 0.85,
            risk_level: 3,
            recommended_action: 'Consider narrowing scope for receiving party protection',
            suggested_text: 'Only information specifically marked as confidential',
            clauses: { id: 1, name: 'Definition of Confidential Information', category: 'definition' }
          },
          {
            id: `${reviewId}-analysis-2`,
            clause_id: 2,
            detected_text: 'period of five (5) years',
            match_type: 'not_acceptable',
            confidence_score: 0.92,
            risk_level: 5,
            recommended_action: 'Reduce duration for receiving party advantage',
            suggested_text: 'period of three (3) years',
            clauses: { id: 2, name: 'Duration of Confidentiality Obligations', category: 'duration' }
          },
          {
            id: `${reviewId}-analysis-3`,
            clause_id: 3,
            detected_text: null,
            match_type: 'missing',
            confidence_score: 1.0,
            risk_level: 4,
            recommended_action: 'Add governing law clause',
            suggested_text: 'This Agreement shall be governed by Singapore law',
            clauses: { id: 3, name: 'Governing Law and Jurisdictions', category: 'governing_law' }
          }
        ]
      };
    } else {
      // Production mode: fetch from database
      const { data: dbReview, error: reviewError } = await supabase
        .from('reviews')
        .select(`
          *,
          clause_analyses(
            *,
            clauses(id, name, category)
          )
        `)
        .eq('id', reviewId)
        .single();

      if (reviewError || !dbReview) {
        return NextResponse.json(
          { error: 'Review not found', details: reviewError?.message },
          { status: 404 }
        );
      }
      
      review = dbReview;
    }

    // Organize analysis results by clause and match type
    const analysisByClause: Record<string, any> = {};
    const missingClauses: any[] = [];

    for (const analysis of review.clause_analyses || []) {
      if (analysis.match_type === 'missing') {
        missingClauses.push(analysis);
      } else if (analysis.clauses) {
        const clauseName = analysis.clauses.name;
        if (!analysisByClause[clauseName]) {
          analysisByClause[clauseName] = {
            clause: analysis.clauses,
            analyses: {}
          };
        }
        analysisByClause[clauseName].analyses[analysis.match_type] = analysis;
      }
    }

    // Calculate matrix view data (3×4 grid)
    const matrixData = Object.values(analysisByClause).map((clauseData: any) => ({
      clauseId: clauseData.clause.id,
      clauseName: clauseData.clause.name,
      startingPosition: clauseData.analyses.starting_position || null,
      fallback: clauseData.analyses.fallback || null,
      notAcceptable: clauseData.analyses.not_acceptable || null,
      missing: false
    }));

    // Add missing clauses to matrix
    const existingClauseNames = new Set(matrixData.map(item => item.clauseName));
    for (const missing of missingClauses) {
      // Extract clause name from recommended action or use generic name
      const clauseName = missing.recommended_action?.includes('Definition') ? 'Definition of Confidential Information' :
                         missing.recommended_action?.includes('Duration') ? 'Duration of Confidentiality Obligations' :
                         missing.recommended_action?.includes('Governing') ? 'Governing Law and Jurisdictions' :
                         'Unknown Clause';
      
      if (!existingClauseNames.has(clauseName)) {
        matrixData.push({
          clauseId: null,
          clauseName,
          startingPosition: null,
          fallback: null,
          notAcceptable: null,
          missing: true
        });
      }
    }

    // Calculate summary statistics
    const totalAnalyses = review.clause_analyses?.length || 0;
    const notAcceptableCount = review.clause_analyses?.filter((a: any) => a.match_type === 'not_acceptable').length || 0;
    const missingCount = missingClauses.length;
    const avgConfidence = totalAnalyses > 0 
      ? review.clause_analyses.reduce((sum: number, a: any) => sum + (a.confidence_score || 0), 0) / totalAnalyses
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        review: {
          id: review.id,
          clientName: review.client_name,
          ndaTitle: review.nda_title,
          partyPerspective: review.party_perspective,
          status: review.status,
          overallScore: review.overall_score,
          originalText: review.original_text,
          createdAt: review.created_at,
          updatedAt: review.updated_at
        },
        matrix: matrixData,
        summary: {
          totalAnalyses,
          notAcceptableCount,
          missingCount,
          avgConfidence: Math.round(avgConfidence * 100) / 100,
          riskLevel: notAcceptableCount > 0 ? 'high' : 
                    missingCount > 0 ? 'medium' : 'low'
        },
        analyses: review.clause_analyses || []
      }
    });

  } catch (error) {
    console.error('Reviews API error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const reviewId = params.id;
    const body = await request.json();
    const { analysisId, editedSuggestion, userOverrideType, userFeedback } = body;

    if (!analysisId) {
      return NextResponse.json(
        { error: 'Analysis ID is required' },
        { status: 400 }
      );
    }

    // Update the specific analysis with user edits
    const { data, error } = await supabase
      .from('clause_analyses')
      .update({
        edited_suggestion: editedSuggestion,
        user_override_type: userOverrideType,
        user_feedback: userFeedback
      })
      .eq('id', analysisId)
      .eq('review_id', reviewId)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Failed to update analysis', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        analysisId,
        updatedAt: new Date().toISOString(),
        changes: {
          editedSuggestion,
          userOverrideType,
          userFeedback
        }
      }
    });

  } catch (error) {
    console.error('Reviews PATCH API error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}