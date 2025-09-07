'use client'

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { PartyPerspective } from '@/types';

interface PartySelectionProps {
  onPartySelected: (perspective: PartyPerspective) => void;
  onPlaybookBrowse?: (perspective: PartyPerspective) => void;
  selectedPerspective?: PartyPerspective;
}

const partyOptions = [
  {
    value: 'receiving' as const,
    title: 'Receiving Party',
    icon: '📋',
    subtitle: 'M&A Acquirer / Investor',
    description: 'Your client is receiving confidential information for due diligence or investment evaluation.',
    benefits: [
      'Minimize restrictions on future operations',
      'Narrow confidentiality scope to marked information',
      'Short duration (3-5 years) with clear endpoints',
      'Broad exceptions for public and independently developed information'
    ],
    isDefault: true
  },
  {
    value: 'disclosing' as const,
    title: 'Disclosing Party', 
    icon: '🏢',
    subtitle: 'Target Company / Seller',
    description: 'Your client is sharing sensitive business information that needs maximum protection.',
    benefits: [
      'Comprehensive protection of all shared information',
      'Long duration (7-10 years) with indefinite trade secret protection',
      'Limited exceptions only for truly public information',
      'Strong enforcement in favourable jurisdiction'
    ],
    isDefault: false
  },
  {
    value: 'mutual' as const,
    title: 'Mutual NDA',
    icon: '🤝', 
    subtitle: 'Joint Venture / Partnership',
    description: 'Both parties are exchanging confidential information and need balanced protection.',
    benefits: [
      'Equal obligations and protection for both parties',
      'Balanced duration (5 years) with fair exceptions',
      'Reciprocal treatment of confidential information',
      'Neutral jurisdiction for dispute resolution'
    ],
    isDefault: false
  }
];

export function PartySelection({ onPartySelected, onPlaybookBrowse, selectedPerspective }: PartySelectionProps) {
  const [selected, setSelected] = useState<PartyPerspective | undefined>(selectedPerspective);

  const handleSelection = (perspective: PartyPerspective) => {
    setSelected(perspective);
  };

  const handleContinue = () => {
    if (selected) {
      onPartySelected(selected);
    }
  };

  const handleBrowsePlaybook = () => {
    if (selected && onPlaybookBrowse) {
      onPlaybookBrowse(selected);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-100 via-white to-kaiterra-50 p-6">
      <div className="max-w-6xl mx-auto">
        
        {/* Header - Enhanced with Kaiterra professional aesthetic */}
        <div className="text-center mb-12">
          <div className="mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-kaiterra-600 rounded-2xl mb-4 shadow-kaiterra">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                <div className="w-4 h-4 bg-kaiterra-600 rounded"></div>
              </div>
            </div>
          </div>
          <h1 className="text-4xl font-bold text-neutral-800 mb-4 tracking-tight">
            NDA Review Playbook
          </h1>
          <p className="text-xl text-neutral-600 mb-2 max-w-2xl mx-auto">
            Select your client&apos;s perspective to get party-specific legal analysis
          </p>
          <p className="text-sm text-neutral-500 max-w-xl mx-auto">
            This determines which negotiation strategy and legal standards will be applied
          </p>
        </div>

        {/* Party Selection Cards - Enhanced with monitoring dashboard style */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          {partyOptions.map((option) => (
            <Card 
              key={option.value}
              className={`cursor-pointer transition-all duration-300 hover:shadow-strong border-2 rounded-2xl ${
                selected === option.value 
                  ? 'ring-4 ring-kaiterra-200 bg-kaiterra-50 border-kaiterra-300 shadow-kaiterra transform scale-105' 
                  : 'hover:bg-neutral-50 border-neutral-200 hover:border-kaiterra-300 hover:shadow-medium'
              }`}
              onClick={() => handleSelection(option.value)}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{option.icon}</span>
                    <div>
                      <CardTitle className="text-lg">
                        {option.title}
                      </CardTitle>
                      <CardDescription className="text-sm font-medium text-blue-600">
                        {option.subtitle}
                      </CardDescription>
                    </div>
                  </div>
                  {option.isDefault && (
                    <Badge variant="secondary" className="text-xs">
                      Default
                    </Badge>
                  )}
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-600">
                  {option.description}
                </p>
                
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">
                    Strategy Focus:
                  </h4>
                  <ul className="space-y-1">
                    {option.benefits.map((benefit, index) => (
                      <li key={index} className="text-xs text-gray-600 flex items-start gap-2">
                        <span className="text-green-500 mt-0.5">✓</span>
                        {benefit}
                      </li>
                    ))}
                  </ul>
                </div>

                {selected === option.value && (
                  <div className="pt-2 border-t">
                    <Badge variant="default" className="text-xs">
                      Selected
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center gap-4">
          <Button
            size="lg"
            variant="outline"
            onClick={handleBrowsePlaybook}
            disabled={!selected}
            className="px-8 py-3"
          >
            📖 Browse Playbook
            {selected && (
              <span className="ml-2 text-xs">
                ({partyOptions.find(p => p.value === selected)?.title})
              </span>
            )}
          </Button>
          <Button
            size="lg"
            onClick={handleContinue}
            disabled={!selected}
            className="px-8 py-3"
          >
            📤 Continue to Upload NDA
            {selected && (
              <span className="ml-2 text-xs">
                ({partyOptions.find(p => p.value === selected)?.title})
              </span>
            )}
          </Button>
        </div>

        {/* Additional Info */}
        <div className="mt-8 text-center">
          <Card className="max-w-2xl mx-auto bg-blue-50 border-blue-200">
            <CardContent className="p-6">
              <h3 className="font-semibold text-blue-900 mb-2">
                Why Party Perspective Matters
              </h3>
              <p className="text-sm text-blue-700">
                NDA negotiation strategy fundamentally differs based on which party you represent. 
                Our system analyses clauses against 27 comprehensive rules tailored to your client&apos;s 
                specific needs and provides contextual rewriting suggestions based on their position.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}