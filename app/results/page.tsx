'use client'

import { useState, useEffect } from 'react';
import { AnalysisResults } from '@/components/analysis-results';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function ResultsPage() {
  const [selectedReview, setSelectedReview] = useState<string>('1d2e25af-d410-45c9-89ff-c65f567c3fc5');
  const [partyPerspective, setPartyPerspective] = useState<'receiving' | 'disclosing'>('receiving');

  const reviews = [
    {
      id: '1d2e25af-d410-45c9-89ff-c65f567c3fc5',
      title: 'Receiving Party Analysis',
      party: 'receiving' as const,
      description: 'Test NDA from receiving party perspective'
    },
    {
      id: '7ae269da-420c-4e26-bdec-b6695739af8e', 
      title: 'Disclosing Party Analysis',
      party: 'disclosing' as const,
      description: 'Same NDA from disclosing party perspective'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800 mb-4">
            🧪 NDA Analysis Results Testing
          </h1>
          <p className="text-slate-600 mb-6">
            Compare how the same NDA document gets different analysis results based on party perspective
          </p>
          
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Select Test Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {reviews.map((review) => (
                  <Button
                    key={review.id}
                    variant={selectedReview === review.id ? "default" : "outline"}
                    className="h-auto p-4 justify-start text-left"
                    onClick={() => {
                      setSelectedReview(review.id);
                      setPartyPerspective(review.party);
                    }}
                  >
                    <div>
                      <div className="font-semibold flex items-center gap-2">
                        <Badge variant={review.party === 'receiving' ? 'default' : 'secondary'}>
                          {review.party === 'receiving' ? '📋 Receiving' : '🏢 Disclosing'}
                        </Badge>
                        {review.title}
                      </div>
                      <div className="text-sm opacity-80 mt-1">
                        {review.description}
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="bg-white rounded-lg shadow-lg">
          <AnalysisResults 
            reviewId={selectedReview} 
            partyPerspective={partyPerspective} 
          />
        </div>
      </div>
    </div>
  );
}