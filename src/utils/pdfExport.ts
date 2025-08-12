import jsPDF from 'jspdf';
import { Block } from '../types';
import {
  containsThaiText,
  setupThaiSupport,
  addThaiText,
  enhanceTextQuality,
  splitThaiTextToSize,
  getTextWidth,
  addPageBreakIfNeeded,
  willTextFitOnPage,
  validateTextPosition,
  processTextForPDF
} from './thai-pdf-support-sharp';

// A4 Page Constants (CRITICAL for proper layout)
const PAGE_HEIGHT = 841.89; // A4 height in points
const PAGE_WIDTH = 595.28;  // A4 width in points
const MARGIN_LEFT = 85;     // Left margin
const MARGIN_RIGHT = 68;    // Right margin  
const MARGIN_TOP = 68;      // Top margin
const MARGIN_BOTTOM = 68;   // Bottom margin
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT; // Safe content area
const LINE_HEIGHT = 14.4;   // Standard line height

// Screenplay layout positions (Thai standard)
const LAYOUT_POSITIONS = {
  'scene-heading': { marginLeft: 0, bold: true, uppercase: true, alignRight: false },
  'action': { marginLeft: 0, bold: false, uppercase: false, alignRight: false },
  'character': { marginLeft: 200, bold: false, uppercase: true, alignRight: false },      // Character names
  'dialogue': { marginLeft: 130, bold: false, uppercase: false, alignRight: false },       // Dialogue text
  'parenthetical': { marginLeft: 165, bold: false, uppercase: false, alignRight: false },  // (parenthetical)
  'transition': { marginLeft: 0, bold: false, uppercase: true, alignRight: true },      // FADE IN: etc. - flush right
  'text': { marginLeft: 0, bold: false, uppercase: false, alignRight: false },
  'shot': { marginLeft: 0, bold: true, uppercase: true, alignRight: false }
};

// Helper function for title page
function createTitlePage(pdf: jsPDF, title: string, author: string, contact: string) {
  enhanceTextQuality(pdf);
  
  // Title (centered, 1/3 down page)
  pdf.setFontSize(18);
  const titleY = PAGE_HEIGHT / 3;
  const titleWidth = getTextWidth(pdf, title);
  const titleX = (PAGE_WIDTH - titleWidth) / 2;
  addThaiText(pdf, title.toUpperCase(), titleX, titleY, 'bold');
  
  // Reset font size
  pdf.setFontSize(12);
  
  // "Written by" or "เขียนโดย"
  const writtenBy = containsThaiText(author) ? 'เขียนโดย' : 'Written by';
  const writtenByY = PAGE_HEIGHT / 2;
  const writtenByWidth = getTextWidth(pdf, writtenBy);
  const writtenByX = (PAGE_WIDTH - writtenByWidth) / 2;
  addThaiText(pdf, writtenBy, writtenByX, writtenByY, 'normal');
  
  // Author name
  const authorY = writtenByY + LINE_HEIGHT * 2;
  const authorWidth = getTextWidth(pdf, author);
  const authorX = (PAGE_WIDTH - authorWidth) / 2;
  addThaiText(pdf, author, authorX, authorY, 'normal');
  
  // Contact (bottom right, within margins)
  if (contact) {
    const contactY = PAGE_HEIGHT - MARGIN_BOTTOM;
    const contactWidth = getTextWidth(pdf, contact);
    const contactX = PAGE_WIDTH - MARGIN_RIGHT - contactWidth;
    addThaiText(pdf, contact, contactX, contactY, 'normal');
  }
}

