# PLANNING.md - NDA Review Playbook System

## Project Vision

### Mission Statement
Build a streamlined web application that reduces NDA review time by 70% whilst maintaining consistency and quality through automated clause analysis against predefined rules.

### Target Outcome
Enable small-medium law firms in Singapore to review NDAs in minutes rather than hours, with consistent quality and comprehensive documentation.

### Success Metrics
- **Speed**: Review time reduced from 2 hours to 30 minutes
- **Accuracy**: 95% clause identification rate
- **Consistency**: Zero missed critical clauses
- **User Adoption**: 3 active users within 30 days

### MVP Deadline
**19 September 2025** - Working prototype with 5 core features:
1. **Fixed 3-Section UI**: Playbook browser, NDA Upload, Analysis Results with auto-navigation
2. **Pre-seeded Playbook**: 3 NDA clause types with complete rule definitions:
   - Definition of Confidential Information
   - Duration of Confidentiality Obligations  
   - Governing Law and Jurisdictions
3. **Smart Analysis Engine**: Keyword-based matching + AI-powered contextual rewording suggestions
4. **Analysis Matrix**: Visual grid showing clause categorisations (Starting Position/Fallback/Not Acceptable/Missing)
5. **Interactive Details**: Right-panel drill-down with reasoning and editable AI suggestions

---

## System Architecture

### High-Level Architecture
```
┌─────────────────────────────────────────┐
│          User Browser                    │
│  Single Page Application (React/Next.js) │
└─────────────┬───────────────────────────┘
              │ HTTPS
              ▼
┌─────────────────────────────────────────┐
│         Vercel Edge Network              │
│    (CDN, Edge Functions, Hosting)        │
└─────────────┬───────────────────────────┘
              │
     ┌────────┴────────┐
     ▼                 ▼
┌──────────┐    ┌──────────────┐
│  Next.js │    │   Vercel     │
│   SSR    │    │  Serverless  │
│          │    │  Functions   │
└────┬─────┘    └──────┬───────┘
     │                 │
     └────────┬────────┘
              │ 
              ▼
┌─────────────────────────────────────────┐
│            Supabase Cloud               │
├─────────────────────────────────────────┤
│  PostgreSQL │ Storage │ Realtime │ Auth │
└─────────────────────────────────────────┘
```

### Data Flow
```
1. User selects party perspective (Receiving/Disclosing/Mutual)
   ↓
2. User uploads NDA (PDF/DOCX) via Upload section
   ↓
3. Progress indicator: "Extracting text..." (25%)
   ↓
4. Document parsed and text extracted
   ↓
5. Progress indicator: "Matching clauses..." (50%)
   ↓
6. Party-perspective-aware keyword matching against 3 clause types:
   - Definition of Confidential Information
   - Duration of Confidentiality Obligations  
   - Governing Law and Jurisdictions
   ↓
7. Progress indicator: "Generating suggestions..." (75%)
   ↓
8. AI generates contextual rewrite suggestions based on party perspective and rule level
   ↓
9. Progress indicator: "Complete!" (100%)
   ↓
10. Auto-switch to Analysis Results section
   ↓
11. Matrix view displays party-specific categorisations with clickable marks
   ↓
12. User clicks marks → Right panel slides in with perspective-aware details
   ↓
13. User can edit party-specific AI suggestions and save changes
```

