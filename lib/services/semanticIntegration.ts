// lib/services/semanticIntegration.ts
// Phase 2: Enhanced integration layer with optimized semantic detection
// Combines optimized embedding service with existing capabilities

import { SemanticClauseDetector } from './semanticEmbedding';
import { optimizedSemanticEmbedding } from './optimizedSemanticEmbedding';
import { supabase } from '../supabase';
import type { ClauseMatch, AnalysisResult } from '../clause-matcher';
import type { PartyPerspective } from '@/types';

export interface SemanticClauseMatch extends ClauseMatch {
  detectionMethod: 'semantic' | 'keyword' | 'hybrid';
  semanticSimilarity?: number;
  explanation?: string;
}

export interface SemanticAnalysisResult extends AnalysisResult {
  matches: SemanticClauseMatch[];
  processingTime: number;
  semanticDetectionRate: number;
}

/**
 * Enhanced clause detection that combines semantic and keyword approaches with optimization
 */
export class SemanticClauseIntegration {
  private semanticDetector: SemanticClauseDetector;
  private initialized = false;
  private useOptimizedEmbeddings = true;
  
  constructor() {
    this.semanticDetector = new SemanticClauseDetector();
  }
  
  /**
   * Initialize the semantic detector (call once)
   */
  async initialize(): Promise<void> {
    if (!this.initialized) {
      // Initialize both the original detector and optimized embedding service
      await Promise.all([
        this.semanticDetector.initialize(),
        optimizedSemanticEmbedding.initialize()
      ]);
      
      // Warm up cache with common legal phrases
      await this.warmupCommonPhrases();
      
      this.initialized = true;
      console.log('Semantic integration initialized successfully with optimization');
    }
  }
  
  /**
   * Warm up cache with common legal phrases
   */
  private async warmupCommonPhrases(): Promise<void> {
    const commonLegalPhrases = [
      'confidential information shall mean',
      'party receiving confidential information',
      'disclose confidential information',
      'return or destroy confidential information',
      'term of this agreement',
      'governed by the laws of',
      'exclusive jurisdiction',
      'breach of this agreement',
      'permitted use of confidential information',
      'definition of confidential information'
    ];
    
    await optimizedSemanticEmbedding.warmupCache(commonLegalPhrases);
  }
  
  /**
   * Detect a specific clause using hybrid approach
   */
  async detectClauseWithSemantic(
    documentText: string,
    clauseType: string,
    partyPerspective: PartyPerspective,
    options: {
      useSemanticFirst?: boolean;
      fallbackToKeyword?: boolean;
      confidenceThreshold?: number;
    } = {}
  ): Promise<{
    detected: boolean;
    confidence: number;
    method: 'semantic' | 'keyword' | 'hybrid';
    segments: any[];
    explanation?: string;
  }> {
    const {
      useSemanticFirst = true,
      fallbackToKeyword = true,
      confidenceThreshold = 0.6
    } = options;
    
    if (!this.initialized) {
      await this.initialize();
    }
    
    try {
      if (useSemanticFirst) {
        // Try semantic detection first
        const semanticResult = await this.semanticDetector.detectClause(
          documentText,
          clauseType,
          { method: 'semantic', threshold: confidenceThreshold }
        );
        
        if (semanticResult.detected && semanticResult.confidence >= confidenceThreshold) {
          return semanticResult;
        }
        
        // Fall back to hybrid if semantic confidence is low
        if (fallbackToKeyword) {
          const hybridResult = await this.semanticDetector.detectClause(
            documentText,
            clauseType,
            { method: 'hybrid', threshold: confidenceThreshold * 0.8 }
          );
          
          return hybridResult;
        }
        
        return semanticResult;
      } else {
        // Start with hybrid approach
        const hybridResult = await this.semanticDetector.detectClause(
          documentText,
          clauseType,
          { method: 'hybrid', threshold: confidenceThreshold }
        );
        
        return hybridResult;
      }
    } catch (error) {
      console.error('Semantic detection error:', error);
      
      // Fallback to keyword-only detection
      if (fallbackToKeyword) {
        const keywordResult = await this.semanticDetector.detectClause(
          documentText,
          clauseType,
          { method: 'keyword' }
        );
        
        return keywordResult;
      }
      
      throw error;
    }
  }
  
