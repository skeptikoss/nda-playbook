# CLAUDE.md - Project Guidelines for Claude Code Sessions

## Essential Instructions

**IMPORTANT**: At the start of EVERY conversation:
1. Always read `PLANNING.md` first to understand the project vision and architecture
2. Check `TASKS.md` to see current progress and pending work
3. Mark completed tasks in `TASKS.md` immediately after completion
4. Add newly discovered tasks to `TASKS.md` when found
5. Use British English consistently throughout all code and documentation
6. Remember: This system categorises clauses into rule levels, NOT scores - focus on Starting Position/Fallback/Not Acceptable categorisation
7. Always implement human-in-the-loop review for clause categorisations - accuracy is critical for legal documents

---

## Project Overview

You are helping build an NDA Playbook System - a single-page application with fixed sidebar navigation that analyses NDA documents against pre-seeded legal rules using AI-powered contextual suggestions.

**Core Functionality**: 
- **3-Section UI**: Fixed sidebar (Playbook Browser, NDA Upload, Analysis Results) + dynamic content + sliding right panel
- **Keyword Matching**: Match uploaded NDAs against 3 clause types with party-perspective-aware keywords
- **AI Integration**: OpenAI-powered contextual rewording suggestions based on client's negotiation position
- **Auto-Navigation**: Party Selection → Upload → Analysis → Results with progress indicators
- **Interactive Matrix**: 3×4 grid with clickable marks that slide in detailed explanations
- **Party Perspective System**: 27 rules (3 clauses × 3 perspectives × 3 levels) for context-aware analysis

**Tech Stack**: Next.js 14 (App Router) + Supabase + Vercel + OpenAI API
**Developer Experience**: Zero coding experience - provide clear, complete code
**Timeline**: MVP by 19 September 2025

---

## Core Principles

### 1. Code Generation Approach
- **Always provide complete, working code** - no snippets or partial implementations
- **Explain what each code block does** in simple terms
- **Include all imports and dependencies** explicitly
- **Test code before providing** to ensure it works

### 2. Error Handling
- Always include try-catch blocks in async functions
- Provide meaningful error messages that non-developers can understand
- Log errors to console for debugging
- Never let the app crash silently

### 3. File Organisation
```
Always follow this structure:
- API routes in: app/api/[endpoint]/route.ts
- Components in: components/[component-name].tsx
- Utilities in: lib/[utility-name].ts
- Types in: types/index.ts
```

### 4. Database Interactions
- Always use `supabaseAdmin` for server-side operations (API routes)
- Use prepared statements where possible
- Check for null/undefined before accessing data
- Return meaningful error messages from Supabase operations
- Use the production schema: `clauses`, `clause_rules`, `reviews`, `clause_analyses`
- Leverage enhanced pre-seeded data - 3 clauses × 3 perspectives × 3 rule levels = 27 complete rules with party-specific keywords and AI prompts
- Always include party perspective field: `party_perspective` ('disclosing', 'receiving', 'mutual')
- Always include AI suggestion fields: `suggested_text`, `edited_suggestion`, `user_override_type`

### 5. British English Convention
- Use 'analyse' not 'analyze'
- Use 'organisation' not 'organization'  
- Use 'colour' not 'color'
- Use 'centre' not 'center'
- Apply to all user-facing text, comments, and documentation

### 6. Use MCP tools when it is efficient to do so
- Browsermcp tool to use Microsoft Edge browser for testing and debugging
- Firecrawl tool to access internet information
- Ref tool to get up-to-date on documentation for APIs, services, libraries
- Sequential-thinking tool for a structured thinking process
- Shadcn tool for access to shadcn/ui v4 components, blocks, demos, and metadata
- Supabase tool for interaction with Supabase projects
- Vercel tool for interaction with Vercel projects

---

## Development Workflow

### For New Features
1. Check TASKS.md for the current milestone
2. Create database schema first (if needed)
3. Build API routes before UI components
4. Test with Postman/curl before building UI
5. Update TASKS.md after completion

### For Bug Fixes
1. Reproduce the issue first
2. Explain the root cause
3. Provide the complete fixed file (not just the changed lines)
4. Test the fix thoroughly
5. Document in TASKS.md

### For Optimisations
1. Measure current performance first
2. Explain the optimisation approach
3. Implement incrementally
4. Verify improvements
5. Document changes

---

## Common Patterns

### API Route Template
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    // Input validation
    const body = await request.json()
    
    // Business logic
    
    // Return success
    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

### Component Template
```typescript
'use client'

import { useState, useEffect } from 'react'

interface ComponentProps {
  // Define props
}

export function ComponentName({ prop }: ComponentProps) {
  // State management
  const [loading, setLoading] = useState(false)
  
  // Event handlers
  
  // Effects
  
  // Render
  return <div>Component</div>
}
```

---

