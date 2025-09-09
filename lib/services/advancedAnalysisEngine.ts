// lib/services/advancedAnalysisEngine.ts
// Advanced analysis engine combining semantic detection, hierarchical rules, and ML confidence scoring

import { hierarchicalRulesEngine, type HierarchicalRule, type RuleMatchResult } from './hierarchicalRulesEngine';
import { semanticIntegration } from './semanticIntegration';
import { supabaseAdmin } from '../supabase';
import type { PartyPerspective, ClauseMatch } from '@/types';

export interface AdvancedAnalysisResult {
  clause_id: string;
  clause_name: string;
  detected_text: string | null;
  match_type: 'starting_position' | 'fallback' | 'not_acceptable' | 'missing';
  confidence_score: number;
  risk_level: number;
  recommended_action: string;
  
  // Enhanced fields
  detection_method: 'semantic' | 'keyword' | 'hierarchical' | 'hybrid';
  rule_hierarchy_path: string[];
  ml_confidence: number;
  performance_metrics: {
    precision: number;
    recall: number;
    f1_score: number;
  } | null;
  
  // AI enhancement
  suggested_text: string | null;
  negotiation_guidance: string | null;
  fallback_options: string[];
  
  // Analytics
  processing_time_ms: number;
  cache_hit: boolean;
  model_version: string;
}

export interface DocumentAnalysisResult {
  review_id: string;
  party_perspective: PartyPerspective;
  overall_confidence: number;
  total_processing_time_ms: number;
  detection_summary: {
    semantic_detections: number;
    keyword_detections: number;
    hierarchical_matches: number;
    cache_hits: number;
  };
  clause_results: AdvancedAnalysisResult[];
  recommendations: {
    high_priority: string[];
    medium_priority: string[];
    suggested_next_steps: string[];
  };
}

export class AdvancedAnalysisEngine {
  private analysisCache: Map<string, AdvancedAnalysisResult[]> = new Map();
  private readonly MODEL_VERSION = '2.0-hierarchical-ml';
  
  /**
   * Perform comprehensive document analysis using all available methods
   */
  async analyzeDocument(
    documentText: string,
    partyPerspective: PartyPerspective = 'receiving',
    options: {
      useSemanticDetection?: boolean;
      useHierarchicalRules?: boolean;
      enableMLScoring?: boolean;
      confidenceThreshold?: number;
      includePerformanceMetrics?: boolean;
    } = {}
  ): Promise<DocumentAnalysisResult> {
    const startTime = Date.now();
    const {
      useSemanticDetection = true,
      useHierarchicalRules = true,
      enableMLScoring = true,
      confidenceThreshold = 0.3,
      includePerformanceMetrics = true
    } = options;
    
    // Generate cache key
    const cacheKey = this.generateCacheKey(documentText, partyPerspective, options);
    
    try {
      // Get all clause types
      const { data: clauses, error: clausesError } = await supabaseAdmin
        .from('clauses')
        .select('id, name, category')
        .eq('is_active', true)
        .order('display_order');
        
      if (clausesError) throw clausesError;
      if (!clauses || clauses.length === 0) {
        throw new Error('No active clauses found');
      }
      
      // Create review record
      const reviewId = await this.createReviewRecord(documentText, partyPerspective);
      
      // Analyze each clause
      const clauseResults: AdvancedAnalysisResult[] = [];
      const detectionSummary = {
        semantic_detections: 0,
        keyword_detections: 0,
        hierarchical_matches: 0,
        cache_hits: 0
      };
      
      for (const clause of clauses) {
        const clauseStartTime = Date.now();
        
        // Check cache first
        const cachedResult = this.getCachedResult(cacheKey, clause.id);
        if (cachedResult) {
          clauseResults.push(cachedResult);
          detectionSummary.cache_hits++;
          continue;
        }
        
        // Perform multi-method analysis
        const result = await this.analyzeClause(
          documentText,
          clause.id,
          clause.name,
          partyPerspective,
          {
            useSemanticDetection,
            useHierarchicalRules,
            enableMLScoring,
            confidenceThreshold,
            includePerformanceMetrics,
            processingStartTime: clauseStartTime
          }
        );
        
        clauseResults.push(result);
        
        // Update detection summary
        switch (result.detection_method) {
          case 'semantic':
            detectionSummary.semantic_detections++;
            break;
          case 'hierarchical':
            detectionSummary.hierarchical_matches++;
            break;
          case 'keyword':
            detectionSummary.keyword_detections++;
            break;
          case 'hybrid':
            detectionSummary.semantic_detections++;
            detectionSummary.hierarchical_matches++;
            break;
        }
        
        // Store analysis result in database
        await this.storeAnalysisResult(reviewId, result);
      }
      
      // Cache results
      this.cacheResults(cacheKey, clauseResults);
      
      // Calculate overall metrics
      const overallConfidence = clauseResults.reduce((sum, result) => sum + result.confidence_score, 0) / clauseResults.length;
      const totalProcessingTime = Date.now() - startTime;
      
      // Generate recommendations
      const recommendations = this.generateRecommendations(clauseResults, partyPerspective);
      
      // Update performance metrics
      await this.updatePerformanceMetrics(detectionSummary, totalProcessingTime, clauseResults.length);
      
      return {
        review_id: reviewId,
        party_perspective: partyPerspective,
        overall_confidence: overallConfidence,
        total_processing_time_ms: totalProcessingTime,
        detection_summary: detectionSummary,
        clause_results: clauseResults,
        recommendations
      };
      
    } catch (error) {
      console.error('Advanced document analysis failed:', error);
      throw error;
    }
  }
  
