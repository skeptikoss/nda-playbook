// app/api/performance/route.ts
// API endpoint for monitoring system performance and optimization metrics

import { NextRequest, NextResponse } from 'next/server';
import { optimizedSemanticEmbedding } from '@/lib/services/optimizedSemanticEmbedding';
import { mlConfidenceScoring } from '@/lib/services/mlConfidenceScoring';
import { hierarchicalRulesEngine } from '@/lib/services/hierarchicalRulesEngine';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get('timeframe') || '24h';
    const includeDetails = searchParams.get('details') === 'true';
    
    // Calculate timeframe
    const hours = timeframe === '7d' ? 168 : timeframe === '24h' ? 24 : 1;
    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    
    // Get performance metrics from different components
    const [
      embeddingMetrics,
      mlMetrics,
      databaseMetrics,
      systemMetrics
    ] = await Promise.all([
      getEmbeddingPerformanceMetrics(),
      mlConfidenceScoring.getMLAnalytics(),
      getDatabasePerformanceMetrics(since),
      getSystemPerformanceMetrics(since)
    ]);
    
    // Calculate overall performance score
    const overallScore = calculateOverallPerformanceScore({
      embedding: embeddingMetrics,
      ml: mlMetrics,
      database: databaseMetrics,
      system: systemMetrics
    });
    
    const response = {
      success: true,
      timeframe,
      timestamp: new Date().toISOString(),
      overall_score: overallScore,
      summary: {
        cache_hit_rate: embeddingMetrics.cacheHitRate,
        average_processing_time: embeddingMetrics.averageProcessingTime,
        ml_accuracy_improvement: mlMetrics.accuracyImprovement,
        total_requests: systemMetrics.totalRequests,
        error_rate: systemMetrics.errorRate,
        uptime: systemMetrics.uptime
      },
      components: {
        semantic_embedding: {
          status: embeddingMetrics.cacheHitRate > 0.7 ? 'excellent' : 
                  embeddingMetrics.cacheHitRate > 0.5 ? 'good' : 'needs_improvement',
          cache_hit_rate: embeddingMetrics.cacheHitRate,
          average_processing_time_ms: embeddingMetrics.averageProcessingTime,
          total_requests: embeddingMetrics.totalRequests,
          batch_efficiency: embeddingMetrics.batchEfficiency,
          model_load_time_ms: embeddingMetrics.modelLoadTime,
          optimization_impact: calculateOptimizationImpact(embeddingMetrics)
        },
        ml_confidence_scoring: {
          status: mlMetrics.accuracyImprovement > 5 ? 'excellent' :
                  mlMetrics.accuracyImprovement > 0 ? 'good' : 'baseline',
          total_training_examples: mlMetrics.totalTrainingExamples,
          accuracy_improvement_percent: mlMetrics.accuracyImprovement,
          confidence_calibration: mlMetrics.averageConfidenceCalibration,
          recent_improvements: mlMetrics.recentImprovements,
          top_features: mlMetrics.topPerformingFeatures.slice(0, 3)
        },
        hierarchical_rules: await getRuleEngineMetrics(),
        database_performance: {
          status: databaseMetrics.averageQueryTime < 100 ? 'excellent' :
                  databaseMetrics.averageQueryTime < 500 ? 'good' : 'slow',
          average_query_time_ms: databaseMetrics.averageQueryTime,
          connection_pool_usage: databaseMetrics.connectionPoolUsage,
          cache_efficiency: databaseMetrics.cacheEfficiency,
          recent_slow_queries: databaseMetrics.slowQueries
        }
      }
    };
    
    // Add detailed metrics if requested
    if (includeDetails) {
      response.detailed_metrics = {
        embedding_cache_stats: await getEmbeddingCacheStats(),
        ml_feature_analysis: mlMetrics.topPerformingFeatures,
        recent_performance_trends: await getPerformanceTrends(since),
        optimization_recommendations: generateOptimizationRecommendations({
          embedding: embeddingMetrics,
          ml: mlMetrics,
          database: databaseMetrics
        })
      };
    }
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Performance API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch performance metrics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const action = body.action;
    
    switch (action) {
      case 'clear_cache':
        optimizedSemanticEmbedding.clearCache();
        hierarchicalRulesEngine.clearCache();
        return NextResponse.json({ 
          success: true, 
          message: 'All caches cleared successfully' 
        });
        
      case 'warmup_cache':
        const commonTexts = body.texts || getDefaultWarmupTexts();
        await optimizedSemanticEmbedding.warmupCache(commonTexts);
        return NextResponse.json({ 
          success: true, 
          message: `Cache warmed up with ${commonTexts.length} items` 
        });
        
      case 'process_learning_queue':
        const learningResults = await mlConfidenceScoring.processLearningQueue();
        return NextResponse.json({
          success: true,
          message: 'Learning queue processed',
          results: learningResults
        });
        
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
    
  } catch (error) {
    console.error('Performance action error:', error);
    return NextResponse.json(
      { error: 'Action failed' },
      { status: 500 }
    );
  }
}

