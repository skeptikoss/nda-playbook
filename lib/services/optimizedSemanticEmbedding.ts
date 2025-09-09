// lib/services/optimizedSemanticEmbedding.ts
// Optimized Legal-BERT semantic embedding service with advanced caching and performance improvements

import { supabaseAdmin } from '../supabase';

interface EmbeddingCache {
  embedding: number[];
  created_at: string;
  model_version: string;
  hit_count: number;
}

interface BatchEmbeddingRequest {
  texts: string[];
  hashes: string[];
  priority: 'high' | 'medium' | 'low';
}

interface PerformanceMetrics {
  cacheHitRate: number;
  averageProcessingTime: number;
  totalRequests: number;
  batchEfficiency: number;
  modelLoadTime: number;
}

export class OptimizedSemanticEmbedding {
  private modelCache: any = null;
  private embeddingCache: Map<string, EmbeddingCache> = new Map();
  private batchQueue: Array<{
    text: string;
    hash: string;
    resolve: (embedding: number[]) => void;
    reject: (error: Error) => void;
    priority: 'high' | 'medium' | 'low';
    timestamp: number;
  }> = [];
  
  private isModelLoading = false;
  private modelLoadPromise: Promise<any> | null = null;
  private batchTimer: NodeJS.Timeout | null = null;
  private performanceMetrics: PerformanceMetrics = {
    cacheHitRate: 0,
    averageProcessingTime: 0,
    totalRequests: 0,
    batchEfficiency: 0,
    modelLoadTime: 0
  };
  
  // Configuration
  private readonly CACHE_SIZE_LIMIT = 10000;
  private readonly BATCH_SIZE = 32;
  private readonly BATCH_TIMEOUT_MS = 100;
  private readonly MODEL_VERSION = 'legal-bert-base-uncased';
  private readonly CACHE_EXPIRY_HOURS = 24;
  
  /**
   * Initialize the model with optimized loading
   */
  async initialize(): Promise<void> {
    if (this.modelCache) return;
    
    if (this.isModelLoading) {
      return this.modelLoadPromise!;
    }
    
    this.isModelLoading = true;
    const loadStart = Date.now();
    
    this.modelLoadPromise = this.loadModelOptimized();
    
    try {
      await this.modelLoadPromise;
      this.performanceMetrics.modelLoadTime = Date.now() - loadStart;
      console.log(`Legal-BERT model loaded in ${this.performanceMetrics.modelLoadTime}ms`);
    } finally {
      this.isModelLoading = false;
      this.modelLoadPromise = null;
    }
  }
  
