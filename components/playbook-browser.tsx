'use client'

import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { PartyPerspective, ClauseRule } from '@/types';

interface PlaybookBrowserProps {
  partyPerspective: PartyPerspective;
}

interface ClauseWithRules {
  id: string;
  name: string;
  category: string;
  display_order: number;
  rules: {
    starting_position: ClauseRule | null;
    fallback: ClauseRule | null;
    not_acceptable: ClauseRule | null;
  };
  totalRules: number;
}

export function PlaybookBrowser({ partyPerspective }: PlaybookBrowserProps) {
  const [clauses, setClauses] = useState<ClauseWithRules[]>([]);
  const [selectedClause, setSelectedClause] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchClauses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/clauses?perspective=${partyPerspective}`);
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch clauses');
      }

      setClauses(result.data.clauses);
      
      // Auto-select first clause
      if (result.data.clauses.length > 0) {
        setSelectedClause(result.data.clauses[0].id);
      }
      
    } catch (err) {
      console.error('Error fetching clauses:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [partyPerspective]);

  useEffect(() => {
    fetchClauses();
  }, [fetchClauses]);

  const selectedClauseData = clauses.find(c => c.id === selectedClause);

  const getRuleIcon = (ruleType: string) => {
    switch (ruleType) {
      case 'starting_position': return '✅';
      case 'fallback': return '⚠️';
      case 'not_acceptable': return '❌';
      default: return '❓';
    }
  };

  const getRuleBadgeVariant = (ruleType: string) => {
    switch (ruleType) {
      case 'starting_position': return 'default';
      case 'fallback': return 'secondary';
      case 'not_acceptable': return 'destructive';
      default: return 'outline';
    }
  };

  const getPartyDescription = (perspective: PartyPerspective) => {
    switch (perspective) {
      case 'receiving':
        return 'Your client is receiving confidential information (M&A acquirer/investor position)';
      case 'disclosing':
        return 'Your client is sharing confidential information (target company/seller position)';
      case 'mutual':
        return 'Both parties are exchanging confidential information (partnership/JV position)';
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="text-red-700">
              <strong>Error:</strong> {error}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          📖 Playbook Browser
        </h2>
        <p className="text-gray-600 mb-4">
          {getPartyDescription(partyPerspective)}
        </p>
        <div className="flex items-center gap-2 mb-4">
          <Badge variant="default">
            {partyPerspective.charAt(0).toUpperCase() + partyPerspective.slice(1)} Party
          </Badge>
          <Badge variant="outline">
            {clauses.length} Clause Types
          </Badge>
          <Badge variant="outline">
            {clauses.reduce((sum, c) => sum + c.totalRules, 0)} Rules
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Clause List */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            NDA Clause Types
          </h3>
          
          {clauses.map((clause) => (
            <Card
              key={clause.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                selectedClause === clause.id ? 'ring-2 ring-blue-500 bg-blue-50' : ''
              }`}
              onClick={() => setSelectedClause(clause.id)}
            >
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">
                  {clause.name}
                </CardTitle>
                <CardDescription>
                  {clause.totalRules} rules for {partyPerspective} party perspective
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                <div className="flex gap-2">
                  {Object.entries(clause.rules).map(([ruleType, rule]) => (
                    <Badge
                      key={ruleType}
                      variant={rule ? getRuleBadgeVariant(ruleType) : 'outline'}
                      className="text-xs"
                    >
                      {getRuleIcon(ruleType)} {ruleType.replace('_', ' ')}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Rule Details */}
        <div className="space-y-4">
          {selectedClauseData ? (
            <>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {selectedClauseData.name} Rules
              </h3>
              
              {Object.entries(selectedClauseData.rules).map(([ruleType, rule]) => {
                if (!rule) return null;
                
                return (
                  <Card key={ruleType} className="mb-4">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{getRuleIcon(ruleType)}</span>
                        <CardTitle className="text-base capitalize">
                          {ruleType.replace('_', ' ')}
                        </CardTitle>
                        <Badge variant={getRuleBadgeVariant(ruleType)} className="text-xs">
                          Severity {rule.severity}
                        </Badge>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      
                      {/* Rule Text */}
                      <div>
                        <h4 className="font-medium text-gray-700 mb-2">Rule:</h4>
                        <p className="text-sm text-gray-600">{rule.rule_text}</p>
                      </div>
                      
                      {/* Guidance */}
                      <div>
                        <h4 className="font-medium text-gray-700 mb-2">Guidance:</h4>
                        <p className="text-sm text-gray-600">{rule.guidance_notes}</p>
                      </div>
                      
                      {/* Example Language */}
                      <div>
                        <h4 className="font-medium text-gray-700 mb-2">Example Language:</h4>
                        <div className="bg-gray-50 p-3 rounded text-xs font-mono text-gray-700">
                          {rule.example_language}
                        </div>
                      </div>
                      
                      {/* Keywords */}
                      <div>
                        <h4 className="font-medium text-gray-700 mb-2">Detection Keywords:</h4>
                        <div className="flex flex-wrap gap-1">
                          {rule.keywords.slice(0, 6).map((keyword, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {keyword}
                            </Badge>
                          ))}
                          {rule.keywords.length > 6 && (
                            <Badge variant="outline" className="text-xs">
                              +{rule.keywords.length - 6} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </>
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-gray-500">
                Select a clause type to view its rules
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      
      {/* Summary */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-6">
          <h4 className="font-semibold text-blue-900 mb-2">
            Party Perspective: {partyPerspective.charAt(0).toUpperCase() + partyPerspective.slice(1)}
          </h4>
          <p className="text-sm text-blue-700">
            These rules represent the legal standards and negotiation positions typically favourable to the {' '}
            <strong>{partyPerspective}</strong> party. The system will analyse uploaded NDAs against these 
            party-specific criteria and provide contextual suggestions for improving clause language.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}