// Helper functions

async function getEmbeddingPerformanceMetrics() {
  try {
    return optimizedSemanticEmbedding.getPerformanceMetrics();
  } catch (error) {
    console.error('Failed to get embedding metrics:', error);
    return {
      cacheHitRate: 0,
      averageProcessingTime: 0,
      totalRequests: 0,
      batchEfficiency: 0,
      modelLoadTime: 0
    };
  }
}

async function getDatabasePerformanceMetrics(since: string) {
  try {
    // Query recent performance from audit trail
    const { data: auditData } = await supabaseAdmin
      .from('audit_trail')
      .select('processing_time_ms, created_at')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(1000);
    
    const queryTimes = auditData?.map(a => a.processing_time_ms).filter(t => t > 0) || [];
    const averageQueryTime = queryTimes.length > 0 
      ? queryTimes.reduce((sum, time) => sum + time, 0) / queryTimes.length 
      : 0;
    
    // Get slow queries (>1 second)
    const slowQueries = auditData?.filter(a => a.processing_time_ms > 1000).length || 0;
    
    return {
      averageQueryTime,
      connectionPoolUsage: 0.6, // Mock value
      cacheEfficiency: 0.8, // Mock value
      slowQueries: slowQueries,
      totalQueries: auditData?.length || 0
    };
    
  } catch (error) {
    console.error('Database metrics error:', error);
    return {
      averageQueryTime: 0,
      connectionPoolUsage: 0,
      cacheEfficiency: 0,
      slowQueries: 0,
      totalQueries: 0
    };
  }
}

async function getSystemPerformanceMetrics(since: string) {
  try {
    // Get system metrics from performance_metrics table
    const { data: metrics } = await supabaseAdmin
      .from('performance_metrics')
      .select('*')
      .gte('metric_date', new Date(since).toISOString().split('T')[0])
      .order('metric_date', { ascending: false })
      .limit(7);
    
    const totalRequests = metrics?.reduce((sum, m) => sum + (m.total_documents_processed || 0), 0) || 0;
    const avgProcessingTime = metrics?.length > 0
      ? metrics.reduce((sum, m) => sum + (m.avg_processing_time_ms || 0), 0) / metrics.length
      : 0;
    
    return {
      totalRequests,
      averageProcessingTime: avgProcessingTime,
      errorRate: 0.02, // Mock value
      uptime: 99.9, // Mock value
      memoryUsage: 0.65 // Mock value
    };
    
  } catch (error) {
    console.error('System metrics error:', error);
    return {
      totalRequests: 0,
      averageProcessingTime: 0,
      errorRate: 0,
      uptime: 0,
      memoryUsage: 0
    };
  }
}

async function getRuleEngineMetrics() {
  try {
    const analytics = await hierarchicalRulesEngine.getRuleAnalytics();
    
    return {
      status: analytics.highPerformingRules > analytics.totalRules * 0.7 ? 'excellent' : 'good',
      total_rules: analytics.totalRules,
      average_confidence: analytics.avgConfidence,
      high_performing_rules: analytics.highPerformingRules,
      recent_updates: analytics.recentUpdates,
      top_performers: analytics.topPerformers.slice(0, 3).map(rule => ({
        rule_type: rule.rule_type,
        confidence: rule.confidence_score,
        performance: rule.performance?.f1_score || 0
      }))
    };
  } catch (error) {
    console.error('Rule engine metrics error:', error);
    return {
      status: 'unknown',
      total_rules: 0,
      average_confidence: 0,
      high_performing_rules: 0,
      recent_updates: 0,
      top_performers: []
    };
  }
}

