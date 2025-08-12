import jsPDF from 'jspdf';
import { Block } from '../types';
import {
  containsThaiText,
  addThaiTextAsImage,
  splitThaiTextForImage,
  exportThaiPDFWithImages
} from './thai-pdf-canvas-support';
import {
  normalizeThaiText,
  setFontForText,
  setupThaiSupport,
  processTextForPDF,
  getTextWidth,
  splitThaiTextToSize,
  addThaiText,
  getLineHeight,
  validateTextForPDF,
  needsThaiHandling
} from './thai-pdf-support-simple';

// Import a proper Thai font for jsPDF
// We'll use Courier to match the editor's monospace font
const loadThaiFont = async (pdf: jsPDF): Promise<void> => {
  try {
    // Use Courier to match the editor's monospace font (Courier Prime)
    pdf.setFont('courier');
    console.log('Using Courier font to match editor');
  } catch (error) {
    console.warn('Failed to load Courier font, using fallback:', error);
    pdf.setFont('helvetica');
  }
};

// Constants for A4 layout matching editor exactly
const PAGE_HEIGHT = 841.89; // A4 height in points (297mm)
const PAGE_WIDTH = 595.28;  // A4 width in points (210mm)
// Match editor: 20mm margins on each side
const MARGIN_LEFT = 56.69;  // 20mm in points
const MARGIN_RIGHT = 56.69; // 20mm in points  
const MARGIN_TOP = 56.69;   // 20mm in points
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT; // 170mm content width
// Match editor font size and line height: 16px base with 1.375 leading
const FONT_SIZE = 12; // 16px equivalent in PDF points
const LINE_HEIGHT = FONT_SIZE * 1.6; // Increased to 19.2pt for better spacing to match editor

// Layout configurations matching editor exactly
const blockLayouts = {
  'scene-heading': {
    marginLeft: 0,
    indent: 0,
    spaceAfter: LINE_HEIGHT * 1.2, // Increased spacing for scene headings
    uppercase: true,
    bold: true,
    italic: false,
    width: 1.0, // w-full
    textAlign: 'left' as const
  },
  'action': {
    marginLeft: 0,
    indent: 0,
    spaceAfter: LINE_HEIGHT * 1.0, // Increased spacing for action blocks
    uppercase: false,
    bold: false,
    italic: false,
    width: 1.0, // w-full
    textAlign: 'left' as const
  },
  'character': {
    marginLeft: 0,
    indent: 0,
    spaceAfter: LINE_HEIGHT * 0.3, // Small spacing after character names
    uppercase: true,
    bold: false, // font-semibold in editor, but keep normal for PDF
    italic: false,
    width: 0.67, // w-2/3
    textAlign: 'center' as const
  },
  'dialogue': {
    marginLeft: 0,
    indent: 0,
    spaceAfter: LINE_HEIGHT * 1.0, // Increased spacing after dialogue
    uppercase: false,
    bold: false,
    italic: false,
    width: 0.67, // w-2/3
    textAlign: 'left' as const
  },
  'parenthetical': {
    marginLeft: 0,
    indent: 0,
    spaceAfter: LINE_HEIGHT * 0.2, // Minimal spacing for parentheticals
    uppercase: false,
    bold: false,
    italic: true,
    width: 0.5, // w-1/2
    textAlign: 'left' as const
  },
  'transition': {
    marginLeft: 0,
    indent: 0,
    spaceAfter: LINE_HEIGHT * 1.5, // Extra spacing for transitions
    uppercase: true,
    bold: true,
    italic: false,
    width: 1.0, // w-full
    textAlign: 'right' as const
  },
  'text': {
    marginLeft: 0,
    indent: 0,
    spaceAfter: LINE_HEIGHT * 1.0, // Standard spacing for text blocks
    uppercase: false,
    bold: false,
    italic: false,
    width: 1.0, // w-full
    textAlign: 'left' as const
  },
  'shot': {
    marginLeft: 0,
    indent: 0,
    spaceAfter: LINE_HEIGHT * 1.2, // Increased spacing for shot blocks
    uppercase: true,
    bold: true,
    italic: false,
    width: 1.0, // w-full
    textAlign: 'left' as const
  }
};

