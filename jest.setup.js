import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';

// Set up environment variables for testing
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
process.env.SUPABASE_SERVICE_KEY = 'test-service-key';
process.env.OPENAI_API_KEY = 'test-openai-key';

// Polyfills for Node.js environment
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock fetch for testing
global.fetch = jest.fn();

// Mock @xenova/transformers for testing
jest.mock('@xenova/transformers', () => ({
  pipeline: jest.fn().mockResolvedValue(
    // Mock the embedder function itself
    jest.fn().mockResolvedValue({
      data: Array(768).fill(0).map(() => Math.random()), // 768-dim vector
      tokens: 10 // Mock token count
    })
  )
}));

// Mock Supabase for testing
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ data: [], error: null })
      }),
      upsert: jest.fn().mockResolvedValue({ data: null, error: null }),
      insert: jest.fn().mockResolvedValue({ data: null, error: null })
    })
  },
  supabaseAdmin: {
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ data: [], error: null })
      }),
      upsert: jest.fn().mockResolvedValue({ data: null, error: null }),
      insert: jest.fn().mockResolvedValue({ data: null, error: null })
    })
  }
}));

// Increase test timeout for model loading
jest.setTimeout(60000);