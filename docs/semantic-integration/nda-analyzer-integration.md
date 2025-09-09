# Enhanced NDA Analyzer - Integration Guide

## 🚀 Quick Start

### 1. Environment Setup

```bash
# Install dependencies
npm install @supabase/supabase-js gpt-tokenizer

# Environment variables (.env)
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
EMBEDDING_API_URL=your_embedding_service_url
EMBEDDING_API_KEY=your_embedding_api_key
```

### 2. Initialize the Analyzer

```typescript
import EnhancedNDAAnalyzer from './EnhancedNDAAnalyzer';

const analyzer = new EnhancedNDAAnalyzer(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);
```

## 📋 Usage Examples

### Basic NDA Analysis

```typescript
// Example 1: Analyze NDA as Receiving Party
async function analyzeAsReceivingParty() {
  const ndaText = `
    CONFIDENTIAL INFORMATION. For purposes of this Agreement, 
    "Confidential Information" means all information disclosed by 
    one party to the other party...
  `;

  const results = await analyzer.analyzeDocument(
    ndaText,
    'receiving',
    {
      dealSize: 'medium',
      riskTolerance: 'moderate',
      industry: 'technology',
      jurisdiction: 'Singapore'
    }
  );

  // Process results
  for (const result of results) {
    console.log(`Clause: ${result.clause_type}`);
    console.log(`Risk Level: ${result.risk_level}`);
    console.log(`Issues Found: ${result.detected_issues.length}`);
    
    // Show recommended redlines
    for (const redline of result.recommended_redlines) {
      console.log('\nRecommended Change:');
      console.log(`From: ${redline.original_text}`);
      console.log(`To: ${redline.proposed_text}`);
      console.log(`Reason: ${redline.explanation}`);
    }
  }
}
```

### Smart Redlining with Negotiation Strategy

```typescript
// Example 2: Get negotiation strategy for specific clause
async function getNegotiationStrategy() {
  const clauseText = `
    The obligations of this Agreement shall continue in perpetuity 
    for all Confidential Information disclosed.
  `;

  const results = await analyzer.analyzeDocument(
    clauseText,
    'receiving',
    {
      dealSize: 'large',
      riskTolerance: 'conservative'
    }
  );

  const strategy = results[0].negotiation_strategy;
  
  console.log('Negotiation Playbook:');
  console.log(`Primary Position: ${strategy.primary_position}`);
  console.log('\nFallback Positions:');
  strategy.fallback_positions.forEach((pos, i) => {
    console.log(`${i + 1}. ${pos}`);
  });
  
  console.log('\nKey Arguments:');
  strategy.key_arguments.forEach(arg => {
    console.log(`• ${arg}`);
  });
  
  console.log('\nWalk-Away Triggers:');
  strategy.walk_away_triggers.forEach(trigger => {
    console.log(`⚠️ ${trigger}`);
  });
}
```

### Processing User Feedback

```typescript
// Example 3: Learn from user corrections
async function processUserCorrection() {
  const documentId = 'doc_123';
  const clauseId = 'clause_456';
  const ruleId = 'rule_789';
  
  // User rejected our suggestion and provided correction
  await analyzer.processFeedback(
    documentId,
    clauseId,
    ruleId,
    'modified',
    'The term should be 2 years, not 3 years as suggested'
  );
  
  console.log('Feedback processed - system will learn from this');
}
```

## 🎯 Advanced Features

### 1. Batch Processing

```typescript
async function batchAnalyzeNDAs(ndaFiles: string[]) {
  const batchResults = [];
  
  for (const file of ndaFiles) {
    const results = await analyzer.analyzeDocument(
      file,
      'receiving',
      { dealSize: 'medium', riskTolerance: 'moderate' }
    );
    
    batchResults.push({
      filename: file,
      results,
      highRiskCount: results.filter(r => 
        r.risk_level === 'high' || r.risk_level === 'critical'
      ).length
    });
  }
  
  // Generate summary report
  const report = generateSummaryReport(batchResults);
  return report;
}
```

### 2. Custom Playbook Configuration

```typescript
// Add custom playbook positions for your organisation
async function addCustomPlaybookPosition() {
  const { data, error } = await supabase
    .from('playbook_positions')
    .insert({
      clause_type: 'non_compete',
      party_perspective: 'receiving',
      deal_size_category: 'enterprise',
      risk_tolerance: 'aggressive',
      position_level: 'ideal',
      template_text: 'Non-compete provisions shall be limited to direct competitors only...',
      explanation: 'Narrow scope protects employee mobility',
      common_objections: {
        'too_narrow': 'Industry standard requires broader protection',
        'enforcement': 'Difficult to enforce narrow definitions'
      },
      counter_arguments: {
        'talent_retention': 'Overly broad non-competes discourage top talent',
        'legal_risk': 'Courts increasingly reject broad non-compete clauses'
      }
    });
}
```

### 3. Performance Analytics

```typescript
// Monitor system performance
async function getPerformanceMetrics() {
  const { data: metrics } = await supabase
    .from('performance_metrics')
    .select('*')
    .gte('metric_date', '2025-01-01')
    .order('metric_date', { ascending: false })
    .limit(30);
  
  const { data: ruleEffectiveness } = await supabase
    .from('rule_effectiveness')
    .select('*')
    .gt('f1_score', 0.7)
    .order('f1_score', { ascending: false });
  
  console.log('System Performance (Last 30 Days):');
  console.log(`Average Processing Time: ${metrics[0].avg_processing_time_ms}ms`);
  console.log(`Detection Accuracy: ${metrics[0].clause_detection_accuracy * 100}%`);
  console.log(`Cache Hit Rate: ${metrics[0].cache_hit_rate * 100}%`);
  
  console.log('\nTop Performing Rules:');
  ruleEffectiveness.forEach(rule => {
    console.log(`${rule.rule_type}: F1 Score ${rule.f1_score}`);
  });
}
```

