// lib/services/mlConfidenceScoring.ts
// Machine Learning confidence scoring system with continuous learning

import { supabaseAdmin } from '../supabase';
import type { PartyPerspective } from '@/types';

export interface MLFeatures {
  // Text-based features
  clauseLength: number;
  keywordDensity: number;
  sentimentScore: number;
  readabilityScore: number;
  
  // Structural features
  paragraphCount: number;
  sentenceCount: number;
  averageSentenceLength: number;
  capitalizedWords: number;
  
  // Legal-specific features
  legalTermDensity: number;
  modalVerbCount: number;
  definitionIndicators: number;
  crossReferences: number;
  
  // Context features
  documentPosition: number; // Position in document (0-1)
  proximityToKeyTerms: number;
  hasNumberedLists: boolean;
  hasSubsections: boolean;
  
  // Historical features
  historicalAccuracy: number;
  userOverrideRate: number;
  averageProcessingTime: number;
}

export interface ConfidenceScoreComponents {
  baseline: number; // Base confidence from rule
  mlAdjustment: number; // ML model adjustment
  historyBoost: number; // Historical performance boost
  contextBoost: number; // Document context boost
  penaltyFactor: number; // Penalty for poor past performance
  finalScore: number; // Combined confidence score
}

export interface MLTrainingData {
  rule_id: string;
  features: MLFeatures;
  user_feedback: 'accepted' | 'rejected' | 'modified';
  confidence_at_prediction: number;
  actual_match_quality: number; // 0-1 based on user feedback
  processing_context: {
    party_perspective: PartyPerspective;
    document_type: string;
    user_experience_level: string;
  };
}

export class MLConfidenceScoring {
  private modelCache: Map<string, any> = new Map();
  private featureWeights: Record<string, number> = {
    // Default weights - will be updated through learning
    clauseLength: 0.05,
    keywordDensity: 0.15,
    sentimentScore: 0.08,
    readabilityScore: 0.06,
    paragraphCount: 0.04,
    sentenceCount: 0.03,
    averageSentenceLength: 0.02,
    legalTermDensity: 0.20,
    modalVerbCount: 0.08,
    definitionIndicators: 0.12,
    crossReferences: 0.09,
    documentPosition: 0.03,
    proximityToKeyTerms: 0.15,
    historicalAccuracy: 0.25,
    userOverrideRate: -0.20, // Negative weight for high override rates
    contextualRelevance: 0.10
  };
  