// Create title page with Thai support
const createTitlePageWithThaiSupport = (
  title: string,
  author: string,
  contact: string,
  pdf: jsPDF
): void => {
  // Title (centered, about 1/3 down the page)
  const titleText = normalizeThaiText(title.toUpperCase());
  const titleY = PAGE_HEIGHT / 3;
  const titleWidth = getTextWidth(pdf, titleText);
  const titleX = (PAGE_WIDTH - titleWidth) / 2;
  
  addThaiText(pdf, titleText, titleX, titleY, 'bold');
  
  // "Written by" text (support both Thai and English)
  const writtenByText = containsThaiText(author) ? 'เขียนโดย' : 'Written by';
  const writtenByY = PAGE_HEIGHT / 2;
  const writtenByWidth = getTextWidth(pdf, writtenByText);
  const writtenByX = (PAGE_WIDTH - writtenByWidth) / 2;
  
  addThaiText(pdf, writtenByText, writtenByX, writtenByY, 'normal');
  
  // Author name
  const authorText = normalizeThaiText(author);
  const authorY = writtenByY + LINE_HEIGHT * 2;
  const authorWidth = getTextWidth(pdf, authorText);
  const authorX = (PAGE_WIDTH - authorWidth) / 2;
  
  addThaiText(pdf, authorText, authorX, authorY, 'normal');
  
  // Contact information (bottom right)
  if (contact) {
    const contactText = normalizeThaiText(contact);
    const contactY = PAGE_HEIGHT - MARGIN_TOP;
    const contactWidth = getTextWidth(pdf, contactText);
    const contactX = PAGE_WIDTH - MARGIN_RIGHT - contactWidth;
    
    addThaiText(pdf, contactText, contactX, contactY, 'normal');
  }
};

// Calculate block height with Thai support
const calculateBlockHeight = (text: string, blockType: string, pdf: jsPDF): number => {
  const blockTypeKey = blockType as keyof typeof blockLayouts;
  const layout = blockLayouts[blockTypeKey] || blockLayouts['action'];
  
  // Set font size to match editor
  pdf.setFontSize(FONT_SIZE);
  
  let processedText = processTextForPDF(text);
  
  if (layout.uppercase && !containsThaiText(processedText)) {
    processedText = processedText.toUpperCase();
  }
  
  // Calculate block width based on layout
  const blockWidth = CONTENT_WIDTH * layout.width;
  const lines = splitThaiTextToSize(pdf, processedText, blockWidth);
  
  // Use consistent line height matching editor
  return lines.length * LINE_HEIGHT + (layout.spaceAfter || 0);
};

