// lib/test/phase2SystemTest.ts
// Comprehensive test script for Phase 2 enhanced system

import { advancedAnalysisEngine } from '../services/advancedAnalysisEngine';
import { hierarchicalRulesEngine } from '../services/hierarchicalRulesEngine';
import { mlConfidenceScoring } from '../services/mlConfidenceScoring';
import { optimizedSemanticEmbedding } from '../services/optimizedSemanticEmbedding';
import type { PartyPerspective } from '@/types';

interface TestResult {
  testName: string;
  passed: boolean;
  duration: number;
  details: any;
  error?: string;
}

interface SystemTestResults {
  overall: {
    passed: boolean;
    totalTests: number;
    passedTests: number;
    totalDuration: number;
  };
  components: {
    hierarchicalRules: TestResult[];
    mlConfidenceScoring: TestResult[];
    optimizedEmbedding: TestResult[];
    advancedAnalysis: TestResult[];
    integration: TestResult[];
  };
  performanceMetrics: {
    averageAnalysisTime: number;
    cacheHitRate: number;
    mlAccuracyImprovement: number;
    systemThroughput: number;
  };
}

export class Phase2SystemTest {
  private testDocuments = {
    basicNDA: `
      NON-DISCLOSURE AGREEMENT
      
      This Non-Disclosure Agreement ("Agreement") is entered into on [DATE] by and between [DISCLOSING PARTY] and [RECEIVING PARTY].
      
      1. DEFINITION OF CONFIDENTIAL INFORMATION
      For purposes of this Agreement, "Confidential Information" shall mean all information, data, materials, and knowledge in any form that is proprietary to the Disclosing Party.
      
      2. DURATION OF CONFIDENTIALITY
      The obligations of confidentiality shall remain in effect for a period of five (5) years from the date of disclosure.
      
      3. GOVERNING LAW
      This Agreement shall be governed by and construed in accordance with the laws of Singapore.
    `,
    
    complexNDA: `
      MUTUAL NON-DISCLOSURE AGREEMENT
      
      This Mutual Non-Disclosure Agreement is entered into between TechCorp Inc. and DataSolutions Ltd.
      
      SECTION 1 - CONFIDENTIAL INFORMATION DEFINITION
      "Confidential Information" means any and all non-public, confidential or proprietary information of either party, including but not limited to:
      (a) Technical data, trade secrets, know-how, research, product plans
      (b) Business information, including customer lists, supplier information, marketing plans
      (c) Financial information, including pricing, costs, and strategic plans
      
      SECTION 2 - TERM AND DURATION
      This Agreement shall commence on the Effective Date and shall remain in force for a period of three (3) years, unless terminated earlier in accordance with the provisions herein.
      
      SECTION 3 - JURISDICTION AND GOVERNING LAW
      This Agreement shall be governed by the laws of New York, and the parties consent to the exclusive jurisdiction of the courts of New York for any disputes arising hereunder.
    `,
    
    problematicNDA: `
      CONFIDENTIALITY AGREEMENT
      
      The parties agree that all information shared shall remain confidential forever.
      
      Confidential information includes everything discussed or shared between the parties.
      
      This agreement is governed by the laws of [TO BE DETERMINED].
    `
  };

  /**
   * Run comprehensive Phase 2 system tests
   */
  async runAllTests(): Promise<SystemTestResults> {
    console.log('🚀 Starting Phase 2 System Tests...');
    const startTime = Date.now();
    
    const results: SystemTestResults = {
      overall: { passed: false, totalTests: 0, passedTests: 0, totalDuration: 0 },
      components: {
        hierarchicalRules: [],
        mlConfidenceScoring: [],
        optimizedEmbedding: [],
        advancedAnalysis: [],
        integration: []
      },
      performanceMetrics: {
        averageAnalysisTime: 0,
        cacheHitRate: 0,
        mlAccuracyImprovement: 0,
        systemThroughput: 0
      }
    };

    try {
      // Test each component
      results.components.hierarchicalRules = await this.testHierarchicalRules();
      results.components.mlConfidenceScoring = await this.testMLConfidenceScoring();
      results.components.optimizedEmbedding = await this.testOptimizedEmbedding();
      results.components.advancedAnalysis = await this.testAdvancedAnalysis();
      results.components.integration = await this.testSystemIntegration();
      
      // Calculate overall results
      const allTests = Object.values(results.components).flat();
      results.overall.totalTests = allTests.length;
      results.overall.passedTests = allTests.filter(t => t.passed).length;
      results.overall.passed = results.overall.passedTests === results.overall.totalTests;
      results.overall.totalDuration = Date.now() - startTime;
      
      // Get performance metrics
      results.performanceMetrics = await this.collectPerformanceMetrics();
      
      console.log(`✅ Phase 2 Tests Complete: ${results.overall.passedTests}/${results.overall.totalTests} passed`);
      
    } catch (error) {
      console.error('❌ System test failed:', error);
      results.overall.passed = false;
    }

    return results;
  }

