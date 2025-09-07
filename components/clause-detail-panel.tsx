'use client'

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { PartyPerspective } from '@/types';
import { 
  AlertTriangle, 
  ChevronRight, 
  X, 
  Edit, 
  Save,
  RotateCcw,
  Download
} from 'lucide-react';

interface ClauseDetailPanelProps {
  isOpen: boolean;
  onClose: () => void;
  selectedClause: string | null;
  selectedRuleType: string | null;
  selectedAnalysis: any | null;
  partyPerspective: PartyPerspective;
  onSwitchParty: (newPerspective: PartyPerspective) => void;
  onSaveChanges?: (clauseId: string, changes: any) => void;
}

const partyColors = {
  receiving: 'kaiterra',
  disclosing: 'forest',
  mutual: 'neutral'
};

const partyLabels = {
  receiving: '📋 Receiving Party',
  disclosing: '🏢 Disclosing Party', 
  mutual: '🤝 Mutual NDA'
};

const ruleTypeLabels = {
  startingPosition: '✅ Starting Position',
  fallback: '⚠️ Fallback',
  notAcceptable: '❌ Not Acceptable',
  missing: '📝 Missing'
};

export function ClauseDetailPanel({
  isOpen,
  onClose,
  selectedClause,
  selectedRuleType,
  selectedAnalysis,
  partyPerspective,
  onSwitchParty,
  onSaveChanges
}: ClauseDetailPanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedSuggestion, setEditedSuggestion] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (selectedAnalysis?.suggested_text) {
      setEditedSuggestion(selectedAnalysis.suggested_text);
    }
  }, [selectedAnalysis]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden'; // Prevent background scrolling
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  const handleSuggestionChange = (value: string) => {
    setEditedSuggestion(value);
    setHasChanges(value !== selectedAnalysis?.suggested_text);
  };

  const handleSave = () => {
    if (selectedAnalysis && onSaveChanges) {
      onSaveChanges(selectedAnalysis.id, {
        suggested_text: editedSuggestion,
        edited_suggestion: editedSuggestion,
        user_override_type: 'suggestion_edit'
      });
    }
    setIsEditing(false);
    setHasChanges(false);
  };

  const handleReset = () => {
    setEditedSuggestion(selectedAnalysis?.suggested_text || '');
    setHasChanges(false);
    setIsEditing(false);
  };

  const getPartyContextExplanation = (clauseName: string, ruleType: string) => {
    const contexts: Record<PartyPerspective, Record<string, string>> = {
      receiving: {
        startingPosition: `For receiving parties, this ${clauseName.toLowerCase()} clause should minimize restrictions and maximize information access rights.`,
        fallback: `As a receiving party fallback, this ${clauseName.toLowerCase()} clause provides acceptable but not ideal terms.`,
        notAcceptable: `This ${clauseName.toLowerCase()} clause is problematic for receiving parties as it creates excessive restrictions on information use.`,
        missing: `A ${clauseName.toLowerCase()} clause specifically tailored for receiving party interests should be added to protect information access rights.`
      },
      disclosing: {
        startingPosition: `For disclosing parties, this ${clauseName.toLowerCase()} clause should maximize information protection and confidentiality.`,
        fallback: `As a disclosing party fallback, this ${clauseName.toLowerCase()} clause provides reasonable but not optimal protection.`,
        notAcceptable: `This ${clauseName.toLowerCase()} clause fails to adequately protect disclosing party confidential information.`,
        missing: `A ${clauseName.toLowerCase()} clause focused on disclosing party protection should be included to safeguard sensitive information.`
      },
      mutual: {
        startingPosition: `For mutual NDAs, this ${clauseName.toLowerCase()} clause should provide balanced protection for both parties.`,
        fallback: `As a mutual NDA fallback, this ${clauseName.toLowerCase()} clause offers reasonable reciprocal protection.`,
        notAcceptable: `This ${clauseName.toLowerCase()} clause creates imbalanced terms that favor one party over the other.`,
        missing: `A balanced ${clauseName.toLowerCase()} clause should be added to ensure fair reciprocal protection for both parties.`
      }
    };

    return contexts[partyPerspective]?.[ruleType] || '';
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-25 z-40"
        onClick={onClose}
      />

      {/* Sliding Panel */}
      <div className="w-full h-full bg-white border-l border-neutral-200 flex flex-col">
        <div className="flex flex-col h-full">
          
          {/* Panel Header */}
          <div className={`
            p-4 border-b border-neutral-200 bg-${partyColors[partyPerspective]}-50
          `}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Badge className={`
                  text-xs font-medium px-3 py-1 rounded-xl border-0
                  bg-${partyColors[partyPerspective]}-600 text-white
                `}>
                  {partyLabels[partyPerspective]}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="w-8 h-8 p-0 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {selectedClause && selectedRuleType && (
              <div className="flex items-center gap-2 text-sm">
                <span className="font-semibold text-neutral-700">{selectedClause}</span>
                <ChevronRight className="w-4 h-4 text-neutral-400" />
                <span className="text-neutral-600">
                  {ruleTypeLabels[selectedRuleType as keyof typeof ruleTypeLabels]}
                </span>
              </div>
            )}
          </div>

          {/* Panel Content - Scrollable */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            
            {/* Party Context Explanation */}
            {selectedClause && selectedRuleType && (
              <div className={`
                p-4 rounded-lg border-l-4 
                border-l-${partyColors[partyPerspective]}-500 
                bg-${partyColors[partyPerspective]}-50
              `}>
                <h4 className="font-medium text-neutral-700 mb-2">Party Context:</h4>
                <p className="text-sm text-neutral-600">
                  {getPartyContextExplanation(selectedClause, selectedRuleType)}
                </p>
              </div>
            )}

            {selectedAnalysis ? (
              <div className="space-y-4">
                
                {/* Detected Text */}
                {selectedAnalysis.detected_text && (
                  <div>
                    <h4 className="font-medium text-neutral-700 mb-2">Detected Text:</h4>
                    <div className="bg-neutral-50 p-3 rounded-lg border text-sm font-mono">
                      {selectedAnalysis.detected_text}
                    </div>
                  </div>
                )}

                {/* Confidence & Risk Metrics */}
                <div className="flex gap-4">
                  <div>
                    <h4 className="font-medium text-neutral-700 mb-1">Confidence:</h4>
                    <Badge variant="outline" className="text-sm">
                      {(selectedAnalysis.confidence_score * 100).toFixed(0)}%
                    </Badge>
                  </div>
                  <div>
                    <h4 className="font-medium text-neutral-700 mb-1">Risk Level:</h4>
                    <Badge 
                      variant={selectedAnalysis.risk_level >= 4 ? 'destructive' : 
                               selectedAnalysis.risk_level >= 3 ? 'secondary' : 'default'}
                      className="text-sm"
                    >
                      {selectedAnalysis.risk_level}/5
                    </Badge>
                  </div>
                </div>

                {/* Recommended Action */}
                <div>
                  <h4 className="font-medium text-neutral-700 mb-2">Recommended Action:</h4>
                  <div className="bg-neutral-50 p-3 rounded-lg border text-sm">
                    {selectedAnalysis.recommended_action}
                  </div>
                </div>

                {/* AI Suggestion - Editable */}
                {selectedAnalysis.suggested_text && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-neutral-700">
                        {partyLabels[partyPerspective]} Suggestion:
                      </h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsEditing(!isEditing)}
                        className="text-xs"
                      >
                        <Edit className="w-3 h-3 mr-1" />
                        {isEditing ? 'Cancel' : 'Edit'}
                      </Button>
                    </div>
                    
                    {isEditing ? (
                      <div className="space-y-2">
                        <Textarea
                          value={editedSuggestion}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleSuggestionChange(e.target.value)}
                          className="min-h-[120px] text-sm font-mono"
                          placeholder="Enter your suggested clause text..."
                        />
                        {hasChanges && (
                          <div className="text-xs text-orange-600 bg-orange-50 p-2 rounded">
                            You have unsaved changes
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="bg-blue-50 p-3 rounded-lg border text-sm font-mono">
                        {editedSuggestion || selectedAnalysis.suggested_text}
                      </div>
                    )}
                  </div>
                )}

              </div>
            ) : selectedRuleType === 'missing' ? (
              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-yellow-800 mb-1">Missing Clause</h4>
                    <p className="text-sm text-yellow-700">
                      This <strong>{selectedClause}</strong> clause appears to be missing from the NDA document. 
                      Consider adding one that aligns with {partyLabels[partyPerspective].toLowerCase()} interests.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-neutral-50 p-4 rounded-lg border">
                <p className="text-sm text-neutral-600">
                  No detailed analysis available for this combination.
                </p>
              </div>
            )}

          </div>

          {/* Panel Footer - Action Buttons */}
          <div className="p-4 border-t border-neutral-200 bg-neutral-50">
            <div className="space-y-3">
              
              {/* Primary Actions */}
              <div className="flex gap-2">
                {isEditing ? (
                  <>
                    <Button 
                      onClick={handleSave}
                      disabled={!hasChanges}
                      className="flex-1 text-sm"
                      size="sm"
                    >
                      <Save className="w-3 h-3 mr-1" />
                      Save Changes
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={handleReset}
                      className="text-sm"
                      size="sm"
                    >
                      <RotateCcw className="w-3 h-3 mr-1" />
                      Reset
                    </Button>
                  </>
                ) : (
                  <>
                    <Button 
                      variant="outline" 
                      className="flex-1 text-sm"
                      size="sm"
                      onClick={() => setIsEditing(true)}
                      disabled={!selectedAnalysis?.suggested_text}
                    >
                      <Edit className="w-3 h-3 mr-1" />
                      Edit Suggestion
                    </Button>
                    <Button 
                      variant="outline"
                      className="text-sm"
                      size="sm"
                    >
                      <Download className="w-3 h-3 mr-1" />
                      Export
                    </Button>
                  </>
                )}
              </div>

              {/* Switch Party Perspective */}
              <div className="flex gap-1">
                {(['receiving', 'disclosing', 'mutual'] as const).map((perspective) => (
                  <Button
                    key={perspective}
                    variant={perspective === partyPerspective ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onSwitchParty(perspective)}
                    className="flex-1 text-xs"
                  >
                    {partyLabels[perspective].split(' ')[0]} {/* Just the emoji */}
                  </Button>
                ))}
              </div>

            </div>

            <div className="mt-2 text-xs text-neutral-500 text-center">
              Press ESC to close panel
            </div>
          </div>

        </div>
      </div>
    </>
  );
}