// Add block content to PDF with Thai support
const addBlockToPDF = (
  pdf: jsPDF,
  block: Block,
  y: number,
  sceneNumber?: number,
  dialogueNumber?: number
): number => {
  const blockType = block.type as keyof typeof blockLayouts;
  const layout = blockLayouts[blockType] || blockLayouts['action'];
  
  // Set font size to match editor
  pdf.setFontSize(FONT_SIZE);
  
  // Validate text before processing
  const validation = validateTextForPDF(block.content);
  if (validation.warning) {
    console.warn(`Block ${block.id}: ${validation.warning}`);
  }
  
  let text = processTextForPDF(block.content);
  
  // Add scene number for scene headings
  if (blockType === 'scene-heading' && sceneNumber !== undefined) {
    text = `${sceneNumber}. ${text}`;
  }
  
  // Apply uppercase transformation for non-Thai text
  if (layout.uppercase && !containsThaiText(text)) {
    text = text.toUpperCase();
  }
  
  // Calculate block width and positioning based on layout
  const blockWidth = CONTENT_WIDTH * layout.width;
  const blockStartX = MARGIN_LEFT + (CONTENT_WIDTH - blockWidth) / 2; // Center the block area
  
  // For full-width blocks, use left margin directly
  const x = layout.width === 1.0 ? MARGIN_LEFT : blockStartX;
  const maxWidth = blockWidth;
  
  const lines = splitThaiTextToSize(pdf, text, maxWidth);
  const lineHeight = LINE_HEIGHT; // Use consistent line height
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check if we need a page break
    if (y > PAGE_HEIGHT - MARGIN_TOP - lineHeight) {
      pdf.addPage();
      y = MARGIN_TOP;
    }
    
    // Set font style - handle italic separately since Thai support functions don't support it
    let fontStyle: 'normal' | 'bold' = layout.bold ? 'bold' : 'normal';
    
    // For italic text (parenthetical), we'll use normal font but add visual indication
    if (layout.italic) {
      // Set font to normal for italic blocks since Thai functions don't support italic
      fontStyle = 'normal';
      // We could add parentheses or other visual cues here if needed
    }
    
    setFontForText(pdf, line, fontStyle);
    
    // Calculate line X position based on text alignment
    let lineX = x;
    const lineWidth = getTextWidth(pdf, line);
    
    if (layout.textAlign === 'center') {
      lineX = x + (blockWidth - lineWidth) / 2;
    } else if (layout.textAlign === 'right') {
      lineX = x + blockWidth - lineWidth;
    }
    
    addThaiText(pdf, line, lineX, y, fontStyle);
    
    // Add dialogue number to the right margin for dialogue blocks
    if (blockType === 'dialogue' && dialogueNumber !== undefined && i === lines.length - 1) {
      const numberText = `${dialogueNumber}`;
      const rightMarginX = MARGIN_LEFT + CONTENT_WIDTH;
      setFontForText(pdf, numberText, 'normal');
      const numberWidth = pdf.getTextWidth(numberText);
      pdf.text(numberText, rightMarginX - numberWidth, y);
    }
    
    y += lineHeight;
  }
  
  y += layout.spaceAfter || 0;
  return y;
};