### Component Architecture
```
Frontend Components:
├── App Layout
│   ├── Fixed Left Sidebar (3 sections)
│   │   ├── 📖 Playbook Browser (with party perspective selection + active highlighting)
│   │   ├── 📤 NDA Upload (with party selection + progress indicators)
│   │   └── 📊 Analysis Results (with party-aware matrix view)
│   ├── Dynamic Main Content Area
│   │   ├── Party Selection View (Receiving/Disclosing/Mutual)
│   │   ├── Playbook View (perspective-filtered clause rules display)
│   │   ├── Upload View (dropzone + analysis trigger)
│   │   └── Matrix View (3×4 grid with party-specific clickable marks)
│   └── Sliding Right Panel
│       ├── Clause Detail Display (party context)
│       ├── Classification Reasoning (perspective-aware)
│       ├── AI-Generated Suggestions (party-specific + editable)
│       └── Save/Override Controls

Backend Services:
├── Document Service
│   ├── Upload Handler (PDF/DOCX)
│   ├── Text Extractor 
│   └── Progress Tracker
├── Analysis Engine
│   ├── Party-Aware Keyword Matcher (against 3 clause types × 3 perspectives)
│   ├── Perspective-Based Classification Engine
│   ├── Missing Clause Detector
│   └── Context-Aware AI Suggestion Generator
├── API Routes
│   ├── /upload (file handling + party perspective)
│   ├── /analyze (perspective-aware analysis pipeline)
│   ├── /clauses (party-filtered playbook data)
│   └── /suggestions (party-specific AI rewording)
└── Database Layer
    ├── Enhanced Pre-seeded Clause Rules (27 rules with party perspective)
    ├── Analysis Results Storage
    └── Party-Context AI Suggestion Cache
```

---

## Technology Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 14.x | React framework with App Router |
| React | 18.x | UI library |
| TypeScript | 5.x | Type safety |
| Tailwind CSS | 3.x | Utility-first CSS |
| shadcn/ui | Latest | Pre-built components |
| react-dropzone | 14.x | File upload |
| Lucide React | Latest | Icons |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js API Routes | 14.x | Serverless functions |
| Vercel Edge Functions | Latest | Edge computing |
| pdf-parse | 1.1.x | PDF text extraction |
| mammoth | 1.6.x | DOCX text extraction |
| OpenAI API | 4.x | AI contextual rewording |

### Database & Storage
| Technology | Version | Purpose |
|------------|---------|---------|
| Supabase | Latest | PostgreSQL database |
| Supabase Storage | Latest | Document storage |
| PostgreSQL | 15.x | Relational database |

### Development Tools
| Tool | Purpose |
|------|---------|
| VS Code | Code editor |
| Git | Version control |
| npm | Package manager |
| Postman | API testing |
| Chrome DevTools | Debugging |

---

## Required Tools & Setup

### Prerequisites Checklist
- [ ] Node.js 18+ installed
- [ ] npm or yarn installed
- [ ] Git installed
- [ ] VS Code installed
- [ ] Chrome browser installed

### Account Requirements
- [ ] Supabase account (free tier)
- [ ] Vercel account (free tier)
- [ ] GitHub account (for deployment)

### Environment Setup
```bash
# 1. Create Supabase Project
# - Go to https://supabase.com
# - Create new project
# - Note down project URL and keys

# 2. Install Vercel CLI
npm i -g vercel

# 3. Create Next.js Project
npx create-next-app@latest nda-review --typescript --tailwind --app

# 4. Install Dependencies
cd nda-review
npm install @supabase/supabase-js
npm install pdf-parse mammoth
npm install react-dropzone
npm install lucide-react

# 5. Setup shadcn/ui
npx shadcn-ui@latest init

# 6. Environment Variables
# Create .env.local with:
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key
```

---

## Database Schema (Final - Production Ready)

### Core Tables (Using Claude Desktop's Optimised Design)
1. **clauses** - The 3 clause types with display order
2. **clause_rules** - Complete rule definitions with AI prompts and keywords
3. **reviews** - NDA document analysis sessions  
4. **clause_analyses** - Analysis results with AI suggestions and user overrides

### Production Schema Structure (Enhanced with Party Perspective)
```sql
-- Core clause types (3 pre-seeded)
clauses (id, name, category, display_order, is_active, created_at, updated_at)

-- Complete rule definitions with party perspective and AI integration
clause_rules (
  id, clause_id, rule_type, party_perspective,
  rule_text, keywords[], severity, guidance_notes, 
  example_language, rewriting_prompt, 
  created_at, updated_at
)
-- party_perspective: 'disclosing', 'receiving', 'mutual'
-- Total: 27 rules (3 clauses × 3 perspectives × 3 rule_types)

-- Document analysis sessions with party context
reviews (
  id, client_name, nda_title, file_path, 
  original_text, party_perspective, status, overall_score, 
  created_at, updated_at
)

-- Analysis results with party-aware AI suggestions
clause_analyses (
  id, review_id, clause_id, detected_text,
  match_type, confidence_score, risk_level,
  recommended_action, suggested_text,
  edited_suggestion, user_override_type,
  user_feedback, created_at
)
```

