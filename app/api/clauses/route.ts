import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import type { PartyPerspective } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const partyPerspective = searchParams.get('perspective') as PartyPerspective || 'receiving';
    const clauseId = searchParams.get('clauseId');

    // Validate party perspective
    if (!['receiving', 'disclosing', 'mutual'].includes(partyPerspective)) {
      return NextResponse.json(
        { error: 'Invalid party perspective' },
        { status: 400 }
      );
    }

    if (clauseId) {
      // Fetch rules for specific clause and party perspective
      const { data: clauseData, error: clauseError } = await supabase
        .from('clauses')
        .select('*')
        .eq('id', clauseId)
        .eq('is_active', true)
        .single();

      if (clauseError || !clauseData) {
        return NextResponse.json(
          { error: 'Clause not found' },
          { status: 404 }
        );
      }

      const { data: rules, error: rulesError } = await supabase
        .from('clause_rules')
        .select('*')
        .eq('clause_id', clauseId)
        .eq('party_perspective', partyPerspective)
        .order('severity', { ascending: false });

      if (rulesError) {
        return NextResponse.json(
          { error: 'Failed to fetch rules', details: rulesError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        data: {
          clause: clauseData,
          rules: rules,
          partyPerspective
        }
      });
    } else {
      // Fetch all clauses with their party-specific rules
      const { data: clauses, error: clausesError } = await supabase
        .from('clauses')
        .select(`
          *,
          clause_rules!inner(
            id,
            rule_type,
            party_perspective,
            rule_text,
            keywords,
            severity,
            guidance_notes,
            example_language,
            rewriting_prompt,
            created_at,
            updated_at
          )
        `)
        .eq('clause_rules.party_perspective', partyPerspective)
        .eq('is_active', true)
        .order('display_order');

      if (clausesError) {
        return NextResponse.json(
          { error: 'Failed to fetch clauses', details: clausesError.message },
          { status: 500 }
        );
      }

      // Group rules by rule type for each clause
      const processedClauses = clauses.map(clause => {
        const rulesByType = {
          starting_position: null,
          fallback: null,
          not_acceptable: null
        };

        clause.clause_rules.forEach((rule: any) => {
          rulesByType[rule.rule_type as keyof typeof rulesByType] = rule;
        });

        return {
          ...clause,
          rules: rulesByType,
          totalRules: clause.clause_rules.length
        };
      });

      // Calculate summary statistics
      const totalRules = processedClauses.reduce((sum, clause) => sum + clause.totalRules, 0);
      const availablePerspectives = ['receiving', 'disclosing', 'mutual'];
      
      return NextResponse.json({
        success: true,
        data: {
          clauses: processedClauses,
          summary: {
            totalClauses: processedClauses.length,
            totalRules,
            partyPerspective,
            availablePerspectives,
            rulesPerClause: totalRules / processedClauses.length
          }
        }
      });
    }

  } catch (error) {
    console.error('Clauses API error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}