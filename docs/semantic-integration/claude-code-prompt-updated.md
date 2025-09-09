# Claude Code Implementation Prompt: NDA Analyzer System Upgrade

## Project Context
You are upgrading an existing TypeScript-based NDA (Non-Disclosure Agreement) analysis system that currently uses keyword matching and rule-based classification. The system needs to be enhanced with semantic understanding, machine learning capabilities, and continuous improvement features.

**Important**: I have already implemented a `SemanticClauseDetector` class that uses Legal-BERT for embeddings. Your task is to integrate this existing class with the current system and build the additional layers around it.

## Current System Overview
- **Existing File**: `src/lib/services/documentAnalysis.ts` (keyword-based detection)
- **New File Available**: `src/lib/services/semanticEmbedding.ts` (SemanticClauseDetector class - already implemented)
- **Database**: Supabase with pgvector extension enabled
- **Current Approach**: Two-phase (Detection → Quality Assessment) with fuzzy matching
- **Tech Stack**: TypeScript, React, Supabase, Next.js

## Available Resources

### Already Implemented Components:
1. **SemanticClauseDetector class** (`semanticEmbedding.ts`):
   - Legal-BERT embedding generation
   - Sliding window extraction
   - Hybrid detection (semantic + keyword)
   - Cosine similarity scoring
   - Pattern matching fallback

2. **Database Migration** (ready to apply):
   - All required tables designed
   - pgvector support configured
   - Performance indexes included

## Implementation Requirements

### Phase 1: Integrate Semantic Detection [Priority: CRITICAL - START HERE]

#### Task 1.1: Test and Validate SemanticClauseDetector
**First, create a test harness to ensure Legal-BERT loads correctly:**

```typescript
// Create test file: src/lib/services/__tests__/semanticDetector.test.ts
import { SemanticClauseDetector } from '../semanticEmbedding';

describe('Semantic Detector Initialization', () => {
  it('should initialize Legal-BERT model', async () => {
    const detector = new SemanticClauseDetector();
    await detector.initialize();
    // Test with a simple clause
    const result = await detector.detectClause(
      'Confidential Information means...',
      'definition'
    );
    expect(result).toBeDefined();
  });
});
```

#### Task 1.2: Apply Database Migration
Run the provided migration script to create all necessary tables:
- `clause_embeddings` (for caching)
- `clause_rules` (enhanced with hierarchy)
- `playbook_positions`
- `user_feedback`
- `performance_metrics`
- All supporting tables and functions

#### Task 1.3: Create Integration Layer
```typescript
// Create new file: src/lib/services/integratedAnalyzer.ts
```

This should:
1. Import and initialize the existing `SemanticClauseDetector`
2. Coordinate between semantic detection and existing keyword detection
3. Merge results from both detection methods
4. Apply confidence scoring and thresholds

**Integration Pattern:**
```typescript
class IntegratedNDAAnalyzer {
  private semanticDetector: SemanticClauseDetector;
  private supabase: SupabaseClient;
  
  async initialize() {
    this.semanticDetector = new SemanticClauseDetector();
    await this.semanticDetector.initialize();
  }
  
  async analyzeDocument(text: string, perspective: string) {
    // Use semanticDetector.detectClause() for each clause
    // Enhance with playbook positions
    // Return comprehensive results
  }
}
```

### Phase 2: Enhance Existing Document Analysis [Priority: HIGH]

#### Task 2.1: Update documentAnalysis.ts
Modify the existing `detectClauseInDocument()` function to:
1. Use the IntegratedAnalyzer as primary detection
2. Maintain backward compatibility
3. Add performance tracking

**Update Pattern:**
```typescript
// In documentAnalysis.ts
import { IntegratedNDAAnalyzer } from './integratedAnalyzer';

const analyzer = new IntegratedNDAAnalyzer();

export async function detectClauseInDocument(
  documentText: string,
  clauseType: string,
  partyPerspective: string
) {
  // Initialize analyzer if needed
  if (!analyzer.initialized) {
    await analyzer.initialize();
  }
  
  // Use new semantic detection
  const result = await analyzer.analyzeDocument(
    documentText,
    partyPerspective
  );
  
  // Maintain backward compatibility with existing return format
  return formatForLegacySystem(result);
}
```

