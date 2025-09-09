// lib/services/hierarchicalRulesEngine.ts
// Advanced hierarchical rules engine with parent-child relationships and ML confidence scoring

import { supabaseAdmin } from '../supabase';
import type { PartyPerspective } from '@/types';

export interface HierarchicalRule {
  id: string;
  clause_id: string;
  rule_type: 'starting_position' | 'fallback' | 'not_acceptable';
  party_perspective: PartyPerspective;
  rule_text: string;
  keywords: string[];
  severity: number;
  guidance_notes: string;
  example_language: string;
  rewriting_prompt: string;
  
  // New hierarchical fields
  parent_rule_id: string | null;
  rule_level: number;
  confidence_score: number;
  last_updated_confidence: string | null;
  ml_features: Record<string, any> | null;
  negotiation_guidance: string | null;
  fallback_language: string | null;
  
  // Child rules (populated when loading hierarchy)
  children?: HierarchicalRule[];
  
  // Performance metrics (from rule_performance table)
  performance?: {
    precision: number;
    recall: number;
    f1_score: number;
    true_positives: number;
    false_positives: number;
    true_negatives: number;
    false_negatives: number;
    last_calculated: string;
    sample_size: number;
  };
}

export interface RuleMatchResult {
  rule: HierarchicalRule;
  confidence: number;
  match_type: 'exact' | 'semantic' | 'keyword' | 'fallback';
  reasoning: string;
  suggested_improvements: string[];
  hierarchy_path: string[]; // Path from root to this rule
}

export class HierarchicalRulesEngine {
  private ruleCache: Map<string, HierarchicalRule[]> = new Map();
  private performanceCache: Map<string, any> = new Map();
  
  /**
   * Get all rules for a clause with hierarchical structure
   */
  async getRuleHierarchy(
    clauseId: string, 
    partyPerspective: PartyPerspective
  ): Promise<HierarchicalRule[]> {
    const cacheKey = `${clauseId}-${partyPerspective}`;
    
    if (this.ruleCache.has(cacheKey)) {
      return this.ruleCache.get(cacheKey)!;
    }
    
    try {
      // Get all rules with performance data
      const { data: rulesData, error } = await supabaseAdmin
        .from('clause_rules')
        .select(`
          *,
          rule_performance (
            precision, recall, f1_score,
            true_positives, false_positives, true_negatives, false_negatives,
            last_calculated, calculation_sample_size
          )
        `)
        .eq('clause_id', clauseId)
        .eq('party_perspective', partyPerspective)
        .order('rule_level', { ascending: true })
        .order('confidence_score', { ascending: false });
        
      if (error) {
        console.error('Error fetching hierarchical rules:', error);
        throw error;
      }
      
      // Build hierarchy structure
      const rules = this.buildHierarchy(rulesData || []);
      this.ruleCache.set(cacheKey, rules);
      
      return rules;
    } catch (error) {
      console.error('Failed to get rule hierarchy:', error);
      return [];
    }
  }
  
