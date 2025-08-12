import jsPDF from 'jspdf';

// Check if text contains Thai characters
export const containsThaiText = (text: string): boolean => {
  const thaiRegex = /[\u0E00-\u0E7F]/;
  return thaiRegex.test(text);
};

// Normalize Thai text for better rendering
export const normalizeThaiText = (text: string): string => {
  try {
    let normalized = text.normalize('NFC');
    
    if (containsThaiText(normalized)) {
      // Remove zero-width characters that might cause rendering issues
      normalized = normalized.replace(/[\u200B-\u200D\uFEFF]/g, '');
      
      // Normalize spaces but don't add extra spaces between Thai and English
      // as this can cause layout issues
      normalized = normalized.replace(/\s+/g, ' ').trim();
    }
    
    return normalized;
  } catch (error) {
    console.warn('Text normalization failed:', error);
    return text;
  }
};

// Convert Thai text to a format that works better with jsPDF
export const convertThaiTextForPDF = (text: string): string => {
  if (!containsThaiText(text)) {
    return text;
  }
  
  try {
    // For Thai text, we'll use a different approach
    // Convert to UTF-8 bytes and then back to ensure proper encoding
    const encoder = new TextEncoder();
    const decoder = new TextDecoder('utf-8');
    const bytes = encoder.encode(text);
    const converted = decoder.decode(bytes);
    
    return normalizeThaiText(converted);
  } catch (error) {
    console.warn('Thai text conversion failed, using original:', error);
    return normalizeThaiText(text);
  }
};

// Set appropriate font for text content with better Thai support
export const setFontForText = (pdf: jsPDF, text: string, style: 'normal' | 'bold' = 'normal'): void => {
  try {
    if (containsThaiText(text)) {
      // For Thai text, try to use a font that supports Unicode better
      // We'll use Times which has better Unicode support than Courier
      pdf.setFont('times', style);
    } else {
      // For English text, use Courier to match the editor's monospace font
      pdf.setFont('courier', style);
    }
    
    // Set font size that works well for both Thai and English text
    pdf.setFontSize(12);
  } catch (error) {
    console.warn('Failed to set font, using default:', error);
    pdf.setFont('courier', style);
    pdf.setFontSize(12);
  }
};

// Setup Thai support for A4 paper with improved settings
export const setupThaiSupport = (pdf: jsPDF): void => {
  try {
    // Set default font to courier to match editor's monospace font
    pdf.setFont('courier', 'normal');
    pdf.setFontSize(12);
    
    // Enable Unicode support if available
    if ((pdf as any).setLanguage) {
      (pdf as any).setLanguage('th-TH');
    }
    
    // Set text rendering mode for better character display
    if ((pdf as any).setTextRenderingMode) {
      (pdf as any).setTextRenderingMode(0); // Fill text
    }
    
    // Set character spacing for better Thai text rendering
    if ((pdf as any).setCharSpace) {
      (pdf as any).setCharSpace(0.1);
    }
    
    console.log('Enhanced Thai PDF support initialized with Courier font to match editor');
  } catch (error) {
    console.warn('Failed to setup Thai support:', error);
  }
};

// Process text for PDF rendering
export const processTextForPDF = (text: string): string => {
  return convertThaiTextForPDF(text);
};

// Measure text width with Thai support
export const getTextWidth = (pdf: jsPDF, text: string): number => {
  try {
    const processedText = processTextForPDF(text);
    setFontForText(pdf, processedText);
    return pdf.getTextWidth(processedText);
  } catch (error) {
    console.warn('Failed to measure text width:', error);
    // Fallback: estimate width based on character count
    return containsThaiText(text) ? text.length * 8 : text.length * 6;
  }
};

// Split text to fit within specified width with Thai support
export const splitThaiTextToSize = (pdf: jsPDF, text: string, maxWidth: number): string[] => {
  try {
    const processedText = processTextForPDF(text);
    setFontForText(pdf, processedText);
    return pdf.splitTextToSize(processedText, maxWidth);
  } catch (error) {
    console.warn('Failed to split Thai text, using fallback:', error);
    
    // Fallback: manual word wrapping
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';
    
    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      if (getTextWidth(pdf, testLine) <= maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }
    
    if (currentLine) lines.push(currentLine);
    return lines;
  }
};

// Add Thai text to PDF with proper positioning
export const addThaiText = (pdf: jsPDF, text: string, x: number, y: number, style: 'normal' | 'bold' = 'normal'): void => {
  const processedText = processTextForPDF(text);
  setFontForText(pdf, processedText, style);
  pdf.text(processedText, x, y);
};

// Check if text needs special Thai handling
export const needsThaiHandling = (text: string): boolean => {
  return containsThaiText(text);
};

// Get appropriate line height for text
export const getLineHeight = (text: string): number => {
  // Thai text might need slightly more line height
  return containsThaiText(text) ? 14.4 * 1.1 : 14.4;
};

// Validate text for PDF export
export const validateTextForPDF = (text: string): { isValid: boolean; warning?: string } => {
  if (!text || text.trim().length === 0) {
    return { isValid: true };
  }
  
  // Check for problematic characters
  const problematicChars = /[\u0000-\u001F\u007F-\u009F]/g;
  if (problematicChars.test(text)) {
    return { 
      isValid: true, 
      warning: 'Text contains control characters that may not render properly in PDF' 
    };
  }
  
  return { isValid: true };
};