  /**
   * Analyze individual clause using multiple detection methods
   */
  private async analyzeClause(
    documentText: string,
    clauseId: string,
    clauseName: string,
    partyPerspective: PartyPerspective,
    options: {
      useSemanticDetection: boolean;
      useHierarchicalRules: boolean;
      enableMLScoring: boolean;
      confidenceThreshold: number;
      includePerformanceMetrics: boolean;
      processingStartTime: number;
    }
  ): Promise<AdvancedAnalysisResult> {
    const {
      useSemanticDetection,
      useHierarchicalRules,
      enableMLScoring,
      confidenceThreshold,
      includePerformanceMetrics,
      processingStartTime
    } = options;
    
    let bestMatch: RuleMatchResult | null = null;
    let detectionMethod: 'semantic' | 'keyword' | 'hierarchical' | 'hybrid' = 'keyword';
    let mlConfidence = 0;
    let performanceMetrics = null;
    
    try {
      // Try hierarchical rules first (most advanced)
      if (useHierarchicalRules) {
        const hierarchicalMatches = await hierarchicalRulesEngine.findBestMatches(
          documentText,
          clauseId,
          partyPerspective,
          {
            maxResults: 1,
            confidenceThreshold,
            useMLFeatures: enableMLScoring,
            preferHigherLevels: true
          }
        );
        
        if (hierarchicalMatches.length > 0) {
          bestMatch = hierarchicalMatches[0];
          detectionMethod = 'hierarchical';
          mlConfidence = bestMatch.confidence;
          
          if (includePerformanceMetrics && bestMatch.rule.performance) {
            performanceMetrics = {
              precision: bestMatch.rule.performance.precision,
              recall: bestMatch.rule.performance.recall,
              f1_score: bestMatch.rule.performance.f1_score
            };
          }
        }
      }
      
      // Try semantic detection if hierarchical didn't find good matches
      if (useSemanticDetection && (!bestMatch || bestMatch.confidence < 0.7)) {
        try {
          await semanticIntegration.initialize();
          const semanticResult = await semanticIntegration.detectClauses(
            documentText,
            [clauseName],
            { threshold: confidenceThreshold }
          );
          
          if (semanticResult.detections.length > 0) {
            const semantic = semanticResult.detections[0];
            
            // If semantic is better than hierarchical, use it
            if (!bestMatch || semantic.confidence > bestMatch.confidence) {
              // Convert semantic result to hierarchical format
              bestMatch = await this.convertSemanticToHierarchical(
                semantic,
                clauseId,
                partyPerspective
              );
              detectionMethod = bestMatch ? 'hybrid' : 'semantic';
            }
          }
        } catch (semanticError) {
          console.warn('Semantic detection failed, using hierarchical only:', semanticError);
        }
      }
      
      // Build result
      const processingTime = Date.now() - processingStartTime;
      
      if (bestMatch) {
        return {
          clause_id: clauseId,
          clause_name: clauseName,
          detected_text: this.extractClauseText(documentText, bestMatch),
          match_type: bestMatch.rule.rule_type,
          confidence_score: bestMatch.confidence,
          risk_level: this.calculateRiskLevel(bestMatch.rule.rule_type, bestMatch.confidence),
          recommended_action: this.generateRecommendedAction(bestMatch, partyPerspective),
          detection_method: detectionMethod,
          rule_hierarchy_path: bestMatch.hierarchy_path,
          ml_confidence: mlConfidence,
          performance_metrics: performanceMetrics,
          suggested_text: bestMatch.rule.rewriting_prompt ? 
            await this.generateAISuggestion(bestMatch, partyPerspective) : null,
          negotiation_guidance: bestMatch.rule.negotiation_guidance,
          fallback_options: this.generateFallbackOptions(bestMatch.rule),
          processing_time_ms: processingTime,
          cache_hit: false,
          model_version: this.MODEL_VERSION
        };
      } else {
        // No matches found - clause is missing
        return {
          clause_id: clauseId,
          clause_name: clauseName,
          detected_text: null,
          match_type: 'missing',
          confidence_score: 0,
          risk_level: this.calculateRiskLevel('missing', 0),
          recommended_action: `Add ${clauseName.toLowerCase()} clause to strengthen ${partyPerspective} party position`,
          detection_method: 'keyword',
          rule_hierarchy_path: [],
          ml_confidence: 0,
          performance_metrics: null,
          suggested_text: await this.generateMissingClauseSuggestion(clauseId, partyPerspective),
          negotiation_guidance: `Consider including a ${clauseName.toLowerCase()} clause that favors the ${partyPerspective} party`,
          fallback_options: [],
          processing_time_ms: processingTime,
          cache_hit: false,
          model_version: this.MODEL_VERSION
        };
      }
      
    } catch (error) {
      console.error(`Failed to analyze clause ${clauseName}:`, error);
      
      // Return error state
      return {
        clause_id: clauseId,
        clause_name: clauseName,
        detected_text: null,
        match_type: 'missing',
        confidence_score: 0,
        risk_level: 5,
        recommended_action: 'Manual review required - analysis failed',
        detection_method: 'keyword',
        rule_hierarchy_path: [],
        ml_confidence: 0,
        performance_metrics: null,
        suggested_text: null,
        negotiation_guidance: 'Contact legal expert for manual analysis',
        fallback_options: [],
        processing_time_ms: Date.now() - processingStartTime,
        cache_hit: false,
        model_version: this.MODEL_VERSION
      };
    }
  }
  
