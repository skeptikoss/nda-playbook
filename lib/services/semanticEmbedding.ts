// lib/services/semanticEmbedding.ts
// Phase 1 Implementation: Semantic Clause Detection with Legal-BERT

import { pipeline } from '@xenova/transformers';
import crypto from 'crypto';

// Lazy-load supabase to avoid build-time initialization issues
let _supabase: any = null;
const getSupabase = () => {
  if (!_supabase) {
    _supabase = require('../supabase').supabase;
  }
  return _supabase;
};

interface EmbeddingResult {
  embedding: number[];
  tokens: number;
  model: string;
}

interface ClauseSegment {
  text: string;
  position: { start: number; end: number };
  embedding?: number[];
  similarity?: number;
}

interface DetectionResult {
  detected: boolean;
  confidence: number;
  segments: ClauseSegment[];
  method: 'semantic' | 'keyword' | 'hybrid';
  explanation?: string;
}

export class SemanticClauseDetector {
  private embedder: any = null;
  private modelName = 'Xenova/legal-bert-base-uncased';
  private clauseTemplates: Map<string, number[]> = new Map();
  private cache: Map<string, number[]> = new Map();
  
  /**
   * Initialize the semantic detector with legal-BERT model
   */
  async initialize(): Promise<void> {
    try {
      console.log('Initializing Legal-BERT embedder...');
      this.embedder = await pipeline(
        'feature-extraction',
        this.modelName,
        { revision: 'main' }
      );
      
      // Load pre-computed clause templates from database
      await this.loadClauseTemplates();
      console.log('Semantic detector initialized successfully');
    } catch (error) {
      console.error('Failed to initialize semantic detector:', error);
      throw error;
    }
  }
  
  /**
   * Load pre-computed embeddings for standard clause patterns
   */
  private async loadClauseTemplates(): Promise<void> {
    const templates = await getSupabase()
      .from('clause_templates')
      .select('clause_type, embedding')
      .eq('is_active', true);
    
    if (templates.data) {
      templates.data.forEach((template: any) => {
        this.clauseTemplates.set(
          template.clause_type,
          JSON.parse(template.embedding)
        );
      });
    }
    
    // If no templates exist, create default ones
    if (this.clauseTemplates.size === 0) {
      await this.createDefaultTemplates();
    }
  }
  
  /**
   * Create default clause templates for common NDA clauses
   */
  private async createDefaultTemplates(): Promise<void> {
    const defaultTemplates = {
      definition: "Confidential Information means any and all information disclosed by the Disclosing Party to the Receiving Party, whether orally, in writing, or in any other form, including but not limited to proprietary information, trade secrets, and know-how.",
      duration: "The obligations of the Receiving Party under this Agreement shall survive termination of this Agreement and continue for a period of five (5) years from the date of disclosure.",
      governing: "This Agreement shall be governed by and construed in accordance with the laws of the jurisdiction, without regard to its conflict of law provisions.",
      permitted_use: "The Receiving Party agrees to use the Confidential Information solely for the purpose of evaluating a potential business relationship between the parties.",
      non_disclosure: "The Receiving Party agrees not to disclose any Confidential Information to third parties without the prior written consent of the Disclosing Party.",
      return_of_info: "Upon termination of this Agreement or upon request by the Disclosing Party, the Receiving Party shall promptly return or destroy all Confidential Information.",
      no_license: "Nothing in this Agreement grants the Receiving Party any license or rights to the Confidential Information except as expressly set forth herein."
    };
    
    for (const [type, text] of Object.entries(defaultTemplates)) {
      const embedding = await this.generateEmbedding(text);
      this.clauseTemplates.set(type, embedding.embedding);
      
      // Store in database for persistence
      await getSupabase()
        .from('clause_templates')
        .upsert({
          clause_type: type,
          template_text: text,
          embedding: JSON.stringify(embedding.embedding),
          is_active: true
        });
    }
  }
  