  /**
   * Extract ML features from document text and clause context
   */
  extractFeatures(
    documentText: string,
    clauseText: string,
    ruleId: string,
    context: {
      partyPerspective: PartyPerspective;
      documentLength: number;
      clausePosition: number;
    }
  ): MLFeatures {
    const fullText = clauseText || documentText.substring(context.clausePosition, context.clausePosition + 500);
    
    // Basic text metrics
    const words = fullText.split(/\s+/).filter(w => w.length > 0);
    const sentences = fullText.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const paragraphs = fullText.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    
    // Keyword analysis
    const legalTerms = [
      'confidential', 'proprietary', 'trade secret', 'disclose', 'receive',
      'obligation', 'covenant', 'warrant', 'represent', 'agree',
      'shall', 'will', 'must', 'may', 'should', 'including', 'excluding',
      'governed by', 'jurisdiction', 'applicable law', 'breach', 'remedy'
    ];
    
    const modalVerbs = ['shall', 'will', 'must', 'may', 'should', 'would', 'could'];
    const definitionWords = ['means', 'defined as', 'includes', 'refers to', 'constitutes'];
    
    const keywordCount = this.countMatches(fullText.toLowerCase(), ['confidential', 'disclosure', 'information']);
    const legalTermCount = this.countMatches(fullText.toLowerCase(), legalTerms);
    const modalVerbCount = this.countMatches(fullText.toLowerCase(), modalVerbs);
    const definitionCount = this.countMatches(fullText.toLowerCase(), definitionWords);
    
    // Cross-references detection
    const crossRefPatterns = [/section \d+/gi, /clause \d+/gi, /paragraph \d+/gi, /as defined/gi];
    const crossReferences = crossRefPatterns.reduce((count, pattern) => 
      count + (fullText.match(pattern) || []).length, 0
    );
    
    // Document structure analysis
    const hasNumberedLists = /\d+\.\s/.test(fullText) || /\(\w\)/.test(fullText);
    const hasSubsections = /^\s*\d+\.\d+/.test(fullText);
    
    // Sentiment analysis (simplified)
    const positiveWords = ['agree', 'accept', 'approve', 'permit', 'allow'];
    const negativeWords = ['not', 'never', 'exclude', 'prohibit', 'restrict'];
    const sentimentScore = (
      this.countMatches(fullText.toLowerCase(), positiveWords) -
      this.countMatches(fullText.toLowerCase(), negativeWords)
    ) / words.length;
    
    return {
      clauseLength: fullText.length,
      keywordDensity: keywordCount / words.length,
      sentimentScore: Math.max(-1, Math.min(1, sentimentScore)),
      readabilityScore: this.calculateReadabilityScore(fullText),
      paragraphCount: paragraphs.length,
      sentenceCount: sentences.length,
      averageSentenceLength: words.length / Math.max(sentences.length, 1),
      capitalizedWords: words.filter(w => /^[A-Z]/.test(w)).length,
      legalTermDensity: legalTermCount / words.length,
      modalVerbCount: modalVerbCount,
      definitionIndicators: definitionCount,
      crossReferences: crossReferences,
      documentPosition: context.clausePosition / context.documentLength,
      proximityToKeyTerms: this.calculateProximityScore(fullText, legalTerms),
      hasNumberedLists: hasNumberedLists,
      hasSubsections: hasSubsections,
      historicalAccuracy: 0.7, // Will be populated from database
      userOverrideRate: 0.1, // Will be populated from database
      averageProcessingTime: 0 // Will be populated from database
    };
  }
  
  /**
   * Calculate ML-adjusted confidence score
   */
  async calculateMLConfidence(
    baseConfidence: number,
    features: MLFeatures,
    ruleId: string,
    partyPerspective: PartyPerspective
  ): Promise<ConfidenceScoreComponents> {
    try {
      // Get historical performance data
      const historicalData = await this.getHistoricalPerformance(ruleId);
      
      // Update features with historical data
      features.historicalAccuracy = historicalData.accuracy;
      features.userOverrideRate = historicalData.overrideRate;
      features.averageProcessingTime = historicalData.avgProcessingTime;
      
      // Calculate ML adjustment using feature weights
      let mlAdjustment = 0;
      Object.entries(this.featureWeights).forEach(([feature, weight]) => {
        const featureValue = features[feature as keyof MLFeatures] as number;
        if (typeof featureValue === 'number') {
          mlAdjustment += featureValue * weight;
        }
      });
      
      // Normalize ML adjustment to reasonable range (-0.3 to +0.3)
      mlAdjustment = Math.max(-0.3, Math.min(0.3, mlAdjustment));
      
      // Historical performance boost/penalty
      const historyBoost = historicalData.accuracy > 0.8 ? 0.1 : 
                          historicalData.accuracy < 0.5 ? -0.15 : 0;
      
      // Context-based adjustments
      const contextBoost = this.calculateContextBoost(features, partyPerspective);
      
      // Penalty for high user override rates
      const penaltyFactor = features.userOverrideRate > 0.3 ? -0.2 : 0;
      
      // Calculate final score
      const finalScore = Math.max(0.1, Math.min(1.0, 
        baseConfidence + mlAdjustment + historyBoost + contextBoost + penaltyFactor
      ));
      
      return {
        baseline: baseConfidence,
        mlAdjustment,
        historyBoost,
        contextBoost,
        penaltyFactor,
        finalScore
      };
      
    } catch (error) {
      console.error('ML confidence calculation failed:', error);
      
      // Fallback to baseline with small random adjustment
      const fallbackAdjustment = (Math.random() - 0.5) * 0.1;
      return {
        baseline: baseConfidence,
        mlAdjustment: fallbackAdjustment,
        historyBoost: 0,
        contextBoost: 0,
        penaltyFactor: 0,
        finalScore: Math.max(0.1, Math.min(1.0, baseConfidence + fallbackAdjustment))
      };
    }
  }
  
