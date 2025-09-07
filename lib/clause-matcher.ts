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
 * Calculate keyword overlap score between text and rule keywords
 */
function calculateKeywordOverlap(text: string, keywords: string[]): {
  matchedKeywords: string[];
  score: number;
} {
  const normalizedText = text.toLowerCase();
  const matchedKeywords: string[] = [];
  
  for (const keyword of keywords) {
    const normalizedKeyword = keyword.toLowerCase();
    if (normalizedText.includes(normalizedKeyword)) {
      matchedKeywords.push(keyword);
    }
  }
  
  // Score is percentage of keywords that matched
  const score = keywords.length > 0 ? (matchedKeywords.length / keywords.length) : 0;
  
  return { matchedKeywords, score };
}

/**
 * Find text segments that might contain specific clause content
 */
function findRelevantTextSegments(text: string, keywords: string[], maxSegmentLength = 500): Array<{
  text: string;
  position: { start: number; end: number };
  score: number;
}> {
  const segments: Array<{
    text: string;
    position: { start: number; end: number };
    score: number;
  }> = [];
  
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
  
  for (let i = 0; i < sentences.length; i++) {
    // Create overlapping windows of 1-3 sentences
    for (let windowSize = 1; windowSize <= Math.min(3, sentences.length - i); windowSize++) {
      const segmentText = sentences.slice(i, i + windowSize).join('. ').trim();
      
      if (segmentText.length > maxSegmentLength) continue;
      
      const { matchedKeywords, score } = calculateKeywordOverlap(segmentText, keywords);
      
      if (score > 0.1) { // Only include segments with some keyword overlap
        const start = text.indexOf(segmentText);
        const end = start + segmentText.length;
        
        segments.push({
          text: segmentText,
          position: { start: Math.max(0, start), end },
          score
        });
      }
    }
  }
  
  // Sort by score and return top segments
  return segments
    .sort((a, b) => b.score - a.score)
    .slice(0, 5); // Top 5 most relevant segments
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
 * Main function to analyze document text against party-specific rules
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
    const foundClauseIds = new Set<string>();
    
    // Group rules by clause for organized analysis
    const rulesByClause = rules.reduce((acc, rule) => {
      if (!acc[rule.clause_id]) {
        acc[rule.clause_id] = [];
      }
      acc[rule.clause_id].push(rule);
      return acc;
    }, {} as Record<string, ClauseRule[]>);
    
    // Analyze each clause
    for (const clause of clauses) {
      const clauseRules = rulesByClause[clause.id] || [];
      let bestMatch: ClauseMatch | null = null;
      let highestScore = 0;
      
      for (const rule of clauseRules) {
        if (!rule.keywords || rule.keywords.length === 0) continue;
        
        // Find relevant text segments for this rule
        const segments = findRelevantTextSegments(documentText, rule.keywords);
        
        for (const segment of segments) {
          if (segment.score > highestScore) {
            highestScore = segment.score;
            
            const { matchedKeywords } = calculateKeywordOverlap(segment.text, rule.keywords);
            
            bestMatch = {
              clauseId: rule.clause_id,
              clauseName: clause.name,
              ruleId: rule.id,
              ruleType: rule.rule_type,
              matchedText: segment.text,
              matchedKeywords,
              confidenceScore: segment.score,
              position: segment.position
            };
          }
        }
      }
      
      if (bestMatch && bestMatch.confidenceScore >= 0.2) { // Minimum threshold
        matches.push(bestMatch);
        foundClauseIds.add(clause.id);
      }
    }
    
    // Identify missing clauses
    const missingClauses = clauses
      .filter(clause => !foundClauseIds.has(clause.id))
      .map(clause => clause.name);
    
    // Calculate overall score
    const totalClauses = clauses.length;
    const foundClauses = matches.length;
    const avgConfidence = matches.length > 0 
      ? matches.reduce((sum, match) => sum + match.confidenceScore, 0) / matches.length 
      : 0;
    
    const overallScore = (foundClauses / totalClauses) * 0.6 + avgConfidence * 0.4;
    
    return {
      matches: matches.sort((a, b) => b.confidenceScore - a.confidenceScore),
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