  /**
   * Get embeddings with intelligent caching and batching
   */
  async getEmbeddings(
    texts: string[],
    options: {
      priority?: 'high' | 'medium' | 'low';
      useCache?: boolean;
      forceFresh?: boolean;
    } = {}
  ): Promise<number[][]> {
    const {
      priority = 'medium',
      useCache = true,
      forceFresh = false
    } = options;
    
    const startTime = Date.now();
    this.performanceMetrics.totalRequests++;
    
    try {
      // Pre-process texts and generate cache keys
      const processedRequests = texts.map(text => ({
        text: this.preprocessText(text),
        hash: this.generateCacheKey(text),
        originalIndex: texts.indexOf(text)
      }));
      
      const results: Array<{ index: number; embedding: number[] }> = [];
      const missingRequests: Array<{ text: string; hash: string; index: number }> = [];
      
      // Check cache first (if enabled and not forcing fresh)
      if (useCache && !forceFresh) {
        for (const req of processedRequests) {
          const cached = await this.getCachedEmbedding(req.hash);
          if (cached) {
            results.push({ index: req.originalIndex, embedding: cached.embedding });
            this.performanceMetrics.cacheHitRate = 
              (this.performanceMetrics.cacheHitRate * (this.performanceMetrics.totalRequests - 1) + 1) / 
              this.performanceMetrics.totalRequests;
          } else {
            missingRequests.push({ 
              text: req.text, 
              hash: req.hash, 
              index: req.originalIndex 
            });
          }
        }
      } else {
        // No caching - compute all
        missingRequests.push(...processedRequests.map(req => ({
          text: req.text,
          hash: req.hash,
          index: req.originalIndex
        })));
      }
      
      // Compute missing embeddings
      if (missingRequests.length > 0) {
        const newEmbeddings = await this.computeEmbeddingsBatch(
          missingRequests.map(r => r.text),
          priority
        );
        
        // Cache new embeddings and add to results
        for (let i = 0; i < newEmbeddings.length; i++) {
          const req = missingRequests[i];
          const embedding = newEmbeddings[i];
          
          results.push({ index: req.index, embedding });
          
          if (useCache) {
            await this.cacheEmbedding(req.hash, embedding);
          }
        }
      }
      
      // Sort results by original index and extract embeddings
      const sortedResults = results
        .sort((a, b) => a.index - b.index)
        .map(r => r.embedding);
      
      // Update performance metrics
      const processingTime = Date.now() - startTime;
      this.performanceMetrics.averageProcessingTime = 
        (this.performanceMetrics.averageProcessingTime * (this.performanceMetrics.totalRequests - 1) + processingTime) / 
        this.performanceMetrics.totalRequests;
      
      return sortedResults;
      
    } catch (error) {
      console.error('Optimized embedding generation failed:', error);
      throw error;
    }
  }
  
  /**
   * Compute similarity scores with caching optimization
   */
  async computeSimilarity(
    text1: string,
    text2: string,
    options: { useCache?: boolean } = {}
  ): Promise<number> {
    try {
      const embeddings = await this.getEmbeddings([text1, text2], options);
      return this.cosineSimilarity(embeddings[0], embeddings[1]);
    } catch (error) {
      console.error('Similarity computation failed:', error);
      return 0;
    }
  }
  
