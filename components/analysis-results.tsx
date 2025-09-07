'use client'

import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ClauseDetailPanel } from './clause-detail-panel';
import type { PartyPerspective } from '@/types';
import { CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';

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
  const [rightPanelOpen, setRightPanelOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      setRightPanelOpen(true);
    }
  };

  const handlePanelClose = () => {
    setRightPanelOpen(false);
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

  const selectedItem = data.matrix.find(item => item.clauseName === selectedClause);
  const selectedAnalysis = selectedItem && selectedRuleType !== 'missing' 
    ? selectedItem[selectedRuleType as keyof MatrixItem] 
    : null;

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
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-gray-900">
              {data.summary.totalAnalyses}
            </div>
            <div className="text-sm text-gray-500">Total Analyses</div>
          </CardContent>
        </Card>
        
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
        
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">
              {(data.summary.avgConfidence * 100).toFixed(0)}%
            </div>
            <div className="text-sm text-gray-500">Avg Confidence</div>
          </CardContent>
        </Card>
      </div>

      {/* Analysis Matrix (3×4 Grid) */}
      <Card>
        <CardHeader>
          <CardTitle>Analysis Matrix</CardTitle>
          <CardDescription>
            Click on any cell to view detailed analysis and suggestions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="p-3 text-left font-medium text-gray-700 border-b">
                    Clause Type
                  </th>
                  <th className="p-3 text-center font-medium text-gray-700 border-b">
                    ✅ Starting Position
                  </th>
                  <th className="p-3 text-center font-medium text-gray-700 border-b">
                    ⚠️ Fallback
                  </th>
                  <th className="p-3 text-center font-medium text-gray-700 border-b">
                    ❌ Not Acceptable
                  </th>
                  <th className="p-3 text-center font-medium text-gray-700 border-b">
                    📝 Missing
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.matrix.map((item, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-medium text-gray-900">
                      {item.clauseName}
                    </td>
                    
                    <td 
                      className={`p-3 text-center cursor-pointer hover:bg-green-50 ${
                        item.startingPosition ? 'bg-green-50' : ''
                      }`}
                      onClick={() => handleCellClick(item.clauseName, 'startingPosition', item)}
                    >
                      {getStatusIcon(item, 'startingPosition')}
                    </td>
                    
                    <td 
                      className={`p-3 text-center cursor-pointer hover:bg-yellow-50 ${
                        item.fallback ? 'bg-yellow-50' : ''
                      }`}
                      onClick={() => handleCellClick(item.clauseName, 'fallback', item)}
                    >
                      {getStatusIcon(item, 'fallback')}
                    </td>
                    
                    <td 
                      className={`p-3 text-center cursor-pointer hover:bg-red-50 ${
                        item.notAcceptable ? 'bg-red-50' : ''
                      }`}
                      onClick={() => handleCellClick(item.clauseName, 'notAcceptable', item)}
                    >
                      {getStatusIcon(item, 'notAcceptable')}
                    </td>
                    
                    <td 
                      className={`p-3 text-center cursor-pointer hover:bg-yellow-50 ${
                        item.missing ? 'bg-yellow-50' : ''
                      }`}
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

      {/* Right Panel Detail Component */}
      <ClauseDetailPanel
        isOpen={rightPanelOpen}
        onClose={handlePanelClose}
        selectedClause={selectedClause}
        selectedRuleType={selectedRuleType}
        selectedAnalysis={selectedAnalysis}
        partyPerspective={partyPerspective}
        onSwitchParty={onSwitchParty || (() => {})}
        onSaveChanges={handleSaveChanges}
      />
    </div>
  );
}