  /**
   * Test hierarchical rules engine
   */
  private async testHierarchicalRules(): Promise<TestResult[]> {
    console.log('📋 Testing Hierarchical Rules Engine...');
    const tests: TestResult[] = [];

    // Test 1: Rule hierarchy loading
    tests.push(await this.runTest(
      'Rule Hierarchy Loading',
      async () => {
        const rules = await hierarchicalRulesEngine.getRuleHierarchy(
          'clause-definition', 
          'receiving'
        );
        
        if (rules.length === 0) throw new Error('No rules loaded');
        
        const hasHierarchy = rules.some(rule => rule.children && rule.children.length > 0);
        
        return {
          rulesLoaded: rules.length,
          hasHierarchy,
          sampleRule: {
            id: rules[0].id,
            level: rules[0].rule_level,
            confidence: rules[0].confidence_score
          }
        };
      }
    ));

    // Test 2: Best match finding
    tests.push(await this.runTest(
      'Best Match Finding',
      async () => {
        const matches = await hierarchicalRulesEngine.findBestMatches(
          this.testDocuments.basicNDA,
          'clause-definition',
          'receiving',
          { maxResults: 3, confidenceThreshold: 0.3 }
        );
        
        if (matches.length === 0) throw new Error('No matches found');
        
        return {
          matchesFound: matches.length,
          topConfidence: matches[0].confidence,
          hierarchyPath: matches[0].hierarchy_path
        };
      }
    ));

    // Test 3: Performance metrics
    tests.push(await this.runTest(
      'Rule Analytics',
      async () => {
        const analytics = await hierarchicalRulesEngine.getRuleAnalytics();
        
        return {
          totalRules: analytics.totalRules,
          avgConfidence: analytics.avgConfidence,
          highPerformingRules: analytics.highPerformingRules
        };
      }
    ));

    return tests;
  }

  /**
   * Test ML confidence scoring system
   */
  private async testMLConfidenceScoring(): Promise<TestResult[]> {
    console.log('🧠 Testing ML Confidence Scoring...');
    const tests: TestResult[] = [];

    // Test 1: Feature extraction
    tests.push(await this.runTest(
      'ML Feature Extraction',
      async () => {
        const features = mlConfidenceScoring.extractFeatures(
          this.testDocuments.basicNDA,
          'confidential information shall mean',
          'rule-123',
          {
            partyPerspective: 'receiving',
            documentLength: this.testDocuments.basicNDA.length,
            clausePosition: 100
          }
        );
        
        if (!features.clauseLength || !features.keywordDensity) {
          throw new Error('Features not extracted properly');
        }
        
        return {
          clauseLength: features.clauseLength,
          keywordDensity: features.keywordDensity,
          legalTermDensity: features.legalTermDensity,
          hasStructure: features.hasNumberedLists
        };
      }
    ));

    // Test 2: Confidence calculation
    tests.push(await this.runTest(
      'ML Confidence Calculation',
      async () => {
        const mockFeatures = mlConfidenceScoring.extractFeatures(
          this.testDocuments.basicNDA,
          'confidential information',
          'rule-456',
          {
            partyPerspective: 'receiving',
            documentLength: 1000,
            clausePosition: 200
          }
        );
        
        const confidence = await mlConfidenceScoring.calculateMLConfidence(
          0.7,
          mockFeatures,
          'rule-456',
          'receiving'
        );
        
        return {
          baseline: confidence.baseline,
          mlAdjustment: confidence.mlAdjustment,
          finalScore: confidence.finalScore,
          components: {
            historyBoost: confidence.historyBoost,
            contextBoost: confidence.contextBoost
          }
        };
      }
    ));

    // Test 3: Analytics
    tests.push(await this.runTest(
      'ML Analytics',
      async () => {
        const analytics = await mlConfidenceScoring.getMLAnalytics();
        
        return {
          totalTrainingExamples: analytics.totalTrainingExamples,
          accuracyImprovement: analytics.accuracyImprovement,
          topFeatures: analytics.topPerformingFeatures.slice(0, 3)
        };
      }
    ));

    return tests;
  }

