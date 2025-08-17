// Standard Screenplay PDF Export with correct formatting
import jsPDF from 'jspdf';
import { Block } from '../types';
import {
  containsThaiText,
  normalizeThaiText,
  setFontForText,
  processTextForPDF,
  getTextWidth,
  splitThaiTextToSize,
  addThaiText,
  getLineHeight,
  validateTextForPDF
} from './thai-pdf-support-simple';

// Page setup for A4 (Thai standard)
const PAGE_HEIGHT = 841.89; // A4 height in points
const PAGE_WIDTH = 595.28;  // A4 width in points

// Standard screenplay margins (industry standard)
const MARGIN_LEFT = 85;     // ~30mm
const MARGIN_RIGHT = 68;    // ~24mm  
const MARGIN_TOP = 68;      // ~24mm
const MARGIN_BOTTOM = 68;   // ~24mm

const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;
const LINE_HEIGHT = 14.4;

// Scene number positioning (LEFT MARGIN - OUTSIDE content area)
const SCENE_NUMBER_X = 30; // Outside left margin, closer to edge

// Standard screenplay formatting (exact industry specifications)
const blockLayouts = {
  'scene-heading': {
    marginLeft: 0,
    indent: 0,
    spaceAfter: LINE_HEIGHT,
    uppercase: true,
    bold: true,
    showSceneNumber: true,
    rightAlign: false
  },
  'action': {
    marginLeft: 0,
    indent: 0,
    spaceAfter: LINE_HEIGHT,
    uppercase: false,
    bold: false,
    rightAlign: false
  },
  'character': {
    marginLeft: 200, // 200pt from left margin
    indent: 0,
    spaceAfter: 0,
    uppercase: true,
    bold: false,
    rightAlign: false
  },
  'dialogue': {
    marginLeft: 130, // 130pt from left margin
    indent: 0,
    spaceAfter: LINE_HEIGHT,
    uppercase: false,
    bold: false,
    rightAlign: false
  },
  'parenthetical': {
    marginLeft: 165, // 165pt from left margin (between character and dialogue)
    indent: 0,
    spaceAfter: 0,
    uppercase: false,
    bold: false,
    inline: true, // Special flag to handle inline parenthetical
    rightAlign: false
  },
  'transition': {
    marginLeft: 0,
    indent: 0,
    spaceAfter: LINE_HEIGHT,
    uppercase: true,
    bold: false,
    rightAlign: true
  }
};

// Title page creation
const createStandardTitlePage = (
  pdf: jsPDF,
  title: string,
  author: string,
  contact: string
): void => {
  // Title (centered, 1/3 down page)
  const titleText = normalizeThaiText(title.toUpperCase());
  const titleY = PAGE_HEIGHT / 3;
  
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(14);
  const titleWidth = pdf.getTextWidth(titleText);
  const titleX = (PAGE_WIDTH - titleWidth) / 2;
  pdf.text(titleText, titleX, titleY);
  
  // "Written by" text
  const writtenByText = containsThaiText(author) ? 'เขียนโดย' : 'Written by';
  const writtenByY = titleY + LINE_HEIGHT * 3;
  
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(12);
  const writtenByWidth = pdf.getTextWidth(writtenByText);
  const writtenByX = (PAGE_WIDTH - writtenByWidth) / 2;
  pdf.text(writtenByText, writtenByX, writtenByY);
  
  // Author name
  const authorText = normalizeThaiText(author);
  const authorY = writtenByY + LINE_HEIGHT * 2;
  const authorWidth = pdf.getTextWidth(authorText);
  const authorX = (PAGE_WIDTH - authorWidth) / 2;
  pdf.text(authorText, authorX, authorY);
  
  // Contact info (bottom right)
  if (contact) {
    const contactText = normalizeThaiText(contact);
    const contactY = PAGE_HEIGHT - MARGIN_BOTTOM;
    const contactWidth = pdf.getTextWidth(contactText);
    const contactX = PAGE_WIDTH - MARGIN_RIGHT - contactWidth;
    pdf.text(contactText, contactX, contactY);
  }
};