export const exportToPDF = async (
  blocks: Block[],
  title: string = 'Untitled Screenplay',
  author: string = '',
  contact: string = ''
): Promise<void> => {
  try {
    console.log('🚀 Starting PDF export with SHARP Thai support and PERFECT layout...');
    
    // Show loading indicator
    const loadingIndicator = document.createElement('div');
    loadingIndicator.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]';
    loadingIndicator.innerHTML = `
      <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl flex flex-col items-center">
        <div class="w-12 h-12 border-4 border-[#E86F2C] border-t-transparent rounded-full animate-spin mb-4"></div>
        <p class="text-[#1E4D3A] dark:text-white font-medium">Generating Perfect Thai PDF...</p>
        <p class="text-[#577B92] dark:text-gray-400 text-sm mt-1">Sharp text + Perfect layout control</p>
      </div>
    `;
    document.body.appendChild(loadingIndicator);
    
    // Create PDF with high-quality settings
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a4',
      compress: false,  // NO compression for sharp text
      precision: 2      // High precision
    });
    
    // Setup sharp Thai rendering
    setupThaiSupport(pdf);
    enhanceTextQuality(pdf);
    
    // Add metadata
    pdf.setProperties({
      title: processTextForPDF(title),
      author: processTextForPDF(author),
      creator: 'LiQid Screenplay Writer - Sharp Thai PDF',
      subject: 'Screenplay',
      keywords: 'screenplay, script, movie, thai, ภาพยนตร์, บท'
    });
    
    // Create title page
    createTitlePage(pdf, title, author, contact);
    
    // Start content page
    pdf.addPage();
    enhanceTextQuality(pdf);
    
    let currentY = MARGIN_TOP;
    let dialogueNumber = 1;
    let sceneNumber = 1;
    
    // Process each block with PROPER LAYOUT CONTROL
    for (const block of blocks) {
      // Skip empty blocks
      if (!block.content.trim()) continue;
      
      const layout = LAYOUT_POSITIONS[block.type as keyof typeof LAYOUT_POSITIONS] || LAYOUT_POSITIONS['action'];
      
      // Calculate text position
      const textX = MARGIN_LEFT + layout.marginLeft;
      const maxWidth = CONTENT_WIDTH - layout.marginLeft;
      
      // Process text
      let text = block.content;
      
      // Add scene number for scene headings
      if (block.type === 'scene-heading') {
        text = `${sceneNumber}. ${text}`;
        sceneNumber++;
      }
      
      if (layout.uppercase && !containsThaiText(text)) {
        text = text.toUpperCase();
      }
      
      // Split text to fit within margins (PREVENTS OVERFLOW)
      const lines = splitThaiTextToSize(pdf, text, maxWidth);
      
      // Check if we need a page break BEFORE adding content
      currentY = addPageBreakIfNeeded(pdf, currentY, lines.length);
      
      // Add each line with proper layout control
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // Ensure we're still within page bounds
        if (!willTextFitOnPage(pdf, currentY, 1)) {
          pdf.addPage();
          enhanceTextQuality(pdf);
          currentY = MARGIN_TOP;
        }
        
        // Calculate text position based on alignment
        let finalTextX = textX;
        if (layout.alignRight) {
          // For right-aligned text (transitions), position flush to right margin
          const lineWidth = getTextWidth(pdf, line);
          finalTextX = PAGE_WIDTH - MARGIN_RIGHT - lineWidth;
        }
        
        // Add text with layout validation
        const style = layout.bold ? 'bold' : 'normal';
        addThaiText(pdf, line, finalTextX, currentY, style);
        
        // Add dialogue numbers (if applicable) - flush to right margin like transitions
        if (block.type === 'dialogue' && i === 0) {
          const numberText = `${dialogueNumber}`;
          const numberWidth = getTextWidth(pdf, numberText);
          const numberX = PAGE_WIDTH - MARGIN_RIGHT - numberWidth; // Flush to right margin
          addThaiText(pdf, numberText, numberX, currentY, 'normal');
          dialogueNumber++;
        }
        
        currentY += LINE_HEIGHT;
      }
      
      // Add spacing after block
      currentY += LINE_HEIGHT * 0.5;
    }
    
    // Create safe filename
    const safeFilename = title
      .replace(/[^a-zA-Z0-9ก-๙\s]/g, '') // Allow Thai characters
      .replace(/\s+/g, '_')
      .toLowerCase() + '_perfect.pdf';
    
    pdf.save(safeFilename);
    
    // Remove loading indicator
    document.body.removeChild(loadingIndicator);
    
    console.log('✅ PDF exported successfully with SHARP Thai text and PERFECT layout!');
    console.log('📄 Features: Sharp text rendering + No overflow + Perfect margins + Smart page breaks');
    
  } catch (error) {
    console.error('❌ Error generating perfect Thai PDF:', error);
    
    // Remove loading indicator if it exists
    const loadingIndicator = document.querySelector('.fixed.inset-0.bg-black\\/50');
    if (loadingIndicator && loadingIndicator.parentNode) {
      loadingIndicator.parentNode.removeChild(loadingIndicator);
    }
    
    // Show error message
    alert('Failed to generate PDF. Please try again.');
    throw error;
  }
};

export const exportScreenplayToPDF = async (
  contentElement: HTMLElement | null,
  pages: HTMLElement[],
  title: string = 'Untitled Screenplay',
  author: string = 'Anonymous'
): Promise<void> => {
  if (!contentElement || !pages.length) {
    console.error('No content or pages provided for PDF export');
    return;
  }

  try {
    // Show loading indicator
    const loadingIndicator = document.createElement('div');
    loadingIndicator.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]';
    loadingIndicator.innerHTML = `
      <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl flex flex-col items-center">
        <div class="w-12 h-12 border-4 border-[#E86F2C] border-t-transparent rounded-full animate-spin mb-4"></div>
        <p class="text-[#1E4D3A] dark:text-white font-medium">Generating Perfect Thai PDF...</p>
        <p class="text-[#577B92] dark:text-gray-400 text-sm mt-1">Sharp text + Perfect layout control</p>
      </div>
    `;
    document.body.appendChild(loadingIndicator);

    // Get screenplay blocks from the editor state
    const blocks = (window as any).screenplay?.state?.blocks;
    
    if (!blocks || !Array.isArray(blocks)) {
      throw new Error('Could not access screenplay blocks data');
    }
    
    // Get header information
    const header = (window as any).screenplay?.state?.header || {
      title: title || 'Untitled Screenplay',
      author: author || 'Anonymous',
      contact: ''
    };
    
    // Export using the perfect Thai PDF method
    await exportToPDF(
      blocks,
      header.title || title,
      header.author || author,
      header.contact || ''
    );
    
    // Remove loading indicator
    document.body.removeChild(loadingIndicator);
  } catch (error) {
    console.error('Error generating perfect Thai PDF:', error);
    
    // Remove loading indicator if it exists
    const loadingIndicator = document.querySelector('.fixed.inset-0.bg-black\\/50');
    if (loadingIndicator && loadingIndicator.parentNode) {
      loadingIndicator.parentNode.removeChild(loadingIndicator);
    }
    
    // Show error message
    alert('Failed to generate perfect Thai PDF. Please try again.');
  }
};
