-- Migration Script: NDA Analyzer System Upgrade
-- Run these migrations in order on your Supabase database

-- ============================================
-- PHASE 1: Semantic Embeddings Support
-- ============================================

-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Table for caching clause embeddings
CREATE TABLE IF NOT EXISTS clause_embeddings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clause_hash text UNIQUE NOT NULL,
  embedding vector(768) NOT NULL, -- Legal-BERT uses 768 dimensions
  model_version text NOT NULL,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- Index for faster similarity searches
CREATE INDEX idx_clause_embeddings_vector ON clause_embeddings 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Table for clause templates (standard patterns)
CREATE TABLE IF NOT EXISTS clause_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clause_type text NOT NULL UNIQUE,
  template_text text NOT NULL,
  embedding jsonb NOT NULL, -- Store as JSONB for compatibility
  is_active boolean DEFAULT true,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- ============================================
-- PHASE 2: Hierarchical Rules Enhancement
-- ============================================

-- Add hierarchy support to existing clause_rules table
ALTER TABLE clause_rules 
ADD COLUMN IF NOT EXISTS parent_rule_id uuid REFERENCES clause_rules(id),
ADD COLUMN IF NOT EXISTS rule_level integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS confidence_score decimal(3,2) DEFAULT 0.70,
ADD COLUMN IF NOT EXISTS last_updated_confidence timestamp,
ADD COLUMN IF NOT EXISTS ml_features jsonb,
ADD COLUMN IF NOT EXISTS negotiation_guidance text,
ADD COLUMN IF NOT EXISTS fallback_language text;

-- Create index for hierarchical queries
CREATE INDEX IF NOT EXISTS idx_clause_rules_hierarchy 
ON clause_rules(parent_rule_id, rule_level);

-- Rule performance tracking
CREATE TABLE IF NOT EXISTS rule_performance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id uuid REFERENCES clause_rules(id) ON DELETE CASCADE,
  true_positives integer DEFAULT 0,
  false_positives integer DEFAULT 0,
  true_negatives integer DEFAULT 0,
  false_negatives integer DEFAULT 0,
  precision decimal(3,2),
  recall decimal(3,2),
  f1_score decimal(3,2),
  last_calculated timestamp DEFAULT now(),
  calculation_sample_size integer DEFAULT 0,
  UNIQUE(rule_id)
);

-- Trigger to update rule performance metrics
CREATE OR REPLACE FUNCTION update_rule_metrics()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate precision: TP / (TP + FP)
  IF (NEW.true_positives + NEW.false_positives) > 0 THEN
    NEW.precision := NEW.true_positives::decimal / (NEW.true_positives + NEW.false_positives);
  ELSE
    NEW.precision := 0;
  END IF;
  
  -- Calculate recall: TP / (TP + FN)
  IF (NEW.true_positives + NEW.false_negatives) > 0 THEN
    NEW.recall := NEW.true_positives::decimal / (NEW.true_positives + NEW.false_negatives);
  ELSE
    NEW.recall := 0;
  END IF;
  
  -- Calculate F1 score: 2 * (precision * recall) / (precision + recall)
  IF (NEW.precision + NEW.recall) > 0 THEN
    NEW.f1_score := 2 * (NEW.precision * NEW.recall) / (NEW.precision + NEW.recall);
  ELSE
    NEW.f1_score := 0;
  END IF;
  
  NEW.last_calculated := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_rule_metrics
BEFORE INSERT OR UPDATE ON rule_performance
FOR EACH ROW
EXECUTE FUNCTION update_rule_metrics();

-- ============================================
-- PHASE 3: Feedback & Learning System
-- ============================================

-- User feedback collection
CREATE TABLE IF NOT EXISTS user_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL,
  clause_id uuid REFERENCES clauses(id),
  predicted_rule_id uuid REFERENCES clause_rules(id),
  user_action text CHECK (user_action IN ('accepted', 'rejected', 'modified')),
  user_correction text,
  confidence_at_prediction decimal(3,2),
  detection_method text CHECK (detection_method IN ('semantic', 'keyword', 'hybrid')),
  processing_time_ms integer,
  created_at timestamp DEFAULT now(),
  user_id uuid,
  session_id text
);