async function getEmbeddingCacheStats() {
  try {
    const { data: cacheStats } = await supabaseAdmin
      .from('clause_embeddings')
      .select('model_version, created_at')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
    
    return {
      total_cached_embeddings: cacheStats?.length || 0,
      cache_age_distribution: {
        last_hour: cacheStats?.filter(c => 
          new Date(c.created_at) > new Date(Date.now() - 60 * 60 * 1000)
        ).length || 0,
        last_day: cacheStats?.length || 0
      },
      model_versions: Array.from(new Set(cacheStats?.map(c => c.model_version) || []))
    };
  } catch (error) {
    console.error('Cache stats error:', error);
    return {
      total_cached_embeddings: 0,
      cache_age_distribution: { last_hour: 0, last_day: 0 },
      model_versions: []
    };
  }
}

async function getPerformanceTrends(since: string) {
  try {
    const { data: trends } = await supabaseAdmin
      .from('performance_metrics')
      .select('metric_date, avg_processing_time_ms, semantic_detection_rate, cache_hit_rate')
      .gte('metric_date', new Date(since).toISOString().split('T')[0])
      .order('metric_date', { ascending: true });
    
    return trends?.map(t => ({
      date: t.metric_date,
      processing_time: t.avg_processing_time_ms,
      semantic_rate: t.semantic_detection_rate,
      cache_hit_rate: t.cache_hit_rate
    })) || [];
  } catch (error) {
    console.error('Performance trends error:', error);
    return [];
  }
}

function calculateOverallPerformanceScore(metrics: any): number {
  const weights = {
    cacheHitRate: 0.25,
    processingTime: 0.25,
    mlAccuracy: 0.20,
    errorRate: 0.15,
    uptime: 0.15
  };
  
  const scores = {
    cacheHitRate: metrics.embedding.cacheHitRate * 100,
    processingTime: Math.max(0, 100 - (metrics.embedding.averageProcessingTime / 10)),
    mlAccuracy: Math.min(100, metrics.ml.accuracyImprovement + 70),
    errorRate: Math.max(0, 100 - (metrics.system.errorRate * 1000)),
    uptime: metrics.system.uptime
  };
  
  return Object.entries(weights).reduce((total, [key, weight]) => {
    return total + (scores[key as keyof typeof scores] * weight);
  }, 0);
}

function calculateOptimizationImpact(metrics: any): string {
  const cacheImpact = metrics.cacheHitRate > 0.7 ? 'high' : 
                     metrics.cacheHitRate > 0.4 ? 'medium' : 'low';
  const batchingImpact = metrics.batchEfficiency > 0.8 ? 'high' :
                        metrics.batchEfficiency > 0.5 ? 'medium' : 'low';
  
  if (cacheImpact === 'high' && batchingImpact === 'high') return 'excellent';
  if (cacheImpact === 'high' || batchingImpact === 'high') return 'good';
  return 'baseline';
}

function generateOptimizationRecommendations(metrics: any): string[] {
  const recommendations: string[] = [];
  
  if (metrics.embedding.cacheHitRate < 0.5) {
    recommendations.push('Consider warming up cache with more common patterns');
  }
  
  if (metrics.embedding.averageProcessingTime > 1000) {
    recommendations.push('Enable batch processing for better throughput');
  }
  
  if (metrics.ml.accuracyImprovement < 5) {
    recommendations.push('Collect more user feedback to improve ML accuracy');
  }
  
  if (metrics.database.averageQueryTime > 500) {
    recommendations.push('Consider adding database indexes for frequently queried fields');
  }
  
  return recommendations;
}

function getDefaultWarmupTexts(): string[] {
  return [
    'confidential information',
    'non-disclosure agreement',
    'party receiving information',
    'governing law and jurisdiction',
    'duration of confidentiality',
    'return or destruction of information',
    'permitted use of information',
    'definition of confidential information',
    'breach of agreement',
    'remedy for breach'
  ];
}