  /**
   * Enhance existing clause matches with semantic similarity scores
   */
  async enhanceClauseMatches(
    documentText: string,
    existingMatches: ClauseMatch[],
    partyPerspective: PartyPerspective
  ): Promise<SemanticClauseMatch[]> {
    if (!this.initialized) {
      await this.initialize();
    }
    
    const enhancedMatches: SemanticClauseMatch[] = [];
    
    for (const match of existingMatches) {
      try {
        // Get the matched text portion
        const matchedTextSegment = documentText.substring(
          match.position.start,
          match.position.end
        );
        
        // Run semantic analysis on the matched segment
        const semanticResult = await this.semanticDetector.detectClause(
          matchedTextSegment,
          this.mapClauseNameToType(match.clauseName),
          { method: 'semantic' }
        );
        
        // Create enhanced match
        const enhancedMatch: SemanticClauseMatch = {
          ...match,
          detectionMethod: semanticResult.confidence > 0.5 ? 'hybrid' : 'keyword',
          semanticSimilarity: semanticResult.confidence,
          explanation: semanticResult.explanation,
          confidenceScore: Math.max(match.confidenceScore, semanticResult.confidence)
        };
        
        enhancedMatches.push(enhancedMatch);
        
      } catch (error) {
        console.error(`Error enhancing match for ${match.clauseName}:`, error);
        
        // Fall back to original match
        const fallbackMatch: SemanticClauseMatch = {
          ...match,
          detectionMethod: 'keyword'
        };
        
        enhancedMatches.push(fallbackMatch);
      }
    }
    
    return enhancedMatches;
  }
  
  /**
   * Find missing clauses using semantic detection
   */
  async findMissingClauses(
    documentText: string,
    expectedClauseTypes: string[],
    partyPerspective: PartyPerspective,
    confidenceThreshold: number = 0.6
  ): Promise<{
    clauseType: string;
    confidence: number;
    detected: boolean;
    explanation?: string;
  }[]> {
    if (!this.initialized) {
      await this.initialize();
    }
    
    const results = [];
    
    for (const clauseType of expectedClauseTypes) {
      try {
        const detection = await this.semanticDetector.detectClause(
          documentText,
          clauseType,
          { method: 'hybrid', threshold: confidenceThreshold }
        );
        
        results.push({
          clauseType,
          confidence: detection.confidence,
          detected: detection.detected,
          explanation: detection.explanation
        });
        
      } catch (error) {
        console.error(`Error detecting ${clauseType}:`, error);
        results.push({
          clauseType,
          confidence: 0,
          detected: false,
          explanation: `Error during detection: ${error}`
        });
      }
    }
    
    return results;
  }
  
  /**
   * Map clause names to semantic detection types
   */
  mapClauseNameToType(clauseName: string): string {
    const mapping: Record<string, string> = {
      'Definition of Confidential Information': 'definition',
      'Term and Duration': 'duration',
      'Governing Law': 'governing',
      'Permitted Use': 'permitted_use',
      'Non-Disclosure': 'non_disclosure',
      'Return of Information': 'return_of_info',
      'No License': 'no_license'
    };
    
    return mapping[clauseName] || clauseName.toLowerCase().replace(/\s+/g, '_');
  }
  
  /**
   * Get performance metrics for the current session
   */
  getPerformanceMetrics() {
    return {
      initialized: this.initialized,
      // Add more metrics as needed
    };
  }
}

// Export singleton instance for easy use
export const semanticIntegration = new SemanticClauseIntegration();