  /**
   * Main detection function combining semantic and keyword approaches
   */
  async detectClause(
    text: string,
    clauseType: string,
    options: {
      method?: 'semantic' | 'keyword' | 'hybrid';
      threshold?: number;
      maxSegments?: number;
    } = {}
  ): Promise<DetectionResult> {
    const {
      method = 'hybrid',
      threshold = 0.7,
      maxSegments = 3
    } = options;
    
    let result: DetectionResult = {
      detected: false,
      confidence: 0,
      segments: [],
      method
    };
    
    try {
      if (method === 'semantic' || method === 'hybrid') {
        result = await this.semanticDetection(text, clauseType, threshold, maxSegments);
      }
      
      if (method === 'keyword' || (method === 'hybrid' && result.confidence < 0.6)) {
        const keywordResult = await this.keywordDetection(text, clauseType);
        
        if (method === 'hybrid') {
          // Combine results with weighted average
          result = this.combineResults(result, keywordResult);
        } else {
          result = keywordResult;
        }
      }
      
      // Generate explanation
      result.explanation = this.generateExplanation(result, clauseType);
      
    } catch (error) {
      console.error('Detection error:', error);
      // Fallback to keyword detection on error
      result = await this.keywordDetection(text, clauseType);
    }
    
    return result;
  }
  
  /**
   * Perform semantic similarity-based detection
   */
  private async semanticDetection(
    text: string,
    clauseType: string,
    threshold: number,
    maxSegments: number
  ): Promise<DetectionResult> {
    // Extract sliding windows from text
    const windows = this.extractSlidingWindows(text, 256, 64);
    
    // Get template embedding
    const templateEmbedding = this.clauseTemplates.get(clauseType);
    if (!templateEmbedding) {
      throw new Error(`No template found for clause type: ${clauseType}`);
    }
    
    // Score each window
    const scoredSegments: ClauseSegment[] = [];
    
    for (const window of windows) {
      const embedding = await this.getOrComputeEmbedding(window.text);
      const similarity = this.cosineSimilarity(embedding, templateEmbedding);
      
      scoredSegments.push({
        ...window,
        embedding,
        similarity
      });
    }
    
    // Sort by similarity and take top segments
    scoredSegments.sort((a, b) => (b.similarity || 0) - (a.similarity || 0));
    const topSegments = scoredSegments.slice(0, maxSegments);
    
    // Calculate aggregate confidence
    const confidence = this.calculateConfidence(topSegments, text, clauseType);
    
    return {
      detected: confidence >= threshold,
      confidence,
      segments: topSegments,
      method: 'semantic'
    };
  }
  