## Supabase Specifics

### Storage Bucket
- Bucket name: `nda-documents`
- Max file size: 4.5MB
- Accepted types: PDF, DOCX

### Database Tables (Production Schema)
- `clauses` - The 3 clause types (Definition, Duration, Governing Law) with display_order
- `clause_rules` - Complete pre-seeded rules with keywords[], AI rewriting_prompt, example_language
- `reviews` - NDA document analysis sessions with status tracking for progress indicators
- `clause_analyses` - Analysis results with AI suggested_text and user override capabilities

### Common Queries
```typescript
// Fetch clauses with party-specific rules for playbook display
const { data, error } = await supabaseAdmin
  .from('clauses')
  .select(`
    *, 
    clause_rules!inner(
      *,
      party_perspective
    )
  `)
  .eq('clause_rules.party_perspective', selectedPerspective)
  .order('display_order')
  
// Create review session with party perspective tracking
const { data, error } = await supabaseAdmin
  .from('reviews')
  .insert({ 
    client_name,
    nda_title, 
    file_path,
    original_text,
    party_perspective: 'receiving', // default to receiving party
    status: 'processing' // for progress indicators
  })
  .select()
  .single()

// Create analysis result with party-aware AI suggestion
const { data, error } = await supabaseAdmin
  .from('clause_analyses')
  .insert({ 
    review_id,
    clause_id, 
    detected_text,
    match_type: 'not_acceptable',
    confidence_score: 0.92,
    suggested_text: contextualAISuggestion, // based on party perspective
    recommended_action: 'Rewrite using Starting Position standard for receiving party'
  })
  .select()
  .single()
```

---

## Party Perspective System

### Core Concept
NDA negotiation strategy fundamentally differs based on which party the lawyer represents:

#### **Receiving Party** (DEFAULT - Acquirer/Investor)
- **Goal**: Maximum access to information, minimal restrictions
- **Strategy**: Narrow confidentiality scope, short duration, broad exceptions
- **Example**: "Only specifically marked proprietary information protected for 3 years"

#### **Disclosing Party** (Target Company/Seller)
- **Goal**: Maximum protection of sensitive business information  
- **Strategy**: Broad confidentiality definitions, long duration, strict obligations
- **Example**: "All information shared is confidential for 10 years"

#### **Mutual NDA** (Joint Ventures/Partnerships)
- **Goal**: Balanced protection for both parties
- **Strategy**: Fair reciprocal obligations, reasonable scope and duration
- **Example**: "Reasonable confidentiality scope for 5 years with standard exceptions"

### Implementation Approach
- **Party Selection**: User selects perspective before analysis
- **Context-Aware Rules**: 27 total rules (3 clauses × 3 perspectives × 3 levels)
- **Perspective-Specific Keywords**: Different matching terms for each party position
- **Contextual AI Suggestions**: Rewording based on client's negotiation strategy

### Target Context
- **Client Sectors**: Banking, Shipping, Telco, Tech, FMCG
- **Transaction Types**: M&A acquisitions, divestments, due diligence
- **Default Setting**: Receiving party (most common in M&A scenarios)

---

## UI Components (shadcn/ui)

Always install components before using:
```bash
npx shadcn-ui@latest add [component-name]
```

Common components needed:
- card, button, input, label (basic UI)
- progress (multi-step analysis progress indicators)
- toast (notifications and success messages)  
- alert (error messages)
- textarea (for editing AI suggestions)
- badge (for classification labels: Starting Position/Fallback/Not Acceptable)

---

## Testing Checklist

Before marking a task complete:
- [ ] Code compiles without errors
- [ ] No TypeScript warnings
- [ ] API endpoints return correct status codes with proper progress updates
- [ ] UI displays loading states and progress indicators correctly
- [ ] AI suggestions generate successfully with fallback to templates
- [ ] Sidebar navigation and auto-switching works
- [ ] Right panel slide-in animations work smoothly
- [ ] Matrix displays correct classifications (✅❌⚠️)
- [ ] Errors are handled gracefully
- [ ] Console has no errors
- [ ] Complete user flow works: Browse → Upload → Analyse → Results → Details

---

## Deployment Notes

### Environment Variables Required
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=
OPENAI_API_KEY=
```

### Vercel Configuration
- Framework: Next.js
- Build Command: `npm run build`
- Output Directory: `.next`
- Function timeout: 30 seconds

---

## Getting Help

If stuck:
1. Check the error message carefully
2. Verify environment variables are set
3. Check Supabase logs for database errors
4. Ensure all dependencies are installed
5. Verify file paths are correct
6. Check browser console for client-side errors

---

## Remember

- This is a legal tech application - accuracy matters
- The user has no coding experience - be explicit
- MVP deadline is 19 September - focus on core features
- Keep it simple - avoid premature optimisation
- Document everything - future Claude sessions need context