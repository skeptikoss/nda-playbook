// lib/services/__tests__/semanticDetector.test.ts
// Phase 1, Task 1.1: Test Legal-BERT initialization and basic detection

import { SemanticClauseDetector } from '../semanticEmbedding';

describe('Semantic Detector Initialization', () => {
  let detector: SemanticClauseDetector;
  
  beforeAll(async () => {
    detector = new SemanticClauseDetector();
    // Increase timeout for model loading
    jest.setTimeout(60000);
  });

  it('should initialize Legal-BERT model', async () => {
    // Initialize the detector
    await detector.initialize();
    
    // Test with a simple definition clause
    const result = await detector.detectClause(
      'Confidential Information means any and all information disclosed by one party to another',
      'definition'
    );
    
    expect(result).toBeDefined();
    expect(result.detected).toBeDefined();
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
    expect(result.method).toBeDefined();
    expect(['semantic', 'keyword', 'hybrid']).toContain(result.method);
  }, 60000); // 60 second timeout for model loading

  it('should detect definition clause with high confidence', async () => {
    const definitionText = `
      1. DEFINITIONS
      
      "Confidential Information" means any and all information, in any form or medium, 
      disclosed by the Disclosing Party to the Receiving Party, including but not limited to:
      (a) proprietary information, trade secrets, know-how, inventions, techniques, processes;
      (b) financial information, business plans, customer lists, supplier information;
      (c) any other information that would reasonably be considered confidential.
    `;
    
    const result = await detector.detectClause(definitionText, 'definition', { method: 'keyword' });
    
    expect(result.detected).toBe(true);
    expect(result.confidence).toBeGreaterThan(0.5);
    expect(result.segments.length).toBeGreaterThan(0);
    expect(result.explanation).toBeDefined();
  });

  it('should detect duration clause', async () => {
    const durationText = `
      The obligations of the Receiving Party under this Agreement shall survive 
      termination of this Agreement and continue for a period of five (5) years 
      from the date of disclosure of the applicable Confidential Information.
    `;
    
    const result = await detector.detectClause(durationText, 'duration', { method: 'keyword' });
    
    expect(result.detected).toBe(true);
    expect(result.confidence).toBeGreaterThan(0.5);
    expect(result.segments.length).toBeGreaterThan(0);
  });

  it('should detect governing law clause', async () => {
    const governingText = `
      This Agreement shall be governed by and construed in accordance with 
      the laws of Singapore, without regard to its conflict of law provisions.
      The parties consent to the exclusive jurisdiction of the courts of Singapore.
    `;
    
    const result = await detector.detectClause(governingText, 'governing', { method: 'keyword' });
    
    expect(result.detected).toBe(true);
    expect(result.confidence).toBeGreaterThan(0.5);
    expect(result.segments.length).toBeGreaterThan(0);
  });

  it('should handle different detection methods', async () => {
    const text = 'Confidential Information means proprietary data and trade secrets.';
    
    const semanticResult = await detector.detectClause(text, 'definition', { method: 'semantic' });
    const keywordResult = await detector.detectClause(text, 'definition', { method: 'keyword' });
    const hybridResult = await detector.detectClause(text, 'definition', { method: 'hybrid' });
    
    expect(semanticResult.method).toBe('semantic');
    expect(keywordResult.method).toBe('keyword');
    expect(hybridResult.method).toBe('hybrid');
  });

  it('should return low confidence for unrelated text', async () => {
    const unrelatedText = `
      The weather today is sunny with a chance of rain. 
      Please remember to bring an umbrella if you go outside.
    `;
    
    const result = await detector.detectClause(unrelatedText, 'definition');
    
    expect(result.confidence).toBeLessThan(0.5);
    expect(result.detected).toBe(false);
  });

  it('should handle empty or invalid input gracefully', async () => {
    const emptyResult = await detector.detectClause('', 'definition');
    expect(emptyResult.confidence).toBe(0);
    expect(emptyResult.detected).toBe(false);
    
    const shortResult = await detector.detectClause('Hi', 'definition');
    expect(shortResult.confidence).toBeLessThan(0.3);
  });

  it('should provide meaningful explanations', async () => {
    const text = 'Confidential Information includes all proprietary business information.';
    const result = await detector.detectClause(text, 'definition');
    
    if (result.detected) {
      expect(result.explanation).toBeDefined();
      expect(result.explanation).toContain('definition');
      expect(result.explanation).toContain('confidence');
    }
  });
});

describe('Semantic Detector Performance', () => {
  let detector: SemanticClauseDetector;
  
  beforeAll(async () => {
    detector = new SemanticClauseDetector();
    await detector.initialize();
    jest.setTimeout(30000);
  });

  it('should process clause detection within reasonable time', async () => {
    const startTime = Date.now();
    
    const result = await detector.detectClause(
      'The Receiving Party agrees to maintain confidentiality of all information received.',
      'non_disclosure'
    );
    
    const processingTime = Date.now() - startTime;
    
    expect(processingTime).toBeLessThan(10000); // Should complete within 10 seconds
    expect(result).toBeDefined();
  });

  it('should handle concurrent detections', async () => {
    const texts = [
      'Confidential Information means proprietary data.',
      'This agreement shall remain in effect for 3 years.',
      'Governed by the laws of New York.',
      'Information shall be used solely for evaluation purposes.'
    ];
    
    const clauseTypes = ['definition', 'duration', 'governing', 'permitted_use'];
    
    const promises = texts.map((text, index) => 
      detector.detectClause(text, clauseTypes[index])
    );
    
    const results = await Promise.all(promises);
    
    expect(results.length).toBe(4);
    results.forEach(result => {
      expect(result).toBeDefined();
      expect(result.confidence).toBeGreaterThanOrEqual(0);
    });
  });
});