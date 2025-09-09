# NDA Analyzer System Architecture

## 🏗️ How The Pieces Fit Together

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                           │
│                    (Web App / API Endpoint)                      │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│               INTEGRATED NDA ANALYZER                            │
│                 (Orchestration Layer)                            │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  • Document parsing & clause extraction                  │   │
│  │  • Analysis workflow coordination                        │   │
│  │  • Playbook application & redlining                     │   │
│  │  • Learning & feedback processing                       │   │
│  └─────────────────────────────────────────────────────────┘   │
└────────────┬──────────────────────────┬─────────────────────────┘
             │                          │
             ▼                          ▼
┌────────────────────────┐  ┌─────────────────────────────────────┐
│  SEMANTIC DETECTOR     │  │        SUPABASE DATABASE            │
│  (Legal-BERT Engine)   │  │                                     │
│                        │  │  ┌─────────────────────────────┐   │
│  • Embedding generation│  │  │ • clause_embeddings (cache) │   │
│  • Sliding windows     │  │  │ • clause_rules              │   │
│  • Similarity scoring  │  │  │ • playbook_positions        │   │
│  • Hybrid detection    │  │  │ • user_feedback             │   │
│                        │  │  │ • performance_metrics       │   │
└────────────────────────┘  │  │ • negotiation_history       │   │
                            │  └─────────────────────────────┘   │
                            └─────────────────────────────────────┘
```

## 📦 File Structure

```
src/
├── lib/
│   ├── services/
│   │   ├── semanticEmbedding.ts      # SemanticClauseDetector (Legal-BERT)
│   │   ├── integratedAnalyzer.ts     # IntegratedNDAAnalyzer (Main orchestrator)
│   │   └── supabase.ts                # Supabase client configuration
│   ├── types/
│   │   └── nda.types.ts              # TypeScript interfaces
│   └── utils/
│       └── clauseExtraction.ts       # Clause extraction utilities
├── api/
│   └── analyze-nda.ts                 # API endpoint
└── migrations/
    └── 001_nda_analyzer_upgrade.sql   # Database schema
```

## 🔄 Data Flow

### 1. **Document Analysis Flow**

```typescript
// User uploads NDA document
const ndaText = await readDocument(file);

// Initialize analyzer (happens once)
const analyzer = new IntegratedNDAAnalyzer(SUPABASE_URL, SUPABASE_KEY);
await analyzer.initialize(); // This initializes SemanticClauseDetector

// Analyze document
const results = await analyzer.analyzeDocument(
  ndaText,
  'receiving',  // Party perspective
  {
    dealSize: 'medium',
    riskTolerance: 'moderate'
  }
);
```

### 2. **What Happens Inside**

```
Document Text
    ↓
[IntegratedNDAAnalyzer.extractClausesEnhanced()]
    ↓
Individual Clauses
    ↓
[SemanticClauseDetector.detectClause()]
    ├── Generate embeddings (Legal-BERT)
    ├── Check embedding cache
    ├── Semantic similarity scoring
    └── Keyword pattern matching
    ↓
Detection Results (confidence, segments)
    ↓
[IntegratedNDAAnalyzer.applyRules()]
    ├── Fetch rules from database
    └── Match rules to segments
    ↓
[IntegratedNDAAnalyzer.enhanceWithPlaybook()]
    ├── Get playbook positions
    └── Generate redlines & strategy
    ↓
Final Analysis Results
```

## 🚀 Implementation Steps

### Step 1: Set Up Dependencies

```bash
# Core dependencies
npm install @supabase/supabase-js
npm install @xenova/transformers  # For Legal-BERT
npm install crypto

# Development dependencies
npm install -D @types/node typescript
```

### Step 2: Configure Environment

```env
# .env.local
SUPABASE_URL=your_project_url
SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### Step 3: Run Database Migration

```sql
-- Run the migration script you already have
-- This creates all necessary tables and functions
```

### Step 4: Initialize Services

```typescript
// lib/services/index.ts
import { IntegratedNDAAnalyzer } from './integratedAnalyzer';
import { createClient } from '@supabase/supabase-js';

// Create singleton instance
let analyzer: IntegratedNDAAnalyzer | null = null;

export async function getNDAAnalyzer(): Promise<IntegratedNDAAnalyzer> {
  if (!analyzer) {
    analyzer = new IntegratedNDAAnalyzer(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!
    );
    await analyzer.initialize();
  }
  return analyzer;
}
```

### Step 5: Create API Endpoint

