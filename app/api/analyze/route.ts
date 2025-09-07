import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { analyzeDocument, formatAnalysisResults } from '@/lib/clause-matcher';
import { generateClauseSuggestion, generateMissingClauseSuggestion } from '@/lib/ai-suggestions';
import type { PartyPerspective } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { reviewId } = body;

    if (!reviewId) {
      return NextResponse.json(
        { error: 'Review ID is required' },
        { status: 400 }
      );
    }

    // Fetch the review record (with development mode support)
    let review: any;
    
    if (reviewId.startsWith('dev-')) {
      // Development mode: return mock analysis results (skip actual analysis)
      console.log('Development mode detected - returning mock analysis results');
      
      const mockAnalysisResults = {
        clauseMatches: [
          {
            clauseId: 1,
            clauseName: 'Definition of Confidential Information',
            matchType: 'fallback',
            confidenceScore: 0.85,
            riskLevel: 3,
            detectedText: 'All proprietary information, technical data, trade secrets...',
            recommendedAction: 'Consider narrowing scope for receiving party protection',
            suggestedText: 'Only information specifically marked as confidential'
          },
          {
            clauseId: 2,
            clauseName: 'Duration of Confidentiality Obligations',
            matchType: 'not_acceptable',
            confidenceScore: 0.92,
            riskLevel: 5,
            detectedText: 'period of five (5) years',
            recommendedAction: 'Reduce duration for receiving party advantage',
            suggestedText: 'period of three (3) years'
          }
        ],
        missingClauses: [
          {
            clauseId: 3,
            clauseName: 'Governing Law and Jurisdictions',
            recommendedAction: 'Add governing law clause',
            suggestedText: 'This Agreement shall be governed by Singapore law'
          }
        ],
        overallScore: 73,
        partyPerspective: 'receiving'
      };
      
      return NextResponse.json({
        success: true,
        data: {
          reviewId,
          analysisResults: mockAnalysisResults,
          metadata: {
            analysisType: 'development_mock',
            partyPerspective: 'receiving'
          }
        }
      });
    } else {
      // Production mode: fetch from database
      const { data: dbReview, error: reviewError } = await supabaseAdmin
        .from('reviews')
        .select('*')
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

    if (!review.original_text) {
      return NextResponse.json(
        { error: 'No document text found for analysis' },
        { status: 400 }
      );
    }

    console.log(`Starting analysis for review ${reviewId} with ${review.party_perspective} perspective`);

    // Update review status to processing
    await supabaseAdmin
      .from('reviews')
      .update({ status: 'processing' })
      .eq('id', reviewId);

    try {
      // Perform party-aware document analysis
      const analysisResults = await analyzeDocument(
        review.original_text, 
        review.party_perspective as PartyPerspective
      );

      console.log(`Analysis found ${analysisResults.matches.length} matches, ${analysisResults.missingClauses.length} missing clauses`);

      // Store analysis results in database
      const analysisRecords = [];

      // Process matches
      for (const match of analysisResults.matches) {
        // Generate AI suggestion for this match (if it's not acceptable or needs improvement)
        let suggestedText = null;
        let recommendedAction = 'Review clause against party perspective requirements';

        if (match.ruleType === 'not_acceptable' || match.confidenceScore < 0.7) {
          const suggestionResult = await generateClauseSuggestion(
            match.matchedText,
            match.ruleId,
            review.party_perspective as PartyPerspective,
            false // Use template for MVP
          );

          if (suggestionResult.success) {
            suggestedText = suggestionResult.data.suggestedText;
            recommendedAction = suggestionResult.data.reasoning;
          } else {
            suggestedText = suggestionResult.fallbackSuggestion || null;
            recommendedAction = 'Consider revising this clause to better align with party interests';
          }
        } else if (match.ruleType === 'starting_position') {
          recommendedAction = 'Clause aligns with preferred position - no changes needed';
        } else if (match.ruleType === 'fallback') {
          recommendedAction = 'Acceptable fallback position - consider if improvements are possible';
        }

        const analysisRecord = {
          review_id: reviewId,
          clause_id: match.clauseId,
          detected_text: match.matchedText,
          match_type: match.ruleType,
          confidence_score: match.confidenceScore,
          risk_level: match.ruleType === 'not_acceptable' ? 5 : 
                     match.ruleType === 'fallback' ? 3 : 1,
          recommended_action: recommendedAction,
          position_start: match.position.start,
          position_end: match.position.end,
          suggested_text: suggestedText
        };

        analysisRecords.push(analysisRecord);
      }

      // Process missing clauses
      for (const missingClause of analysisResults.missingClauses) {
        const suggestionResult = await generateMissingClauseSuggestion(
          missingClause,
          review.party_perspective as PartyPerspective
        );

        let suggestedText = null;
        let recommendedAction = `Consider adding ${missingClause} clause`;

        if (suggestionResult.success) {
          suggestedText = suggestionResult.data.suggestedText;
          recommendedAction = suggestionResult.data.reasoning;
        }

        const analysisRecord = {
          review_id: reviewId,
          clause_id: null, // No clause ID for missing clauses
          detected_text: null,
          match_type: 'missing',
          confidence_score: 1.0, // High confidence that it's missing
          risk_level: 4, // Missing clauses are generally high risk
          recommended_action: recommendedAction,
          suggested_text: suggestedText
        };

        analysisRecords.push(analysisRecord);
      }

      // Insert all analysis records
      const { error: insertError } = await supabaseAdmin
        .from('clause_analyses')
        .insert(analysisRecords);

      if (insertError) {
        console.error('Failed to insert analysis records:', insertError);
        throw new Error(`Database insert failed: ${insertError.message}`);
      }

      // Update review with completion status and overall score
      const { error: updateError } = await supabaseAdmin
        .from('reviews')
        .update({
          status: 'completed',
          overall_score: analysisResults.overallScore
        })
        .eq('id', reviewId);

      if (updateError) {
        console.error('Failed to update review status:', updateError);
      }

      // Format results for response
      const formattedResults = formatAnalysisResults(analysisResults);

      console.log(`Analysis completed for review ${reviewId}`);

      return NextResponse.json({
        success: true,
        data: {
          reviewId,
          analysis: analysisResults,
          summary: formattedResults,
          recordsCreated: analysisRecords.length,
          completedAt: new Date().toISOString()
        }
      });

    } catch (analysisError) {
      console.error('Analysis failed:', analysisError);
      
      // Update review status to error
      await supabaseAdmin
        .from('reviews')
        .update({ 
          status: 'error'
        })
        .eq('id', reviewId);

      throw analysisError;
    }

  } catch (error) {
    console.error('Analyze API error:', error);
    return NextResponse.json(
      { 
        error: 'Analysis failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}