  /**
   * Build parent-child hierarchy from flat rule list
   */
  private buildHierarchy(flatRules: any[]): HierarchicalRule[] {
    const ruleMap = new Map<string, HierarchicalRule>();
    const rootRules: HierarchicalRule[] = [];
    
    // First pass: create rule objects
    flatRules.forEach(ruleData => {
      const rule: HierarchicalRule = {
        id: ruleData.id,
        clause_id: ruleData.clause_id,
        rule_type: ruleData.rule_type,
        party_perspective: ruleData.party_perspective,
        rule_text: ruleData.rule_text,
        keywords: ruleData.keywords || [],
        severity: ruleData.severity,
        guidance_notes: ruleData.guidance_notes,
        example_language: ruleData.example_language,
        rewriting_prompt: ruleData.rewriting_prompt,
        parent_rule_id: ruleData.parent_rule_id,
        rule_level: ruleData.rule_level || 1,
        confidence_score: parseFloat(ruleData.confidence_score) || 0.70,
        last_updated_confidence: ruleData.last_updated_confidence,
        ml_features: ruleData.ml_features,
        negotiation_guidance: ruleData.negotiation_guidance,
        fallback_language: ruleData.fallback_language,
        children: [],
        performance: ruleData.rule_performance?.[0] ? {
          precision: parseFloat(ruleData.rule_performance[0].precision) || 0,
          recall: parseFloat(ruleData.rule_performance[0].recall) || 0,
          f1_score: parseFloat(ruleData.rule_performance[0].f1_score) || 0,
          true_positives: ruleData.rule_performance[0].true_positives || 0,
          false_positives: ruleData.rule_performance[0].false_positives || 0,
          true_negatives: ruleData.rule_performance[0].true_negatives || 0,
          false_negatives: ruleData.rule_performance[0].false_negatives || 0,
          last_calculated: ruleData.rule_performance[0].last_calculated,
          sample_size: ruleData.rule_performance[0].calculation_sample_size || 0
        } : undefined
      };
      
      ruleMap.set(rule.id, rule);
    });
    
    // Second pass: build hierarchy
    ruleMap.forEach(rule => {
      if (rule.parent_rule_id && ruleMap.has(rule.parent_rule_id)) {
        const parent = ruleMap.get(rule.parent_rule_id)!;
        parent.children!.push(rule);
      } else {
        rootRules.push(rule);
      }
    });
    
    // Sort children by confidence score
    const sortChildren = (rules: HierarchicalRule[]) => {
      rules.forEach(rule => {
        if (rule.children && rule.children.length > 0) {
          rule.children.sort((a, b) => b.confidence_score - a.confidence_score);
          sortChildren(rule.children);
        }
      });
    };
    
    sortChildren(rootRules);
    return rootRules.sort((a, b) => b.confidence_score - a.confidence_score);
  }
  
  /**
   * Find best matching rules using hierarchical traversal and ML confidence
   */
  async findBestMatches(
    documentText: string,
    clauseId: string,
    partyPerspective: PartyPerspective,
    options: {
      maxResults?: number;
      confidenceThreshold?: number;
      useMLFeatures?: boolean;
      preferHigherLevels?: boolean;
    } = {}
  ): Promise<RuleMatchResult[]> {
    const {
      maxResults = 5,
      confidenceThreshold = 0.3,
      useMLFeatures = true,
      preferHigherLevels = true
    } = options;
    
    const rules = await this.getRuleHierarchy(clauseId, partyPerspective);
    const matches: RuleMatchResult[] = [];
    
    // Traverse hierarchy and find matches
    const traverseAndMatch = (
      rules: HierarchicalRule[], 
      path: string[] = []
    ) => {
      rules.forEach(rule => {
        const currentPath = [...path, rule.rule_type];
        const matchResult = this.evaluateRuleMatch(documentText, rule, currentPath);
        
        if (matchResult.confidence >= confidenceThreshold) {
          matches.push(matchResult);
        }
        
        // Recurse into children
        if (rule.children && rule.children.length > 0) {
          traverseAndMatch(rule.children, currentPath);
        }
      });
    };
    
    traverseAndMatch(rules);
    
    // Sort matches by confidence and hierarchy preference
    matches.sort((a, b) => {
      if (preferHigherLevels && a.rule.rule_level !== b.rule.rule_level) {
        return a.rule.rule_level - b.rule.rule_level; // Lower level = higher in hierarchy
      }
      return b.confidence - a.confidence;
    });
    
    return matches.slice(0, maxResults);
  }
  