```typescript
// app/api/analyze/route.ts (Next.js 13+ App Router)
import { NextRequest, NextResponse } from 'next/server';
import { getNDAAnalyzer } from '@/lib/services';

export async function POST(request: NextRequest) {
  try {
    const { document, perspective, context } = await request.json();
    
    const analyzer = await getNDAAnalyzer();
    const results = await analyzer.analyzeDocument(
      document,
      perspective || 'receiving',
      context || { dealSize: 'medium', riskTolerance: 'moderate' }
    );
    
    return NextResponse.json({
      success: true,
      results,
      summary: generateSummary(results)
    });
    
  } catch (error) {
    console.error('Analysis failed:', error);
    return NextResponse.json(
      { success: false, error: 'Analysis failed' },
      { status: 500 }
    );
  }
}

function generateSummary(results: any[]) {
  return {
    totalClauses: results.length,
    criticalIssues: results.filter(r => r.risk_level === 'critical').length,
    highRiskIssues: results.filter(r => r.risk_level === 'high').length,
    recommendedActions: results
      .filter(r => r.recommended_redlines.length > 0)
      .map(r => ({
        clause: r.clause_type,
        action: r.recommended_redlines[0]?.explanation
      }))
  };
}
```

## 🧪 Testing Your Implementation

### 1. Test Semantic Detection

```typescript
// test/semantic.test.ts
import { SemanticClauseDetector } from '@/lib/services/semanticEmbedding';

describe('Semantic Detection', () => {
  let detector: SemanticClauseDetector;
  
  beforeAll(async () => {
    detector = new SemanticClauseDetector();
    await detector.initialize();
  });
  
  test('detects definition clause', async () => {
    const text = 'Confidential Information means all proprietary information...';
    const result = await detector.detectClause(text, 'definition');
    
    expect(result.detected).toBe(true);
    expect(result.confidence).toBeGreaterThan(0.7);
    expect(result.method).toBe('semantic');
  });
});
```

### 2. Test Full Analysis

```typescript
// test/integrated.test.ts
import { IntegratedNDAAnalyzer } from '@/lib/services/integratedAnalyzer';

describe('Integrated Analysis', () => {
  let analyzer: IntegratedNDAAnalyzer;
  
  beforeAll(async () => {
    analyzer = new IntegratedNDAAnalyzer(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!
    );
    await analyzer.initialize();
  });
  
  test('analyzes complete NDA', async () => {
    const nda = `
      1. DEFINITION
      Confidential Information means...
      
      2. TERM
      This Agreement shall continue in perpetuity...
    `;
    
    const results = await analyzer.analyzeDocument(nda, 'receiving');
    
    expect(results).toHaveLength(2);
    expect(results[0].clause_type).toBe('definition');
    expect(results[1].clause_type).toBe('duration');
    expect(results[1].risk_level).toBe('high'); // Perpetuity = high risk
  });
});
```

## 🎯 Performance Optimisation

### Caching Strategy

1. **Embedding Cache**: Store in memory + database
2. **Rule Cache**: Pre-load frequently used rules
3. **Playbook Cache**: Cache by deal context

```typescript
// Implement in IntegratedNDAAnalyzer
private cache = {
  embeddings: new Map<string, number[]>(),
  rules: new Map<string, ClauseRule[]>(),
  playbooks: new Map<string, PlaybookPosition[]>()
};
```

### Batch Processing

```typescript
// Process multiple documents efficiently
async function batchAnalyze(documents: string[]) {
  const analyzer = await getNDAAnalyzer();
  
  // Process in parallel with concurrency limit
  const results = await pLimit(3)(
    documents.map(doc => () => analyzer.analyzeDocument(doc, 'receiving'))
  );
  
  return results;
}
```

## 📊 Monitoring & Analytics

### Key Metrics to Track

```sql
-- Dashboard query for system health
SELECT 
  DATE(created_at) as date,
  COUNT(*) as analyses,
  AVG(confidence_score) as avg_confidence,
  SUM(CASE WHEN risk_level = 'critical' THEN 1 ELSE 0 END) as critical_issues,
  AVG(processing_time_ms) as avg_time_ms
FROM audit_trail
WHERE event_type = 'document_analysis'
  AND created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

## 🔧 Troubleshooting

### Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Legal-BERT not loading | Check @xenova/transformers installation, may need to download model first |
| Slow first analysis | Model initialization is slow; pre-warm in background |
| High false positives | Adjust confidence thresholds in `detectClause()` options |
| Missing redlines | Ensure playbook_positions table has data for your context |

## 🚦 Production Checklist

- [ ] Database migrations applied
- [ ] Legal-BERT model cached locally
- [ ] Environment variables configured
- [ ] Playbook positions populated
- [ ] API rate limiting implemented
- [ ] Error logging configured
- [ ] Performance monitoring enabled
- [ ] Backup strategy in place

## 💡 Next Steps

1. **Immediate**: Test with real NDAs from your legal services prospects
2. **Week 1**: Populate playbook positions for Singapore context
3. **Week 2**: Gather feedback and adjust confidence thresholds
4. **Month 1**: Implement learning queue processing
5. **Quarter**: Build industry-specific rule sets

---

**Ready to deploy! Start with Step 1 above and work through the implementation.**