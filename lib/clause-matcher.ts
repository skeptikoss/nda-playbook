import { supabase } from './supabase';
import type { ClauseRule, PartyPerspective } from '@/types';

export interface ClauseMatch {
  clauseId: string;
  clauseName: string;
  ruleId: string;
  ruleType: 'starting_position' | 'fallback' | 'not_acceptable';
  matchedText: string;
  matchedKeywords: string[];
  confidenceScore: number;
  position: {
    start: number;
    end: number;
  };
}

export interface AnalysisResult {
  matches: ClauseMatch[];
  missingClauses: string[];
  overallScore: number;
  partyPerspective: PartyPerspective;
}

/**
 * Calculate Levenshtein distance for fuzzy matching
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
  
  for (let i = 0; i <= str1.length; i += 1) {
    matrix[0][i] = i;
  }
  
  for (let j = 0; j <= str2.length; j += 1) {
    matrix[j][0] = j;
  }
  
  for (let j = 1; j <= str2.length; j += 1) {
    for (let i = 1; i <= str1.length; i += 1) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + indicator
      );
    }
  }
  
  return matrix[str2.length][str1.length];
}

/**
 * Enhanced keyword overlap calculation with fuzzy matching and phrase detection
 */
function calculateKeywordOverlap(text: string, keywords: string[]): {
  matchedKeywords: string[];
  score: number;
} {
  const normalizedText = text.toLowerCase();
  const matchedKeywords: string[] = [];
  let totalMatchScore = 0;
  
  for (const keyword of keywords) {
    const normalizedKeyword = keyword.toLowerCase();
    let matched = false;
    let matchScore = 0;
    
    // Exact phrase matching (highest score)
    if (normalizedText.includes(normalizedKeyword)) {
      matchedKeywords.push(keyword);
      matchScore = 1.0;
      matched = true;
    }
    // Word-boundary matching for multi-word phrases
    else if (normalizedKeyword.includes(' ')) {
      const keywordWords = normalizedKeyword.split(' ');
      const foundWords = keywordWords.filter(word => 
        normalizedText.includes(word) || 
        normalizedText.split(/\W+/).some(textWord => 
          levenshteinDistance(textWord, word) <= Math.max(1, Math.floor(word.length * 0.15))
        )
      );
      
      if (foundWords.length >= keywordWords.length * 0.7) { // 70% of words must match
        matchedKeywords.push(keyword);
        matchScore = foundWords.length / keywordWords.length;
        matched = true;
      }
    }
    // Fuzzy matching for single words
    else {
      const textWords = normalizedText.split(/\W+/);
      for (const textWord of textWords) {
        if (textWord.length >= 3) { // Only fuzzy match words of reasonable length
          const distance = levenshteinDistance(textWord, normalizedKeyword);
          const maxDistance = Math.max(1, Math.floor(normalizedKeyword.length * 0.2)); // 20% error tolerance
          
          if (distance <= maxDistance) {
            matchedKeywords.push(keyword);
            matchScore = 1 - (distance / normalizedKeyword.length);
            matched = true;
            break;
          }
        }
      }
    }
    
    totalMatchScore += matchScore;
  }
  
  // Weighted score considering both match count and match quality
  const score = keywords.length > 0 ? totalMatchScore / keywords.length : 0;
  
  return { matchedKeywords: Array.from(new Set(matchedKeywords)), score };
}

/**
 * Enhanced text segmentation that better identifies clause boundaries
 */