// Enhanced block rendering with proper scene numbers and parenthetical handling
const renderStandardBlock = (
  pdf: jsPDF,
  block: Block,
  y: number,
  sceneNumber?: number,
  dialogueNumber?: number,
  transitionNumber?: number
): number => {
  const blockType = block.type as keyof typeof blockLayouts;
  const layout = blockLayouts[blockType] || blockLayouts['action'];
  
  let text = processTextForPDF(block.content);
  
  // Apply text transformations
  if (layout.uppercase && !containsThaiText(text)) {
    text = text.toUpperCase();
  }
  
  // Set font style
  const fontWeight = layout.bold ? 'bold' : 'normal';
  pdf.setFont('helvetica', fontWeight);
  pdf.setFontSize(12);
  pdf.setTextColor(0, 0, 0); // Pure black
  
  // Calculate positioning
  const x = MARGIN_LEFT + layout.marginLeft + layout.indent;
  const maxWidth = CONTENT_WIDTH - layout.marginLeft - layout.indent;
  
  // Handle right alignment for transitions
  let finalX = x;
  if (layout.rightAlign) {
    const textWidth = pdf.getTextWidth(text);
    finalX = MARGIN_LEFT + CONTENT_WIDTH - textWidth;
  }
  
  // Split text into lines
  const lines = splitThaiTextToSize(pdf, text, maxWidth);
  const lineHeight = getLineHeight(text);
  
  // Render scene number OUTSIDE the margin (if scene heading)
  if (blockType === 'scene-heading' && sceneNumber !== undefined) {
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0); // Pure black for scene numbers
    const sceneNumberText = `${sceneNumber}`;
    pdf.text(sceneNumberText, SCENE_NUMBER_X, y);
    // Reset font for scene heading text
    pdf.setFont('helvetica', fontWeight);
  }
  
  // Render each line
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check for page break
    if (y > PAGE_HEIGHT - MARGIN_BOTTOM - lineHeight) {
      pdf.addPage();
      y = MARGIN_TOP;
    }
    
    // Adjust X position for right-aligned blocks
    let lineX = finalX;
    if (layout.rightAlign) {
      const lineWidth = pdf.getTextWidth(line);
      lineX = MARGIN_LEFT + CONTENT_WIDTH - lineWidth;
    }
    
    // Render line
    addThaiText(pdf, line, lineX, y, fontWeight);
    
    // Add dialogue number (last line only)
    if (blockType === 'dialogue' && dialogueNumber !== undefined && i === lines.length - 1) {
      pdf.setFont('helvetica', 'bold'); // Bold for dialogue numbers
      pdf.setTextColor(0, 0, 0); // Pure black
      const numberText = `${dialogueNumber}`;
      const numberWidth = pdf.getTextWidth(numberText);
      const numberX = MARGIN_LEFT + CONTENT_WIDTH - numberWidth;
      pdf.text(numberText, numberX, y);
    }
    
    // Add transition number (last line only)
    if (blockType === 'transition' && transitionNumber !== undefined && i === lines.length - 1) {
      pdf.setFont('helvetica', 'bold'); // Bold for transition numbers
      pdf.setTextColor(0, 0, 0); // Pure black
      const numberText = `${transitionNumber}`;
      const numberWidth = pdf.getTextWidth(numberText);
      const numberX = MARGIN_LEFT + CONTENT_WIDTH - numberWidth - 20; // Small offset
      pdf.text(numberText, numberX, y);
    }
    
    y += lineHeight;
  }
  
  y += layout.spaceAfter || 0;
  return y;
};

// Handle special parenthetical-dialogue combination
const handleParentheticalDialogue = (
  blocks: Block[],
  index: number
): { combinedBlock: Block | null, skipNext: boolean } => {
  const currentBlock = blocks[index];
  const nextBlock = blocks[index + 1];
  
  // Check if current is parenthetical and next is dialogue
  if (currentBlock.type === 'parenthetical' && 
      nextBlock && nextBlock.type === 'dialogue') {
    
    // Combine parenthetical with dialogue
    const combinedContent = `${currentBlock.content} ${nextBlock.content}`;
    
    return {
      combinedBlock: {
        ...nextBlock,
        content: combinedContent,
        type: 'dialogue'
      },
      skipNext: true
    };
  }
  
  return { combinedBlock: null, skipNext: false };
};

