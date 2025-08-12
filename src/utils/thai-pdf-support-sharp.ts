import jsPDF from 'jspdf';

// Basic Thai text detection
export const containsThaiText = (text: string): boolean => {
  const thaiRegex = /[\u0E00-\u0E7F]/;
  return thaiRegex.test(text);
};

// Simple normalization (like build2-v1.4)
export const normalizeThaiText = (text: string): string => {
  try {
    let normalized = text.normalize('NFC');
    
    if (containsThaiText(normalized)) {
      // Remove zero-width characters
      normalized = normalized.replace(/[\u200B-\u200D\uFEFF]/g, '');
      
      // Add spacing between Thai and English
      normalized = normalized.replace(/([a-zA-Z0-9])([ก-๙])/g, '$1 $2');
      normalized = normalized.replace(/([ก-๙])([a-zA-Z0-9])/g, '$1 $2');
      
      normalized = normalized.replace(/\s+/g, ' ').trim();
    }
    
    return normalized;
  } catch (error) {
    console.warn('Text normalization failed:', error);
    return text;
  }
};

// Sharp font setting (like build2-v1.4)
export const setFontForText = (pdf: jsPDF, text: string, style: 'normal' | 'bold' = 'normal'): void => {
  try {
    if (containsThaiText(text)) {
      // Use Helvetica for Thai (sharp rendering)
      pdf.setFont('helvetica', style);
      
      // Ensure minimum font size for clarity
      const currentSize = pdf.getFontSize();
      if (currentSize < 12) {
        pdf.setFontSize(12);
      }
    } else {
      // Use Courier for English
      pdf.setFont('courier', style);
    }
  } catch (error) {
    console.warn('Failed to set font:', error);
    pdf.setFont('helvetica', style);
  }
};

// High-quality PDF setup
export const setupThaiSupport = (pdf: jsPDF): void => {
  try {
    pdf.setFontSize(12);
    
    // Sharp text rendering
    if ((pdf as any).setTextRenderingMode) {
      (pdf as any).setTextRenderingMode(0); // Fill mode
    }
    
    // Remove character spacing issues
    if ((pdf as any).setCharSpace) {
      (pdf as any).setCharSpace(0);
    }
    
    console.log('Sharp Thai PDF support initialized');
  } catch (error) {
    console.warn('Failed to setup Thai support:', error);
  }
};

// Simple text processing
export const processTextForPDF = (text: string): string => {
  return normalizeThaiText(text);
};

// Accurate text width measurement (CRITICAL for proper layout)
export const getTextWidth = (pdf: jsPDF, text: string): number => {
  try {
    const processedText = processTextForPDF(text);
    setFontForText(pdf, processedText);
    return pdf.getTextWidth(processedText);
  } catch (error) {
    // More accurate fallback for Thai text
    return containsThaiText(text) ? text.length * 7.2 : text.length * 6;
  }
};

// Smart text splitting (PREVENTS overflow)
export const splitThaiTextToSize = (pdf: jsPDF, text: string, maxWidth: number): string[] => {
  try {
    const processedText = processTextForPDF(text);
    setFontForText(pdf, processedText);
    
    // Use jsPDF's built-in splitting (most accurate)
    return pdf.splitTextToSize(processedText, maxWidth);
  } catch (error) {
    // Enhanced fallback with better word breaking
    const words = text.split(/(\s+)/);
    const lines: string[] = [];
    let currentLine = '';
    
    for (const word of words) {
      const testLine = currentLine + word;
      const testWidth = getTextWidth(pdf, testLine);
      
      if (testWidth <= maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine.trim()) {
          lines.push(currentLine.trim());
        }
        currentLine = word.trim();
        
        // Handle single words that are too long
        while (getTextWidth(pdf, currentLine) > maxWidth && currentLine.length > 1) {
          const breakPoint = Math.floor(currentLine.length * 0.8);
          lines.push(currentLine.substring(0, breakPoint));
          currentLine = currentLine.substring(breakPoint);
        }
      }
    }
    
    if (currentLine.trim()) {
      lines.push(currentLine.trim());
    }
    return lines;
  }
};

// LAYOUT CONTROL FUNCTIONS

// Check if text fits on current page
export const willTextFitOnPage = (pdf: jsPDF, currentY: number, additionalLines: number = 1): boolean => {
  const PAGE_HEIGHT = 841.89; // A4 height
  const MARGIN_BOTTOM = 68;
  const LINE_HEIGHT = 14.4;
  
  const requiredSpace = currentY + (additionalLines * LINE_HEIGHT);
  return requiredSpace <= (PAGE_HEIGHT - MARGIN_BOTTOM);
};

// Safe page break
export const addPageBreakIfNeeded = (pdf: jsPDF, currentY: number, requiredLines: number = 2): number => {
  if (!willTextFitOnPage(pdf, currentY, requiredLines)) {
    pdf.addPage();
    enhanceTextQuality(pdf); // Reapply quality settings
    return 68; // Top margin
  }
  return currentY;
};

// Validate text position (prevent overflow)
export const validateTextPosition = (x: number, y: number, textWidth: number): { x: number, y: number, valid: boolean } => {
  const PAGE_WIDTH = 595.28; // A4 width
  const PAGE_HEIGHT = 841.89; // A4 height
  const MARGIN_RIGHT = 68;
  const MARGIN_BOTTOM = 68;
  
  let validX = x;
  let validY = y;
  let valid = true;
  
  // Check horizontal bounds
  if (x + textWidth > PAGE_WIDTH - MARGIN_RIGHT) {
    validX = PAGE_WIDTH - MARGIN_RIGHT - textWidth;
    valid = false;
  }
  
  if (validX < 68) { // Left margin
    validX = 68;
    valid = false;
  }
  
  // Check vertical bounds
  if (y > PAGE_HEIGHT - MARGIN_BOTTOM) {
    validY = PAGE_HEIGHT - MARGIN_BOTTOM;
    valid = false;
  }
  
  return { x: validX, y: validY, valid };
};

// Sharp text addition with LAYOUT VALIDATION
export const addThaiText = (pdf: jsPDF, text: string, x: number, y: number, style: 'normal' | 'bold' = 'normal'): void => {
  const processedText = processTextForPDF(text);
  setFontForText(pdf, processedText, style);
  
  // Validate position to prevent overflow
  const textWidth = pdf.getTextWidth(processedText);
  const position = validateTextPosition(x, y, textWidth);
  
  if (!position.valid) {
    console.warn(`Text position adjusted to prevent overflow: (${x},${y}) -> (${position.x},${position.y})`);
  }
  
  pdf.text(processedText, position.x, position.y); // Safe text rendering
};

// Quality enhancement function
export const enhanceTextQuality = (pdf: jsPDF): void => {
  try {
    // Reduce compression for better quality
    if ((pdf as any).internal.setCompressionLevel) {
      (pdf as any).internal.setCompressionLevel(0);
    }
  } catch (error) {
    console.warn('Could not enhance quality:', error);
  }
};

// Additional helper functions for compatibility
export const needsThaiHandling = (text: string): boolean => {
  return containsThaiText(text);
};

export const getLineHeight = (text: string): number => {
  return containsThaiText(text) ? 14.4 * 1.1 : 14.4;
};

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