  /**
   * Find most similar texts from a corpus with efficient batching
   */
  async findMostSimilar(
    queryText: string,
    corpus: string[],
    options: {
      topK?: number;
      threshold?: number;
      useCache?: boolean;
    } = {}
  ): Promise<Array<{ text: string; similarity: number; index: number }>> {
    const {
      topK = 5,
      threshold = 0.5,
      useCache = true
    } = options;
    
    try {
      // Get embeddings for query and corpus
      const [queryEmbedding, ...corpusEmbeddings] = await this.getEmbeddings(
        [queryText, ...corpus],
        { priority: 'high', useCache }
      );
      
      // Calculate similarities
      const similarities = corpusEmbeddings.map((embedding, index) => ({
        text: corpus[index],
        similarity: this.cosineSimilarity(queryEmbedding, embedding),
        index
      }));
      
      // Filter and sort
      return similarities
        .filter(s => s.similarity >= threshold)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, topK);
        
    } catch (error) {
      console.error('Similar text search failed:', error);
      return [];
    }
  }
  
  /**
   * Batch process embeddings with intelligent queuing
   */
  private async computeEmbeddingsBatch(
    texts: string[],
    priority: 'high' | 'medium' | 'low' = 'medium'
  ): Promise<number[][]> {
    // Ensure model is loaded
    await this.initialize();
    
    // For single text or high priority, process immediately
    if (texts.length === 1 || priority === 'high') {
      return this.computeEmbeddingsImmediate(texts);
    }
    
    // For multiple texts, use batching
    return new Promise((resolve, reject) => {
      const batchPromises = texts.map(text => this.queueForBatch(text, priority));
      Promise.all(batchPromises)
        .then(resolve)
        .catch(reject);
    });
  }
  
  /**
   * Queue text for batch processing
   */
  private queueForBatch(
    text: string,
    priority: 'high' | 'medium' | 'low'
  ): Promise<number[]> {
    return new Promise((resolve, reject) => {
      const hash = this.generateCacheKey(text);
      
      this.batchQueue.push({
        text,
        hash,
        resolve,
        reject,
        priority,
        timestamp: Date.now()
      });
      
      // Start batch timer if not running
      if (!this.batchTimer) {
        this.batchTimer = setTimeout(() => {
          this.processBatchQueue();
        }, this.BATCH_TIMEOUT_MS);
      }
      
      // Process immediately if batch is full
      if (this.batchQueue.length >= this.BATCH_SIZE) {
        if (this.batchTimer) {
          clearTimeout(this.batchTimer);
          this.batchTimer = null;
        }
        this.processBatchQueue();
      }
    });
  }
  
  /**
   * Process the batch queue
   */
  private async processBatchQueue(): Promise<void> {
    if (this.batchQueue.length === 0) return;
    
    // Sort by priority and timestamp
    this.batchQueue.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      return priorityDiff !== 0 ? priorityDiff : a.timestamp - b.timestamp;
    });
    
    // Take batch
    const batch = this.batchQueue.splice(0, this.BATCH_SIZE);
    
    try {
      const texts = batch.map(item => item.text);
      const embeddings = await this.computeEmbeddingsImmediate(texts);
      
      // Resolve all promises
      batch.forEach((item, index) => {
        item.resolve(embeddings[index]);
      });
      
      // Update batch efficiency
      this.performanceMetrics.batchEfficiency = 
        (this.performanceMetrics.batchEfficiency * 0.9) + (batch.length / this.BATCH_SIZE * 0.1);
        
    } catch (error) {
      // Reject all promises
      batch.forEach(item => item.reject(error as Error));
    }
    
    // Reset timer
    this.batchTimer = null;
    
    // Process remaining queue if any
    if (this.batchQueue.length > 0) {
      this.batchTimer = setTimeout(() => {
        this.processBatchQueue();
      }, this.BATCH_TIMEOUT_MS);
    }
  }
  
  /**
   * Immediate embedding computation (bypasses batching)
   */
  private async computeEmbeddingsImmediate(texts: string[]): Promise<number[][]> {
    try {
      // Mock Legal-BERT computation - in production this would use actual model
      // For now, return deterministic embeddings based on text content
      return texts.map(text => this.generateMockEmbedding(text));
      
    } catch (error) {
      console.error('Immediate embedding computation failed:', error);
      throw error;
    }
  }
  
  /**
   * Load model with optimization
   */
  private async loadModelOptimized(): Promise<any> {
    try {
      // Mock model loading - in production would load Legal-BERT
      await new Promise(resolve => setTimeout(resolve, 100)); // Simulate load time
      
      this.modelCache = {
        name: this.MODEL_VERSION,
        loaded: true,
        loadedAt: new Date().toISOString()
      };
      
      return this.modelCache;
      
    } catch (error) {
      console.error('Model loading failed:', error);
      throw error;
    }
  }
  
  /**
   * Get cached embedding from memory or database
   */
  private async getCachedEmbedding(hash: string): Promise<EmbeddingCache | null> {
    // Check memory cache first
    const memCached = this.embeddingCache.get(hash);
    if (memCached && !this.isCacheExpired(memCached.created_at)) {
      memCached.hit_count++;
      return memCached;
    }
    
    // Check database cache
    try {
      const { data, error } = await supabaseAdmin
        .from('clause_embeddings')
        .select('embedding, created_at, model_version')
        .eq('clause_hash', hash)
        .eq('model_version', this.MODEL_VERSION)
        .single();
        
      if (error || !data) return null;
      
      const cached: EmbeddingCache = {
        embedding: Array.from(data.embedding) as number[],
        created_at: data.created_at,
        model_version: data.model_version,
        hit_count: 1
      };
      
      // Store in memory cache
      this.embeddingCache.set(hash, cached);
      this.cleanupMemoryCache();
      
      return cached;
      
    } catch (error) {
      console.error('Database cache lookup failed:', error);
      return null;
    }
  }
  
  /**
   * Cache embedding in memory and database
   */
  private async cacheEmbedding(hash: string, embedding: number[]): Promise<void> {
    const cached: EmbeddingCache = {
      embedding,
      created_at: new Date().toISOString(),
      model_version: this.MODEL_VERSION,
      hit_count: 0
    };
    
    // Store in memory
    this.embeddingCache.set(hash, cached);
    this.cleanupMemoryCache();
    
    // Store in database (async, don't block)
    this.storeCacheInDatabase(hash, embedding).catch(error => {
      console.error('Database caching failed:', error);
    });
  }
  
  /**
   * Store embedding cache in database
   */
  private async storeCacheInDatabase(hash: string, embedding: number[]): Promise<void> {
    await supabaseAdmin
      .from('clause_embeddings')
      .upsert({
        clause_hash: hash,
        embedding: embedding,
        model_version: this.MODEL_VERSION,
        updated_at: new Date().toISOString()
      });
  }
  
  /**
   * Generate mock embedding (for development)
   */
  private generateMockEmbedding(text: string): number[] {
    // Generate deterministic 768-dimensional embedding based on text
    const embedding = new Array(768);
    let seed = 0;
    
    // Create seed from text content
    for (let i = 0; i < text.length; i++) {
      seed = (seed * 31 + text.charCodeAt(i)) % 1000000;
    }
    
    // Generate pseudo-random embedding
    for (let i = 0; i < 768; i++) {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      embedding[i] = (seed / 4294967296 - 0.5) * 2; // Range [-1, 1]
    }
    
    // Normalize
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map(val => val / magnitude);
  }
  
  /**
   * Calculate cosine similarity
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    const magnitude = Math.sqrt(normA * normB);
    return magnitude === 0 ? 0 : dotProduct / magnitude;
  }
  
  /**
   * Preprocess text for embedding
   */
  private preprocessText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 512); // Limit length for efficiency
  }
  
  /**
   * Generate cache key
   */
  private generateCacheKey(text: string): string {
    const processed = this.preprocessText(text);
    return require('crypto').createHash('md5').update(processed + this.MODEL_VERSION).digest('hex');
  }
  
  /**
   * Check if cache entry is expired
   */
  private isCacheExpired(createdAt: string): boolean {
    const created = new Date(createdAt);
    const expiry = new Date(created.getTime() + this.CACHE_EXPIRY_HOURS * 60 * 60 * 1000);
    return new Date() > expiry;
  }
  
  /**
   * Clean up memory cache to prevent memory leaks
   */
  private cleanupMemoryCache(): void {
    if (this.embeddingCache.size <= this.CACHE_SIZE_LIMIT) return;
    
    // Sort by hit count and last access
    const entries = Array.from(this.embeddingCache.entries())
      .sort((a, b) => {
        // Prefer higher hit count and recent access
        return b[1].hit_count - a[1].hit_count;
      });
    
    // Keep top performers
    const keepers = entries.slice(0, Math.floor(this.CACHE_SIZE_LIMIT * 0.8));
    
    this.embeddingCache.clear();
    keepers.forEach(([key, value]) => {
      this.embeddingCache.set(key, value);
    });
  }
  
  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics {
    return { ...this.performanceMetrics };
  }
  
  /**
   * Clear all caches
   */
  clearCache(): void {
    this.embeddingCache.clear();
  }
  
  /**
   * Warm up cache with common patterns
   */
  async warmupCache(commonTexts: string[]): Promise<void> {
    console.log(`Warming up cache with ${commonTexts.length} common patterns...`);
    
    try {
      await this.getEmbeddings(commonTexts, { 
        priority: 'low', 
        useCache: true 
      });
      
      console.log('Cache warmup completed successfully');
    } catch (error) {
      console.error('Cache warmup failed:', error);
    }
  }
}

// Export singleton instance
export const optimizedSemanticEmbedding = new OptimizedSemanticEmbedding();