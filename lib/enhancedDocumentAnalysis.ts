// lib/enhancedDocumentAnalysis.ts
// Enhanced document analysis with semantic integration and hierarchical rules
// Backward compatible with existing clause-matcher.ts

import { analyzeDocument as originalAnalyzeDocument } from './clause-matcher';
import { advancedAnalysisEngine, type DocumentAnalysisResult, type AdvancedAnalysisResult } from './services/advancedAnalysisEngine';
import { semanticIntegration } from './services/semanticIntegration';
import type { AnalysisResult, ClauseMatch } from './clause-matcher';
import type { PartyPerspective } from '@/types';

export interface EnhancedAnalysisResult extends AnalysisResult {
  semanticDetectionUsed: boolean;
  processingTime: number;
  semanticConfidenceScores: Record<string, number>;
  detectionMethods: Record<string, 'semantic' | 'keyword' | 'hybrid'>;
  
  // New Phase 2 fields
  hierarchicalRulesUsed?: boolean;
  mlConfidenceScores?: Record<string, number>;
  performanceMetrics?: Record<string, any>;
  advancedRecommendations?: {
    high_priority: string[];
    medium_priority: string[];
    suggested_next_steps: string[];
  };
}

/**
 * Enhanced document analysis that uses advanced AI methods
 * with backward compatibility
 */
