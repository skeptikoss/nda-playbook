'use client'

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { PartyPerspective } from '@/types';
import { Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';

interface UploadSectionProps {
  partyPerspective: PartyPerspective;
  onUploadComplete: (reviewId: string, clientName?: string, ndaTitle?: string, overallScore?: number) => void;
  onProgressUpdate: (progress: number) => void;
}

interface UploadState {
  status: 'idle' | 'uploading' | 'parsing' | 'analyzing' | 'complete' | 'error';
  progress: number;
  message: string;
  file: File | null;
  reviewId: string | null;
  error: string | null;
  textInput: string;
  inputMode: 'file' | 'text';
}

export function UploadSection({ 
  partyPerspective, 
  onUploadComplete, 
  onProgressUpdate 
}: UploadSectionProps) {
  const [uploadState, setUploadState] = useState<UploadState>({
    status: 'idle',
    progress: 0,
    message: '',
    file: null,
    reviewId: null,
    error: null,
    textInput: '',
    inputMode: 'file'
  });
  
  const [formData, setFormData] = useState({
    clientName: '',
    ndaTitle: ''
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setUploadState(prev => ({
        ...prev,
        file,
        status: 'idle',
        error: null
      }));
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    },
    maxSize: 4.5 * 1024 * 1024, // 4.5MB
    multiple: false
  });

  const updateProgress = (progress: number, message: string) => {
    setUploadState(prev => ({ ...prev, progress, message }));
    onProgressUpdate(progress);
  };

  const validateTextInput = (text: string) => {
    if (text.trim().length === 0) return { valid: false, error: 'Text content cannot be empty' };
    if (text.trim().length < 100) return { valid: false, error: 'Text content is too short - please provide at least 100 characters of NDA content' };
    if (text.split(/\s+/).length < 20) return { valid: false, error: 'Text content is too short - please provide at least 20 words of NDA content' };
    return { valid: true, error: null };
  };

  const handleUpload = async () => {
    let hasValidInput = false;
    let validationError = null;

    if (uploadState.inputMode === 'file') {
      hasValidInput = !!uploadState.file;
    } else {
      const validation = validateTextInput(uploadState.textInput);
      hasValidInput = validation.valid;
      validationError = validation.error;
    }
    
    if (!hasValidInput || !formData.clientName || !formData.ndaTitle) {
      setUploadState(prev => ({
        ...prev,
        error: validationError || `Please ${uploadState.inputMode === 'file' ? 'select a file' : 'enter text content'} and fill in all required fields`,
        status: 'error'
      }));
      return;
    }

    try {
      setUploadState(prev => ({ ...prev, status: 'uploading', error: null }));
      updateProgress(10, 'Uploading document...');

      // Upload the document or text
      const uploadFormData = new FormData();
      if (uploadState.inputMode === 'file') {
        uploadFormData.append('file', uploadState.file!);
      } else {
        // For text input, create a Blob to simulate a file
        const textBlob = new Blob([uploadState.textInput], { type: 'text/plain' });
        uploadFormData.append('file', textBlob, `${formData.ndaTitle.replace(/[^a-zA-Z0-9]/g, '_')}_text_input.txt`);
        uploadFormData.append('isTextInput', 'true');
      }
      uploadFormData.append('clientName', formData.clientName);
      uploadFormData.append('ndaTitle', formData.ndaTitle);
      uploadFormData.append('partyPerspective', partyPerspective);

      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: uploadFormData
      });

      const uploadResult = await uploadResponse.json();

      if (!uploadResult.success) {
        throw new Error(uploadResult.error || 'Upload failed');
      }

      const reviewId = uploadResult.data.review.id;
      setUploadState(prev => ({ ...prev, reviewId }));

      updateProgress(30, 'Extracting text from document...');

      // Wait a moment for processing
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      updateProgress(50, `Matching clauses for ${partyPerspective} party...`);
      
      // Start analysis
      setUploadState(prev => ({ ...prev, status: 'analyzing' }));
      
      const analysisResponse = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          reviewId,
          documentText: reviewId.startsWith('dev-') ? uploadState.textInput : undefined,
          partyPerspective: reviewId.startsWith('dev-') ? partyPerspective : undefined
        })
      });

      const analysisResult = await analysisResponse.json();

      if (!analysisResult.success) {
        throw new Error(analysisResult.error || 'Analysis failed');
      }

      updateProgress(75, `Generating ${partyPerspective}-specific suggestions...`);
      
      // Wait for AI processing simulation
      await new Promise(resolve => setTimeout(resolve, 1500));

      updateProgress(100, 'Analysis complete!');
      
      setUploadState(prev => ({ ...prev, status: 'complete' }));

      // Extract overall score from analysis or fetch from review API
      let overallScore: number | undefined;
      try {
        if (analysisResult.data?.analysis?.overallScore) {
          overallScore = analysisResult.data.analysis.overallScore;
        } else {
          // Fallback: fetch from review API
          const reviewResponse = await fetch(`/api/reviews/${reviewId}`);
          const reviewData = await reviewResponse.json();
          if (reviewData.success && reviewData.data?.review?.overallScore) {
            overallScore = reviewData.data.review.overallScore;
          }
        }
      } catch (err) {
        console.warn('Could not fetch overall score:', err);
      }

      // Auto-navigate to results after a brief delay
      setTimeout(() => {
        onUploadComplete(
          reviewId, 
          formData.clientName || undefined, 
          formData.ndaTitle || undefined, 
          overallScore
        );
      }, 1500);

    } catch (error) {
      console.error('Upload/Analysis error:', error);
      setUploadState(prev => ({
        ...prev,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      }));
      updateProgress(0, 'Error occurred');
    }
  };

  const resetUpload = () => {
    setUploadState(prev => ({
      status: 'idle',
      progress: 0,
      message: '',
      file: null,
      reviewId: null,
      error: null,
      textInput: '',
      inputMode: prev.inputMode // Preserve the input mode
    }));
    setFormData({ clientName: '', ndaTitle: '' });
    updateProgress(0, '');
  };

  const toggleInputMode = () => {
    setUploadState(prev => ({
      ...prev,
      inputMode: prev.inputMode === 'file' ? 'text' : 'file',
      file: null,
      textInput: '',
      error: null
    }));
  };

  const getPartyDescription = (perspective: PartyPerspective) => {
    switch (perspective) {
      case 'receiving':
        return 'Analysis will focus on minimizing restrictions and protecting your client\'s operational flexibility as the receiving party.';
      case 'disclosing':
        return 'Analysis will focus on maximizing protection for your client\'s confidential information as the disclosing party.';
      case 'mutual':
        return 'Analysis will focus on balanced protection and fair treatment for both parties.';
    }
  };

  return (
    <div className="p-6 space-y-6">
      
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          📤 NDA Upload & Analysis
        </h2>
        <p className="text-gray-600 mb-4">
          Upload your NDA document for party-aware legal analysis
        </p>
        <div className="flex items-center gap-2 mb-4">
          <Badge variant="default">
            {partyPerspective.charAt(0).toUpperCase() + partyPerspective.slice(1)} Party
          </Badge>
        </div>
        <p className="text-sm text-gray-600 mb-6">
          {getPartyDescription(partyPerspective)}
        </p>
        
        {/* Input Mode Toggle */}
        <div className="flex items-center gap-3 mb-6">
          <span className="text-sm font-medium text-gray-700">Input Method:</span>
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => uploadState.inputMode !== 'file' && toggleInputMode()}
              disabled={uploadState.status !== 'idle'}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                uploadState.inputMode === 'file'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              📁 Upload File
            </button>
            <button
              onClick={() => uploadState.inputMode !== 'text' && toggleInputMode()}
              disabled={uploadState.status !== 'idle'}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                uploadState.inputMode === 'text'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              📝 Paste Text
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Upload Form */}
        <div className="space-y-4">
          
          {/* Client Information */}
          <Card>
            <CardHeader>
              <CardTitle>Document Information</CardTitle>
              <CardDescription>
                Enter details about the NDA document
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Client Name *
                </label>
                <input
                  type="text"
                  value={formData.clientName}
                  onChange={(e) => setFormData(prev => ({ ...prev, clientName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter client name"
                  disabled={uploadState.status !== 'idle'}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  NDA Title *
                </label>
                <input
                  type="text"
                  value={formData.ndaTitle}
                  onChange={(e) => setFormData(prev => ({ ...prev, ndaTitle: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter NDA document title"
                  disabled={uploadState.status !== 'idle'}
                />
              </div>
            </CardContent>
          </Card>

          {/* File Upload or Text Input */}
          <Card>
            <CardHeader>
              <CardTitle>
                {uploadState.inputMode === 'file' ? 'Document Upload' : 'NDA Text Input'}
              </CardTitle>
              <CardDescription>
                {uploadState.inputMode === 'file' 
                  ? 'Upload PDF or DOCX file (max 4.5MB)'
                  : 'Paste or type your NDA text content directly'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {uploadState.inputMode === 'file' ? (
                // File Upload Mode
                !uploadState.file ? (
                  <div
                    {...getRootProps()}
                    className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                      isDragActive 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-300 hover:border-gray-400'
                    } ${uploadState.status !== 'idle' ? 'opacity-50 pointer-events-none' : ''}`}
                  >
                    <input {...getInputProps()} />
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    {isDragActive ? (
                      <p className="text-blue-600">Drop the file here...</p>
                    ) : (
                      <div>
                        <p className="text-gray-600 mb-1">
                          Drag & drop an NDA file here, or click to select
                        </p>
                        <p className="text-xs text-gray-500">
                          PDF or DOCX files only, up to 4.5MB
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">
                        {uploadState.file.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {(uploadState.file.size / 1024 / 1024).toFixed(2)} MB
                      </div>
                    </div>
                    {uploadState.status === 'idle' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={resetUpload}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                )
              ) : (
                // Text Input Mode
                <div className="space-y-3">
                  <textarea
                    value={uploadState.textInput}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Limit to reasonable size (approximately equivalent to 4.5MB file)
                      const maxCharacters = 4.5 * 1024 * 1024; // ~4.5MB in characters
                      if (value.length <= maxCharacters) {
                        setUploadState(prev => ({ ...prev, textInput: value, error: null }));
                      }
                    }}
                    placeholder="Paste your NDA text content here...

Example format:
NON-DISCLOSURE AGREEMENT

This Agreement is entered into between [Company A] and [Company B]...

1. CONFIDENTIAL INFORMATION
For purposes of this Agreement, confidential information shall include..."
                    className={`w-full h-64 px-3 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent resize-y text-sm font-mono ${
                      uploadState.textInput.length > 100000 
                        ? 'border-yellow-300 focus:ring-yellow-500' 
                        : 'border-gray-300 focus:ring-blue-500'
                    }`}
                    disabled={uploadState.status !== 'idle'}
                  />
                  <div className="flex justify-between text-xs">
                    <div className="flex items-center gap-4">
                      <span className={`${
                        uploadState.textInput.length > 100000 ? 'text-yellow-600' : 'text-gray-500'
                      }`}>
                        {uploadState.textInput.length.toLocaleString()} characters
                      </span>
                      <span className="text-gray-500">
                        {uploadState.textInput.split('\n').length} lines
                      </span>
                      <span className="text-gray-500">
                        ~{Math.ceil(uploadState.textInput.length / 1000)} KB
                      </span>
                      {uploadState.textInput.trim().length > 0 && (
                        <span className={`font-medium ${
                          validateTextInput(uploadState.textInput).valid 
                            ? 'text-green-600' 
                            : 'text-red-600'
                        }`}>
                          {validateTextInput(uploadState.textInput).valid ? '✓ Valid' : '⚠ Too short'}
                        </span>
                      )}
                    </div>
                    {uploadState.textInput.length > 100000 && (
                      <span className="text-yellow-600 font-medium">
                        Large text - may take longer to process
                      </span>
                    )}
                  </div>
                  {uploadState.textInput && uploadState.status === 'idle' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setUploadState(prev => ({ ...prev, textInput: '' }))}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      Clear Text
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={handleUpload}
              disabled={
                (uploadState.inputMode === 'file' 
                  ? !uploadState.file 
                  : !validateTextInput(uploadState.textInput).valid
                ) || 
                !formData.clientName || 
                !formData.ndaTitle ||
                ['uploading', 'parsing', 'analyzing'].includes(uploadState.status)
              }
              className="flex-1"
            >
              {uploadState.status === 'idle' ? 'Run Analysis' : 'Processing...'}
            </Button>
            
            {uploadState.status !== 'idle' && uploadState.status !== 'complete' && (
              <Button variant="outline" onClick={resetUpload}>
                Cancel
              </Button>
            )}
          </div>
        </div>

        {/* Progress and Status */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Analysis Progress</CardTitle>
              <CardDescription>
                Real-time progress of document analysis
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              
              {uploadState.status !== 'idle' && (
                <div className="space-y-2">
                  <Progress value={uploadState.progress} className="w-full" />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{uploadState.message}</span>
                    <span>{uploadState.progress}%</span>
                  </div>
                </div>
              )}

              {/* Status Messages */}
              {uploadState.status === 'complete' && (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">Analysis Complete!</span>
                </div>
              )}

              {uploadState.error && (
                <div className="flex items-start gap-2 text-red-600">
                  <AlertCircle className="w-5 h-5 mt-0.5" />
                  <div>
                    <div className="font-medium">Error</div>
                    <div className="text-sm">{uploadState.error}</div>
                  </div>
                </div>
              )}

              {/* Process Steps */}
              <div className="space-y-2 text-sm">
                <div className="font-medium text-gray-700 mb-3">Analysis Steps:</div>
                
                <div className={`flex items-center gap-2 ${
                  uploadState.progress >= 25 ? 'text-green-600' : 'text-gray-400'
                }`}>
                  <div className="w-2 h-2 rounded-full bg-current"></div>
                  Extracting text from document
                </div>
                
                <div className={`flex items-center gap-2 ${
                  uploadState.progress >= 50 ? 'text-green-600' : 'text-gray-400'
                }`}>
                  <div className="w-2 h-2 rounded-full bg-current"></div>
                  Matching clauses for {partyPerspective} party
                </div>
                
                <div className={`flex items-center gap-2 ${
                  uploadState.progress >= 75 ? 'text-green-600' : 'text-gray-400'
                }`}>
                  <div className="w-2 h-2 rounded-full bg-current"></div>
                  Generating {partyPerspective}-specific suggestions
                </div>
                
                <div className={`flex items-center gap-2 ${
                  uploadState.progress >= 100 ? 'text-green-600' : 'text-gray-400'
                }`}>
                  <div className="w-2 h-2 rounded-full bg-current"></div>
                  Complete - redirecting to results
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Party Context */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-6">
              <h4 className="font-semibold text-blue-900 mb-2">
                {partyPerspective.charAt(0).toUpperCase() + partyPerspective.slice(1)} Party Analysis
              </h4>
              <p className="text-sm text-blue-700">
                Your analysis will be tailored to the <strong>{partyPerspective}</strong> party perspective, 
                focusing on clauses and language that align with your client&apos;s strategic position in the NDA negotiation.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}