  /**
   * Evaluate how well a rule matches the document text
   */
  private evaluateRuleMatch(
    documentText: string, 
    rule: HierarchicalRule,
    hierarchyPath: string[]
  ): RuleMatchResult {
    let confidence = 0;
    let matchType: 'exact' | 'semantic' | 'keyword' | 'fallback' = 'keyword';
    const reasoning: string[] = [];
    const suggestedImprovements: string[] = [];
    
    // Keyword matching with enhanced scoring
    const keywordMatches = this.calculateKeywordScore(documentText, rule.keywords);
    if (keywordMatches.score > 0) {
      confidence += keywordMatches.score * 0.4;
      reasoning.push(`Keyword matches: ${keywordMatches.matches.join(', ')}`);
    }
    
    // ML features-based scoring
    if (rule.ml_features && rule.ml_features.patterns) {
      const mlScore = this.calculateMLScore(documentText, rule.ml_features);
      confidence += mlScore * 0.3;
      reasoning.push(`ML pattern confidence: ${(mlScore * 100).toFixed(1)}%`);
    }
    
    // Performance history weighting
    if (rule.performance) {
      const performanceWeight = rule.performance.f1_score * 0.2;
      confidence += performanceWeight;
      reasoning.push(`Historical accuracy: ${(rule.performance.f1_score * 100).toFixed(1)}%`);
    }
    
    // Base confidence from rule
    confidence += rule.confidence_score * 0.1;
    
    // Generate improvement suggestions
    if (rule.negotiation_guidance) {
      suggestedImprovements.push(rule.negotiation_guidance);
    }
    
    if (rule.fallback_language && confidence < 0.7) {
      suggestedImprovements.push(`Consider fallback language: "${rule.fallback_language}"`);
    }
    
    // Determine match type
    if (confidence > 0.9) {
      matchType = 'exact';
    } else if (confidence > 0.7) {
      matchType = 'semantic';
    } else if (confidence > 0.5) {
      matchType = 'keyword';
    } else {
      matchType = 'fallback';
    }
    
    return {
      rule,
      confidence: Math.min(confidence, 1.0),
      match_type: matchType,
      reasoning: reasoning.join('; '),
      suggested_improvements: suggestedImprovements,
      hierarchy_path: hierarchyPath
    };
  }
  
  /**
   * Calculate keyword matching score with fuzzy matching
   */
  private calculateKeywordScore(text: string, keywords: string[]): {
    score: number;
    matches: string[];
  } {
    const textLower = text.toLowerCase();
    const matches: string[] = [];
    let totalScore = 0;
    
    keywords.forEach(keyword => {
      const keywordLower = keyword.toLowerCase();
      if (textLower.includes(keywordLower)) {
        matches.push(keyword);
        totalScore += 1;
      } else {
        // Fuzzy matching for partial matches
        const words = keywordLower.split(' ');
        const partialMatches = words.filter(word => 
          word.length > 3 && textLower.includes(word)
        );
        if (partialMatches.length > 0) {
          matches.push(`~${keyword}`);
          totalScore += partialMatches.length / words.length * 0.5;
        }
      }
    });
    
    return {
      score: Math.min(totalScore / Math.max(keywords.length, 1), 1.0),
      matches
    };
  }
  
  /**
   * Calculate ML-based confidence score
   */
  private calculateMLScore(text: string, mlFeatures: Record<string, any>): number {
    // Simplified ML scoring - in production this would use trained models
    let score = 0;
    
    if (mlFeatures.patterns) {
      const patterns = mlFeatures.patterns as string[];
      patterns.forEach(pattern => {
        try {
          const regex = new RegExp(pattern, 'i');
          if (regex.test(text)) {
            score += 0.2;
          }
        } catch (e) {
          // Invalid regex pattern
        }
      });
    }
    
    if (mlFeatures.sentiment_indicators) {
      const indicators = mlFeatures.sentiment_indicators as string[];
      const textLower = text.toLowerCase();
      indicators.forEach(indicator => {
        if (textLower.includes(indicator.toLowerCase())) {
          score += 0.1;
        }
      });
    }
    
    return Math.min(score, 1.0);
  }
  