export async function analyzeDocumentWithSemantic(
  documentText: string, 
  partyPerspective: PartyPerspective = 'receiving',
  options: {
    useSemanticFirst?: boolean;
    semanticThreshold?: number;
    fallbackToOriginal?: boolean;
    useHierarchicalRules?: boolean;
    enableMLScoring?: boolean;
    useAdvancedEngine?: boolean;
  } = {}
): Promise<EnhancedAnalysisResult> {
  const startTime = Date.now();
  const {
    useSemanticFirst = true,
    semanticThreshold = 0.6,
    fallbackToOriginal = true,
    useHierarchicalRules = true,
    enableMLScoring = true,
    useAdvancedEngine = true
  } = options;
  
  let semanticDetectionUsed = false;
  let hierarchicalRulesUsed = false;
  const semanticConfidenceScores: Record<string, number> = {};
  const mlConfidenceScores: Record<string, number> = {};
  const detectionMethods: Record<string, 'semantic' | 'keyword' | 'hybrid'> = {};
  const performanceMetrics: Record<string, any> = {};
  
  try {
    // Use advanced analysis engine if enabled (Phase 2)
    if (useAdvancedEngine) {
      try {
        const advancedResult = await advancedAnalysisEngine.analyzeDocument(
          documentText,
          partyPerspective,
          {
            useSemanticDetection: useSemanticFirst,
            useHierarchicalRules,
            enableMLScoring,
            confidenceThreshold: semanticThreshold,
            includePerformanceMetrics: true
          }
        );
        
        // Convert to legacy format for backward compatibility
        const legacyResult = await convertAdvancedToLegacy(advancedResult, documentText, partyPerspective);
        
        // Add enhanced metadata
        legacyResult.hierarchicalRulesUsed = true;
        legacyResult.advancedRecommendations = advancedResult.recommendations;
        
        advancedResult.clause_results.forEach(clause => {
          semanticConfidenceScores[clause.clause_name] = clause.confidence_score;
          mlConfidenceScores[clause.clause_name] = clause.ml_confidence;
          detectionMethods[clause.clause_name] = clause.detection_method as any;
          performanceMetrics[clause.clause_name] = clause.performance_metrics;
        });
        
        return {
          ...legacyResult,
          semanticDetectionUsed: advancedResult.detection_summary.semantic_detections > 0,
          processingTime: Date.now() - startTime,
          semanticConfidenceScores,
          detectionMethods,
          hierarchicalRulesUsed,
          mlConfidenceScores,
          performanceMetrics: {
            overall: advancedResult.detection_summary,
            individual: performanceMetrics
          }
        };
        
      } catch (advancedError) {
        console.warn('Advanced analysis failed, falling back to semantic:', advancedError);
        hierarchicalRulesUsed = false;
      }
    }
    
    // Fallback to semantic + original analysis
    if (useSemanticFirst && fallbackToOriginal) {
      try {
        // Initialize semantic detection
        await semanticIntegration.initialize();
        
        // First try semantic analysis
        const originalResult = await originalAnalyzeDocument(documentText, partyPerspective);
        
        // Enhance the matches with semantic similarity
        const enhancedMatches = await semanticIntegration.enhanceClauseMatches(
          documentText,
          originalResult.matches,
          partyPerspective
        );
        
        // Check for additional missing clauses using semantic detection
        const expectedClauseTypes = [
          'definition', 'duration', 'governing', 'permitted_use', 
          'non_disclosure', 'return_of_info', 'no_license'
        ];
        
        const missingClauseDetection = await semanticIntegration.findMissingClauses(
          documentText,
          expectedClauseTypes,
          partyPerspective,
          semanticThreshold
        );
        
        // Update confidence scores and detection methods
        enhancedMatches.forEach(match => {
          semanticConfidenceScores[match.clauseName] = match.semanticSimilarity || match.confidenceScore;
          detectionMethods[match.clauseName] = match.detectionMethod || 'keyword';
        });
        
        // Check for clauses that semantic detection found but keyword missed
        const additionalMatches = [];
        for (const detection of missingClauseDetection) {
          if (detection.detected && detection.confidence >= semanticThreshold) {
            // Found a clause that keyword detection missed
            const isAlreadyFound = enhancedMatches.some(match => 
              semanticIntegration.mapClauseNameToType(match.clauseName) === detection.clauseType
            );
            
            if (!isAlreadyFound) {
              // This is a new semantic detection
              additionalMatches.push({
                clauseId: `semantic-${detection.clauseType}`,
                clauseName: detection.clauseType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                ruleId: 'semantic-rule',
                ruleType: 'starting_position' as const,
                matchedText: 'Detected via semantic analysis',
                matchedKeywords: [],
                confidenceScore: detection.confidence,
                position: { start: 0, end: 0 },
                detectionMethod: 'semantic' as const,
                semanticSimilarity: detection.confidence,
                explanation: detection.explanation
              });
              
              semanticConfidenceScores[detection.clauseType] = detection.confidence;
              detectionMethods[detection.clauseType] = 'semantic';
            }
          }
        }
        
        // Remove clauses from missing list if semantic detection found them
        const updatedMissingClauses = originalResult.missingClauses.filter(missingClause => {
          const clauseType = semanticIntegration.mapClauseNameToType(missingClause);
          const semanticDetection = missingClauseDetection.find(d => d.clauseType === clauseType);
          return !semanticDetection?.detected;
        });
        
        semanticDetectionUsed = true;
        
        const processingTime = Date.now() - startTime;
        
        return {
          matches: [...enhancedMatches, ...additionalMatches],
          missingClauses: updatedMissingClauses,
          overallScore: calculateEnhancedOverallScore(enhancedMatches, updatedMissingClauses.length),
          partyPerspective,
          semanticDetectionUsed,
          processingTime,
          semanticConfidenceScores,
          detectionMethods
        };
        
      } catch (semanticError) {
        console.error('Semantic analysis failed:', semanticError);
        
        if (fallbackToOriginal) {
          console.log('Falling back to original keyword-based analysis');
          return await fallbackToOriginalAnalysis(documentText, partyPerspective, startTime);
        } else {
          throw semanticError;
        }
      }
    } else {
      // Use original analysis directly
      return await fallbackToOriginalAnalysis(documentText, partyPerspective, startTime);
    }
  } catch (error) {
    console.error('Enhanced document analysis failed:', error);
    
    if (fallbackToOriginal) {
      console.log('Falling back to original analysis due to error');
      return await fallbackToOriginalAnalysis(documentText, partyPerspective, startTime);
    } else {
      throw error;
    }
  }
}

/**
 * Fallback to original analysis with enhanced result structure
 */