## 🔧 API Integration

### REST API Endpoint

```typescript
// Express.js endpoint example
app.post('/api/analyze-nda', async (req, res) => {
  try {
    const { document, perspective, context } = req.body;
    
    const results = await analyzer.analyzeDocument(
      document,
      perspective,
      context
    );
    
    res.json({
      success: true,
      results,
      summary: {
        totalClauses: results.length,
        highRiskClauses: results.filter(r => 
          r.risk_level === 'high' || r.risk_level === 'critical'
        ).length,
        recommendedActions: results.flatMap(r => 
          r.recommended_redlines.map(rl => ({
            clause: r.clause_type,
            action: rl.explanation
          }))
        )
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});
```

### n8n Workflow Integration

```javascript
// n8n Function Node
const analyzer = new EnhancedNDAAnalyzer(
  $env.SUPABASE_URL,
  $env.SUPABASE_KEY
);

const results = await analyzer.analyzeDocument(
  $input.item.json.documentText,
  $input.item.json.perspective || 'receiving',
  {
    dealSize: $input.item.json.dealSize || 'medium',
    riskTolerance: $input.item.json.riskTolerance || 'moderate'
  }
);

// Format for next node
return results.map(result => ({
  json: {
    clauseType: result.clause_type,
    riskLevel: result.risk_level,
    issues: result.detected_issues,
    redlines: result.recommended_redlines,
    confidence: result.confidence_score
  }
}));
```

## 📊 Dashboard Queries

### Key Metrics Query

```sql
-- Dashboard view for key metrics
SELECT 
  DATE_TRUNC('week', created_at) as week,
  COUNT(DISTINCT document_id) as documents_analyzed,
  AVG(confidence_score) as avg_confidence,
  SUM(CASE WHEN user_action = 'accepted' THEN 1 ELSE 0 END)::float / 
    COUNT(*) as acceptance_rate,
  AVG(processing_time_ms) as avg_processing_time
FROM audit_trail
WHERE event_type = 'document_analysis'
  AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY week
ORDER BY week DESC;
```

### Learning Progress Query

```sql
-- Track how system is improving
SELECT 
  cr.clause_type,
  AVG(rp.f1_score) as current_f1_score,
  COUNT(uf.id) as feedback_count,
  AVG(CASE WHEN uf.user_action = 'accepted' THEN 1 ELSE 0 END) as acceptance_rate
FROM clause_rules cr
LEFT JOIN rule_performance rp ON cr.id = rp.rule_id
LEFT JOIN user_feedback uf ON cr.id = uf.predicted_rule_id
WHERE uf.created_at >= NOW() - INTERVAL '7 days'
GROUP BY cr.clause_type
HAVING COUNT(uf.id) > 10
ORDER BY current_f1_score DESC;
```

## 🚦 Testing Guide

### Unit Tests

```typescript
// Test semantic detection accuracy
describe('EnhancedNDAAnalyzer', () => {
  it('should detect perpetual term clause as high risk', async () => {
    const clause = 'This Agreement shall continue in perpetuity.';
    const results = await analyzer.analyzeDocument(clause, 'receiving');
    
    expect(results[0].risk_level).toBe('high');
    expect(results[0].detected_issues.length).toBeGreaterThan(0);
  });
  
  it('should provide appropriate redlines for receiving party', async () => {
    const clause = 'All information shall be considered confidential.';
    const results = await analyzer.analyzeDocument(
      clause, 
      'receiving',
      { riskTolerance: 'conservative' }
    );
    
    expect(results[0].recommended_redlines.length).toBeGreaterThan(0);
    expect(results[0].recommended_redlines[0].proposed_text).toContain('marked');
  });
});
```

## 🔐 Security Considerations

1. **API Keys**: Store all API keys in environment variables
2. **Row Level Security**: Enable RLS on all Supabase tables
3. **Input Validation**: Sanitise all document inputs
4. **Rate Limiting**: Implement rate limiting for API endpoints
5. **Audit Trail**: Log all document analyses for compliance

## 📈 Next Steps

### Phase 1: Initial Deployment (Week 1)
- Deploy database migrations
- Configure embedding service
- Test with sample NDAs
- Gather initial feedback

### Phase 2: Learning Activation (Week 2-3)
- Process first 100 documents
- Collect user feedback
- Run first learning batch
- Adjust confidence thresholds

### Phase 3: Production Rollout (Week 4)
- Deploy to production
- Monitor performance metrics
- Implement A/B testing
- Scale embedding cache

## 🆘 Troubleshooting

### Common Issues

**Issue**: Slow embedding generation
```typescript
// Solution: Implement batch embedding
const batchEmbeddings = await analyzer.generateBatchEmbeddings(clauses);
```

**Issue**: High false positive rate
```typescript
// Solution: Adjust confidence threshold
const filtered = results.filter(r => r.confidence_score > 0.75);
```

**Issue**: Memory issues with large documents
```typescript
// Solution: Process in chunks
const chunks = splitDocument(largeDocument, 5000);
for (const chunk of chunks) {
  await analyzer.analyzeDocument(chunk, perspective);
}
```

## 📚 Resources

- [Supabase Vector Documentation](https://supabase.com/docs/guides/ai/vector-columns)
- [Legal-BERT Model](https://huggingface.co/nlpaueb/legal-bert-base-uncased)
- [NDA Best Practices Guide](https://example.com/nda-guide)

---

**Ready to enhance your NDA analysis? Start with the Quick Start guide above!**