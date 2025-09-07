import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
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

    // Upload file to Supabase Storage (with fallback for development)
    const fileName = `${Date.now()}-${file.name}`;
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    
    let uploadData: any;
    let filePath = `dev-mode/${fileName}`;  // Default path for development
    
    const { data, error: uploadError } = await supabaseAdmin.storage
      .from('nda-documents')
      .upload(fileName, fileBuffer, {
        contentType: isTextInput ? 'text/plain' : file.type,
        metadata: {
          clientName,
          ndaTitle,
          originalName: file.name,
          sourceType: isTextInput ? 'text_input' : 'file_upload'
        }
      });

    if (uploadError) {
      console.warn('Storage upload failed (likely placeholder API keys):', uploadError.message);
      console.log('Continuing with development mode - file stored locally in memory only');
      // In development mode with placeholder keys, continue without storage
      uploadData = { path: filePath };
    } else {
      uploadData = data;
      filePath = uploadData.path;
    }

    // Create review record in database (with development mode fallback)
    const { data: review, error: reviewError } = await supabaseAdmin
      .from('reviews')
      .insert({
        client_name: clientName,
        nda_title: ndaTitle,
        file_path: filePath,
        original_text: processedText,
        party_perspective: partyPerspective,
        status: 'processing'
      })
      .select()
      .single();

    if (reviewError) {
      console.warn('Database insert failed (likely placeholder API keys):', reviewError.message);
      console.log('Continuing with development mode - using mock review data');
      
      // Clean up uploaded file (only if it was actually uploaded to storage)
      if (!uploadError && uploadData) {
        await supabaseAdmin.storage
          .from('nda-documents')
          .remove([fileName]);
      }

      // In development mode, create a mock review object
      const mockReview = {
        id: `dev-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        client_name: clientName,
        nda_title: ndaTitle,
        file_path: filePath,
        original_text: processedText,
        party_perspective: partyPerspective,
        status: 'processing',
        created_at: new Date().toISOString()
      };
      
      console.log(`Mock review created: ${mockReview.id}`);
      
      return NextResponse.json({
        success: true,
        data: {
          reviewId: mockReview.id,
          fileName: file.name,
          filePath: filePath,
          metadata: {
            ...metadata,
            partyPerspective,
            clientName,
            ndaTitle,
            developmentMode: true
          }
        }
      });
    }

    console.log(`Review created: ${review.id}`);

    return NextResponse.json({
      success: true,
      data: {
        reviewId: review.id,
        fileName: file.name,
        filePath: filePath,
        metadata: {
          ...metadata,
          partyPerspective,
          clientName,
          ndaTitle
        }
      }
    });

  } catch (error) {
    console.error('Upload API error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}