  /**
   * Enhanced keyword-based detection with patterns
   */
  private async keywordDetection(
    text: string,
    clauseType: string
  ): Promise<DetectionResult> {
    const patterns = this.getClausePatterns(clauseType);
    const keywords = this.getClauseKeywords(clauseType);
    
    let bestMatch: ClauseSegment | null = null;
    let maxScore = 0;
    
    // Check patterns first (higher confidence)
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match.index !== undefined) {
        const segment: ClauseSegment = {
          text: match[0],
          position: {
            start: match.index,
            end: match.index + match[0].length
          }
        };
        
        const score = 0.8 + (match[0].length / text.length) * 0.2;
        if (score > maxScore) {
          maxScore = score;
          bestMatch = segment;
        }
      }
    }
    
    // If no pattern match, check keywords
    if (!bestMatch) {
      const keywordMatches = this.findKeywordMatches(text, keywords);
      if (keywordMatches.length > 0) {
        maxScore = Math.min(0.6 + (keywordMatches.length * 0.1), 0.9);
        bestMatch = {
          text: text.substring(
            Math.max(0, keywordMatches[0].index - 50),
            Math.min(text.length, keywordMatches[0].index + 200)
          ),
          position: {
            start: keywordMatches[0].index,
            end: keywordMatches[0].index + keywordMatches[0].keyword.length
          }
        };
      }
    }
    
    return {
      detected: maxScore > 0.5,
      confidence: maxScore,
      segments: bestMatch ? [bestMatch] : [],
      method: 'keyword'
    };
  }
  
  /**
   * Combine semantic and keyword detection results
   */
  private combineResults(
    semantic: DetectionResult,
    keyword: DetectionResult
  ): DetectionResult {
    // Weighted combination: 70% semantic, 30% keyword
    const combinedConfidence = (semantic.confidence * 0.7) + (keyword.confidence * 0.3);
    
    // Merge segments, prioritizing semantic matches
    const segments = [...semantic.segments];
    
    // Add keyword segments that don't overlap with semantic ones
    for (const kSegment of keyword.segments) {
      const hasOverlap = segments.some(sSegment => 
        this.segmentsOverlap(sSegment, kSegment)
      );
      
      if (!hasOverlap) {
        segments.push(kSegment);
      }
    }
    
    return {
      detected: combinedConfidence > 0.6,
      confidence: combinedConfidence,
      segments: segments.slice(0, 5),
      method: 'hybrid'
    };
  }
  
  /**
   * Extract sliding windows from text for embedding
   */
  private extractSlidingWindows(
    text: string,
    windowSize: number,
    stride: number
  ): ClauseSegment[] {
    const windows: ClauseSegment[] = [];
    const words = text.split(/\s+/);
    
    for (let i = 0; i < words.length; i += stride) {
      const windowWords = words.slice(i, i + windowSize);
      if (windowWords.length < windowSize / 4) break; // Skip very small windows
      
      const windowText = windowWords.join(' ');
      const startPos = text.indexOf(windowWords[0], i > 0 ? windows[windows.length - 1]?.position.start : 0);
      
      windows.push({
        text: windowText,
        position: {
          start: startPos,
          end: startPos + windowText.length
        }
      });
    }
    
    return windows;
  }
  
  /**
   * Generate embedding with caching
   */
  private async getOrComputeEmbedding(text: string): Promise<number[]> {
    // Check cache first
    const hash = crypto.createHash('md5').update(text).digest('hex');
    
    if (this.cache.has(hash)) {
      return this.cache.get(hash)!;
    }
    
    // Check database cache
    const cached = await getSupabase()
      .from('clause_embeddings')
      .select('embedding')
      .eq('clause_hash', hash)
      .single();
    
    if (cached.data) {
      const embedding = JSON.parse(cached.data.embedding);
      this.cache.set(hash, embedding);
      return embedding;
    }
    
    // Generate new embedding
    const result = await this.generateEmbedding(text);
    
    // Store in caches
    this.cache.set(hash, result.embedding);
    await getSupabase()
      .from('clause_embeddings')
      .insert({
        clause_hash: hash,
        embedding: JSON.stringify(result.embedding),
        model_version: this.modelName
      });
    
    return result.embedding;
  }
  
  /**
   * Generate embedding using Legal-BERT
   */
  private async generateEmbedding(text: string): Promise<EmbeddingResult> {
    if (!this.embedder) {
      throw new Error('Embedder not initialized');
    }
    
    const result = await this.embedder(text, {
      pooling: 'mean',
      normalize: true
    });
    
    return {
      embedding: Array.from(result.data),
      tokens: result.tokens,
      model: this.modelName
    };
  }
  
  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(vec1: number[], vec2: number[]): number {
    if (vec1.length !== vec2.length) {
      throw new Error('Vectors must have same length');
    }
    
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;
    
    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      norm1 += vec1[i] * vec1[i];
      norm2 += vec2[i] * vec2[i];
    }
    
    norm1 = Math.sqrt(norm1);
    norm2 = Math.sqrt(norm2);
    
    if (norm1 === 0 || norm2 === 0) return 0;
    
    return dotProduct / (norm1 * norm2);
  }
  
  /**
   * Calculate contextual confidence score
   */
  private calculateConfidence(
    segments: ClauseSegment[],
    fullText: string,
    clauseType: string
  ): number {
    if (segments.length === 0) return 0;
    
    let confidence = segments[0].similarity || 0;
    
    // Boost for multiple high-scoring segments
    if (segments.length > 1 && segments[1].similarity && segments[1].similarity > 0.6) {
      confidence *= 1.1;
    }
    
    // Position boost for definition clauses (usually early)
    if (clauseType === 'definition' && segments[0].position.start < fullText.length * 0.3) {
      confidence *= 1.15;
    }
    
    // Position boost for governing law (usually late)
    if (clauseType === 'governing' && segments[0].position.start > fullText.length * 0.7) {
      confidence *= 1.1;
    }
    
    // Check for section headers
    const headerBoost = this.checkSectionHeaders(fullText, clauseType);
    confidence *= headerBoost;
    
    return Math.min(confidence, 1.0);
  }
  
  /**
   * Check for relevant section headers
   */
  private checkSectionHeaders(text: string, clauseType: string): number {
    const headerPatterns: Record<string, RegExp[]> = {
      definition: [
        /\n\s*\d+\.?\s*definitions?\s*\n/i,
        /\n\s*(?:article|section)\s+\w+\.?\s*definitions?\s*\n/i
      ],
      duration: [
        /\n\s*\d+\.?\s*term\s*\n/i,
        /\n\s*\d+\.?\s*duration\s*\n/i
      ],
      governing: [
        /\n\s*\d+\.?\s*governing\s+law\s*\n/i,
        /\n\s*\d+\.?\s*applicable\s+law\s*\n/i
      ]
    };
    
    const patterns = headerPatterns[clauseType];
    if (!patterns) return 1.0;
    
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        return 1.2;
      }
    }
    
    return 1.0;
  }
  
  /**
   * Get clause-specific patterns
   */
  private getClausePatterns(clauseType: string): RegExp[] {
    const patterns: Record<string, RegExp[]> = {
      definition: [
        /confidential\s+information\s+(?:means|includes|shall\s+mean)[^.]+\./gi,
        /"confidential\s+information"\s+(?:means|includes)[^.]+\./gi,
        /for\s+purposes\s+of\s+this\s+agreement[^.]*confidential[^.]+\./gi
      ],
      duration: [
        /(?:period|term)\s+of\s+\d+\s+(?:years?|months?)[^.]+\./gi,
        /survive\s+(?:termination|expiration)\s+for[^.]+\./gi,
        /remain\s+in\s+effect\s+(?:for|until)[^.]+\./gi
      ],
      governing: [
        /governed\s+by\s+(?:the\s+)?laws?\s+of[^.]+\./gi,
        /exclusive\s+jurisdiction\s+of\s+(?:the\s+)?courts?[^.]+\./gi,
        /disputes?\s+(?:shall|will)\s+be\s+(?:resolved|settled)[^.]+\./gi
      ]
    };
    
    return patterns[clauseType] || [];
  }
  
  /**
   * Get clause-specific keywords
   */
  private getClauseKeywords(clauseType: string): string[] {
    const keywords: Record<string, string[]> = {
      definition: [
        'confidential information',
        'proprietary information',
        'trade secret',
        'means',
        'includes',
        'defined as'
      ],
      duration: [
        'period',
        'term',
        'years',
        'survive',
        'termination',
        'expiration',
        'perpetuity'
      ],
      governing: [
        'governed',
        'jurisdiction',
        'applicable law',
        'disputes',
        'courts',
        'venue'
      ]
    };
    
    return keywords[clauseType] || [];
  }
  
  /**
   * Find keyword matches in text
   */
  private findKeywordMatches(
    text: string,
    keywords: string[]
  ): Array<{ keyword: string; index: number }> {
    const matches: Array<{ keyword: string; index: number }> = [];
    const lowerText = text.toLowerCase();
    
    for (const keyword of keywords) {
      const index = lowerText.indexOf(keyword.toLowerCase());
      if (index !== -1) {
        matches.push({ keyword, index });
      }
    }
    
    return matches.sort((a, b) => a.index - b.index);
  }
  
  /**
   * Check if two segments overlap
   */
  private segmentsOverlap(seg1: ClauseSegment, seg2: ClauseSegment): boolean {
    return seg1.position.start < seg2.position.end && 
           seg2.position.start < seg1.position.end;
  }
  
  /**
   * Generate human-readable explanation
   */
  private generateExplanation(result: DetectionResult, clauseType: string): string {
    if (!result.detected) {
      return `No ${clauseType} clause detected in the document.`;
    }
    
    const methodExplanation = {
      semantic: 'using AI-powered semantic analysis',
      keyword: 'using pattern and keyword matching',
      hybrid: 'using combined AI and pattern analysis'
    };
    
    let explanation = `${clauseType.charAt(0).toUpperCase() + clauseType.slice(1)} clause detected ${methodExplanation[result.method]} with ${(result.confidence * 100).toFixed(0)}% confidence.`;
    
    if (result.segments.length > 0) {
      const topSegment = result.segments[0];
      if (topSegment.similarity) {
        explanation += ` The detected text has ${(topSegment.similarity * 100).toFixed(0)}% similarity to standard ${clauseType} clauses.`;
      }
    }
    
    return explanation;
  }
}

// Export singleton instance
export const semanticDetector = new SemanticClauseDetector();