function findRelevantTextSegments(text: string, keywords: string[], maxSegmentLength = 800): Array<{
  text: string;
  position: { start: number; end: number };
  score: number;
}> {
  const segments: Array<{
    text: string;
    position: { start: number; end: number };
    score: number;
  }> = [];
  
  // Split by multiple delimiters that commonly separate clauses in legal documents
  const clauseDelimiters = /(?:\n\s*\d+\.|\n\s*\([a-z]\)|\n\s*[A-Z][A-Z\s]+:|\n{2,}|\.(?=\s*[A-Z][a-z]+\s+[a-z]+)|;\s*(?=[A-Z]))/;
  const potentialClauses = text.split(clauseDelimiters).filter(s => s.trim().length > 20);
  
  // Also split by sentences for finer granularity
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
  
  // Combine both approaches
  const textSegments = [...potentialClauses, ...sentences];
  
  for (const segmentText of textSegments) {
    const cleanedSegment = segmentText.trim();
    
    if (cleanedSegment.length < 20 || cleanedSegment.length > maxSegmentLength) continue;
    
    const { matchedKeywords, score } = calculateKeywordOverlap(cleanedSegment, keywords);
    
    if (score > 0.2) { // Increased threshold for better precision
      // Find more accurate position using word boundaries
      const startIndex = text.toLowerCase().indexOf(cleanedSegment.toLowerCase());
      const endIndex = startIndex + cleanedSegment.length;
      
      // Check if this segment overlaps significantly with existing segments
      const hasSignificantOverlap = segments.some(existing => {
        const overlapStart = Math.max(existing.position.start, startIndex);
        const overlapEnd = Math.min(existing.position.end, endIndex);
        const overlapLength = Math.max(0, overlapEnd - overlapStart);
        const segmentLength = endIndex - startIndex;
        const overlapRatio = overlapLength / segmentLength;
        
        return overlapRatio > 0.7; // 70% overlap threshold
      });
      
      if (!hasSignificantOverlap) {
        segments.push({
          text: cleanedSegment,
          position: { start: Math.max(0, startIndex), end: endIndex },
          score
        });
      } else {
        // If overlapping, keep the one with higher score
        const existingIndex = segments.findIndex(existing => {
          const overlapStart = Math.max(existing.position.start, startIndex);
          const overlapEnd = Math.min(existing.position.end, endIndex);
          const overlapLength = Math.max(0, overlapEnd - overlapStart);
          const segmentLength = endIndex - startIndex;
          return overlapLength / segmentLength > 0.7;
        });
        
        if (existingIndex !== -1 && score > segments[existingIndex].score) {
          segments[existingIndex] = {
            text: cleanedSegment,
            position: { start: Math.max(0, startIndex), end: endIndex },
            score
          };
        }
      }
    }
  }
  
  // Sort by score and return top segments
  return segments
    .sort((a, b) => b.score - a.score)
    .slice(0, 8); // Increased to top 8 most relevant segments
}

/**
 * Fetch clause rules for specific party perspective
 */
async function fetchClauseRules(partyPerspective: PartyPerspective): Promise<ClauseRule[]> {
  const { data, error } = await supabase
    .from('clause_rules')
    .select(`
      id,
      clause_id,
      rule_type,
      party_perspective,
      rule_text,
      keywords,
      severity,
      guidance_notes,
      example_language,
      rewriting_prompt,
      created_at,
      updated_at
    `)
    .eq('party_perspective', partyPerspective)
    .order('severity', { ascending: false }); // Higher severity first
  
  if (error) {
    throw new Error(`Failed to fetch clause rules: ${error.message}`);
  }
  
  return data as ClauseRule[];
}

/**
 * Fetch clause information
 */
async function fetchClauses() {
  const { data, error } = await supabase
    .from('clauses')
    .select('id, name, category, display_order')
    .eq('is_active', true)
    .order('display_order');
  
  if (error) {
    throw new Error(`Failed to fetch clauses: ${error.message}`);
  }
  
  return data;
}

/**
 * Enhanced detection keywords for each clause type (Phase 1: Detection)
 * Including synonyms, legal variations, and common phrasings
 */
const DETECTION_KEYWORDS = {
  'definition': [
    // Core terms
    'confidential', 'information', 'define', 'proprietary', 'secret', 'disclosure',
    // Legal variations
    'confidentiality', 'proprietary information', 'trade secret', 'non-public',
    'sensitive information', 'business information', 'technical information',
    // Definition patterns
    'shall mean', 'means', 'includes', 'defined as', 'refers to',
    'confidential information shall include', 'for purposes of this agreement'
  ],
  'duration': [
    // Time periods
    'year', 'years', 'period', 'term', 'duration', 'survive', 'time', 'expir', 'effect',
    // Legal duration patterns
    'perpetuity', 'indefinite', 'until', 'from the date', 'effective date',
    'termination', 'expiration', 'survival', 'continue in effect',
    // Common durations
    'three years', 'five years', 'seven years', 'ten years', 'two years'
  ],
  'governing': [
    // Jurisdiction terms
    'govern', 'governed', 'jurisdiction', 'court', 'law', 'dispute', 'forum', 'venue',
    // Legal system references
    'applicable law', 'laws of', 'under the laws', 'subject to the laws',
    'federal court', 'state court', 'arbitration', 'mediation',
    // Dispute resolution
    'exclusive jurisdiction', 'submit to jurisdiction', 'waive objection'
  ]
};