// Main export function with standard formatting
export const exportToStandardPDF = async (
  blocks: Block[],
  title: string = 'Untitled Screenplay',
  author: string = '',
  contact: string = ''
): Promise<void> => {
  try {
    // Loading indicator
    const loadingIndicator = document.createElement('div');
    loadingIndicator.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]';
    loadingIndicator.innerHTML = `
      <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl flex flex-col items-center">
        <div class="w-12 h-12 border-4 border-[#E86F2C] border-t-transparent rounded-full animate-spin mb-4"></div>
        <p class="text-gray-700 dark:text-gray-300 font-medium">กำลังสร้าง PDF มาตรฐาน...</p>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-2">เลขฉากด้านซ้าย + จัดรูปแบบถูกต้อง</p>
      </div>
    `;
    document.body.appendChild(loadingIndicator);

    // Create PDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a4'
    });

    // Set default settings
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(12);
    pdf.setTextColor(0, 0, 0);

    // Add title page
    createStandardTitlePage(pdf, title, author, contact);
    pdf.addPage();

    // Process content blocks
    let y = MARGIN_TOP;
    let sceneNumber = 0;
    let dialogueNumber = 0;
    let transitionNumber = 0;

    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      
      // Handle parenthetical-dialogue combinations
      const parentheticalResult = handleParentheticalDialogue(blocks, i);
      if (parentheticalResult.combinedBlock) {
        // Use combined block and skip next
        const combinedBlock = parentheticalResult.combinedBlock;
        if (combinedBlock.type === 'dialogue') {
          dialogueNumber++;
        }
        
        y = renderStandardBlock(
          pdf,
          combinedBlock,
          y,
          undefined,
          dialogueNumber,
          undefined
        );
        
        i++; // Skip the next block since we combined it
        continue;
      }
      
      // Count scene, dialogue, and transition numbers
      if (block.type === 'scene-heading') {
        sceneNumber++;
      } else if (block.type === 'dialogue') {
        dialogueNumber++;
      } else if (block.type === 'transition') {
        transitionNumber++;
      }
      
      // Render block with appropriate numbers
      y = renderStandardBlock(
        pdf,
        block,
        y,
        block.type === 'scene-heading' ? sceneNumber : undefined,
        block.type === 'dialogue' ? dialogueNumber : undefined,
        block.type === 'transition' ? transitionNumber : undefined
      );
    }

    // Save PDF
    const fileName = `${title.replace(/[^a-zA-Z0-9ก-๙\s]/g, '') || 'screenplay'}_standard_${new Date().toISOString().split('T')[0]}.pdf`;
    
    document.body.removeChild(loadingIndicator);
    pdf.save(fileName);
    
    console.log('Standard screenplay PDF exported successfully');
    
  } catch (error) {
    // Clean up loading indicator
    const loadingIndicator = document.querySelector('.fixed.inset-0.bg-black\\/50');
    if (loadingIndicator) {
      document.body.removeChild(loadingIndicator);
    }
    
    console.error('Error exporting standard PDF:', error);
    throw error;
  }
};

// Enhanced export with better scene detection
export const exportToEnhancedStandardPDF = async (
  blocks: Block[],
  title: string = 'Untitled Screenplay',
  author: string = '',
  contact: string = ''
): Promise<void> => {
  try {
    const loadingIndicator = document.createElement('div');
    loadingIndicator.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]';
    loadingIndicator.innerHTML = `
      <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl flex flex-col items-center">
        <div class="w-12 h-12 border-4 border-[#E86F2C] border-t-transparent rounded-full animate-spin mb-4"></div>
        <p class="text-gray-700 dark:text-gray-300 font-medium">กำลังสร้าง PDF มาตรฐานที่ปรับปรุงแล้ว...</p>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-2">เลขฉากชัด + จัดรูปแบบเป็นมาตรฐาน</p>
      </div>
    `;
    document.body.appendChild(loadingIndicator);

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a4'
    });

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(12);
    pdf.setTextColor(0, 0, 0);

    // Title page
    createStandardTitlePage(pdf, title, author, contact);
    pdf.addPage();

    // Enhanced block processing
    let y = MARGIN_TOP;
    const counters = {
      scene: 0,
      dialogue: 0,
      transition: 0
    };

    // Pre-process blocks to handle special cases
    const processedBlocks: Array<{block: Block, numbers: any}> = [];
    
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      
      // Count numbers
      if (block.type === 'scene-heading') counters.scene++;
      if (block.type === 'dialogue') counters.dialogue++;
      if (block.type === 'transition') counters.transition++;
      
      // Handle parenthetical combinations
      if (block.type === 'parenthetical' && 
          i + 1 < blocks.length && 
          blocks[i + 1].type === 'dialogue') {
        
        // Combine with next dialogue
        const dialogueBlock = blocks[i + 1];
        const combinedContent = `${block.content} ${dialogueBlock.content}`;
        
        processedBlocks.push({
          block: {
            ...dialogueBlock,
            content: combinedContent
          },
          numbers: {
            scene: undefined,
            dialogue: counters.dialogue,
            transition: undefined
          }
        });
        
        i++; // Skip next block
      } else {
        processedBlocks.push({
          block,
          numbers: {
            scene: block.type === 'scene-heading' ? counters.scene : undefined,
            dialogue: block.type === 'dialogue' ? counters.dialogue : undefined,
            transition: block.type === 'transition' ? counters.transition : undefined
          }
        });
      }
    }

    // Render processed blocks
    for (const item of processedBlocks) {
      y = renderStandardBlock(
        pdf,
        item.block,
        y,
        item.numbers.scene,
        item.numbers.dialogue,
        item.numbers.transition
      );
    }

    // Save with descriptive filename
    const fileName = `${title.replace(/[^a-zA-Z0-9ก-๙\s]/g, '') || 'screenplay'}_enhanced_standard_${new Date().toISOString().split('T')[0]}.pdf`;
    
    document.body.removeChild(loadingIndicator);
    pdf.save(fileName);
    
    console.log('Enhanced standard screenplay PDF exported successfully');
    
  } catch (error) {
    const loadingIndicator = document.querySelector('.fixed.inset-0.bg-black\\/50');
    if (loadingIndicator) {
      document.body.removeChild(loadingIndicator);
    }
    console.error('Error in enhanced standard PDF export:', error);
    throw error;
  }
};