  /**
   * Convert semantic detection result to hierarchical rule format
   */
  private async convertSemanticToHierarchical(
    semanticResult: any,
    clauseId: string,
    partyPerspective: PartyPerspective
  ): Promise<RuleMatchResult | null> {
    try {
      // Get the best matching rule for this semantic result
      const rules = await hierarchicalRulesEngine.getRuleHierarchy(clauseId, partyPerspective);
      
      if (rules.length === 0) return null;
      
      // Use the highest confidence rule as base
      const bestRule = rules[0];
      
      return {
        rule: bestRule,
        confidence: semanticResult.confidence,
        match_type: 'semantic',
        reasoning: `Semantic similarity: ${(semanticResult.confidence * 100).toFixed(1)}%`,
        suggested_improvements: [],
        hierarchy_path: [bestRule.rule_type]
      };
    } catch (error) {
      console.error('Failed to convert semantic to hierarchical:', error);
      return null;
    }
  }
  
  /**
   * Extract relevant clause text from document
   */
  private extractClauseText(documentText: string, match: RuleMatchResult): string {
    // Simple extraction - in production this would be more sophisticated
    const searchText = match.rule.keywords[0] || match.rule.rule_type;
    const index = documentText.toLowerCase().indexOf(searchText.toLowerCase());
    
    if (index !== -1) {
      const start = Math.max(0, index - 100);
      const end = Math.min(documentText.length, index + 300);
      return documentText.substring(start, end).trim();
    }
    
    return 'Clause text not found in document';
  }
  
  /**
   * Calculate risk level based on rule type and confidence
   */
  private calculateRiskLevel(ruleType: string, confidence: number): number {
    if (ruleType === 'missing') return 4;
    if (ruleType === 'not_acceptable') return 5;
    if (ruleType === 'fallback' && confidence < 0.7) return 3;
    if (ruleType === 'starting_position' && confidence > 0.8) return 1;
    return 2;
  }
  
  /**
   * Generate recommended action based on analysis
   */
  private generateRecommendedAction(
    match: RuleMatchResult,
    partyPerspective: PartyPerspective
  ): string {
    const { rule, confidence, match_type } = match;
    
    if (rule.rule_type === 'starting_position' && confidence > 0.8) {
      return `Excellent - clause aligns with ${partyPerspective} party starting position`;
    }
    
    if (rule.rule_type === 'fallback' && confidence > 0.6) {
      return `Acceptable - clause meets ${partyPerspective} party fallback requirements`;
    }
    
    if (rule.rule_type === 'not_acceptable') {
      return `Action required - negotiate better terms for ${partyPerspective} party`;
    }
    
    return `Review recommended - clause may need adjustment for ${partyPerspective} party`;
  }
  
  /**
   * Generate AI-powered suggestion text
   */
  private async generateAISuggestion(
    match: RuleMatchResult,
    partyPerspective: PartyPerspective
  ): Promise<string> {
    // This would integrate with OpenAI API in production
    // For now, return the rewriting prompt as template
    const prompt = match.rule.rewriting_prompt || '';
    return prompt.replace(/\{party\}/g, partyPerspective);
  }
  
