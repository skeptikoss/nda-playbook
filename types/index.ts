// Core database types based on our schema
export interface Clause {
  id: string;
  name: string;
  category: 'core' | 'standard' | 'optional';
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClauseRule {
  id: string;
  clause_id: string;
  rule_type: 'starting_position' | 'fallback' | 'not_acceptable';
  party_perspective: 'disclosing' | 'receiving' | 'mutual';
  rule_text: string;
  keywords: string[];
  severity: number;
  guidance_notes: string;
  example_language: string;
  rewriting_prompt: string;
  created_at: string;
  updated_at: string;
}

export interface Review {
  id: string;
  client_name: string;
  nda_title: string;
  file_path?: string;
  original_text?: string;
  party_perspective: 'disclosing' | 'receiving' | 'mutual';
  status: 'pending' | 'processing' | 'completed' | 'error';
  overall_score?: number;
  created_at: string;
  updated_at: string;
}

export interface ClauseAnalysis {
  id: string;
  review_id: string;
  clause_id: string;
  detected_text?: string;
  match_type: 'starting_position' | 'fallback' | 'not_acceptable' | 'missing';
  confidence_score: number;
  risk_level: number;
  recommended_action: string;
  suggested_text?: string;
  edited_suggestion?: string;
  user_override_type?: string;
  user_feedback?: string;
  created_at: string;
}

// UI and component types
export type PartyPerspective = 'disclosing' | 'receiving' | 'mutual';

export interface UploadedFile {
  file: File;
  clientName: string;
  ndaTitle: string;
  partyPerspective: PartyPerspective;
}

export interface AnalysisProgress {
  step: 'extracting' | 'matching' | 'generating' | 'complete';
  percentage: number;
  message: string;
}

export interface MatrixResult {
  clause_id: string;
  clause_name: string;
  starting_position?: ClauseAnalysis;
  fallback?: ClauseAnalysis;
  not_acceptable?: ClauseAnalysis;
  missing?: boolean;
}

// API response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface UploadResponse {
  reviewId: string;
  fileName: string;
  filePath: string;
}

export interface AnalysisResponse {
  reviewId: string;
  results: MatrixResult[];
  overallScore: number;
  completedAt: string;
}