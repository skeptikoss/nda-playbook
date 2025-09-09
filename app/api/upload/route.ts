import { NextRequest, NextResponse } from 'next/server';
import { parseDocument, preprocessText } from '@/lib/document-parser';
import type { PartyPerspective } from '@/types';

export async function POST(request: NextRequest) {
  try {
    // Parse form data
    const formData = await request.formData();
    
    const file = formData.get('file') as File;
    const clientName = formData.get('clientName') as string;
    const ndaTitle = formData.get('ndaTitle') as string;
    const partyPerspective = (formData.get('partyPerspective') as PartyPerspective) || 'receiving';
    const isTextInput = formData.get('isTextInput') === 'true';

    // Validate input
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!clientName || !ndaTitle) {
      return NextResponse.json(
        { error: 'Client name and NDA title are required' },
        { status: 400 }
      );
    }

    // Validate party perspective
    if (!['receiving', 'disclosing', 'mutual'].includes(partyPerspective)) {
      return NextResponse.json(
        { error: 'Invalid party perspective' },
        { status: 400 }
      );
    }

    // Parse the document or extract text
    let text: string;
    let metadata: any;
    
    if (isTextInput) {
      // For text input, extract text directly from the file blob
      console.log(`Processing text input: ${file.name} (${file.size} bytes)`);
      text = await file.text();
      metadata = {
        wordCount: text.split(/\s+/).filter(word => word.length > 0).length,
        characterCount: text.length,
        sourceType: 'text_input'
      };
      console.log(`Text input processed: ${metadata.wordCount} words, ${metadata.characterCount} characters`);
    } else {
      // For file upload, use existing parsing logic
      console.log(`Parsing ${file.name} (${file.size} bytes)`);
      const parseResult = await parseDocument(file);

      if (!parseResult.success) {
        return NextResponse.json(
          { 
            error: 'Document parsing failed', 
            details: parseResult.error 
          },
          { status: 400 }
        );
      }

      text = parseResult.data.text;
      metadata = parseResult.data.metadata;
      console.log(`Document parsed: ${metadata.wordCount} words, ${metadata.pageCount || 'unknown'} pages`);
    }

    const processedText = preprocessText(text);

    // Create mock review for algorithm testing (no database dependency)
    console.log('Creating mock review for algorithm testing - bypassing database');
    const mockReview = {
      id: `dev-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      client_name: clientName,
      nda_title: ndaTitle,
      file_path: `dev-mode/${Date.now()}-${file.name}`,
      original_text: processedText,
      party_perspective: partyPerspective,
      status: 'uploaded',
      created_at: new Date().toISOString(),
      metadata
    };

    console.log(`Review created: ${mockReview.id} for party: ${partyPerspective}`);

    return NextResponse.json({
      success: true,
      data: {
        review: mockReview,
        metadata: {
          wordCount: metadata.wordCount,
          characterCount: metadata.characterCount,
          sourceType: metadata.sourceType,
          fileName: file.name,
          fileSize: file.size
        }
      },
      message: `Document uploaded successfully for ${partyPerspective} party analysis`
    });

  } catch (error) {
    console.error('Upload API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}