### Phase 3: Hierarchical Rule Engine [Priority: HIGH]

#### Task 3.1: Implement Rule Hierarchy
The database already has the structure. Now implement the logic:

```typescript
// Create new file: src/lib/services/hierarchicalRules.ts
```

**Requirements:**
1. Load rules with parent-child relationships
2. Apply rules in order of hierarchy
3. Inherit confidence from parent rules
4. Support fallback rules when primary rules don't match

#### Task 3.2: ML-Enhanced Scoring
Integrate TensorFlow.js for lightweight scoring:

```typescript
// Add to hierarchicalRules.ts
import * as tf from '@tensorflow/tfjs';

class RuleScorer {
  private model: tf.LayersModel;
  
  async scoreRule(features: RuleFeatures): Promise<number> {
    // Features: keyword_overlap, position, semantic_similarity, context
    const input = tf.tensor2d([Object.values(features)]);
    const prediction = this.model.predict(input) as tf.Tensor;
    return prediction.dataSync()[0];
  }
}
```

### Phase 4: Continuous Learning System [Priority: MEDIUM]

#### Task 4.1: Feedback Collection Service
```typescript
// Create new file: src/lib/services/feedbackSystem.ts
```

Implement:
1. Capture user actions (accept/reject/modify)
2. Store feedback with context
3. Update rule confidence scores
4. Queue for batch learning

#### Task 4.2: Bayesian Confidence Updates
```typescript
function updateRuleConfidence(
  priorConfidence: number,
  feedbackSignal: boolean,
  sampleSize: number
): number {
  const alpha = 1.0; // Prior successes
  const beta = 1.0;  // Prior failures
  
  // Update with feedback
  const newAlpha = alpha + (feedbackSignal ? 1 : 0);
  const newBeta = beta + (feedbackSignal ? 0 : 1);
  
  // Calculate posterior mean
  const posteriorMean = newAlpha / (newAlpha + newBeta);
  
  // Blend with prior based on sample size
  const weight = Math.min(sampleSize / 100, 1.0);
  return priorConfidence * (1 - weight) + posteriorMean * weight;
}
```

### Phase 5: Smart Redlining Engine [Priority: MEDIUM]

#### Task 5.1: Create Redlining Service
```typescript
// Create new file: src/lib/services/redliningEngine.ts
```

Use the `playbook_positions` table to:
1. Generate context-aware redlines
2. Provide negotiation strategies
3. Offer multiple fallback positions
4. Track acceptance rates

### Phase 6: Performance Optimization [Priority: LOW]

#### Task 6.1: Implement Caching Strategy
1. Redis for frequently accessed rules
2. In-memory cache for embeddings (already in SemanticClauseDetector)
3. Batch processing for multiple documents
4. Connection pooling for Supabase

#### Task 6.2: Add Performance Monitoring
Track and store in `performance_metrics` table:
- Detection accuracy by method
- Processing time per document
- Cache hit rates
- User feedback rates

## Testing Requirements

### Unit Tests
Create test suites for:
1. SemanticClauseDetector initialization and detection
2. Integration layer coordination
3. Rule hierarchy application
4. Confidence calculations
5. Feedback processing

### Integration Tests
```typescript
// Test complete flow
describe('End-to-End NDA Analysis', () => {
  it('should analyze NDA with semantic detection', async () => {
    const analyzer = new IntegratedNDAAnalyzer();
    await analyzer.initialize();
    
    const results = await analyzer.analyzeDocument(
      testNDA,
      'receiving'
    );
    
    expect(results).toContainClauseType('definition');
    expect(results[0].detection_method).toBe('semantic');
    expect(results[0].confidence_score).toBeGreaterThan(0.7);
  });
});
```

### Test Data
```typescript
const testClauses = {
  definition_standard: "Confidential Information means any information disclosed by one party to the other party, directly or indirectly, in writing, orally, or by inspection of tangible objects.",
  definition_variant: "For purposes of this Agreement, 'Proprietary Information' shall include all information or material that has or could have commercial value.",
  duration_perpetual: "The obligations of the Receiving Party under this Agreement shall survive termination and continue in perpetuity.",
  duration_limited: "This Agreement shall remain in effect for a period of three (3) years from the Effective Date.",
  governing_law: "This Agreement shall be governed by and construed in accordance with the laws of Singapore, without regard to its conflict of law provisions."
};
```