-- Index for feedback analytics
CREATE INDEX idx_user_feedback_analytics 
ON user_feedback(created_at, user_action, predicted_rule_id);

-- Learning queue for batch processing
CREATE TABLE IF NOT EXISTS learning_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feedback_batch jsonb NOT NULL,
  processing_status text DEFAULT 'pending' 
    CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
  processed_at timestamp,
  error_message text,
  model_version text,
  improvements_applied integer DEFAULT 0,
  created_at timestamp DEFAULT now()
);

-- ============================================
-- PHASE 4: Smart Redlining System
-- ============================================

-- Playbook positions for different scenarios
CREATE TABLE IF NOT EXISTS playbook_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clause_type text NOT NULL,
  party_perspective text NOT NULL 
    CHECK (party_perspective IN ('receiving', 'disclosing', 'mutual')),
  deal_size_category text 
    CHECK (deal_size_category IN ('small', 'medium', 'large', 'enterprise')),
  risk_tolerance text 
    CHECK (risk_tolerance IN ('conservative', 'moderate', 'aggressive')),
  position_level text NOT NULL
    CHECK (position_level IN ('ideal', 'acceptable', 'minimum', 'walk_away')),
  template_text text NOT NULL,
  explanation text,
  common_objections jsonb,
  counter_arguments jsonb,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  UNIQUE(clause_type, party_perspective, deal_size_category, risk_tolerance, position_level)
);

-- Negotiation history tracking
CREATE TABLE IF NOT EXISTS negotiation_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid,
  clause_type text NOT NULL,
  original_clause text NOT NULL,
  proposed_redline text NOT NULL,
  counter_proposal text,
  final_accepted text,
  was_accepted boolean,
  negotiation_rounds integer DEFAULT 1,
  time_to_resolution interval,
  deal_context jsonb,
  party_perspective text,
  outcome_notes text,
  created_at timestamp DEFAULT now()
);

-- Index for negotiation pattern analysis
CREATE INDEX idx_negotiation_patterns 
ON negotiation_history(clause_type, party_perspective, was_accepted);

-- ============================================
-- PHASE 5: Performance & Analytics
-- ============================================

-- System performance metrics
CREATE TABLE IF NOT EXISTS performance_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date date NOT NULL,
  total_documents_processed integer DEFAULT 0,
  avg_processing_time_ms decimal(10,2),
  clause_detection_accuracy decimal(3,2),
  semantic_detection_rate decimal(3,2),
  keyword_detection_rate decimal(3,2),
  hybrid_detection_rate decimal(3,2),
  cache_hit_rate decimal(3,2),
  user_override_rate decimal(3,2),
  false_positive_rate decimal(3,2),
  false_negative_rate decimal(3,2),
  created_at timestamp DEFAULT now(),
  UNIQUE(metric_date)
);

-- Audit trail for all system decisions
CREATE TABLE IF NOT EXISTS audit_trail (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  document_id uuid,
  clause_id uuid,
  rule_id uuid,
  user_id uuid,
  action text NOT NULL,
  details jsonb,
  confidence_score decimal(3,2),
  processing_time_ms integer,
  ip_address inet,
  user_agent text,
  created_at timestamp DEFAULT now()
);

-- Index for audit queries
CREATE INDEX idx_audit_trail_lookup 
ON audit_trail(document_id, created_at DESC);

-- ============================================
-- VIEWS FOR ANALYTICS
-- ============================================

-- View for rule effectiveness
CREATE OR REPLACE VIEW rule_effectiveness AS
SELECT 
  cr.id,
  cr.clause_id,
  cr.rule_type,
  cr.party_perspective,
  cr.confidence_score,
  rp.precision,
  rp.recall,
  rp.f1_score,
  COUNT(uf.id) as feedback_count,
  SUM(CASE WHEN uf.user_action = 'accepted' THEN 1 ELSE 0 END)::decimal / 
    NULLIF(COUNT(uf.id), 0) as acceptance_rate