/**
 * Enhanced clause detection with context awareness and multiple validation approaches
 */
function detectClauseInDocument(text: string, clauseName: string): {
  detected: boolean;
  bestText: string;
  confidence: number;
} {
  const clauseKey = clauseName.toLowerCase().includes('definition') ? 'definition' :
                   clauseName.toLowerCase().includes('duration') ? 'duration' :
                   clauseName.toLowerCase().includes('governing') ? 'governing' : null;
  
  if (!clauseKey) {
    return { detected: false, bestText: '', confidence: 0 };
  }
  
  const keywords = DETECTION_KEYWORDS[clauseKey];
  const segments = findRelevantTextSegments(text, keywords, 1000);
  
  if (segments.length === 0) {
    return { detected: false, bestText: '', confidence: 0 };
  }
  
  // Apply context-specific validation for each clause type
  const contextValidatedSegments = segments.filter(segment => {
    
    switch (clauseKey) {
      case 'definition':
        // Must contain definitional language patterns
        return /(?:shall mean|means|includes?|defined as|refers to|for purposes of)/i.test(segment.text) ||
               /confidential.*information.*(?:includes?|means|shall mean)/i.test(segment.text);
      
      case 'duration':
        // Must contain time references with legal context
        return /(?:\d+\s*years?|\d+\s*months?|perpetuity|indefinite|until|termination|expir|survival)/i.test(segment.text) &&
               /(?:period|term|duration|effect|continue|survive|remain)/i.test(segment.text);
      
      case 'governing':
        // Must contain jurisdiction or dispute resolution language
        return /(?:govern|jurisdiction|applicable law|laws? of|dispute|court|forum|venue|arbitrat)/i.test(segment.text);
      
      default:
        return true;
    }
  });
  
  if (contextValidatedSegments.length === 0) {
    // Fallback to original segments if context validation is too strict
    const bestSegment = segments[0];
    return {
      detected: bestSegment.score > 0.3, // Higher threshold for fallback
      bestText: bestSegment.text,
      confidence: bestSegment.score * 0.7 // Reduced confidence for non-validated matches
    };
  }
  
  // Select best validated segment
  const bestSegment = contextValidatedSegments[0];
  
  // Bonus confidence for context validation
  const validationBonus = 0.2;
  const adjustedConfidence = Math.min(1.0, bestSegment.score + validationBonus);
  
  return {
    detected: adjustedConfidence > 0.4, // Higher threshold for validated matches
    bestText: bestSegment.text,
    confidence: adjustedConfidence
  };
}

/**
 * Enhanced quality evaluation with party-perspective context and rule prioritisation
 */
