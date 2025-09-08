'use client'

import { useState, useEffect, useCallback } from 'react';
import { PartySelection } from './party-selection';
import { PlaybookBrowser } from './playbook-browser';
import { UploadSection } from './upload-section';
import { AnalysisResults } from './analysis-results';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { PartyPerspective } from '@/types';
import { BookOpen, Upload, BarChart3, ArrowLeft } from 'lucide-react';

type AppSection = 'party-selection' | 'playbook' | 'upload' | 'results';

interface StoredAnalysis {
  reviewId: string;
  clientName: string;
  ndaTitle: string;
  partyPerspective: PartyPerspective;
  analysedAt: string;
  overallScore: number;
}

interface AppState {
  currentSection: AppSection;
  partyPerspective: PartyPerspective | null;
  reviewId: string | null;
  uploadProgress: number;
}

const MAX_STORED_ANALYSES = 3;

export function NDAPlaybookApp() {
  const [appState, setAppState] = useState<AppState>({
    currentSection: 'party-selection',
    partyPerspective: null,
    reviewId: null,
    uploadProgress: 0
  });
  
  
  // Stored analyses state
  const [storedAnalyses, setStoredAnalyses] = useState<StoredAnalysis[]>([]);
  const [selectedStoredAnalysis, setSelectedStoredAnalysis] = useState<string | null>(null);

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

  const handleUploadComplete = (reviewId: string, clientName?: string, ndaTitle?: string, overallScore?: number) => {
    setAppState(prev => ({
      ...prev,
      reviewId,
      currentSection: 'results' // Auto-navigate to results after analysis
    }));
    
    // Store the analysis for persistent access
    if (clientName && ndaTitle && typeof overallScore === 'number' && appState.partyPerspective) {
      storeAnalysis({
        reviewId,
        clientName,
        ndaTitle,
        partyPerspective: appState.partyPerspective,
        analysedAt: new Date().toISOString(),
        overallScore
      });
    }
  };

  // Function to store analysis in localStorage (keep last 3)
  const storeAnalysis = (analysis: StoredAnalysis) => {
    const stored = getStoredAnalyses();
    const updated = [analysis, ...stored.filter(a => a.reviewId !== analysis.reviewId)]
      .slice(0, MAX_STORED_ANALYSES);
    
    localStorage.setItem('nda-playbook-stored-analyses', JSON.stringify(updated));
    setStoredAnalyses(updated);
  };

  // Function to get stored analyses from localStorage
  const getStoredAnalyses = (): StoredAnalysis[] => {
    try {
      const stored = localStorage.getItem('nda-playbook-stored-analyses');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  };

  // Function to handle selecting a stored analysis
  const handleStoredAnalysisSelect = (reviewId: string, partyPerspective: PartyPerspective) => {
    setSelectedStoredAnalysis(reviewId);
    setAppState(prev => ({
      ...prev,
      reviewId: null, // Clear current session review ID
      partyPerspective,
      currentSection: 'results'
    }));
  };

  const handleBackToPartySelection = () => {
    setAppState({
      currentSection: 'party-selection',
      partyPerspective: null,
      reviewId: null,
      uploadProgress: 0
    });
    setSelectedStoredAnalysis(null); // Clear selected stored analysis
  };

  const handleSwitchParty = (newPerspective: PartyPerspective) => {
    setAppState(prev => ({
      ...prev,
      partyPerspective: newPerspective
    }));
  };

  const cycleThroughParties = useCallback(() => {
    const parties: PartyPerspective[] = ['receiving', 'disclosing', 'mutual'];
    const currentIndex = parties.indexOf(appState.partyPerspective!);
    const nextIndex = (currentIndex + 1) % parties.length;
    handleSwitchParty(parties[nextIndex]);
  }, [appState.partyPerspective, handleSwitchParty]);
  

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle shortcuts when not in input fields
      const isInInput = (event.target as HTMLElement)?.tagName === 'INPUT' || 
                       (event.target as HTMLElement)?.tagName === 'TEXTAREA';
      
      if (!isInInput && appState.partyPerspective) {
        if (event.key === 'p' || event.key === 'P') {
          event.preventDefault();
          cycleThroughParties();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [appState.partyPerspective, cycleThroughParties]);

  // Party perspective and stored analyses persistence
  useEffect(() => {
    // Load party perspective from localStorage on mount
    const savedPerspective = localStorage.getItem('nda-playbook-party-perspective') as PartyPerspective | null;
    if (savedPerspective && !appState.partyPerspective) {
      setAppState(prev => ({
        ...prev,
        partyPerspective: savedPerspective
      }));
    }
    
    // Load stored analyses on mount
    const stored = getStoredAnalyses();
    setStoredAnalyses(stored);
  }, [appState.partyPerspective]);

  useEffect(() => {
    // Save party perspective to localStorage when it changes
    if (appState.partyPerspective) {
      localStorage.setItem('nda-playbook-party-perspective', appState.partyPerspective);
    }
  }, [appState.partyPerspective]);

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

  // Main 3-section UI with Kaiterra design system and consistent layout
  return (
    <div className="min-h-screen bg-neutral-100 flex">
      
      {/* Fixed Left Sidebar */}
      <div className="bg-white border-r border-neutral-200 flex flex-col shadow-medium w-80">
        
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
            <div className="relative group">
              <button
                onClick={() => {
                  if (appState.reviewId) {
                    handleSectionChange('results');
                  } else if (storedAnalyses.length > 0) {
                    // Clear selected stored analysis to show selection interface
                    setSelectedStoredAnalysis(null);
                    handleSectionChange('results');
                  }
                }}
                disabled={!appState.reviewId && storedAnalyses.length === 0}
                className="w-full p-4 text-left hover:bg-neutral-50 transition-all duration-200 flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                <div className={`p-2 rounded-xl transition-colors ${
                  appState.currentSection === 'results' && (appState.reviewId || storedAnalyses.length > 0)
                    ? 'bg-neutral-600 text-white' 
                    : (appState.reviewId || storedAnalyses.length > 0)
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
                    {appState.reviewId ? 'View current analysis' : 
                     storedAnalyses.length > 0 ? `${storedAnalyses.length} stored analysis` : 'Complete upload first'}
                  </div>
                </div>
                {appState.currentSection === 'results' && (appState.reviewId || storedAnalyses.length > 0) && (
                  <div className="w-2 h-2 bg-neutral-600 rounded-full shadow-soft animate-pulse"></div>
                )}
              </button>
              
              {/* Dropdown for stored analyses when multiple exist */}
              {!appState.reviewId && storedAnalyses.length > 1 && appState.currentSection === 'results' && (
                <div className="absolute top-full left-4 right-4 bg-white border border-neutral-200 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                  {storedAnalyses.map((analysis, index) => (
                    <button
                      key={analysis.reviewId}
                      onClick={() => handleStoredAnalysisSelect(analysis.reviewId, analysis.partyPerspective)}
                      className="w-full p-3 text-left hover:bg-neutral-50 flex items-center justify-between border-b border-neutral-100 last:border-b-0"
                    >
                      <div>
                        <div className="font-medium text-sm text-neutral-700">{analysis.clientName}</div>
                        <div className="text-xs text-neutral-500">{analysis.ndaTitle}</div>
                        <div className="text-xs text-neutral-400">
                          {analysis.partyPerspective} • {(analysis.overallScore * 100).toFixed(0)}% • {new Date(analysis.analysedAt).toLocaleDateString()}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
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

      {/* Main Content Area - Fixed width */}
      <div className="flex flex-col flex-1 min-w-0 bg-white">
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
                onUploadComplete={(reviewId, clientName, ndaTitle, overallScore) => 
                  handleUploadComplete(reviewId, clientName, ndaTitle, overallScore)
                }
                onProgressUpdate={(progress) => 
                  setAppState(prev => ({ ...prev, uploadProgress: progress }))
                }
              />
            </div>
          )}
          
          {appState.currentSection === 'results' && (appState.reviewId || selectedStoredAnalysis) && (
            <div className="h-full">
              <AnalysisResults
                reviewId={appState.reviewId || selectedStoredAnalysis || ''}
                partyPerspective={appState.partyPerspective}
                onSwitchParty={handleSwitchParty}
              />
            </div>
          )}
          
          {/* Show stored analyses selection when no active session */}
          {appState.currentSection === 'results' && !appState.reviewId && !selectedStoredAnalysis && storedAnalyses.length > 0 && (
            <div className="p-6 space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  📊 Select Analysis to View
                </h2>
                <p className="text-gray-600 mb-6">
                  Choose from your {storedAnalyses.length} recent NDA analyse{storedAnalyses.length > 1 ? 's' : ''}
                </p>
              </div>
              
              <div className="max-w-4xl mx-auto grid gap-4">
                {storedAnalyses.map((analysis, index) => (
                  <Card key={analysis.reviewId} className="hover:shadow-lg transition-all duration-200 cursor-pointer hover:border-blue-200">
                    <CardContent 
                      className="p-6"
                      onClick={() => handleStoredAnalysisSelect(analysis.reviewId, analysis.partyPerspective)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          {/* Analysis number */}
                          <div className="w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-semibold text-sm">
                            {index + 1}
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg text-gray-900">{analysis.clientName}</h3>
                            <p className="text-gray-600 mb-2">{analysis.ndaTitle}</p>
                            <div className="flex items-center gap-4 text-sm text-gray-500">
                              <Badge variant={
                                analysis.partyPerspective === 'receiving' ? 'default' :
                                analysis.partyPerspective === 'disclosing' ? 'secondary' : 'outline'
                              }>
                                {analysis.partyPerspective.charAt(0).toUpperCase() + analysis.partyPerspective.slice(1)} Party
                              </Badge>
                              <Badge variant={
                                analysis.overallScore >= 0.7 ? 'default' :
                                analysis.overallScore >= 0.4 ? 'secondary' : 'destructive'
                              }>
                                Score: {(analysis.overallScore * 100).toFixed(0)}%
                              </Badge>
                              <span className="flex items-center gap-1">
                                📅 {new Date(analysis.analysedAt).toLocaleDateString()}
                              </span>
                              <span className="flex items-center gap-1">
                                ⏱️ {new Date(analysis.analysedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                            View Analysis →
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              {/* Quick action buttons */}
              <div className="text-center pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setAppState(prev => ({ ...prev, currentSection: 'upload' }))}
                  className="mr-4"
                >
                  📤 Analyse New NDA
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={() => setAppState(prev => ({ ...prev, currentSection: 'playbook' }))}
                >
                  📖 Browse Playbook
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
      
    </div>
  );
}