  /**
   * Update rule confidence based on user feedback
   */
  async updateRuleConfidence(
    ruleId: string,
    feedback: {
      wasAccurate: boolean;
      userCorrection?: string;
      confidence: number;
    }
  ): Promise<void> {
    try {
      // Update rule confidence
      await supabaseAdmin
        .from('clause_rules')
        .update({
          confidence_score: feedback.confidence,
          last_updated_confidence: new Date().toISOString()
        })
        .eq('id', ruleId);
        
      // Update performance metrics
      const { data: performance, error: perfError } = await supabaseAdmin
        .from('rule_performance')
        .select('*')
        .eq('rule_id', ruleId)
        .single();
        
      if (perfError && perfError.code !== 'PGRST116') {
        throw perfError;
      }
      
      const updates = performance ? {
        true_positives: feedback.wasAccurate ? performance.true_positives + 1 : performance.true_positives,
        false_positives: !feedback.wasAccurate ? performance.false_positives + 1 : performance.false_positives,
        calculation_sample_size: performance.calculation_sample_size + 1
      } : {
        rule_id: ruleId,
        true_positives: feedback.wasAccurate ? 1 : 0,
        false_positives: feedback.wasAccurate ? 0 : 1,
        true_negatives: 0,
        false_negatives: 0,
        calculation_sample_size: 1
      };
      
      await supabaseAdmin
        .from('rule_performance')
        .upsert(updates);
        
      // Clear cache
      this.clearCache();
      
    } catch (error) {
      console.error('Failed to update rule confidence:', error);
      throw error;
    }
  }
  
  /**
   * Get rule effectiveness analytics
   */
  async getRuleAnalytics(clauseId?: string, partyPerspective?: PartyPerspective): Promise<{
    totalRules: number;
    avgConfidence: number;
    highPerformingRules: number;
    recentUpdates: number;
    topPerformers: HierarchicalRule[];
  }> {
    try {
      let query = supabaseAdmin
        .from('clause_rules')
        .select(`
          *,
          rule_performance (precision, recall, f1_score, calculation_sample_size)
        `);
        
      if (clauseId) {
        query = query.eq('clause_id', clauseId);
      }
      
      if (partyPerspective) {
        query = query.eq('party_perspective', partyPerspective);
      }
      
      const { data: rules, error } = await query;
      
      if (error) throw error;
      
      const totalRules = rules?.length || 0;
      const avgConfidence = rules?.reduce((sum, rule) => sum + parseFloat(rule.confidence_score), 0) / totalRules;
      const highPerformingRules = rules?.filter(rule => 
        rule.rule_performance?.[0]?.f1_score > 0.8
      ).length || 0;
      
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const recentUpdates = rules?.filter(rule => 
        rule.last_updated_confidence && rule.last_updated_confidence > oneWeekAgo
      ).length || 0;
      
      const topPerformers = rules
        ?.filter(rule => rule.rule_performance?.[0])
        ?.sort((a, b) => (b.rule_performance?.[0]?.f1_score || 0) - (a.rule_performance?.[0]?.f1_score || 0))
        ?.slice(0, 5)
        ?.map(rule => this.buildHierarchy([rule])[0]) || [];
      
      return {
        totalRules,
        avgConfidence: avgConfidence || 0,
        highPerformingRules,
        recentUpdates,
        topPerformers
      };
    } catch (error) {
      console.error('Failed to get rule analytics:', error);
      return {
        totalRules: 0,
        avgConfidence: 0,
        highPerformingRules: 0,
        recentUpdates: 0,
        topPerformers: []
      };
    }
  }
  
  /**
   * Clear internal caches
   */
  clearCache(): void {
    this.ruleCache.clear();
    this.performanceCache.clear();
  }
}

// Export singleton instance
export const hierarchicalRulesEngine = new HierarchicalRulesEngine();