FROM clause_rules cr
LEFT JOIN rule_performance rp ON cr.id = rp.rule_id
LEFT JOIN user_feedback uf ON cr.id = uf.predicted_rule_id
GROUP BY cr.id, cr.clause_id, cr.rule_type, cr.party_perspective, 
         cr.confidence_score, rp.precision, rp.recall, rp.f1_score;

-- View for negotiation success patterns
CREATE OR REPLACE VIEW negotiation_patterns AS
SELECT 
  clause_type,
  party_perspective,
  COUNT(*) as total_negotiations,
  AVG(negotiation_rounds) as avg_rounds,
  SUM(CASE WHEN was_accepted THEN 1 ELSE 0 END)::decimal / 
    NULLIF(COUNT(*), 0) as success_rate,
  AVG(EXTRACT(EPOCH FROM time_to_resolution)/3600)::decimal(10,2) as avg_hours_to_resolution
FROM negotiation_history
GROUP BY clause_type, party_perspective;

-- ============================================
-- FUNCTIONS FOR ANALYSIS
-- ============================================

-- Function to calculate semantic similarity using pgvector
CREATE OR REPLACE FUNCTION calculate_similarity(
  embedding1 vector(768),
  embedding2 vector(768)
)
RETURNS decimal AS $$
BEGIN
  RETURN 1 - (embedding1 <=> embedding2); -- Cosine distance to similarity
END;
$$ LANGUAGE plpgsql;

-- Function to get best matching rules for a clause
CREATE OR REPLACE FUNCTION get_best_rules(
  p_clause_embedding vector(768),
  p_clause_type text,
  p_party_perspective text,
  p_limit integer DEFAULT 5
)
RETURNS TABLE (
  rule_id uuid,
  confidence decimal,
  rule_type text,
  similarity decimal
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cr.id as rule_id,
    cr.confidence_score as confidence,
    cr.rule_type,
    calculate_similarity(p_clause_embedding, ce.embedding) as similarity
  FROM clause_rules cr
  JOIN clause_embeddings ce ON ce.clause_hash = md5(cr.rule_text)
  WHERE cr.party_perspective = p_party_perspective
    AND EXISTS (
      SELECT 1 FROM clauses c 
      WHERE c.id = cr.clause_id AND c.name ILIKE '%' || p_clause_type || '%'
    )
  ORDER BY similarity DESC, cr.confidence_score DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- INITIAL DATA SEEDING
-- ============================================

-- Insert default playbook positions
INSERT INTO playbook_positions (clause_type, party_perspective, deal_size_category, risk_tolerance, position_level, template_text, explanation)
VALUES 
  ('definition', 'receiving', 'medium', 'moderate', 'ideal', 
   'Confidential Information shall mean only information that is (i) clearly marked as confidential, (ii) identified as confidential at the time of disclosure, or (iii) would reasonably be understood to be confidential.',
   'Narrow definition protects receiving party from over-broad obligations'),
  
  ('duration', 'receiving', 'medium', 'moderate', 'ideal',
   'The obligations under this Agreement shall expire three (3) years from the date of disclosure.',
   'Shorter duration reduces long-term obligations'),
  
  ('governing', 'receiving', 'medium', 'moderate', 'acceptable',
   'This Agreement shall be governed by the laws of [Receiving Party Jurisdiction], without regard to conflict of law principles.',
   'Home jurisdiction provides legal advantages and reduces costs');

-- ============================================
-- PERMISSIONS
-- ============================================

-- Grant necessary permissions (adjust based on your Supabase setup)
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_clause_rules_lookup 
ON clause_rules(clause_id, party_perspective, rule_type);

CREATE INDEX IF NOT EXISTS idx_user_feedback_recent 
ON user_feedback(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_trail_user 
ON audit_trail(user_id, created_at DESC);

-- ============================================
-- COMPLETION MESSAGE
-- ============================================
DO $$
BEGIN
  RAISE NOTICE 'Migration completed successfully!';
  RAISE NOTICE 'Tables created: 11';
  RAISE NOTICE 'Indexes created: 9';
  RAISE NOTICE 'Views created: 2';
  RAISE NOTICE 'Functions created: 3';
  RAISE NOTICE 'Next step: Run the TypeScript implementation';
END $$;