function evaluateClauseForParty(
  detectedText: string,
  clauseRules: ClauseRule[],
  partyPerspective: PartyPerspective
): { ruleType: 'starting_position' | 'fallback' | 'not_acceptable'; confidence: number; bestRule: ClauseRule } | null {
  let bestScore = 0;
  let bestRule: ClauseRule | null = null;
  let bestRuleType: 'starting_position' | 'fallback' | 'not_acceptable' = 'not_acceptable';
  
  // Group rules by type for better evaluation
  const rulesByType = clauseRules.reduce((acc, rule) => {
    if (!acc[rule.rule_type]) acc[rule.rule_type] = [];
    acc[rule.rule_type].push(rule);
    return acc;
  }, {} as Record<string, ClauseRule[]>);
  
  // Test against each rule type with weighted scoring
  for (const rule of clauseRules) {
    if (!rule.keywords || rule.keywords.length === 0) continue;
    
    const { score } = calculateKeywordOverlap(detectedText, rule.keywords);
    
    // Apply party-specific weighting and rule context
    let weightedScore = score;
    
    // Bonus for rule text patterns in detected text
    if (rule.rule_text) {
      const ruleTextWords = rule.rule_text.toLowerCase().split(/\s+/).slice(0, 10); // First 10 words
      const ruleTextMatches = ruleTextWords.filter(word => 
        word.length > 3 && detectedText.toLowerCase().includes(word)
      ).length;
      
      if (ruleTextMatches > 0) {
        weightedScore += (ruleTextMatches / ruleTextWords.length) * 0.3; // Up to 30% bonus
      }
    }
    
    // Rule type priority weighting based on party perspective
    const typeWeights = {
      'receiving': { 'starting_position': 1.2, 'fallback': 1.0, 'not_acceptable': 0.8 },
      'disclosing': { 'starting_position': 1.2, 'fallback': 1.0, 'not_acceptable': 1.1 },
      'mutual': { 'starting_position': 1.1, 'fallback': 1.0, 'not_acceptable': 0.9 }
    };
    
    const typeWeight = typeWeights[partyPerspective]?.[rule.rule_type] || 1.0;
    weightedScore *= typeWeight;
    
    // Severity bonus (higher severity = more important rule)
    if (rule.severity) {
      weightedScore += (rule.severity - 1) * 0.1; // Up to 40% bonus for severity 5
    }
    
    if (weightedScore > bestScore) {
      bestScore = weightedScore;
      bestRule = rule;
      bestRuleType = rule.rule_type;
    }
  }
  
  // Enhanced fallback logic with party perspective consideration
  if (!bestRule || bestScore < 0.25) {
    // Try to find the most appropriate rule based on party perspective
    const preferredRuleTypes = {
      'receiving': ['starting_position', 'fallback', 'not_acceptable'],
      'disclosing': ['not_acceptable', 'fallback', 'starting_position'],
      'mutual': ['fallback', 'starting_position', 'not_acceptable']
    };
    
    for (const ruleType of preferredRuleTypes[partyPerspective]) {
      const rulesOfType = rulesByType[ruleType];
      if (rulesOfType && rulesOfType.length > 0) {
        // Pick the rule with highest severity
        const defaultRule = rulesOfType.sort((a, b) => (b.severity || 1) - (a.severity || 1))[0];
        return {
          ruleType: ruleType as 'starting_position' | 'fallback' | 'not_acceptable',
          confidence: 0.4, // Moderate confidence for party-context fallback
          bestRule: defaultRule
        };
      }
    }
    
    // Ultimate fallback
    const ultimateFallback = clauseRules[0];
    return ultimateFallback ? {
      ruleType: 'not_acceptable', // Conservative default
      confidence: 0.2, // Low confidence for ultimate fallback
      bestRule: ultimateFallback
    } : null;
  }
  
  return {
    ruleType: bestRuleType,
    confidence: Math.min(1.0, bestScore), // Cap at 100%
    bestRule: bestRule
  };
}

/**
 * Main function to analyze document text against party-specific rules
 * Improved with two-phase analysis: Detection → Quality Assessment
 */