  /**
   * Store training data from user feedback
   */
  async recordTrainingData(
    ruleId: string,
    features: MLFeatures,
    userFeedback: 'accepted' | 'rejected' | 'modified',
    confidenceAtPrediction: number,
    context: {
      partyPerspective: PartyPerspective;
      documentType: string;
      userExperienceLevel: string;
    }
  ): Promise<void> {
    try {
      // Calculate actual match quality based on user feedback
      let actualQuality = 0.5; // Default for modified
      if (userFeedback === 'accepted') actualQuality = 1.0;
      if (userFeedback === 'rejected') actualQuality = 0.0;
      
      // Store in user_feedback table with extended data
      await supabaseAdmin
        .from('user_feedback')
        .insert({
          document_id: crypto.randomUUID(), // Should be passed from calling context
          predicted_rule_id: ruleId,
          user_action: userFeedback,
          confidence_at_prediction: confidenceAtPrediction,
          detection_method: 'hierarchical',
          processing_time_ms: features.averageProcessingTime,
          user_feedback: JSON.stringify({
            features,
            actual_quality: actualQuality,
            context
          })
        });
      
      // Queue for batch learning
      await this.queueForLearning({
        rule_id: ruleId,
        features,
        user_feedback: userFeedback,
        confidence_at_prediction: confidenceAtPrediction,
        actual_match_quality: actualQuality,
        processing_context: {
          party_perspective: context.partyPerspective,
          document_type: context.documentType,
          user_experience_level: context.userExperienceLevel
        }
      });
      
    } catch (error) {
      console.error('Failed to record training data:', error);
    }
  }
  
  /**
   * Process learning queue and update model weights
   */
  async processLearningQueue(): Promise<{
    processed: number;
    improvements_applied: number;
    errors: string[];
  }> {
    try {
      // Get pending learning tasks
      const { data: learningTasks, error } = await supabaseAdmin
        .from('learning_queue')
        .select('*')
        .eq('processing_status', 'pending')
        .limit(50);
        
      if (error) throw error;
      if (!learningTasks || learningTasks.length === 0) {
        return { processed: 0, improvements_applied: 0, errors: [] };
      }
      
      let processed = 0;
      let improvementsApplied = 0;
      const errors: string[] = [];
      
      for (const task of learningTasks) {
        try {
          // Mark as processing
          await supabaseAdmin
            .from('learning_queue')
            .update({ processing_status: 'processing' })
            .eq('id', task.id);
          
          // Extract training data from batch
          const trainingBatch = task.feedback_batch as MLTrainingData[];
          
          // Update feature weights based on feedback
          const weightUpdates = this.calculateWeightUpdates(trainingBatch);
          
          // Apply weight updates
          Object.entries(weightUpdates).forEach(([feature, adjustment]) => {
            if (this.featureWeights[feature] !== undefined) {
              this.featureWeights[feature] += adjustment;
              // Clamp weights to reasonable ranges
              this.featureWeights[feature] = Math.max(-1, Math.min(1, this.featureWeights[feature]));
            }
          });
          
          // Update rule performance metrics
          await this.updateRulePerformanceMetrics(trainingBatch);
          
          // Mark as completed
          await supabaseAdmin
            .from('learning_queue')
            .update({ 
              processing_status: 'completed',
              processed_at: new Date().toISOString(),
              improvements_applied: Object.keys(weightUpdates).length
            })
            .eq('id', task.id);
          
          processed++;
          improvementsApplied += Object.keys(weightUpdates).length;
          
        } catch (taskError) {
          errors.push(`Task ${task.id}: ${taskError}`);
          
          // Mark as failed
          await supabaseAdmin
            .from('learning_queue')
            .update({ 
              processing_status: 'failed',
              error_message: String(taskError)
            })
            .eq('id', task.id);
        }
      }
      
      return { processed, improvements_applied: improvementsApplied, errors };
      
    } catch (error) {
      console.error('Learning queue processing failed:', error);
      return { processed: 0, improvements_applied: 0, errors: [String(error)] };
    }
  }
  
