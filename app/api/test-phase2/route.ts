// app/api/test-phase2/route.ts
// API endpoint to run Phase 2 system tests

import { NextRequest, NextResponse } from 'next/server';
import { phase2SystemTest } from '@/lib/test/phase2SystemTest';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json';
    const runTests = searchParams.get('run') === 'true';
    
    if (!runTests) {
      return NextResponse.json({
        message: 'Phase 2 system test endpoint ready. Use ?run=true to execute tests.',
        endpoints: {
          runTests: '/api/test-phase2?run=true',
          getReport: '/api/test-phase2?run=true&format=report'
        },
        testComponents: [
          'hierarchical-rules',
          'ml-confidence-scoring',
          'optimized-embedding',
          'advanced-analysis',
          'system-integration'
        ]
      });
    }
    
    console.log('🚀 Starting Phase 2 System Tests via API...');
    
    // Run the comprehensive test suite
    const testResults = await phase2SystemTest.runAllTests();
    
    // Return appropriate format
    if (format === 'report') {
      const report = phase2SystemTest.generateReport(testResults);
      
      return new NextResponse(report, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'X-Test-Status': testResults.overall.passed ? 'PASSED' : 'FAILED',
          'X-Test-Score': `${testResults.overall.passedTests}/${testResults.overall.totalTests}`,
          'X-Test-Duration': testResults.overall.totalDuration.toString()
        }
      });
    }
    
    // JSON format (default)
    return NextResponse.json({
      success: true,
      testResults,
      summary: {
        status: testResults.overall.passed ? 'PASSED' : 'FAILED',
        passRate: `${testResults.overall.passedTests}/${testResults.overall.totalTests}`,
        duration: `${testResults.overall.totalDuration}ms`,
        performanceScore: calculatePerformanceScore(testResults.performanceMetrics)
      },
      recommendations: generateTestRecommendations(testResults)
    }, {
      status: testResults.overall.passed ? 200 : 500,
      headers: {
        'X-Test-Status': testResults.overall.passed ? 'PASSED' : 'FAILED',
        'X-Test-Score': `${testResults.overall.passedTests}/${testResults.overall.totalTests}`
      }
    });
    
  } catch (error) {
    console.error('Phase 2 test execution failed:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Test execution failed',
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { component, testName } = body;
    
    if (!component || !testName) {
      return NextResponse.json(
        { error: 'component and testName required' },
        { status: 400 }
      );
    }
    
    // Run specific test
    console.log(`Running specific test: ${component}.${testName}`);
    
    // This would run a specific test component
    // For now, return a mock response
    return NextResponse.json({
      success: true,
      message: `Specific test ${component}.${testName} would run here`,
      note: 'Individual test execution not yet implemented'
    });
    
  } catch (error) {
    console.error('Specific test execution failed:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Specific test failed',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

// Helper functions

function calculatePerformanceScore(metrics: any): string {
  let score = 0;
  let maxScore = 400;
  
  // Cache hit rate (0-100 points)
  score += metrics.cacheHitRate * 100;
  
  // Analysis time (0-100 points, inverse relationship)
  if (metrics.averageAnalysisTime > 0) {
    score += Math.max(0, 100 - (metrics.averageAnalysisTime / 20));
  }
  
  // ML improvement (0-100 points)
  score += Math.min(100, metrics.mlAccuracyImprovement + 50);
  
  // System throughput (0-100 points)
  score += Math.min(100, metrics.systemThroughput / 10);
  
  const percentage = (score / maxScore) * 100;
  
  if (percentage >= 90) return 'Excellent';
  if (percentage >= 75) return 'Good';
  if (percentage >= 60) return 'Fair';
  return 'Needs Improvement';
}

function generateTestRecommendations(results: any): string[] {
  const recommendations: string[] = [];
  
  // Check overall pass rate
  const passRate = results.overall.passedTests / results.overall.totalTests;
  if (passRate < 0.9) {
    recommendations.push('Some tests are failing - review component implementations');
  }
  
  // Check performance metrics
  if (results.performanceMetrics.cacheHitRate < 0.5) {
    recommendations.push('Low cache hit rate - consider warming up cache with common patterns');
  }
  
  if (results.performanceMetrics.averageAnalysisTime > 5000) {
    recommendations.push('High analysis time - optimize processing pipeline');
  }
  
  if (results.performanceMetrics.mlAccuracyImprovement < 5) {
    recommendations.push('ML accuracy could be improved - collect more training data');
  }
  
  // Check individual components
  Object.entries(results.components).forEach(([component, tests]: [string, any[]]) => {
    const componentPassRate = tests.filter(t => t.passed).length / tests.length;
    if (componentPassRate < 0.8) {
      recommendations.push(`${component} component needs attention - ${Math.round(componentPassRate * 100)}% pass rate`);
    }
  });
  
  if (recommendations.length === 0) {
    recommendations.push('All tests passing - system performing well');
  }
  
  return recommendations;
}