### Key Features
- **Enhanced Pre-seeded Data**: Complete legal language for all 3 clause types × 3 perspectives × 3 rule levels = 27 comprehensive rules
- **Party-Aware AI Integration**: Each rule includes perspective-specific rewriting_prompt for contextual suggestions  
- **Perspective-Based Keyword Matching**: Arrays of party-specific keywords for efficient clause detection
- **Context-Aware Analysis**: Rules and suggestions tailored to client's negotiation position (Receiving/Disclosing/Mutual)
- **User Overrides**: Tracks human corrections and reasoning with party context
- **Progress Tracking**: Status field supports real-time progress indicators
- **Default Perspective**: System defaults to "Receiving Party" (most common M&A scenario)
- **Target Sectors**: Optimized for Banking, Shipping, Telco, Tech, FMCG M&A transactions

---

## Security Considerations

### Data Protection
- All documents stored in private Supabase storage
- No documents accessible via public URL
- Database row-level security (RLS) enabled

### API Security
- Service key only on server-side
- Input validation on all endpoints
- Rate limiting via Vercel

### Compliance
- Data remains in Singapore region
- No external AI services (initially)
- Audit trail in database

---

## Development Phases

### Phase 1: Foundation (Days 1-2)
- Database setup
- Project scaffolding
- Environment configuration

### Phase 2: Backend Core (Days 3-4)
- Document upload API
- Text extraction
- Basic matching algorithm

### Phase 3: Frontend Basics (Days 5-6)
- Upload interface
- Report display
- Error handling

### Phase 4: Testing & Polish (Day 7)
- End-to-end testing
- Performance optimisation
- Deployment

---

## Risk Mitigation

### Technical Risks
| Risk | Mitigation |
|------|------------|
| 4.5MB file limit | Warn users, compress PDFs |
| Matching accuracy | Start with exact match, iterate |
| Vercel timeout | Optimise processing, use queues later |

### Business Risks
| Risk | Mitigation |
|------|------------|
| Low adoption | Focus on UX simplicity |
| Accuracy concerns | Clear confidence scores |
| Support burden | Comprehensive error messages |

### Legal & Professional Risks ⚖️
| Risk | Impact | Mitigation Strategy |
|------|--------|---------------------|
| **Professional Liability** | High | Clear disclaimers: "AI assistance not legal advice", require lawyer review |
| **False Negatives** | Critical | Conservative flagging, human oversight requirements, confidence thresholds |
| **False Positives** | Medium | Calibrated sensitivity, user feedback loops, explanation of flagging rationale |
| **Confidentiality Breach** | Critical | End-to-end encryption, attorney-client privilege protection, secure deletion |
| **Unauthorized Practice** | High | User authentication, lawyer-only access, professional oversight controls |
| **Data Retention** | Medium | Clear retention policies, automatic deletion, client control over data |
| **Jurisdiction Compliance** | Medium | Singapore law validation, regular legal updates, local counsel review |
| **Audit & Compliance** | Medium | Full audit trails, SOC2 compliance path, professional standards adherence |

### Singapore Legal Market Risks
| Risk | Impact | Mitigation Strategy |
|------|--------|---------------------|
| **Regulatory Changes** | Medium | Monitor MAS/ACRA updates, quarterly legal review, adaptive rule engine |
| **Bar Association Compliance** | High | Law Society of Singapore approval, continuing education integration |
| **Cross-Border Complexity** | Medium | Multi-jurisdiction rule sets, local counsel partnerships |
| **Cultural Adaptation** | Low | Multi-language support, local legal terminology, regional preferences |

