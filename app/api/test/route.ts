import { NextResponse } from 'next/server';
import { testSupabaseConnection, supabase } from '@/lib/supabase';

export async function GET() {
  try {
    // Test basic connection
    const connectionTest = await testSupabaseConnection();
    
    if (!connectionTest.success) {
      return NextResponse.json(
        { 
          error: 'Database connection failed', 
          details: connectionTest.error 
        },
        { status: 500 }
      );
    }

    // Test that we can fetch clause rules with party perspective
    const { data: rulesTest, error: rulesError } = await supabase
      .from('clause_rules')
      .select('id, party_perspective, rule_type')
      .eq('party_perspective', 'receiving')
      .limit(3);

    if (rulesError) {
      return NextResponse.json(
        { 
          error: 'Failed to fetch rules', 
          details: rulesError.message 
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'NDA Playbook System Ready',
      status: {
        database: 'Connected',
        clauses: connectionTest.data?.length || 0,
        rules: rulesTest?.length || 0,
        partyPerspectives: ['receiving', 'disclosing', 'mutual']
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('API test error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}