export async function analyzeDocument(
  documentText: string, 
  partyPerspective: PartyPerspective = 'receiving'
): Promise<AnalysisResult> {
  try {
    // Fetch rules and clauses
    const [rules, clauses] = await Promise.all([
      fetchClauseRules(partyPerspective),
      fetchClauses()
    ]);
    
    const matches: ClauseMatch[] = [];
    const missingClauses: string[] = [];
    
    // Group rules by clause for organized analysis
    const rulesByClause = rules.reduce((acc, rule) => {
      if (!acc[rule.clause_id]) {
        acc[rule.clause_id] = [];
      }
      acc[rule.clause_id].push(rule);
      return acc;
    }, {} as Record<string, ClauseRule[]>);
    
    // Analyze each clause with improved two-phase approach
    for (const clause of clauses) {
      const clauseRules = rulesByClause[clause.id] || [];
      
      // PHASE 1: DETECTION - Does this clause exist in the document?
      const detection = detectClauseInDocument(documentText, clause.name);
      
      if (!detection.detected) {
        // Truly missing clause
        missingClauses.push(clause.name);
        continue;
      }
      
      // PHASE 2: QUALITY ASSESSMENT - How good is this clause for the party?
      const evaluation = evaluateClauseForParty(detection.bestText, clauseRules, partyPerspective);
      
      if (evaluation) {
        const { matchedKeywords } = calculateKeywordOverlap(detection.bestText, evaluation.bestRule.keywords || []);
        
        const match: ClauseMatch = {
          clauseId: clause.id,
          clauseName: clause.name,
          ruleId: evaluation.bestRule.id,
          ruleType: evaluation.ruleType,
          matchedText: detection.bestText,
          matchedKeywords,
          confidenceScore: evaluation.confidence,
          position: { start: 0, end: detection.bestText.length } // Simplified position
        };
        
        matches.push(match);
      } else {
        // Clause detected but couldn't evaluate properly - mark as missing for now
        missingClauses.push(clause.name);
      }
    }
    
    // Calculate overall score based on risk assessment
    const totalClauses = clauses.length;
    const foundClauses = matches.length;
    const avgConfidence = matches.length > 0 
      ? matches.reduce((sum, match) => sum + match.confidenceScore, 0) / matches.length 
      : 0;
    
    // Risk-based scoring: not_acceptable clauses increase risk
    const riskScore = matches.reduce((risk, match) => {
      if (match.ruleType === 'not_acceptable') return risk + 0.3;
      if (match.ruleType === 'fallback') return risk + 0.1;
      return risk; // starting_position adds no risk
    }, 0);
    
    const overallScore = Math.max(0, (foundClauses / totalClauses) * 0.5 + avgConfidence * 0.3 + (1 - riskScore) * 0.2);
    
    return {
      matches: matches.sort((a, b) => {
        // Sort by risk level first (not_acceptable first), then confidence
        const riskOrder = { 'not_acceptable': 3, 'fallback': 2, 'starting_position': 1 };
        const aRisk = riskOrder[a.ruleType];
        const bRisk = riskOrder[b.ruleType];
        if (aRisk !== bRisk) return bRisk - aRisk;
        return b.confidenceScore - a.confidenceScore;
      }),
      missingClauses,
      overallScore: Math.round(overallScore * 100) / 100,
      partyPerspective
    };
    
  } catch (error) {
    console.error('Document analysis error:', error);
    throw new Error(`Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get specific clause rule by ID for detailed analysis
 */
export async function getClauseRule(ruleId: string): Promise<ClauseRule | null> {
  const { data, error } = await supabase
    .from('clause_rules')
    .select('*')
    .eq('id', ruleId)
    .single();
  
  if (error) {
    console.error('Error fetching clause rule:', error);
    return null;
  }
  
  return data as ClauseRule;
}

/**
 * Get all rules for a specific clause and party perspective
 */
export async function getClauseRulesForPerspective(
  clauseId: string, 
  partyPerspective: PartyPerspective
): Promise<ClauseRule[]> {
  const { data, error } = await supabase
    .from('clause_rules')
    .select('*')
    .eq('clause_id', clauseId)
    .eq('party_perspective', partyPerspective)
    .order('severity', { ascending: false });
  
  if (error) {
    console.error('Error fetching clause rules:', error);
    return [];
  }
  
  return data as ClauseRule[];
}

/**
 * Helper function to format analysis results for display
 */
export function formatAnalysisResults(results: AnalysisResult): {
  summary: string;
  recommendations: string[];
  riskLevel: 'low' | 'medium' | 'high';
} {
  const { matches, missingClauses, overallScore } = results;
  
  let riskLevel: 'low' | 'medium' | 'high' = 'low';
  if (overallScore < 0.3) riskLevel = 'high';
  else if (overallScore < 0.6) riskLevel = 'medium';
  
  const summary = `Analysis complete for ${results.partyPerspective} party perspective. ` +
    `Found ${matches.length} clause matches with ${(overallScore * 100).toFixed(0)}% overall confidence. ` +
    `${missingClauses.length} clauses may be missing.`;
  
  const recommendations: string[] = [];
  
  if (missingClauses.length > 0) {
    recommendations.push(`Consider adding missing clauses: ${missingClauses.join(', ')}`);
  }
  
  const lowConfidenceMatches = matches.filter(m => m.confidenceScore < 0.5);
  if (lowConfidenceMatches.length > 0) {
    recommendations.push(`Review low-confidence matches for accuracy`);
  }
  
  const notAcceptableMatches = matches.filter(m => m.ruleType === 'not_acceptable');
  if (notAcceptableMatches.length > 0) {
    recommendations.push(`Address ${notAcceptableMatches.length} not-acceptable clause(s) immediately`);
  }
  
  return { summary, recommendations, riskLevel };
}