---

## Future Enhancements (Post-MVP)

**Based on Legal Professional Assessment & Client Feedback**

### **Priority 1: Enhanced Document Intelligence (Q4 2025)**
- **Semantic Clause Analysis**: Context-aware understanding beyond keyword matching
- **Cross-Reference Detection**: Identify "as defined in Section X" relationships
- **Table & Schedule Analysis**: Extract structured data from complex formatting
- **Party & Signature Block Identification**: Automatic contract party detection
- **Amendment Clause Detection**: Identify modification and update provisions

### **Priority 2: Legal Workflow Integration (Q1 2026)**
- **Matter/Client Association**: Link analyses to specific legal matters
- **Version Control System**: Track document iterations and changes over time
- **Collaboration Tools**: Multi-lawyer comments, notes, and suggestions
- **Template Library**: Firm-specific standard clause improvements
- **DMS Integration**: Connect with iManage, NetDocuments, SharePoint

### **Priority 3: Advanced Party & Risk Analysis (Q1 2026)**
- **Industry-Specific Variations**: Tech, pharma, manufacturing clause libraries
- **Deal Context Intelligence**: M&A, licensing, partnership-specific analysis
- **Jurisdiction Adaptation**: Singapore, US, UK legal requirement variations
- **Risk Tolerance Settings**: Conservative, balanced, aggressive negotiation modes
- **Regulatory Compliance**: PDPA, GDPR, sector-specific requirements

### **Priority 4: Client Presentation & Deliverables (Q2 2026)**
- **Executive Summary Generation**: AI-powered high-level risk assessments
- **Professional Report Export**: PDF/PowerPoint client presentation formats
- **Redline Document Generation**: Track changes with legal rationale
- **Comparative Analysis**: Before/after improvement visualizations
- **Plain English Summaries**: Non-lawyer explanations for business clients

### **Priority 5: Advanced AI & Automation (Q2 2026)**
- **Contextual Clause Rewriting**: Party-specific language improvement suggestions
- **Learning from Negotiations**: Machine learning from successful deal outcomes
- **Multi-Document Analysis**: Cross-contract consistency checking
- **Automated Risk Scoring**: Quantitative risk assessment with business impact
- **Natural Language Query**: "Show me all duration clauses longer than 5 years"

### **Priority 6: Enterprise & Security Features (Q3 2026)**
- **Multi-User Authentication**: Role-based access (Partners, Associates, Paralegals)
- **Audit Trail & Compliance**: Full tracking of document access and modifications
- **Advanced Security**: End-to-end encryption, SOC2 Type II compliance
- **API Integration**: Connect with existing legal practice management systems
- **White-Label Options**: Customizable for different law firm brands

### **Priority 7: Singapore Legal Market Specialization (Ongoing)**
- **Local Law Integration**: Singapore Contracts Act and case law references
- **Cross-Border Expertise**: Singapore as regional hub considerations
- **Local Court Precedents**: Integration with Singapore legal database
- **Regulatory Updates**: Automatic incorporation of new legal requirements
- **Multi-Language Support**: English, Mandarin, Malay document analysis

---

## Key Decisions Made

1. **Single-tenant architecture** - Simpler to build and deploy
2. **No authentication initially** - Focus on core functionality
3. **Keyword matching first** - Prove concept before AI
4. **Single page application** - Reduce complexity
5. **British English throughout** - Singapore market standard

---

## Success Criteria for MVP

- [ ] Successfully parse PDF and DOCX files
- [ ] Match at least 3 core clauses
- [ ] Generate visual report with scores
- [ ] Deploy to production URL
- [ ] Test with 2 real NDAs
- [ ] Complete within 4.5MB file limit
- [ ] Process in under 30 seconds

---

## Contact & Support

**Project Owner**: IntellioAI (Singapore)
**Timeline**: September 2025
**Budget**: Bootstrap (SGD 0)
**Target Market**: Singapore SME law firms