  /**
   * Generate suggestion for missing clause
   */
  private async generateMissingClauseSuggestion(
    clauseId: string,
    partyPerspective: PartyPerspective
  ): Promise<string> {
    try {
      // Get template from playbook positions
      const { data: template } = await supabaseAdmin
        .from('playbook_positions')
        .select('template_text')
        .eq('clause_type', clauseId)
        .eq('party_perspective', partyPerspective)
        .eq('position_level', 'ideal')
        .single();
        
      return template?.template_text || 'Standard clause template not available';
    } catch (error) {
      return 'Standard clause template not available';
    }
  }
  
  /**
   * Generate fallback options
   */
  private generateFallbackOptions(rule: HierarchicalRule): string[] {
    const options: string[] = [];
    
    if (rule.fallback_language) {
      options.push(rule.fallback_language);
    }
    
    if (rule.example_language && rule.example_language !== rule.fallback_language) {
      options.push(rule.example_language);
    }
    
    return options;
  }
  
  /**
   * Generate comprehensive recommendations
   */
  private generateRecommendations(
    results: AdvancedAnalysisResult[],
    partyPerspective: PartyPerspective
  ): {
    high_priority: string[];
    medium_priority: string[];
    suggested_next_steps: string[];
  } {
    const highPriority: string[] = [];
    const mediumPriority: string[] = [];
    const suggestedNextSteps: string[] = [];
    
    results.forEach(result => {
      if (result.risk_level >= 4) {
        highPriority.push(`${result.clause_name}: ${result.recommended_action}`);
      } else if (result.risk_level === 3) {
        mediumPriority.push(`${result.clause_name}: ${result.recommended_action}`);
      }
      
      if (result.negotiation_guidance) {
        suggestedNextSteps.push(result.negotiation_guidance);
      }
    });
    
    return {
      high_priority: highPriority,
      medium_priority: mediumPriority,
      suggested_next_steps: Array.from(new Set(suggestedNextSteps))
    };
  }
  
  // Helper methods for caching and database operations
  private generateCacheKey(
    text: string,
    perspective: PartyPerspective,
    options: any
  ): string {
    const hash = require('crypto')
      .createHash('md5')
      .update(`${text}-${perspective}-${JSON.stringify(options)}`)
      .digest('hex');
    return hash;
  }
  
  private getCachedResult(cacheKey: string, clauseId: string): AdvancedAnalysisResult | null {
    const cached = this.analysisCache.get(cacheKey);
    return cached?.find(r => r.clause_id === clauseId) || null;
  }
  
  private cacheResults(cacheKey: string, results: AdvancedAnalysisResult[]): void {
    this.analysisCache.set(cacheKey, results);
    
    // Clean cache if it gets too large
    if (this.analysisCache.size > 100) {
      const keys = Array.from(this.analysisCache.keys());
      keys.slice(0, 50).forEach(key => this.analysisCache.delete(key));
    }
  }
  
  private async createReviewRecord(
    text: string,
    perspective: PartyPerspective
  ): Promise<string> {
    const { data, error } = await supabaseAdmin
      .from('reviews')
      .insert({
        client_name: 'Advanced Analysis',
        nda_title: 'Document Analysis',
        original_text: text.substring(0, 10000), // Limit size
        party_perspective: perspective,
        status: 'processing'
      })
      .select('id')
      .single();
      
    if (error) throw error;
    return data.id;
  }
  
  private async storeAnalysisResult(
    reviewId: string,
    result: AdvancedAnalysisResult
  ): Promise<void> {
    await supabaseAdmin
      .from('clause_analyses')
      .insert({
        review_id: reviewId,
        clause_id: result.clause_id,
        detected_text: result.detected_text,
        match_type: result.match_type,
        confidence_score: result.confidence_score,
        risk_level: result.risk_level,
        recommended_action: result.recommended_action,
        suggested_text: result.suggested_text,
        user_feedback: JSON.stringify({
          detection_method: result.detection_method,
          ml_confidence: result.ml_confidence,
          processing_time_ms: result.processing_time_ms,
          model_version: result.model_version
        })
      });
  }
  
  private async updatePerformanceMetrics(
    summary: any,
    totalTime: number,
    documentCount: number
  ): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      await supabaseAdmin
        .from('performance_metrics')
        .upsert({
          metric_date: today,
          total_documents_processed: documentCount,
          avg_processing_time_ms: totalTime,
          semantic_detection_rate: summary.semantic_detections / documentCount,
          keyword_detection_rate: summary.keyword_detections / documentCount,
          hybrid_detection_rate: summary.hierarchical_matches / documentCount,
          cache_hit_rate: summary.cache_hits / documentCount
        });
    } catch (error) {
      console.warn('Failed to update performance metrics:', error);
    }
  }
}

// Export singleton instance
export const advancedAnalysisEngine = new AdvancedAnalysisEngine();