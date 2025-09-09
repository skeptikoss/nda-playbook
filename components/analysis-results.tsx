'use client'

import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { PartyPerspective } from '@/types';
import { CheckCircle, XCircle, AlertTriangle, Info, ChevronDown, ChevronUp, FileText } from 'lucide-react';

interface AnalysisResultsProps {
  reviewId: string;
  partyPerspective: PartyPerspective;
  onSwitchParty?: (newPerspective: PartyPerspective) => void;
}

interface MatrixItem {
  clauseId: string | null;
  clauseName: string;
  startingPosition: any;
  fallback: any;
  notAcceptable: any;
  missing: boolean;
}

interface ReviewData {
  review: {
    id: string;
    clientName: string;
    ndaTitle: string;
    partyPerspective: PartyPerspective;
    status: string;
    overallScore: number;
    originalText?: string;
  };
  matrix: MatrixItem[];
  summary: {
    totalAnalyses: number;
    notAcceptableCount: number;
    missingCount: number;
    avgConfidence: number;
    riskLevel: 'low' | 'medium' | 'high';
  };
  analyses: any[];
}

export function AnalysisResults({ reviewId, partyPerspective, onSwitchParty }: AnalysisResultsProps) {
  const [data, setData] = useState<ReviewData | null>(null);
  const [selectedClause, setSelectedClause] = useState<string | null>(null);
  const [selectedRuleType, setSelectedRuleType] = useState<string | null>(null);
  const [selectedAnalysis, setSelectedAnalysis] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPreviewExpanded, setIsPreviewExpanded] = useState(false);

  const fetchAnalysisResults = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/reviews/${reviewId}`);
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch analysis results');
      }

      setData(result.data);
      
    } catch (err) {
      console.error('Error fetching analysis results:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [reviewId]);

  useEffect(() => {
    fetchAnalysisResults();
  }, [fetchAnalysisResults]);

  const getStatusIcon = (item: MatrixItem, ruleType: 'startingPosition' | 'fallback' | 'notAcceptable' | 'missing') => {
    if (ruleType === 'missing') {
      return item.missing ? <AlertTriangle className="w-4 h-4 text-yellow-600" /> : null;
    }
    
    const analysis = item[ruleType];
    if (!analysis) return null;
    
    switch (ruleType) {
      case 'startingPosition':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'fallback':
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      case 'notAcceptable':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Info className="w-4 h-4 text-blue-600" />;
    }
  };

  const getStatusText = (ruleType: string) => {
    switch (ruleType) {
      case 'startingPosition': return 'Starting Position';
      case 'fallback': return 'Fallback';
      case 'notAcceptable': return 'Not Acceptable';
      case 'missing': return 'Missing';
      default: return ruleType;
    }
  };

  const getRiskBadge = (riskLevel: string) => {
    switch (riskLevel) {
      case 'high':
        return <Badge variant="destructive">High Risk</Badge>;
      case 'medium':
        return <Badge variant="secondary">Medium Risk</Badge>;
      case 'low':
        return <Badge variant="default">Low Risk</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const handleCellClick = (clauseName: string, ruleType: string, item: MatrixItem) => {
    const analysis = ruleType === 'missing' ? null : item[ruleType as keyof MatrixItem];
    if (analysis || ruleType === 'missing') {
      setSelectedClause(clauseName);
      setSelectedRuleType(ruleType);
      setSelectedAnalysis(analysis);
    }
  };

  const handleSaveChanges = async (clauseId: string, changes: any) => {
    // Implementation for saving changes to the analysis
    console.log('Saving changes:', clauseId, changes);
    // You can add API call here to save changes to the database
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="h-40 bg-gray-200 rounded"></div>
          <div className="h-60 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="text-red-700">
              <strong>Error:</strong> {error || 'No data available'}
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
          📊 Analysis Results
        </h2>
        <p className="text-gray-600 mb-4">
          Party-aware analysis results for {data.review.clientName}
        </p>
        <div className="flex items-center gap-2 mb-4">
          <Badge variant="default">
            {partyPerspective.charAt(0).toUpperCase() + partyPerspective.slice(1)} Party
          </Badge>
          {getRiskBadge(data.summary.riskLevel)}
          <Badge variant="outline">
            Score: {(data.review.overallScore * 100).toFixed(0)}%
          </Badge>
          <Badge variant="outline">
            {data.summary.totalAnalyses} Analyses
          </Badge>
        </div>
      </div>

      {/* Compact Document Preview Section */}
      <Card className="mb-4">
        <CardContent className="p-4">
          <Button
            variant="ghost"
            onClick={() => setIsPreviewExpanded(!isPreviewExpanded)}
            className="w-full justify-between p-0 h-auto hover:bg-transparent"
          >
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-gray-500" />
              <div className="text-left">
                <div className="font-medium text-sm">{data.review.ndaTitle}</div>
                <div className="text-xs text-gray-500">{data.review.clientName} • {data.review.originalText?.length || 0} characters</div>
              </div>
            </div>
            {isPreviewExpanded ? 
              <ChevronUp className="w-4 h-4 text-gray-400" /> : 
              <ChevronDown className="w-4 h-4 text-gray-400" />
            }
          </Button>
          
          {isPreviewExpanded && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="bg-gray-50 border rounded-lg p-4 max-h-48 overflow-y-auto">
                <div className="text-sm font-mono text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {data.review.originalText ? 
                    data.review.originalText.substring(0, 1500) + (data.review.originalText.length > 1500 ? '...' : '')
                    : 'Document text not available'}
                </div>
              </div>
              {data.review.originalText && data.review.originalText.length > 1500 && (
                <div className="text-xs text-gray-500 mt-2">
                  Showing first 1,500 characters of {data.review.originalText.length} total
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Column - Analysis Matrix */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Analysis Matrix
          </h3>
          
          {/* Summary Stats */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-red-600">
                  {data.summary.notAcceptableCount}
                </div>
                <div className="text-sm text-gray-500">Not Acceptable</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-yellow-600">
                  {data.summary.missingCount}
                </div>
                <div className="text-sm text-gray-500">Missing Clauses</div>
              </CardContent>
            </Card>
          </div>

          {/* Matrix Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Clause Analysis Grid</CardTitle>
              <CardDescription>
                Click on any cell to view detailed analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse table-fixed">
                  <thead>
                    <tr>
                      <th className="p-2 text-left font-medium text-gray-700 border-b text-sm w-[120px]">
                        Clause
                      </th>
                      <th className="p-2 text-center font-medium text-gray-700 border-b text-sm">
                        ✅
                      </th>
                      <th className="p-2 text-center font-medium text-gray-700 border-b text-sm">
                        ⚠️
                      </th>
                      <th className="p-2 text-center font-medium text-gray-700 border-b text-sm">
                        ❌
                      </th>
                      <th className="p-2 text-center font-medium text-gray-700 border-b text-sm">
                        📝
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.matrix.map((item, index) => (
                      <tr key={index} className="border-b hover:bg-gray-50">
                        <td className="p-2 font-medium text-gray-900 text-sm min-w-[120px]">
                          <div className="truncate" title={item.clauseName}>
                            {item.clauseName}
                          </div>
                        </td>
                        
                        <td 
                          className={`p-2 text-center cursor-pointer hover:bg-green-50 ${
                            item.startingPosition ? 'bg-green-50' : ''
                          } ${selectedClause === item.clauseName && selectedRuleType === 'startingPosition' ? 'ring-2 ring-blue-500' : ''}`}
                          onClick={() => handleCellClick(item.clauseName, 'startingPosition', item)}
                        >
                          {getStatusIcon(item, 'startingPosition')}
                        </td>
                        
                        <td 
                          className={`p-2 text-center cursor-pointer hover:bg-yellow-50 ${
                            item.fallback ? 'bg-yellow-50' : ''
                          } ${selectedClause === item.clauseName && selectedRuleType === 'fallback' ? 'ring-2 ring-blue-500' : ''}`}
                          onClick={() => handleCellClick(item.clauseName, 'fallback', item)}
                        >
                          {getStatusIcon(item, 'fallback')}
                        </td>
                        
                        <td 
                          className={`p-2 text-center cursor-pointer hover:bg-red-50 ${
                            item.notAcceptable ? 'bg-red-50' : ''
                          } ${selectedClause === item.clauseName && selectedRuleType === 'notAcceptable' ? 'ring-2 ring-blue-500' : ''}`}
                          onClick={() => handleCellClick(item.clauseName, 'notAcceptable', item)}
                        >
                          {getStatusIcon(item, 'notAcceptable')}
                        </td>
                        
                        <td 
                          className={`p-2 text-center cursor-pointer hover:bg-yellow-50 ${
                            item.missing ? 'bg-yellow-50' : ''
                          } ${selectedClause === item.clauseName && selectedRuleType === 'missing' ? 'ring-2 ring-blue-500' : ''}`}
                          onClick={() => handleCellClick(item.clauseName, 'missing', item)}
                        >
                          {getStatusIcon(item, 'missing')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Analysis Details */}
        <div className="space-y-4">
          {selectedClause && selectedRuleType ? (
            <>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Analysis Details
              </h3>
              
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">{selectedClause}</CardTitle>
                    <Badge variant="outline">
                      {selectedRuleType === 'startingPosition' && '✅ Starting Position'}
                      {selectedRuleType === 'fallback' && '⚠️ Fallback'}
                      {selectedRuleType === 'notAcceptable' && '❌ Not Acceptable'}
                      {selectedRuleType === 'missing' && '📝 Missing'}
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {selectedAnalysis ? (
                    <>
                      {/* Confidence & Risk Metrics */}
                      <div className="flex gap-4">
                        <div>
                          <h4 className="font-medium text-gray-700 mb-1">Confidence:</h4>
                          <Badge variant="outline" className="text-sm">
                            {(selectedAnalysis.confidence_score * 100).toFixed(0)}%
                          </Badge>
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-700 mb-1">Risk Level:</h4>
                          <Badge 
                            variant={selectedAnalysis.risk_level >= 4 ? 'destructive' : 
                                     selectedAnalysis.risk_level >= 3 ? 'secondary' : 'default'}
                            className="text-sm"
                          >
                            {selectedAnalysis.risk_level}/5
                          </Badge>
                        </div>
                      </div>

                      {/* Detected Text */}
                      {selectedAnalysis.detected_text && (
                        <div>
                          <h4 className="font-medium text-gray-700 mb-2">Detected Text:</h4>
                          <div className="bg-gray-50 p-3 rounded-lg border text-sm font-mono">
                            {selectedAnalysis.detected_text}
                          </div>
                        </div>
                      )}

                      {/* Recommended Action */}
                      <div>
                        <h4 className="font-medium text-gray-700 mb-2">Recommended Action:</h4>
                        <div className="bg-gray-50 p-3 rounded-lg border text-sm">
                          {selectedAnalysis.recommended_action}
                        </div>
                      </div>

                      {/* AI Suggestion */}
                      {selectedAnalysis.suggested_text && (
                        <div>
                          <h4 className="font-medium text-gray-700 mb-2">
                            {partyPerspective.charAt(0).toUpperCase() + partyPerspective.slice(1)} Party Suggestion:
                          </h4>
                          <div className="bg-blue-50 p-3 rounded-lg border text-sm font-mono">
                            {selectedAnalysis.suggested_text}
                          </div>
                        </div>
                      )}

                      {/* Party Context */}
                      <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-l-blue-500">
                        <h4 className="font-medium text-blue-700 mb-2">Party Context:</h4>
                        <p className="text-sm text-blue-600">
                          {selectedRuleType === 'startingPosition' && `For ${partyPerspective} parties, this ${selectedClause.toLowerCase()} clause should provide optimal terms.`}
                          {selectedRuleType === 'fallback' && `As a ${partyPerspective} party fallback, this ${selectedClause.toLowerCase()} clause provides acceptable but not ideal terms.`}
                          {selectedRuleType === 'notAcceptable' && `This ${selectedClause.toLowerCase()} clause is problematic for ${partyPerspective} parties.`}
                          {selectedRuleType === 'missing' && `A ${selectedClause.toLowerCase()} clause tailored for ${partyPerspective} party interests should be added.`}
                        </p>
                      </div>
                    </>
                  ) : selectedRuleType === 'missing' ? (
                    <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-yellow-800 mb-1">Missing Clause</h4>
                          <p className="text-sm text-yellow-700">
                            This <strong>{selectedClause}</strong> clause appears to be missing from the NDA document. 
                            Consider adding one that aligns with {partyPerspective} party interests.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-50 p-4 rounded-lg border">
                      <p className="text-sm text-gray-600">
                        No detailed analysis available for this combination.
                      </p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-4">
                    <Button 
                      variant="outline" 
                      size="sm"
                      disabled={!selectedAnalysis?.suggested_text}
                    >
                      Edit Suggestion
                    </Button>
                    <Button 
                      variant="outline"
                      size="sm"
                    >
                      Export
                    </Button>
                    {onSwitchParty && (
                      <div className="flex gap-1 ml-auto">
                        {(['receiving', 'disclosing', 'mutual'] as const).map((perspective) => (
                          <Button
                            key={perspective}
                            variant={perspective === partyPerspective ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => onSwitchParty(perspective)}
                            className="text-xs"
                          >
                            {perspective === 'receiving' && '📋'}
                            {perspective === 'disclosing' && '🏢'}
                            {perspective === 'mutual' && '🤝'}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-gray-500">
                <div className="mb-4">
                  <Info className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <h4 className="font-medium text-gray-700 mb-2">Select Analysis to View</h4>
                  <p className="text-sm">
                    Click on any cell in the matrix to view detailed analysis and suggestions
                  </p>
                </div>
                <div className="text-xs text-gray-400">
                  <div className="flex items-center justify-center gap-4 mb-2">
                    <span>✅ Starting Position</span>
                    <span>⚠️ Fallback</span>
                  </div>
                  <div className="flex items-center justify-center gap-4">
                    <span>❌ Not Acceptable</span>
                    <span>📝 Missing</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      
      {/* Summary Footer */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-6">
          <h4 className="font-semibold text-blue-900 mb-2">
            Analysis Summary - {partyPerspective.charAt(0).toUpperCase() + partyPerspective.slice(1)} Party Perspective
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-blue-700">
            <div>
              <strong>Total Analyses:</strong> {data.summary.totalAnalyses}<br/>
              <strong>Average Confidence:</strong> {(data.summary.avgConfidence * 100).toFixed(0)}%
            </div>
            <div>
              <strong>Issues Found:</strong> {data.summary.notAcceptableCount} not acceptable<br/>
              <strong>Missing Clauses:</strong> {data.summary.missingCount}
            </div>
            <div>
              <strong>Risk Level:</strong> {getRiskBadge(data.summary.riskLevel)}<br/>
              <strong>Overall Score:</strong> {(data.review.overallScore * 100).toFixed(0)}%
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}