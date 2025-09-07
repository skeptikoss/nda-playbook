'use client'

import { useState } from 'react';
import { PartySelection } from './party-selection';
import { PlaybookBrowser } from './playbook-browser';
import { UploadSection } from './upload-section';
import { AnalysisResults } from './analysis-results';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { PartyPerspective } from '@/types';
import { BookOpen, Upload, BarChart3, ArrowLeft } from 'lucide-react';

type AppSection = 'party-selection' | 'playbook' | 'upload' | 'results';

interface AppState {
  currentSection: AppSection;
  partyPerspective: PartyPerspective | null;
  reviewId: string | null;
  uploadProgress: number;
}

export function NDAPlaybookApp() {
  const [appState, setAppState] = useState<AppState>({
    currentSection: 'party-selection',
    partyPerspective: null,
    reviewId: null,
    uploadProgress: 0
  });

  const handlePartySelected = (perspective: PartyPerspective) => {
    setAppState(prev => ({
      ...prev,
      partyPerspective: perspective,
      currentSection: 'upload' // Auto-navigate to upload after party selection
    }));
  };

  const handlePlaybookBrowse = (perspective: PartyPerspective) => {
    setAppState(prev => ({
      ...prev,
      partyPerspective: perspective,
      currentSection: 'playbook' // Auto-navigate to playbook after party selection
    }));
  };

  const handleSectionChange = (section: AppSection) => {
    // Prevent navigation to certain sections without party selection
    if (!appState.partyPerspective && section !== 'party-selection') {
      return;
    }
    
    setAppState(prev => ({
      ...prev,
      currentSection: section
    }));
  };

  const handleUploadComplete = (reviewId: string) => {
    setAppState(prev => ({
      ...prev,
      reviewId,
      currentSection: 'results' // Auto-navigate to results after analysis
    }));
  };

  const handleBackToPartySelection = () => {
    setAppState({
      currentSection: 'party-selection',
      partyPerspective: null,
      reviewId: null,
      uploadProgress: 0
    });
  };

  // If no party selected, show party selection
  if (!appState.partyPerspective) {
    return (
      <PartySelection
        onPartySelected={handlePartySelected}
        onPlaybookBrowse={handlePlaybookBrowse}
        selectedPerspective={appState.partyPerspective || undefined}
      />
    );
  }

  // Main 3-section UI with Kaiterra design system
  return (
    <div className="min-h-screen bg-neutral-100 flex">
      
      {/* Fixed Left Sidebar - Kaiterra monitoring dashboard style */}
      <div className="w-80 bg-white border-r border-neutral-200 flex flex-col shadow-medium">
        
        {/* Header - Professional monitoring aesthetic */}
        <div className="p-6 border-b border-neutral-200 bg-gradient-to-r from-kaiterra-50 to-white">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-neutral-800 tracking-tight">
              NDA Playbook
            </h1>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackToPartySelection}
              className="text-xs text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg"
            >
              <ArrowLeft className="w-3 h-3 mr-1" />
              Change Party
            </Button>
          </div>
          
          {/* Party Perspective Badge - Enhanced with Kaiterra colors */}
          <div className="flex items-center gap-2">
            <Badge className={`text-xs font-medium px-3 py-1 rounded-xl border-0 ${
              appState.partyPerspective === 'receiving' ? 'bg-kaiterra-600 text-white' :
              appState.partyPerspective === 'disclosing' ? 'bg-forest-600 text-white' :
              'bg-neutral-600 text-white'
            }`}>
              {appState.partyPerspective === 'receiving' && '📋 Receiving Party'}
              {appState.partyPerspective === 'disclosing' && '🏢 Disclosing Party'}  
              {appState.partyPerspective === 'mutual' && '🤝 Mutual NDA'}
            </Badge>
          </div>
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 flex flex-col">
          
          {/* 1. Playbook Browser Section - Kaiterra monitoring style */}
          <div 
            className={`border-b border-neutral-200 transition-all duration-200 ${
              appState.currentSection === 'playbook' ? 'bg-kaiterra-50 border-l-4 border-l-kaiterra-600' : ''
            }`}
          >
            <button
              onClick={() => handleSectionChange('playbook')}
              className="w-full p-4 text-left hover:bg-neutral-50 transition-all duration-200 flex items-center gap-3 group"
            >
              <div className={`p-2 rounded-xl transition-colors ${
                appState.currentSection === 'playbook' 
                  ? 'bg-kaiterra-600 text-white' 
                  : 'bg-kaiterra-100 text-kaiterra-600 group-hover:bg-kaiterra-200'
              }`}>
                <BookOpen className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className={`font-semibold text-sm ${
                  appState.currentSection === 'playbook' ? 'text-kaiterra-700' : 'text-neutral-700'
                }`}>
                  📖 Playbook Browser
                </div>
                <div className="text-xs text-neutral-500">
                  View {appState.partyPerspective} party rules
                </div>
              </div>
              {appState.currentSection === 'playbook' && (
                <div className="w-2 h-2 bg-kaiterra-600 rounded-full shadow-soft animate-pulse"></div>
              )}
            </button>
          </div>

          {/* 2. Upload Section - Enhanced with monitoring aesthetic */}
          <div 
            className={`border-b border-neutral-200 transition-all duration-200 ${
              appState.currentSection === 'upload' ? 'bg-forest-50 border-l-4 border-l-forest-600' : ''
            }`}
          >
            <button
              onClick={() => handleSectionChange('upload')}
              className="w-full p-4 text-left hover:bg-neutral-50 transition-all duration-200 flex items-center gap-3 group"
            >
              <div className={`p-2 rounded-xl transition-colors ${
                appState.currentSection === 'upload' 
                  ? 'bg-forest-600 text-white' 
                  : 'bg-forest-100 text-forest-600 group-hover:bg-forest-200'
              }`}>
                <Upload className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className={`font-semibold text-sm ${
                  appState.currentSection === 'upload' ? 'text-forest-700' : 'text-neutral-700'
                }`}>
                  📤 NDA Upload
                </div>
                <div className="text-xs text-neutral-500">
                  Upload & analyse NDA document
                </div>
              </div>
              {appState.currentSection === 'upload' && (
                <div className="w-2 h-2 bg-forest-600 rounded-full shadow-soft animate-pulse"></div>
              )}
            </button>
          </div>

          {/* 3. Analysis Results Section - Data monitoring style */}
          <div 
            className={`border-b border-neutral-200 transition-all duration-200 ${
              appState.currentSection === 'results' ? 'bg-neutral-50 border-l-4 border-l-neutral-600' : ''
            }`}
          >
            <button
              onClick={() => handleSectionChange('results')}
              disabled={!appState.reviewId}
              className="w-full p-4 text-left hover:bg-neutral-50 transition-all duration-200 flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              <div className={`p-2 rounded-xl transition-colors ${
                appState.currentSection === 'results' && appState.reviewId
                  ? 'bg-neutral-600 text-white' 
                  : appState.reviewId 
                  ? 'bg-neutral-100 text-neutral-600 group-hover:bg-neutral-200'
                  : 'bg-neutral-100 text-neutral-400'
              }`}>
                <BarChart3 className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className={`font-semibold text-sm ${
                  appState.currentSection === 'results' ? 'text-neutral-700' : 'text-neutral-600'
                }`}>
                  📊 Analysis Results
                </div>
                <div className="text-xs text-neutral-500">
                  {appState.reviewId ? 'View analysis matrix' : 'Complete upload first'}
                </div>
              </div>
              {appState.currentSection === 'results' && appState.reviewId && (
                <div className="w-2 h-2 bg-neutral-600 rounded-full shadow-soft animate-pulse"></div>
              )}
            </button>
          </div>

          {/* Status Footer - Enhanced monitoring dashboard style */}
          <div className="mt-auto p-4 bg-gradient-to-r from-neutral-50 to-neutral-100 border-t border-neutral-200">
            <div className="text-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-neutral-600">System Status</span>
                <Badge className="text-xs bg-forest-100 text-forest-700 border-forest-200">
                  ● Ready
                </Badge>
              </div>
              <div className="space-y-1 text-neutral-500">
                <div className="flex justify-between">
                  <span>Database:</span>
                  <span className="font-medium">27 rules loaded</span>
                </div>
                <div className="flex justify-between">
                  <span>Party:</span>
                  <span className="font-medium capitalize">{appState.partyPerspective} perspective</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area - Kaiterra monitoring dashboard style */}
      <div className="flex-1 flex flex-col min-w-0 bg-white">
        <div className="flex-1 overflow-auto bg-gradient-to-br from-neutral-50 via-white to-neutral-50">
          {appState.currentSection === 'playbook' && (
            <div className="h-full">
              <PlaybookBrowser partyPerspective={appState.partyPerspective} />
            </div>
          )}
          
          {appState.currentSection === 'upload' && (
            <div className="h-full">
              <UploadSection
                partyPerspective={appState.partyPerspective}
                onUploadComplete={handleUploadComplete}
                onProgressUpdate={(progress) => 
                  setAppState(prev => ({ ...prev, uploadProgress: progress }))
                }
              />
            </div>
          )}
          
          {appState.currentSection === 'results' && appState.reviewId && (
            <div className="h-full">
              <AnalysisResults
                reviewId={appState.reviewId}
                partyPerspective={appState.partyPerspective}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}