  /**
   * Get analytics on ML model performance
   */
  async getMLAnalytics(): Promise<{
    totalTrainingExamples: number;
    accuracyImprovement: number;
    averageConfidenceCalibration: number;
    topPerformingFeatures: Array<{ feature: string; weight: number; impact: string }>;
    recentImprovements: number;
  }> {
    try {
      // Get training data statistics
      const { data: feedbackStats } = await supabaseAdmin
        .from('user_feedback')
        .select('user_action, confidence_at_prediction, created_at')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
      
      const totalExamples = feedbackStats?.length || 0;
      
      // Calculate accuracy improvement (simplified)
      const recentAccuracy = feedbackStats
        ?.filter(f => f.user_action === 'accepted')
        ?.length || 0;
      const accuracyRate = totalExamples > 0 ? recentAccuracy / totalExamples : 0;
      
      // Calculate confidence calibration
      const avgConfidence = feedbackStats?.reduce((sum, f) => 
        sum + (f.confidence_at_prediction || 0), 0) / Math.max(totalExamples, 1);
      
      // Analyze feature performance
      const topFeatures = Object.entries(this.featureWeights)
        .sort(([,a], [,b]) => Math.abs(b) - Math.abs(a))
        .slice(0, 5)
        .map(([feature, weight]) => ({
          feature,
          weight,
          impact: Math.abs(weight) > 0.1 ? 'High' : Math.abs(weight) > 0.05 ? 'Medium' : 'Low'
        }));
      
      // Count recent improvements
      const { data: recentQueue } = await supabaseAdmin
        .from('learning_queue')
        .select('improvements_applied')
        .eq('processing_status', 'completed')
        .gte('processed_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
      
      const recentImprovements = recentQueue?.reduce((sum, q) => 
        sum + (q.improvements_applied || 0), 0) || 0;
      
      return {
        totalTrainingExamples: totalExamples,
        accuracyImprovement: accuracyRate * 100,
        averageConfidenceCalibration: avgConfidence,
        topPerformingFeatures: topFeatures,
        recentImprovements
      };
      
    } catch (error) {
      console.error('Failed to get ML analytics:', error);
      return {
        totalTrainingExamples: 0,
        accuracyImprovement: 0,
        averageConfidenceCalibration: 0.7,
        topPerformingFeatures: [],
        recentImprovements: 0
      };
    }
  }
  
  // Helper methods
  private countMatches(text: string, terms: string[]): number {
    return terms.reduce((count, term) => {
      const regex = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      return count + (text.match(regex) || []).length;
    }, 0);
  }
  
  private calculateReadabilityScore(text: string): number {
    // Simplified Flesch Reading Ease score
    const words = text.split(/\s+/).length;
    const sentences = text.split(/[.!?]+/).length;
    const syllables = this.countSyllables(text);
    
    if (words === 0 || sentences === 0) return 0;
    
    const score = 206.835 - (1.015 * (words / sentences)) - (84.6 * (syllables / words));
    return Math.max(0, Math.min(100, score)) / 100; // Normalize to 0-1
  }
  
  private countSyllables(text: string): number {
    return text.toLowerCase()
      .replace(/[^a-z]/g, '')
      .replace(/[aeiou]{2,}/g, 'a')
      .replace(/[^aeiou]/g, '')
      .length || 1;
  }
  
  private calculateProximityScore(text: string, keyTerms: string[]): number {
    let totalProximity = 0;
    let termCount = 0;
    
    keyTerms.forEach(term => {
      const index = text.toLowerCase().indexOf(term.toLowerCase());
      if (index !== -1) {
        // Closer to beginning = higher score
        const proximity = 1 - (index / text.length);
        totalProximity += proximity;
        termCount++;
      }
    });
    
    return termCount > 0 ? totalProximity / termCount : 0;
  }
  
  private async getHistoricalPerformance(ruleId: string): Promise<{
    accuracy: number;
    overrideRate: number;
    avgProcessingTime: number;
  }> {
    try {
      const { data: performance } = await supabaseAdmin
        .from('rule_performance')
        .select('*')
        .eq('rule_id', ruleId)
        .single();
      
      if (performance) {
        const total = performance.true_positives + performance.false_positives + 
                     performance.true_negatives + performance.false_negatives;
        const accuracy = total > 0 ? 
          (performance.true_positives + performance.true_negatives) / total : 0.7;
        
        return {
          accuracy: accuracy,
          overrideRate: 0.1, // Would calculate from user_feedback
          avgProcessingTime: 500 // Would calculate from processing logs
        };
      }
    } catch (error) {
      console.warn('Failed to get historical performance:', error);
    }
    
    return { accuracy: 0.7, overrideRate: 0.1, avgProcessingTime: 500 };
  }
  
  private calculateContextBoost(features: MLFeatures, partyPerspective: PartyPerspective): number {
    let boost = 0;
    
    // Boost for strong legal term density
    if (features.legalTermDensity > 0.1) boost += 0.05;
    
    // Boost for good document structure
    if (features.hasNumberedLists || features.hasSubsections) boost += 0.03;
    
    // Boost for appropriate clause length
    if (features.clauseLength > 100 && features.clauseLength < 1000) boost += 0.02;
    
    // Party-specific boosts
    if (partyPerspective === 'receiving' && features.sentimentScore < 0) {
      boost += 0.02; // Restrictive language good for receiving party
    } else if (partyPerspective === 'disclosing' && features.sentimentScore > 0) {
      boost += 0.02; // Permissive language good for disclosing party
    }
    
    return boost;
  }
  
  private calculateWeightUpdates(trainingBatch: MLTrainingData[]): Record<string, number> {
    const updates: Record<string, number> = {};
    const learningRate = 0.01;
    
    trainingBatch.forEach(example => {
      const error = example.actual_match_quality - example.confidence_at_prediction;
      
      // Update weights based on prediction error
      Object.entries(example.features).forEach(([feature, value]) => {
        if (typeof value === 'number' && this.featureWeights[feature] !== undefined) {
          const gradient = error * value;
          updates[feature] = (updates[feature] || 0) + learningRate * gradient;
        }
      });
    });
    
    return updates;
  }
  
  private async updateRulePerformanceMetrics(trainingBatch: MLTrainingData[]): Promise<void> {
    const ruleUpdates = new Map<string, { tp: number; fp: number; tn: number; fn: number }>();
    
    trainingBatch.forEach(example => {
      const current = ruleUpdates.get(example.rule_id) || { tp: 0, fp: 0, tn: 0, fn: 0 };
      
      if (example.user_feedback === 'accepted') {
        current.tp++;
      } else if (example.user_feedback === 'rejected') {
        if (example.confidence_at_prediction > 0.5) {
          current.fp++;
        } else {
          current.tn++;
        }
      } else { // modified
        current.fp++; // Treat as false positive since it needed modification
      }
      
      ruleUpdates.set(example.rule_id, current);
    });
    
    // Update database
    for (const [ruleId, metrics] of ruleUpdates) {
      await supabaseAdmin
        .from('rule_performance')
        .upsert({
          rule_id: ruleId,
          true_positives: metrics.tp,
          false_positives: metrics.fp,
          true_negatives: metrics.tn,
          false_negatives: metrics.fn,
          calculation_sample_size: metrics.tp + metrics.fp + metrics.tn + metrics.fn
        });
    }
  }
  
  private async queueForLearning(trainingData: MLTrainingData): Promise<void> {
    try {
      // Get or create learning batch
      const { data: existingBatch } = await supabaseAdmin
        .from('learning_queue')
        .select('*')
        .eq('processing_status', 'pending')
        .limit(1)
        .single();
      
      if (existingBatch) {
        // Add to existing batch
        const currentBatch = existingBatch.feedback_batch as MLTrainingData[];
        currentBatch.push(trainingData);
        
        await supabaseAdmin
          .from('learning_queue')
          .update({ feedback_batch: currentBatch })
          .eq('id', existingBatch.id);
      } else {
        // Create new batch
        await supabaseAdmin
          .from('learning_queue')
          .insert({
            feedback_batch: [trainingData],
            processing_status: 'pending',
            model_version: '2.0-hierarchical-ml'
          });
      }
    } catch (error) {
      console.error('Failed to queue learning data:', error);
    }
  }
}

// Export singleton instance
export const mlConfidenceScoring = new MLConfidenceScoring();