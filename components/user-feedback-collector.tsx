'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  ThumbsUp, 
  ThumbsDown, 
  Edit3, 
  Star, 
  TrendingUp, 
  AlertCircle,
  CheckCircle,
  Brain
} from 'lucide-react';

interface FeedbackData {
  ruleId: string;
  clauseName: string;
  detectedText: string;
  confidence: number;
  ruleType: 'starting_position' | 'fallback' | 'not_acceptable';
  detectionMethod: 'semantic' | 'keyword' | 'hierarchical' | 'hybrid';
  mlConfidence?: number;
  performanceMetrics?: {
    precision: number;
    recall: number;
    f1_score: number;
  };
}

interface UserFeedbackCollectorProps {
  feedbackData: FeedbackData;
  onFeedbackSubmitted: (feedback: {
    action: 'accepted' | 'rejected' | 'modified';
    comment?: string;
    suggestion?: string;
    confidenceRating?: number;
  }) => void;
  className?: string;
}

export function UserFeedbackCollector({ 
  feedbackData, 
  onFeedbackSubmitted,
  className = ''
}: UserFeedbackCollectorProps) {
  const [feedbackMode, setFeedbackMode] = useState<'initial' | 'detailed' | 'submitted'>('initial');
  const [selectedAction, setSelectedAction] = useState<'accepted' | 'rejected' | 'modified' | null>(null);
  const [comment, setComment] = useState('');
  const [suggestion, setSuggestion] = useState('');
  const [confidenceRating, setConfidenceRating] = useState<number>(3);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleQuickFeedback = async (action: 'accepted' | 'rejected' | 'modified') => {
    setIsSubmitting(true);
    
    try {
      if (action === 'accepted') {
        // Simple acceptance - submit immediately
        await onFeedbackSubmitted({ action });
        setFeedbackMode('submitted');
      } else {
        // For rejection or modification, show detailed form
        setSelectedAction(action);
        setFeedbackMode('detailed');
      }
    } catch (error) {
      console.error('Feedback submission failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDetailedSubmit = async () => {
    if (!selectedAction) return;
    
    setIsSubmitting(true);
    
    try {
      await onFeedbackSubmitted({
        action: selectedAction,
        comment: comment.trim() || undefined,
        suggestion: suggestion.trim() || undefined,
        confidenceRating
      });
      setFeedbackMode('submitted');
    } catch (error) {
      console.error('Detailed feedback submission failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getMethodBadgeColor = (method: string) => {
    switch (method) {
      case 'semantic': return 'bg-blue-100 text-blue-800';
      case 'hierarchical': return 'bg-purple-100 text-purple-800';
      case 'hybrid': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (feedbackMode === 'submitted') {
    return (
      <Card className={`${className} border-green-200 bg-green-50`}>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-green-700">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">Feedback Submitted</span>
          </div>
          <p className="text-green-600 text-sm mt-2">
            Thank you! Your feedback will help improve the AI analysis accuracy.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-600" />
            AI Analysis Feedback
          </CardTitle>
          <Badge className={getMethodBadgeColor(feedbackData.detectionMethod)}>
            {feedbackData.detectionMethod}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Analysis Summary */}
        <div className="bg-gray-50 p-3 rounded-lg space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Clause: {feedbackData.clauseName}</span>
            <span className="text-sm text-gray-600">
              Rule: {feedbackData.ruleType.replace('_', ' ')}
            </span>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <TrendingUp className={`w-4 h-4 ${getConfidenceColor(feedbackData.confidence)}`} />
              <span className={`text-sm font-medium ${getConfidenceColor(feedbackData.confidence)}`}>
                {(feedbackData.confidence * 100).toFixed(1)}% confidence
              </span>
            </div>
            
            {feedbackData.mlConfidence && (
              <div className="flex items-center gap-1">
                <Brain className="w-4 h-4 text-purple-600" />
                <span className="text-sm text-purple-600">
                  ML: {(feedbackData.mlConfidence * 100).toFixed(1)}%
                </span>
              </div>
            )}
          </div>
          
          {feedbackData.performanceMetrics && (
            <div className="flex gap-4 text-xs text-gray-600">
              <span>P: {(feedbackData.performanceMetrics.precision * 100).toFixed(0)}%</span>
              <span>R: {(feedbackData.performanceMetrics.recall * 100).toFixed(0)}%</span>
              <span>F1: {(feedbackData.performanceMetrics.f1_score * 100).toFixed(0)}%</span>
            </div>
          )}
        </div>

        {feedbackMode === 'initial' && (
          <div className="space-y-3">
            <p className="text-sm text-gray-700">
              How accurate was this analysis?
            </p>
            
            <div className="flex gap-2">
              <Button
                onClick={() => handleQuickFeedback('accepted')}
                disabled={isSubmitting}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              >
                <ThumbsUp className="w-4 h-4 mr-1" />
                Accurate
              </Button>
              
              <Button
                onClick={() => handleQuickFeedback('modified')}
                disabled={isSubmitting}
                variant="outline"
                className="flex-1"
              >
                <Edit3 className="w-4 h-4 mr-1" />
                Needs Work
              </Button>
              
              <Button
                onClick={() => handleQuickFeedback('rejected')}
                disabled={isSubmitting}
                variant="outline"
                className="flex-1 border-red-300 text-red-700 hover:bg-red-50"
              >
                <ThumbsDown className="w-4 h-4 mr-1" />
                Wrong
              </Button>
            </div>
          </div>
        )}

        {feedbackMode === 'detailed' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              {selectedAction === 'rejected' ? (
                <AlertCircle className="w-5 h-5 text-red-600" />
              ) : (
                <Edit3 className="w-5 h-5 text-blue-600" />
              )}
              <h4 className="font-medium">
                {selectedAction === 'rejected' ? 'Analysis was incorrect' : 'Analysis needs improvement'}
              </h4>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                What went wrong? (Optional)
              </label>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Describe the issue with the analysis..."
                className="w-full"
                rows={3}
              />
            </div>

            {selectedAction === 'modified' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Suggested improvement:
                </label>
                <Textarea
                  value={suggestion}
                  onChange={(e) => setSuggestion(e.target.value)}
                  placeholder="How should this analysis be improved?"
                  className="w-full"
                  rows={3}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Overall confidence in your feedback:
              </label>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    onClick={() => setConfidenceRating(rating)}
                    className={`p-1 ${rating <= confidenceRating ? 'text-yellow-500' : 'text-gray-300'}`}
                  >
                    <Star className="w-5 h-5 fill-current" />
                  </button>
                ))}
                <span className="ml-2 text-sm text-gray-600">
                  ({confidenceRating}/5)
                </span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleDetailedSubmit}
                disabled={isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
              </Button>
              <Button
                onClick={() => setFeedbackMode('initial')}
                variant="outline"
                disabled={isSubmitting}
              >
                Back
              </Button>
            </div>
          </div>
        )}

        {/* Learning Impact Notice */}
        <div className="bg-blue-50 p-3 rounded-lg border-l-4 border-blue-400">
          <div className="flex items-start gap-2">
            <Brain className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="text-blue-800 font-medium mb-1">Continuous Learning</p>
              <p className="text-blue-700">
                Your feedback helps train our AI to provide better analysis for future documents.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}