## Success Criteria

### Performance Metrics
- **Clause Detection Rate**: ≥ 85% (baseline: ~70%)
- **Processing Speed**: < 5 seconds per standard NDA
- **False Positive Rate**: < 10%
- **User Override Rate**: < 10%
- **Semantic Detection Usage**: > 60% of analyses

### Code Quality
- TypeScript strict mode enabled
- 80% test coverage minimum
- All functions documented with JSDoc
- Error handling with proper logging
- Proper integration with existing SemanticClauseDetector

## Implementation Order

### Week 1: Foundation (START HERE)
1. Validate SemanticClauseDetector works
2. Apply database migration
3. Create integration layer
4. Test with sample NDAs

### Week 2-3: Integration
1. Update documentAnalysis.ts
2. Implement hierarchical rules
3. Add confidence scoring

### Week 4-5: Learning System
1. Implement feedback collection
2. Add Bayesian updates
3. Create learning queue

### Week 6-7: Redlining
1. Build redlining engine
2. Add negotiation strategies
3. Create playbook UI

### Week 8-10: Optimization & Testing
1. Add caching layers
2. Performance monitoring
3. Comprehensive testing
4. Documentation

## Technical Requirements

### Libraries to Install
```json
{
  "dependencies": {
    "@xenova/transformers": "^2.x",  // Already used by SemanticClauseDetector
    "@tensorflow/tfjs": "^4.x",
    "bull": "^4.x",
    "redis": "^4.x",
    "p-limit": "^3.x"  // For concurrency control
  },
  "devDependencies": {
    "@testing-library/react": "^14.x",
    "jest": "^29.x",
    "supertest": "^6.x"
  }
}
```

### Environment Variables
```bash
# Add to .env.local
HUGGINGFACE_API_KEY=your_key_here  # If using API instead of local model
REDIS_URL=redis://localhost:6379
SUPABASE_SERVICE_ROLE_KEY=your_service_key
MODEL_VERSION=legal-bert-v1
EMBEDDING_CACHE_TTL=604800
MAX_CONCURRENT_ANALYSES=3
```

## Files to Provide to Claude Code

When starting the implementation, provide:
1. This implementation prompt
2. The existing `semanticEmbedding.ts` file (SemanticClauseDetector class)
3. The current `documentAnalysis.ts` file
4. The database migration SQL script
5. Current `package.json`
6. Any existing type definitions (`types/nda.types.ts`)

## Initial Setup Commands

```bash
# 1. Install dependencies
npm install @xenova/transformers @tensorflow/tfjs bull redis p-limit

# 2. Run database migration
npx supabase migration up

# 3. Run initial tests
npm test -- semanticDetector.test.ts

# 4. Start development
npm run dev
```

## Key Integration Points

The SemanticClauseDetector provides these methods you'll use:
- `initialize()` - Must be called before use
- `detectClause(text, clauseType, options)` - Main detection method
- Returns: `{ detected, confidence, segments, method, explanation }`

Your integration layer should:
1. Initialize the detector once
2. Use it for each clause
3. Enhance results with database rules
4. Apply playbook positions
5. Return comprehensive analysis

## Common Pitfalls to Avoid

1. **Model Loading**: Legal-BERT is large (~400MB). Load once and reuse
2. **Embedding Cache**: Always check cache before generating new embeddings
3. **Database Connections**: Use connection pooling for Supabase
4. **Error Handling**: Gracefully fall back to keyword detection if semantic fails
5. **Memory Management**: Clear embedding cache periodically

## Questions Resolved

Based on the existing implementation:
1. **Latency**: Target < 5 seconds is achievable with caching
2. **Languages**: English only (Legal-BERT limitation)
3. **Explanation Detail**: Detailed explanations provided by SemanticClauseDetector
4. **Historical Re-analysis**: Implement as background job using Bull queue
5. **Export Format**: MS Word with track changes (use `docx` library)

---

**Start with Phase 1**: Test that the SemanticClauseDetector initializes correctly, then build the integration layer. The semantic detection foundation is already built - focus on integrating it properly with the existing system.