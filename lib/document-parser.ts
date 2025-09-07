import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

export interface ParsedDocument {
  text: string;
  metadata: {
    fileName: string;
    fileSize: number;
    pageCount?: number;
    wordCount: number;
  };
}

export interface DocumentParsingError {
  success: false;
  error: string;
  details?: string;
}

export interface DocumentParsingSuccess {
  success: true;
  data: ParsedDocument;
}

export type DocumentParsingResult = DocumentParsingSuccess | DocumentParsingError;

/**
 * Parse PDF document and extract text content
 */
async function parsePDF(buffer: Buffer, fileName: string): Promise<DocumentParsingResult> {
  try {
    const data = await pdfParse(buffer);
    
    if (!data.text || data.text.trim().length === 0) {
      return {
        success: false,
        error: 'PDF appears to be empty or contains no extractable text',
        details: 'This may be a scanned PDF that requires OCR processing'
      };
    }

    const wordCount = data.text.trim().split(/\s+/).length;

    return {
      success: true,
      data: {
        text: data.text,
        metadata: {
          fileName,
          fileSize: buffer.length,
          pageCount: data.numpages,
          wordCount
        }
      }
    };
  } catch (error) {
    console.error('PDF parsing error:', error);
    return {
      success: false,
      error: 'Failed to parse PDF document',
      details: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Parse DOCX document and extract text content
 */
async function parseDOCX(buffer: Buffer, fileName: string): Promise<DocumentParsingResult> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    
    if (!result.value || result.value.trim().length === 0) {
      return {
        success: false,
        error: 'DOCX document appears to be empty',
        details: 'No extractable text content found'
      };
    }

    const wordCount = result.value.trim().split(/\s+/).length;

    // Log any messages from mammoth (usually about unsupported features)
    if (result.messages && result.messages.length > 0) {
      console.log('DOCX parsing messages:', result.messages);
    }

    return {
      success: true,
      data: {
        text: result.value,
        metadata: {
          fileName,
          fileSize: buffer.length,
          wordCount
        }
      }
    };
  } catch (error) {
    console.error('DOCX parsing error:', error);
    return {
      success: false,
      error: 'Failed to parse DOCX document',
      details: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Main document parsing function that handles multiple file types
 */
export async function parseDocument(
  file: File | Buffer, 
  fileName?: string,
  mimeType?: string
): Promise<DocumentParsingResult> {
  try {
    let buffer: Buffer;
    let actualFileName: string;
    let actualMimeType: string;

    // Handle File object vs Buffer
    if (file instanceof File) {
      buffer = Buffer.from(await file.arrayBuffer());
      actualFileName = file.name;
      actualMimeType = file.type;
    } else {
      buffer = file;
      actualFileName = fileName || 'unknown';
      actualMimeType = mimeType || 'application/octet-stream';
    }

    // Validate file size (4.5MB limit as per planning)
    const MAX_FILE_SIZE = 4.5 * 1024 * 1024; // 4.5MB
    if (buffer.length > MAX_FILE_SIZE) {
      return {
        success: false,
        error: 'File size exceeds maximum limit of 4.5MB',
        details: `File size: ${(buffer.length / 1024 / 1024).toFixed(2)}MB`
      };
    }

    // Validate file type and parse accordingly
    if (actualMimeType === 'application/pdf' || actualFileName.toLowerCase().endsWith('.pdf')) {
      return await parsePDF(buffer, actualFileName);
    } 
    else if (
      actualMimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
      actualFileName.toLowerCase().endsWith('.docx')
    ) {
      return await parseDOCX(buffer, actualFileName);
    }
    else {
      return {
        success: false,
        error: 'Unsupported file type',
        details: `Only PDF and DOCX files are supported. Received: ${actualMimeType}`
      };
    }

  } catch (error) {
    console.error('Document parsing error:', error);
    return {
      success: false,
      error: 'Failed to process document',
      details: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Preprocess extracted text for analysis
 * - Normalize whitespace
 * - Remove excessive line breaks
 * - Clean up common PDF artifacts
 */
export function preprocessText(text: string): string {
  return text
    // Normalize whitespace - replace multiple spaces with single space
    .replace(/\s+/g, ' ')
    // Remove excessive line breaks but preserve paragraph structure
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    // Remove common PDF artifacts like page numbers and headers
    .replace(/Page \d+ of \d+/gi, '')
    .replace(/^\d+\s*$/gm, '') // Remove standalone page numbers
    // Clean up bullet points and list formatting
    .replace(/•\s+/g, '• ')
    .replace(/◦\s+/g, '◦ ')
    // Trim and ensure consistent spacing
    .trim();
}

/**
 * Extract potential clause sections from text
 * This is a simple heuristic-based approach for MVP
 */
export function extractClauseSections(text: string): Array<{
  title: string;
  content: string;
  position: { start: number; end: number };
}> {
  const sections: Array<{
    title: string;
    content: string;
    position: { start: number; end: number };
  }> = [];

  // Common section headers in NDAs
  const sectionPatterns = [
    /(\d+\.?\s*)?confidential\s+information/gi,
    /(\d+\.?\s*)?definition\s+of\s+confidential/gi,
    /(\d+\.?\s*)?duration\s+of\s+confidentiality/gi,
    /(\d+\.?\s*)?term\s+of\s+agreement/gi,
    /(\d+\.?\s*)?governing\s+law/gi,
    /(\d+\.?\s*)?jurisdiction/gi,
    /(\d+\.?\s*)?dispute\s+resolution/gi,
  ];

  for (const pattern of sectionPatterns) {
    let match;
    const matches: RegExpExecArray[] = [];
    while ((match = pattern.exec(text)) !== null) {
      matches.push(match);
      // Reset pattern to avoid infinite loop
      pattern.lastIndex = 0;
      break; // Only get first match for each pattern
    }
    
    for (const match of matches) {
      if (match.index !== undefined) {
        const start = match.index;
        const title = match[0].trim();
        
        // Find the end of this section (next section or end of document)
        let end = text.length;
        const remainingText = text.slice(start + match[0].length);
        
        // Look for next section header
        for (const nextPattern of sectionPatterns) {
          const nextMatch = remainingText.search(nextPattern);
          if (nextMatch !== -1 && nextMatch < end - start) {
            end = start + match[0].length + nextMatch;
          }
        }
        
        // Extract content (limit to reasonable length)
        const maxSectionLength = 1000;
        const content = text.slice(start, Math.min(end, start + maxSectionLength)).trim();
        
        sections.push({
          title,
          content,
          position: { start, end: Math.min(end, start + maxSectionLength) }
        });
      }
    }
  }

  return sections;
}