  /**
   * Test optimized semantic embedding
   */
  private async testOptimizedEmbedding(): Promise<TestResult[]> {
    console.log('⚡ Testing Optimized Semantic Embedding...');
    const tests: TestResult[] = [];

    // Test 1: Initialization and caching
    tests.push(await this.runTest(
      'Embedding Initialization',
      async () => {
        await optimizedSemanticEmbedding.initialize();
        
        const testTexts = [
          'confidential information',
          'non-disclosure agreement',
          'governing law'
        ];
        
        // First call (cache miss)
        const start1 = Date.now();
        const embeddings1 = await optimizedSemanticEmbedding.getEmbeddings(testTexts);
        const time1 = Date.now() - start1;
        
        // Second call (cache hit)
        const start2 = Date.now();
        const embeddings2 = await optimizedSemanticEmbedding.getEmbeddings(testTexts);
        const time2 = Date.now() - start2;
        
        const cacheImprovement = time1 > time2 ? (time1 - time2) / time1 : 0;
        
        return {
          embeddingDimension: embeddings1[0].length,
          firstCallTime: time1,
          secondCallTime: time2,
          cacheImprovement: cacheImprovement,
          embeddingsMatch: JSON.stringify(embeddings1) === JSON.stringify(embeddings2)
        };
      }
    ));

    // Test 2: Similarity computation
    tests.push(await this.runTest(
      'Semantic Similarity',
      async () => {
        const similarity1 = await optimizedSemanticEmbedding.computeSimilarity(
          'confidential information',
          'confidential data'
        );
        
        const similarity2 = await optimizedSemanticEmbedding.computeSimilarity(
          'confidential information',
          'public disclosure'
        );
        
        if (similarity1 <= similarity2) {
          throw new Error('Semantic similarity not working correctly');
        }
        
        return {
          similarTerms: similarity1,
          dissimilarTerms: similarity2,
          differenceDetected: similarity1 > similarity2
        };
      }
    ));

    // Test 3: Performance metrics
    tests.push(await this.runTest(
      'Embedding Performance',
      async () => {
        const metrics = optimizedSemanticEmbedding.getPerformanceMetrics();
        
        return {
          cacheHitRate: metrics.cacheHitRate,
          averageProcessingTime: metrics.averageProcessingTime,
          totalRequests: metrics.totalRequests,
          batchEfficiency: metrics.batchEfficiency
        };
      }
    ));

    return tests;
  }

  /**
   * Test advanced analysis engine
   */
  private async testAdvancedAnalysis(): Promise<TestResult[]> {
    console.log('🔬 Testing Advanced Analysis Engine...');
    const tests: TestResult[] = [];

    // Test 1: Basic document analysis
    tests.push(await this.runTest(
      'Advanced Document Analysis',
      async () => {
        const result = await advancedAnalysisEngine.analyzeDocument(
          this.testDocuments.basicNDA,
          'receiving',
          {
            useSemanticDetection: true,
            useHierarchicalRules: true,
            enableMLScoring: true,
            confidenceThreshold: 0.3
          }
        );
        
        if (result.clause_results.length === 0) {
          throw new Error('No clauses detected');
        }
        
        return {
          clausesAnalyzed: result.clause_results.length,
          overallConfidence: result.overall_confidence,
          detectionSummary: result.detection_summary,
          processingTime: result.total_processing_time_ms,
          hasRecommendations: result.recommendations.high_priority.length > 0
        };
      }
    ));

    // Test 2: Party perspective comparison
    tests.push(await this.runTest(
      'Party Perspective Analysis',
      async () => {
        const receivingResult = await advancedAnalysisEngine.analyzeDocument(
          this.testDocuments.complexNDA,
          'receiving'
        );
        
        const disclosingResult = await advancedAnalysisEngine.analyzeDocument(
          this.testDocuments.complexNDA,
          'disclosing'
        );
        
        // Results should differ based on party perspective
        const confidenceDiff = Math.abs(
          receivingResult.overall_confidence - disclosingResult.overall_confidence
        );
        
        return {
          receivingConfidence: receivingResult.overall_confidence,
          disclosingConfidence: disclosingResult.overall_confidence,
          significantDifference: confidenceDiff > 0.1,
          receivingRecommendations: receivingResult.recommendations.high_priority.length,
          disclosingRecommendations: disclosingResult.recommendations.high_priority.length
        };
      }
    ));

    return tests;
  }