export const exportToPDF = async (
  blocks: Block[],
  title: string = 'Untitled Screenplay',
  author: string = '',
  contact: string = ''
): Promise<void> => {
  try {
    console.log('🚀 Starting PDF export with enhanced Thai support...');
    
    // Use the enhanced canvas-based Thai PDF export
    await exportThaiPDFWithImages(blocks, title, author, contact);
    
    console.log('✅ PDF exported successfully with enhanced Thai support');
    
  } catch (error) {
    console.error('❌ Error generating PDF with enhanced Thai support:', error);
    
    // Fallback to basic export if canvas method fails
    console.log('🔄 Falling back to basic Thai PDF export...');
    
    try {
      // Show loading indicator with Thai support message
      const loadingIndicator = document.createElement('div');
      loadingIndicator.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]';
      loadingIndicator.innerHTML = `
        <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl flex flex-col items-center">
          <div class="w-12 h-12 border-4 border-[#E86F2C] border-t-transparent rounded-full animate-spin mb-4"></div>
          <p class="text-[#1E4D3A] dark:text-white font-medium">Generating PDF with Basic Thai Support...</p>
          <p class="text-[#577B92] dark:text-gray-400 text-sm mt-1">Using fallback method for Thai text.</p>
        </div>
      `;
      document.body.appendChild(loadingIndicator);
      
      // Initialize PDF document with A4 format (Thai standard)
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: 'a4'
      });
      
      // Setup Thai support
      setupThaiSupport(pdf);
      
      // Add metadata with Thai support
      pdf.setProperties({
        title: normalizeThaiText(title),
        author: normalizeThaiText(author),
        creator: 'LiQid Screenplay Writer - Thai Support',
        subject: 'Screenplay',
        keywords: 'screenplay, script, movie, thai, ภาพยนตร์, บท'
      });
      
      // Create title page with Thai support
      createTitlePageWithThaiSupport(title, author, contact, pdf);
      
      // Add new page for screenplay content
      pdf.addPage();
      
      // Initialize position and counters
      let y = MARGIN_TOP;
      let sceneCounter = 1;
      let dialogueCounter = 1;
      
      // Process each block with Thai support
      for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i];
        
        // Skip empty blocks
        if (!block.content.trim()) continue;
        
        // Calculate the height this block will occupy
        const blockHeight = calculateBlockHeight(block.content, block.type, pdf);
        
        // Check if we need a page break
        if (y + blockHeight > PAGE_HEIGHT - MARGIN_TOP - LINE_HEIGHT) {
          pdf.addPage();
          y = MARGIN_TOP;
        }
        
        // Add block with appropriate numbering
        if (block.type === 'scene-heading') {
          y = addBlockToPDF(pdf, block, y, sceneCounter);
          sceneCounter++;
        } else if (block.type === 'dialogue') {
          y = addBlockToPDF(pdf, block, y, undefined, dialogueCounter);
          dialogueCounter++;
        } else {
          y = addBlockToPDF(pdf, block, y);
        }
      }
      
      // Create safe filename that supports Thai characters
      const safeFilename = title
        .replace(/[^a-zA-Z0-9ก-๙\s]/g, '') // Allow Thai characters
        .replace(/\s+/g, '_')
        .toLowerCase() + '.pdf';
      
      pdf.save(safeFilename);
      
      // Remove loading indicator
      document.body.removeChild(loadingIndicator);
      
      console.log('✅ PDF exported successfully with basic Thai support (fallback)');
      
    } catch (fallbackError) {
      console.error('❌ Fallback PDF export also failed:', fallbackError);
      
      // Remove loading indicator if it exists
      const loadingIndicator = document.querySelector('.fixed.inset-0.bg-black\\/50');
      if (loadingIndicator && loadingIndicator.parentNode) {
        loadingIndicator.parentNode.removeChild(loadingIndicator);
      }
      
      // Show error message
      alert('Failed to generate PDF. Please try again.');
      throw fallbackError;
    }
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
    // Show loading indicator with Thai support message
    const loadingIndicator = document.createElement('div');
    loadingIndicator.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]';
    loadingIndicator.innerHTML = `
      <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl flex flex-col items-center">
        <div class="w-12 h-12 border-4 border-[#E86F2C] border-t-transparent rounded-full animate-spin mb-4"></div>
        <p class="text-[#1E4D3A] dark:text-white font-medium">Generating PDF with Thai Support...</p>
        <p class="text-[#577B92] dark:text-gray-400 text-sm mt-1">Processing Thai and English text...</p>
      </div>
    `;
    document.body.appendChild(loadingIndicator);

    // Get screenplay blocks from the editor state
    const blocks = window.screenplay?.state?.blocks;
    
    if (!blocks || !Array.isArray(blocks)) {
      throw new Error('Could not access screenplay blocks data');
    }
    
    // Get header information
    const header = window.screenplay?.state?.header || {
      title: title || 'Untitled Screenplay',
      author: author || 'Anonymous',
      contact: ''
    };
    
    // Export using the Thai-supported PDF method
    await exportToPDF(
      blocks,
      header.title || title,
      header.author || author,
      header.contact || ''
    );
    
    // Remove loading indicator
    document.body.removeChild(loadingIndicator);
  } catch (error) {
    console.error('Error generating PDF:', error);
    
    // Remove loading indicator if it exists
    const loadingIndicator = document.querySelector('.fixed.inset-0.bg-black\\/50');
    if (loadingIndicator && loadingIndicator.parentNode) {
      loadingIndicator.parentNode.removeChild(loadingIndicator);
    }
    
    // Show error message with Thai support info
    alert('Failed to generate PDF with Thai support. Please try again.');
  }
};
