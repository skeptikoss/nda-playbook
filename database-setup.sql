-- NDA Review System Database Setup (Enhanced with Party Perspective)
-- Run this entire file in Supabase SQL Editor on Day 1
-- Based on enhanced architecture with party perspective support and 27 comprehensive rules

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS clause_analyses CASCADE;
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS clause_rules CASCADE;
DROP TABLE IF EXISTS clauses CASCADE;

-- Create clauses table (3 clause types with display order)
CREATE TABLE clauses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL CHECK (category IN ('core', 'standard', 'optional')),
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create clause_rules table with party perspective and AI integration fields
CREATE TABLE clause_rules (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  clause_id UUID REFERENCES clauses(id) ON DELETE CASCADE,
  rule_type VARCHAR(50) NOT NULL CHECK (rule_type IN ('starting_position', 'fallback', 'not_acceptable')),
  party_perspective VARCHAR(20) NOT NULL CHECK (party_perspective IN ('disclosing', 'receiving', 'mutual')),
  rule_text TEXT NOT NULL,
  keywords TEXT[], -- Array of party-specific keywords for matching
  severity INTEGER CHECK (severity >= 1 AND severity <= 5),
  guidance_notes TEXT,
  example_language TEXT,
  rewriting_prompt TEXT, -- AI prompt for party-aware contextual rewording
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create reviews table (document analysis sessions) with party perspective
CREATE TABLE reviews (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  client_name VARCHAR(255) NOT NULL,
  nda_title VARCHAR(255) NOT NULL,
  file_path TEXT,
  original_text TEXT,
  party_perspective VARCHAR(20) NOT NULL DEFAULT 'receiving' CHECK (party_perspective IN ('disclosing', 'receiving', 'mutual')),
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'error')),
  overall_score DECIMAL(3,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create clause_analyses table (analysis results with AI suggestions)
CREATE TABLE clause_analyses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  review_id UUID REFERENCES reviews(id) ON DELETE CASCADE,
  clause_id UUID REFERENCES clauses(id),
  detected_text TEXT,
  match_type VARCHAR(50) CHECK (match_type IN ('starting_position', 'fallback', 'not_acceptable', 'missing')),
  confidence_score DECIMAL(3,2),
  risk_level INTEGER,
  recommended_action TEXT,
  position_start INTEGER,
  position_end INTEGER,
  suggested_text TEXT,             -- AI-generated suggestion
  edited_suggestion TEXT,          -- User's edited version
  user_override_type VARCHAR(50),  -- User's manual override
  user_feedback TEXT,              -- User's reason for override
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance (including party perspective)
CREATE INDEX idx_reviews_status ON reviews(status);
CREATE INDEX idx_reviews_created ON reviews(created_at DESC);
CREATE INDEX idx_reviews_party_perspective ON reviews(party_perspective);
CREATE INDEX idx_clause_analyses_review ON clause_analyses(review_id);
CREATE INDEX idx_clause_rules_clause ON clause_rules(clause_id);
CREATE INDEX idx_clause_rules_party_perspective ON clause_rules(party_perspective);
CREATE INDEX idx_clause_rules_clause_party ON clause_rules(clause_id, party_perspective);

-- Create update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to tables
CREATE TRIGGER update_clauses_updated_at BEFORE UPDATE ON clauses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clause_rules_updated_at BEFORE UPDATE ON clause_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- INSERT PRE-SEEDED DATA FOR 3 CLAUSES WITH PARTY PERSPECTIVE
-- TOTAL: 27 RULES (3 clauses × 3 perspectives × 3 rule levels)
-- ============================================

-- Insert the 3 core clauses
INSERT INTO clauses (name, category, display_order, is_active) VALUES
('Definition of Confidential Information', 'core', 1, true),
('Duration of Confidentiality Obligations', 'core', 2, true),
('Governing Law and Jurisdictions', 'core', 3, true);

-- ============================================
-- CLAUSE 1: DEFINITION OF CONFIDENTIAL INFORMATION
-- 27 COMPREHENSIVE RULES WITH PARTY PERSPECTIVE
-- ============================================

-- RECEIVING PARTY PERSPECTIVE (Default - M&A Acquirer)
INSERT INTO clause_rules (
  clause_id, rule_type, party_perspective, rule_text, keywords, severity, 
  guidance_notes, example_language, rewriting_prompt
)
SELECT 
  id, 'starting_position', 'receiving',
  'Confidential Information limited to specifically marked documents containing proprietary data with comprehensive standard exceptions',
  ARRAY['specifically marked', 'clearly designated', 'proprietary', 'commercially sensitive', 'standard exceptions', 'publicly available', 'independently developed', 'required by law'],
  3,
  'Receiving party wants narrow scope with broad exceptions to minimize restrictions on future operations',
  '"Confidential Information" means information specifically marked as ''Confidential'' or ''Proprietary'' by the disclosing party, excluding information that is: (a) publicly available, (b) independently developed, (c) already known to receiving party, or (d) required by law to be disclosed',
  'Rewrite this confidentiality definition to favor the receiving party in an M&A due diligence context by narrowing the scope to only marked information and including comprehensive exceptions for public information, independent development, and legal requirements'
FROM clauses WHERE name = 'Definition of Confidential Information';

INSERT INTO clause_rules (
  clause_id, rule_type, party_perspective, rule_text, keywords, severity, 
  guidance_notes, example_language, rewriting_prompt
)
SELECT 
  id, 'fallback', 'receiving',
  'Confidential Information includes written materials and oral disclosures with reasonable exceptions for public domain and pre-existing knowledge',
  ARRAY['written materials', 'oral disclosures', 'reasonable person', 'public domain', 'pre-existing knowledge', 'business information'],
  4,
  'Compromise position when marked-only approach is rejected by disclosing party',
  '"Confidential Information" includes all written materials and oral information disclosed during due diligence that a reasonable person would understand to be confidential, excluding publicly available information and information already known to the receiving party',
  'Rewrite to include both written and oral information while maintaining reasonable exceptions for public information and pre-existing knowledge, balancing receiving party needs with disclosing party protection'
FROM clauses WHERE name = 'Definition of Confidential Information';

INSERT INTO clause_rules (
  clause_id, rule_type, party_perspective, rule_text, keywords, severity, 
  guidance_notes, example_language, rewriting_prompt
)
SELECT 
  id, 'not_acceptable', 'receiving',
  'All information disclosed deemed confidential with minimal or no exceptions',
  ARRAY['all information', 'everything disclosed', 'no exceptions', 'minimal exceptions', 'indefinite protection', 'unrestricted scope'],
  5,
  'Unacceptable - creates unlimited liability and operational restrictions',
  'All information, data, materials, or communications disclosed in any form shall be deemed Confidential Information',
  'This overly broad definition needs complete restructuring to include specific categories, clear exceptions, and reasonable limitations that protect the receiving party''s ability to operate independently'
FROM clauses WHERE name = 'Definition of Confidential Information';

-- DISCLOSING PARTY PERSPECTIVE (Target Company/Seller)
INSERT INTO clause_rules (
  clause_id, rule_type, party_perspective, rule_text, keywords, severity, 
  guidance_notes, example_language, rewriting_prompt
)
SELECT 
  id, 'starting_position', 'disclosing',
  'All shared information presumed confidential with limited standard exceptions only',
  ARRAY['all information', 'presumed confidential', 'shared', 'communicated', 'limited exceptions', 'competitive advantage', 'business operations'],
  5,
  'Disclosing party wants maximum protection of all shared information',
  '"Confidential Information" means all information disclosed in any form including financial data, customer lists, business strategies, operational procedures, and technical specifications, with exceptions only for information that is publicly available through no breach of confidentiality',
  'Rewrite to provide maximum protection for the disclosing party by including all forms of information with minimal exceptions limited only to truly public information, ensuring comprehensive protection of competitive advantages'
FROM clauses WHERE name = 'Definition of Confidential Information';

INSERT INTO clause_rules (
  clause_id, rule_type, party_perspective, rule_text, keywords, severity, 
  guidance_notes, example_language, rewriting_prompt
)
SELECT 
  id, 'fallback', 'disclosing',
  'Material business information with standard exceptions for public domain and independently developed information',
  ARRAY['material business information', 'significant', 'standard exceptions', 'public domain', 'independently developed', 'third party rights'],
  4,
  'Compromise when all-information approach is rejected',
  '"Confidential Information" means material business information relating to operations, finances, customers, or strategies, excluding information that is publicly available or independently developed by the receiving party',
  'Rewrite to focus on material business information while allowing standard exceptions, balancing comprehensive protection with reasonable limitations'
FROM clauses WHERE name = 'Definition of Confidential Information';

INSERT INTO clause_rules (
  clause_id, rule_type, party_perspective, rule_text, keywords, severity, 
  guidance_notes, example_language, rewriting_prompt
)
SELECT 
  id, 'not_acceptable', 'disclosing',
  'Only information specifically marked and designated as confidential with broad exceptions',
  ARRAY['only marked', 'specifically designated', 'broad exceptions', 'narrow scope', 'minimal protection', 'unrestricted use'],
  2,
  'Unacceptable - provides insufficient protection for sensitive business information',
  'Only information bearing a ''Confidential'' stamp and specifically designated in writing as confidential',
  'This overly narrow definition must be expanded to include various forms of sensitive business information beyond just marked documents, with reasonable rather than broad exceptions'
FROM clauses WHERE name = 'Definition of Confidential Information';

-- MUTUAL NDA PERSPECTIVE (Balanced Partnership)
INSERT INTO clause_rules (
  clause_id, rule_type, party_perspective, rule_text, keywords, severity, 
  guidance_notes, example_language, rewriting_prompt
)
SELECT 
  id, 'starting_position', 'mutual',
  'Business information disclosed for evaluation purposes with balanced exceptions for both parties',
  ARRAY['business information', 'evaluation purposes', 'balanced', 'both parties', 'mutual protection', 'commercially sensitive', 'fair exceptions'],
  4,
  'Balanced approach protecting both parties equally',
  '"Confidential Information" means business information disclosed by either party for evaluation of potential collaboration, including financial data, business plans, and operational information, with standard exceptions for publicly available information and pre-existing knowledge',
  'Rewrite to ensure balanced protection for both parties with equal obligations and reciprocal exceptions that protect each party''s legitimate interests'
FROM clauses WHERE name = 'Definition of Confidential Information';

INSERT INTO clause_rules (
  clause_id, rule_type, party_perspective, rule_text, keywords, severity, 
  guidance_notes, example_language, rewriting_prompt
)
SELECT 
  id, 'fallback', 'mutual',
  'Commercially sensitive information with reasonable exceptions applicable to both parties',
  ARRAY['commercially sensitive', 'reasonable exceptions', 'both parties', 'mutual', 'proportionate', 'fair treatment'],
  3,
  'Compromise position with proportionate protection',
  '"Confidential Information" means commercially sensitive information that would not ordinarily be shared with third parties, with exceptions for information that is publicly available or developed independently by either party',
  'Rewrite to focus on commercially sensitive information with proportionate exceptions that treat both parties fairly'
FROM clauses WHERE name = 'Definition of Confidential Information';

INSERT INTO clause_rules (
  clause_id, rule_type, party_perspective, rule_text, keywords, severity, 
  guidance_notes, example_language, rewriting_prompt
)
SELECT 
  id, 'not_acceptable', 'mutual',
  'Asymmetric definition favoring one party or creating unbalanced obligations',
  ARRAY['asymmetric', 'unbalanced', 'favoring one party', 'unequal treatment', 'disproportionate', 'unfair advantage'],
  5,
  'Any definition that creates unfair advantage for one party is unacceptable',
  '"Confidential Information" means all information disclosed by Party A but only marked information disclosed by Party B',
  'This unbalanced definition must be rewritten to provide equal protection and obligations for both parties with symmetric treatment of confidential information'
FROM clauses WHERE name = 'Definition of Confidential Information';

-- ============================================
-- CLAUSE 2: DURATION OF CONFIDENTIALITY OBLIGATIONS  
-- 9 COMPREHENSIVE RULES WITH PARTY PERSPECTIVE
-- ============================================

-- RECEIVING PARTY PERSPECTIVE (Default - M&A Acquirer)
INSERT INTO clause_rules (
  clause_id, rule_type, party_perspective, rule_text, keywords, severity, 
  guidance_notes, example_language, rewriting_prompt
)
SELECT 
  id, 'starting_position', 'receiving',
  '3 years maximum duration with automatic return/destruction of information',
  ARRAY['3 years', 'maximum duration', 'automatic return', 'destruction', 'finite term', 'clear endpoint', 'information disposal'],
  2,
  'Receiving party wants finite, reasonable timeframe with clear information disposal requirements',
  'Confidentiality obligations shall terminate 3 years from the date of disclosure, whereupon all confidential information shall be returned or destroyed at the disclosing party''s option',
  'Rewrite to establish a clear 3-year maximum term with automatic information return/destruction obligations that provide certainty and clear endpoint for receiving party obligations'
FROM clauses WHERE name = 'Duration of Confidentiality Obligations';

INSERT INTO clause_rules (
  clause_id, rule_type, party_perspective, rule_text, keywords, severity, 
  guidance_notes, example_language, rewriting_prompt
)
SELECT 
  id, 'fallback', 'receiving',
  '5 years duration with option to return or retain information for legal purposes',
  ARRAY['5 years', 'duration', 'option to return', 'retain', 'legal purposes', 'compliance', 'reasonable term'],
  3,
  'Compromise when 3-year term is rejected',
  'Confidentiality obligations shall continue for 5 years from disclosure, with receiving party having the option to return information or retain copies for legal compliance purposes',
  'Rewrite to provide a 5-year term while allowing retention for legitimate legal and compliance purposes, balancing obligations with practical business needs'
FROM clauses WHERE name = 'Duration of Confidentiality Obligations';

INSERT INTO clause_rules (
  clause_id, rule_type, party_perspective, rule_text, keywords, severity, 
  guidance_notes, example_language, rewriting_prompt
)
SELECT 
  id, 'not_acceptable', 'receiving',
  'Indefinite duration or perpetual confidentiality obligations',
  ARRAY['indefinite', 'perpetual', 'forever', 'permanent', 'no expiration', 'unlimited duration', 'in perpetuity'],
  5,
  'Unacceptable - creates unlimited long-term liability',
  'Confidentiality obligations shall continue in perpetuity',
  'This indefinite term is unacceptable and must be revised to include a specific time limit (3-7 years) with clear termination conditions to provide certainty and limit long-term liability'
FROM clauses WHERE name = 'Duration of Confidentiality Obligations';

-- DISCLOSING PARTY PERSPECTIVE (Target Company/Seller)
INSERT INTO clause_rules (
  clause_id, rule_type, party_perspective, rule_text, keywords, severity, 
  guidance_notes, example_language, rewriting_prompt
)
SELECT 
  id, 'starting_position', 'disclosing',
  'Indefinite duration for trade secrets and commercially sensitive information',
  ARRAY['indefinite duration', 'trade secrets', 'commercially sensitive', 'perpetual protection', 'no time limit', 'competitive advantage'],
  5,
  'Disclosing party wants maximum protection duration for valuable information',
  'Confidentiality obligations shall continue indefinitely with respect to trade secrets and for 10 years for other confidential information',
  'Rewrite to provide maximum protection duration, distinguishing between trade secrets (indefinite) and other confidential information (long-term) to preserve competitive advantages'
FROM clauses WHERE name = 'Duration of Confidentiality Obligations';

INSERT INTO clause_rules (
  clause_id, rule_type, party_perspective, rule_text, keywords, severity, 
  guidance_notes, example_language, rewriting_prompt
)
SELECT 
  id, 'fallback', 'disclosing',
  '7-10 years duration with indefinite protection for trade secrets only',
  ARRAY['7-10 years', 'duration', 'indefinite', 'trade secrets only', 'long-term protection', 'competitive information'],
  4,
  'Compromise accepting finite term for most information but retaining indefinite protection for true trade secrets',
  'Confidentiality obligations shall continue for 7 years, except for trade secrets which shall remain confidential indefinitely',
  'Rewrite to provide long-term protection (7-10 years) for confidential information while maintaining indefinite protection specifically for legitimate trade secrets'
FROM clauses WHERE name = 'Duration of Confidentiality Obligations';

INSERT INTO clause_rules (
  clause_id, rule_type, party_perspective, rule_text, keywords, severity, 
  guidance_notes, example_language, rewriting_prompt
)
SELECT 
  id, 'not_acceptable', 'disclosing',
  '3 years or less duration with broad information return/destruction requirements',
  ARRAY['3 years or less', 'short duration', 'broad destruction', 'immediate return', 'limited protection', 'insufficient term'],
  2,
  'Unacceptable - insufficient time to protect competitive advantage',
  'Confidentiality obligations terminate after 2 years with mandatory destruction of all information',
  'This short-term protection is inadequate and must be extended to at least 5-7 years to provide meaningful protection for business information and competitive advantages'
FROM clauses WHERE name = 'Duration of Confidentiality Obligations';

-- MUTUAL NDA PERSPECTIVE (Balanced Partnership)
INSERT INTO clause_rules (
  clause_id, rule_type, party_perspective, rule_text, keywords, severity, 
  guidance_notes, example_language, rewriting_prompt
)
SELECT 
  id, 'starting_position', 'mutual',
  '5 years duration with balanced return/retention options for both parties',
  ARRAY['5 years', 'duration', 'balanced', 'return/retention options', 'both parties', 'mutual', 'fair treatment', 'reciprocal'],
  3,
  'Balanced timeframe providing reasonable protection for both parties',
  'Confidentiality obligations shall continue for 5 years from disclosure, with both parties having equal rights regarding information return or retention for business purposes',
  'Rewrite to provide a balanced 5-year term with equal treatment for both parties regarding information handling and retention rights'
FROM clauses WHERE name = 'Duration of Confidentiality Obligations';

INSERT INTO clause_rules (
  clause_id, rule_type, party_perspective, rule_text, keywords, severity, 
  guidance_notes, example_language, rewriting_prompt
)
SELECT 
  id, 'fallback', 'mutual',
  '3-7 years duration with different terms for different types of information',
  ARRAY['3-7 years', 'different terms', 'different types', 'information categories', 'varied protection', 'tiered approach'],
  4,
  'Compromise approach with differentiated protection based on information sensitivity',
  'Trade secrets: 7 years; financial information: 5 years; general business information: 3 years',
  'Rewrite to provide differentiated protection periods based on information type while maintaining balanced treatment for both parties'
FROM clauses WHERE name = 'Duration of Confidentiality Obligations';

INSERT INTO clause_rules (
  clause_id, rule_type, party_perspective, rule_text, keywords, severity, 
  guidance_notes, example_language, rewriting_prompt
)
SELECT 
  id, 'not_acceptable', 'mutual',
  'Asymmetric duration terms favoring one party over the other',
  ARRAY['asymmetric', 'unequal terms', 'favoring one party', 'different obligations', 'unfair duration', 'imbalanced protection'],
  5,
  'Any duration terms that create unfair advantage are unacceptable',
  'Party A''s information protected for 10 years; Party B''s information protected for 3 years',
  'This unbalanced approach must be rewritten to provide equal protection periods for both parties with symmetric obligations and rights'
FROM clauses WHERE name = 'Duration of Confidentiality Obligations';

-- ============================================
-- CLAUSE 3: GOVERNING LAW AND JURISDICTIONS
-- 9 COMPREHENSIVE RULES WITH PARTY PERSPECTIVE
-- ============================================

-- RECEIVING PARTY PERSPECTIVE (Default - M&A Acquirer)
INSERT INTO clause_rules (
  clause_id, rule_type, party_perspective, rule_text, keywords, severity, 
  guidance_notes, example_language, rewriting_prompt
)
SELECT 
  id, 'starting_position', 'receiving',
  'Receiving party''s jurisdiction and laws with convenient dispute resolution location',
  ARRAY['receiving party jurisdiction', 'home jurisdiction', 'convenient location', 'familiar laws', 'local courts', 'reduced legal costs'],
  3,
  'Receiving party wants disputes handled in familiar jurisdiction with predictable outcomes',
  'This Agreement shall be governed by the laws of [Receiving Party''s Jurisdiction] and any disputes shall be resolved in the courts of [Receiving Party''s Location]',
  'Rewrite to establish the receiving party''s home jurisdiction and governing law to ensure familiar legal framework and convenient dispute resolution location'
FROM clauses WHERE name = 'Governing Law and Jurisdictions';

INSERT INTO clause_rules (
  clause_id, rule_type, party_perspective, rule_text, keywords, severity, 
  guidance_notes, example_language, rewriting_prompt
)
SELECT 
  id, 'fallback', 'receiving',
  'Neutral jurisdiction (Singapore) with established commercial law framework',
  ARRAY['neutral jurisdiction', 'Singapore', 'established framework', 'commercial law', 'international arbitration', 'business-friendly'],
  4,
  'Compromise on neutral, business-friendly jurisdiction when home jurisdiction is rejected',
  'This Agreement shall be governed by Singapore law with disputes resolved through Singapore International Arbitration Centre (SIAC) arbitration',
  'Rewrite to establish Singapore as the neutral governing jurisdiction with its established commercial law framework and recognized international arbitration procedures'
FROM clauses WHERE name = 'Governing Law and Jurisdictions';

INSERT INTO clause_rules (
  clause_id, rule_type, party_perspective, rule_text, keywords, severity, 
  guidance_notes, example_language, rewriting_prompt
)
SELECT 
  id, 'not_acceptable', 'receiving',
  'Disclosing party''s foreign jurisdiction with unfamiliar legal framework',
  ARRAY['foreign jurisdiction', 'unfamiliar laws', 'disclosing party jurisdiction', 'inconvenient forum', 'unknown legal system', 'higher legal costs'],
  5,
  'Unacceptable - creates legal uncertainty and higher dispute resolution costs',
  'Governed by laws of [Disclosing Party''s Remote Jurisdiction] with exclusive jurisdiction in [Inconvenient Location]',
  'This unfavorable jurisdiction clause must be revised to either the receiving party''s home jurisdiction or a neutral, business-friendly jurisdiction like Singapore to ensure fair and predictable dispute resolution'
FROM clauses WHERE name = 'Governing Law and Jurisdictions';

-- DISCLOSING PARTY PERSPECTIVE (Target Company/Seller)
INSERT INTO clause_rules (
  clause_id, rule_type, party_perspective, rule_text, keywords, severity, 
  guidance_notes, example_language, rewriting_prompt
)
SELECT 
  id, 'starting_position', 'disclosing',
  'Disclosing party''s jurisdiction with strong confidentiality law enforcement',
  ARRAY['disclosing party jurisdiction', 'strong enforcement', 'confidentiality laws', 'protective legal framework', 'local courts', 'familiar procedures'],
  4,
  'Disclosing party wants jurisdiction with strong protection for confidential information',
  'This Agreement shall be governed by the laws of [Disclosing Party''s Jurisdiction] with exclusive jurisdiction in the courts of [Disclosing Party''s Location] for enforcement of confidentiality obligations',
  'Rewrite to establish the disclosing party''s home jurisdiction with its strong legal framework for protecting confidential information and trade secrets'
FROM clauses WHERE name = 'Governing Law and Jurisdictions';

INSERT INTO clause_rules (
  clause_id, rule_type, party_perspective, rule_text, keywords, severity, 
  guidance_notes, example_language, rewriting_prompt
)
SELECT 
  id, 'fallback', 'disclosing',
  'Established commercial jurisdiction (Singapore/Hong Kong) with strong IP protection',
  ARRAY['commercial jurisdiction', 'Singapore', 'Hong Kong', 'strong IP protection', 'established precedents', 'business courts'],
  3,
  'Compromise on established commercial center with good IP protection when home jurisdiction is rejected',
  'Governed by Singapore law with disputes resolved in Singapore courts, known for strong intellectual property and confidentiality protection',
  'Rewrite to use an established commercial jurisdiction like Singapore with strong intellectual property protection and clear precedents for confidentiality enforcement'
FROM clauses WHERE name = 'Governing Law and Jurisdictions';

INSERT INTO clause_rules (
  clause_id, rule_type, party_perspective, rule_text, keywords, severity, 
  guidance_notes, example_language, rewriting_prompt
)
SELECT 
  id, 'not_acceptable', 'disclosing',
  'Jurisdiction with weak confidentiality protection or enforcement',
  ARRAY['weak protection', 'poor enforcement', 'limited remedies', 'unfavorable precedents', 'inadequate legal framework', 'uncertain outcomes'],
  5,
  'Unacceptable - inadequate protection for confidential information',
  'Governed by jurisdiction with limited trade secret protection and weak enforcement mechanisms',
  'This inadequate jurisdiction must be changed to one with strong confidentiality laws, established IP protection, and reliable enforcement mechanisms for trade secrets and business information'
FROM clauses WHERE name = 'Governing Law and Jurisdictions';

-- MUTUAL NDA PERSPECTIVE (Balanced Partnership)
INSERT INTO clause_rules (
  clause_id, rule_type, party_perspective, rule_text, keywords, severity, 
  guidance_notes, example_language, rewriting_prompt
)
SELECT 
  id, 'starting_position', 'mutual',
  'Neutral commercial jurisdiction (Singapore) with balanced dispute resolution',
  ARRAY['neutral jurisdiction', 'Singapore', 'balanced', 'commercial law', 'equal treatment', 'established procedures', 'international arbitration'],
  3,
  'Neutral jurisdiction providing equal treatment and established commercial law framework',
  'This Agreement shall be governed by Singapore law with disputes resolved through Singapore International Arbitration Centre, ensuring neutral and balanced treatment of both parties',
  'Rewrite to establish Singapore as the neutral governing jurisdiction with balanced dispute resolution procedures that treat both parties equally'
FROM clauses WHERE name = 'Governing Law and Jurisdictions';

INSERT INTO clause_rules (
  clause_id, rule_type, party_perspective, rule_text, keywords, severity, 
  guidance_notes, example_language, rewriting_prompt
)
SELECT 
  id, 'fallback', 'mutual',
  'International arbitration under established rules with seat in major commercial center',
  ARRAY['international arbitration', 'established rules', 'major commercial center', 'ICC', 'SIAC', 'LCIA', 'neutral venue'],
  4,
  'Compromise using international arbitration when parties cannot agree on governing law',
  'Disputes resolved through ICC arbitration seated in Singapore, applying principles of international commercial law',
  'Rewrite to provide international arbitration under established rules in a neutral commercial center, ensuring fair treatment for both parties'
FROM clauses WHERE name = 'Governing Law and Jurisdictions';

INSERT INTO clause_rules (
  clause_id, rule_type, party_perspective, rule_text, keywords, severity, 
  guidance_notes, example_language, rewriting_prompt
)
SELECT 
  id, 'not_acceptable', 'mutual',
  'Forum selection that advantages one party or creates unequal treatment',
  ARRAY['advantages one party', 'unequal treatment', 'biased jurisdiction', 'unfair forum', 'preferential laws', 'imbalanced procedures'],
  5,
  'Any jurisdiction or dispute resolution mechanism that favors one party is unacceptable',
  'Governed by Party A''s home jurisdiction with Party A receiving preferential treatment in disputes',
  'This biased jurisdiction clause must be revised to provide neutral, balanced dispute resolution that treats both parties equally under established commercial law principles'
FROM clauses WHERE name = 'Governing Law and Jurisdictions';

-- ============================================
-- VERIFY DATA INSERTION
-- ============================================

-- Check clauses were inserted
SELECT 
  c.name as clause_name,
  c.display_order,
  COUNT(cr.id) as rule_count
FROM clauses c
LEFT JOIN clause_rules cr ON c.id = cr.clause_id
GROUP BY c.id, c.name, c.display_order
ORDER BY c.display_order;

-- View all rules summary
SELECT 
  c.name as clause_name,
  cr.rule_type,
  LEFT(cr.rule_text, 50) || '...' as rule_preview,
  array_length(cr.keywords, 1) as keyword_count
FROM clauses c
JOIN clause_rules cr ON c.id = cr.clause_id
ORDER BY c.display_order, 
  CASE 
    WHEN cr.rule_type = 'starting_position' THEN 1
    WHEN cr.rule_type = 'fallback' THEN 2
    WHEN cr.rule_type = 'not_acceptable' THEN 3
  END;