  /**
   * Test system integration
   */
  private async testSystemIntegration(): Promise<TestResult[]> {
    console.log('🔗 Testing System Integration...');
    const tests: TestResult[] = [];

    // Test 1: End-to-end workflow
    tests.push(await this.runTest(
      'End-to-End Workflow',
      async () => {
        const startTime = Date.now();
        
        // Complete analysis workflow
        const analysisResult = await advancedAnalysisEngine.analyzeDocument(
          this.testDocuments.complexNDA,
          'mutual',
          {
            useSemanticDetection: true,
            useHierarchicalRules: true,
            enableMLScoring: true,
            includePerformanceMetrics: true
          }
        );
        
        const totalTime = Date.now() - startTime;
        
        // Simulate user feedback
        if (analysisResult.clause_results.length > 0) {
          const firstClause = analysisResult.clause_results[0];
          const mockFeatures = mlConfidenceScoring.extractFeatures(
            firstClause.detected_text || this.testDocuments.complexNDA,
            firstClause.clause_name,
            'test-rule',
            {
              partyPerspective: 'mutual',
              documentLength: this.testDocuments.complexNDA.length,
              clausePosition: 100
            }
          );
          
          await mlConfidenceScoring.recordTrainingData(
            'test-rule',
            mockFeatures,
            'accepted',
            firstClause.confidence_score,
            {
              partyPerspective: 'mutual',
              documentType: 'mutual_nda',
              userExperienceLevel: 'expert'
            }
          );
        }
        
        return {
          totalProcessingTime: totalTime,
          clausesDetected: analysisResult.clause_results.length,
          detectionMethods: analysisResult.detection_summary,
          feedbackRecorded: true,
          performanceWithinLimits: totalTime < 10000 // 10 seconds
        };
      }
    ));

    // Test 2: Error handling and resilience
    tests.push(await this.runTest(
      'Error Handling',
      async () => {
        // Test with problematic document
        const result = await advancedAnalysisEngine.analyzeDocument(
          this.testDocuments.problematicNDA,
          'receiving'
        );
        
        // System should handle gracefully, not crash
        const handledGracefully = result.clause_results.some(clause => 
          clause.match_type === 'missing' || clause.confidence_score > 0
        );
        
        return {
          systemDidNotCrash: true,
          gracefulHandling: handledGracefully,
          generatedRecommendations: result.recommendations.high_priority.length > 0,
          detectedIssues: result.clause_results.filter(c => c.risk_level >= 4).length
        };
      }
    ));

    return tests;
  }

  /**
   * Run individual test with error handling
   */
  private async runTest(
    testName: string, 
    testFn: () => Promise<any>
  ): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      const details = await testFn();
      const duration = Date.now() - startTime;
      
      console.log(`  ✅ ${testName} (${duration}ms)`);
      
      return {
        testName,
        passed: true,
        duration,
        details
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      
      console.log(`  ❌ ${testName} (${duration}ms): ${error}`);
      
      return {
        testName,
        passed: false,
        duration,
        details: null,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Collect performance metrics from all components
   */
  private async collectPerformanceMetrics(): Promise<SystemTestResults['performanceMetrics']> {
    try {
      const embeddingMetrics = optimizedSemanticEmbedding.getPerformanceMetrics();
      const mlMetrics = await mlConfidenceScoring.getMLAnalytics();
      
      return {
        averageAnalysisTime: embeddingMetrics.averageProcessingTime,
        cacheHitRate: embeddingMetrics.cacheHitRate,
        mlAccuracyImprovement: mlMetrics.accuracyImprovement,
        systemThroughput: embeddingMetrics.totalRequests / (embeddingMetrics.averageProcessingTime || 1) * 1000
      };
    } catch (error) {
      console.error('Failed to collect performance metrics:', error);
      return {
        averageAnalysisTime: 0,
        cacheHitRate: 0,
        mlAccuracyImprovement: 0,
        systemThroughput: 0
      };
    }
  }

  /**
   * Generate test report
   */
  generateReport(results: SystemTestResults): string {
    const passRate = (results.overall.passedTests / results.overall.totalTests * 100).toFixed(1);
    
    let report = `
# Phase 2 System Test Report

## Overall Results
- **Status**: ${results.overall.passed ? '✅ PASSED' : '❌ FAILED'}
- **Tests**: ${results.overall.passedTests}/${results.overall.totalTests} passed (${passRate}%)
- **Duration**: ${results.overall.totalDuration}ms

## Performance Metrics
- **Average Analysis Time**: ${results.performanceMetrics.averageAnalysisTime.toFixed(1)}ms
- **Cache Hit Rate**: ${(results.performanceMetrics.cacheHitRate * 100).toFixed(1)}%
- **ML Accuracy Improvement**: ${results.performanceMetrics.mlAccuracyImprovement.toFixed(1)}%
- **System Throughput**: ${results.performanceMetrics.systemThroughput.toFixed(1)} req/sec

## Component Results
`;

    Object.entries(results.components).forEach(([component, tests]) => {
      const componentPassed = tests.filter(t => t.passed).length;
      const componentTotal = tests.length;
      const componentRate = componentTotal > 0 ? (componentPassed / componentTotal * 100).toFixed(1) : '0';
      
      report += `
### ${component.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
- **Status**: ${componentPassed === componentTotal ? '✅' : '❌'} ${componentPassed}/${componentTotal} (${componentRate}%)
`;
      
      tests.forEach(test => {
        report += `  - ${test.passed ? '✅' : '❌'} ${test.testName} (${test.duration}ms)`;
        if (test.error) report += `: ${test.error}`;
        report += '\n';
      });
    });

    return report;
  }
}

// Export test runner
export const phase2SystemTest = new Phase2SystemTest();