async function fallbackToOriginalAnalysis(
  documentText: string,
  partyPerspective: PartyPerspective,
  startTime: number
): Promise<EnhancedAnalysisResult> {
  const originalResult = await originalAnalyzeDocument(documentText, partyPerspective);
  const processingTime = Date.now() - startTime;
  
  const semanticConfidenceScores: Record<string, number> = {};
  const detectionMethods: Record<string, 'semantic' | 'keyword' | 'hybrid'> = {};
  
  // Mark all as keyword detection
  originalResult.matches.forEach(match => {
    semanticConfidenceScores[match.clauseName] = match.confidenceScore;
    detectionMethods[match.clauseName] = 'keyword';
  });
  
  return {
    ...originalResult,
    semanticDetectionUsed: false,
    processingTime,
    semanticConfidenceScores,
    detectionMethods
  };
}

/**
 * Calculate enhanced overall score considering semantic confidence
 */
function calculateEnhancedOverallScore(matches: any[], missingClausesCount: number): number {
  if (matches.length === 0) return 0;
  
  const totalClauses = matches.length + missingClausesCount;
  const foundClausesScore = matches.length / totalClauses * 60; // 60% for finding clauses
  
  // Quality score based on rule types and confidence
  const qualityScore = matches.reduce((sum, match) => {
    let score = 0;
    
    // Base score by rule type
    if (match.ruleType === 'starting_position') score = 40;
    else if (match.ruleType === 'fallback') score = 25;
    else if (match.ruleType === 'not_acceptable') score = 5;
    else score = 20; // semantic detections
    
    // Boost for high confidence
    if (match.confidenceScore > 0.8) score *= 1.2;
    else if (match.confidenceScore < 0.5) score *= 0.8;
    
    // Boost for semantic detection
    if (match.detectionMethod === 'semantic' || match.detectionMethod === 'hybrid') {
      score *= 1.1;
    }
    
    return sum + score;
  }, 0) / matches.length * 0.4; // 40% for quality
  
  return Math.min(100, Math.round(foundClausesScore + qualityScore));
}

/**
 * Backward compatible export - uses semantic when available, falls back to original
 */
export async function analyzeDocument(
  documentText: string, 
  partyPerspective: PartyPerspective = 'receiving'
): Promise<AnalysisResult> {
  try {
    const enhancedResult = await analyzeDocumentWithSemantic(
      documentText, 
      partyPerspective, 
      { fallbackToOriginal: true }
    );
    
    // Return in original format for backward compatibility
    return {
      matches: enhancedResult.matches.map(match => ({
        clauseId: match.clauseId,
        clauseName: match.clauseName,
        ruleId: match.ruleId,
        ruleType: match.ruleType,
        matchedText: match.matchedText,
        matchedKeywords: match.matchedKeywords || [],
        confidenceScore: match.confidenceScore,
        position: match.position
      })),
      missingClauses: enhancedResult.missingClauses,
      overallScore: enhancedResult.overallScore,
      partyPerspective: enhancedResult.partyPerspective
    };
  } catch (error) {
    console.error('Enhanced analysis failed, using original:', error);
    return await originalAnalyzeDocument(documentText, partyPerspective);
  }
}

/**
 * Convert advanced analysis result to legacy format for backward compatibility
 */
async function convertAdvancedToLegacy(
  advancedResult: DocumentAnalysisResult,
  documentText: string,
  partyPerspective: PartyPerspective
): Promise<AnalysisResult> {
  const matches: ClauseMatch[] = [];
  const missingClauses: string[] = [];
  
  advancedResult.clause_results.forEach(clause => {
    if (clause.match_type === 'missing') {
      missingClauses.push(clause.clause_name);
    } else {
      matches.push({
        clauseId: clause.clause_id,
        clauseName: clause.clause_name,
        ruleId: `rule-${clause.clause_id}`,
        ruleType: clause.match_type,
        matchedText: clause.detected_text || 'Detected via advanced analysis',
        matchedKeywords: [], // Would need to extract from rule
        confidenceScore: clause.confidence_score,
        position: { start: 0, end: 0 } // Would need to calculate from detected_text
      });
    }
  });
  
  return {
    matches,
    missingClauses,
    overallScore: Math.round(advancedResult.overall_confidence * 100),
    partyPerspective
  };
}

// Enhanced version is already exported above

// Re-export other utilities for compatibility
export { formatAnalysisResults } from './clause-matcher';