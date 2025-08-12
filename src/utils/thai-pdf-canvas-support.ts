import jsPDF from 'jspdf';

// Check if text contains Thai characters
export const containsThaiText = (text: string): boolean => {
  const thaiRegex = /[\u0E00-\u0E7F]/;
  return thaiRegex.test(text);
};

// Create a canvas-based image for Thai text
export const createThaiTextImage = (text: string, fontSize: number = 12, fontWeight: string = 'normal'): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      // Set up canvas for high-quality text rendering
      const scale = 2; // For better quality
      const actualFontSize = fontSize * scale;
      
      // Set font with Thai support - prioritize Sarabun for better Thai rendering
      const fontFamily = '"Sarabun", "Noto Sans Thai", "Tahoma", "Arial Unicode MS", Arial, sans-serif';
      ctx.font = `${fontWeight} ${actualFontSize}px ${fontFamily}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic'; // Better baseline for Thai text
      ctx.fillStyle = '#000000';
      
      // Enable better text rendering (if supported)
      if ('textRenderingOptimization' in ctx) {
        (ctx as any).textRenderingOptimization = 'optimizeQuality';
      }
      ctx.imageSmoothingEnabled = true;
      if ('imageSmoothingQuality' in ctx) {
        (ctx as any).imageSmoothingQuality = 'high';
      }

      // Measure text to set canvas size more accurately
      const metrics = ctx.measureText(text);
      const textWidth = Math.ceil(metrics.width);
      
      // Calculate proper height for Thai text (which can have ascenders and descenders)
      const textHeight = Math.ceil(actualFontSize * 1.4); // More space for Thai characters
      
      canvas.width = textWidth + 20; // More padding for better quality
      canvas.height = textHeight + 20;
      
      // Re-set font and properties after canvas resize (canvas resets context)
      ctx.font = `${fontWeight} ${actualFontSize}px ${fontFamily}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = '#000000';
      
      // Re-enable better text rendering (if supported)
      if ('textRenderingOptimization' in ctx) {
        (ctx as any).textRenderingOptimization = 'optimizeQuality';
      }
      ctx.imageSmoothingEnabled = true;
      if ('imageSmoothingQuality' in ctx) {
        (ctx as any).imageSmoothingQuality = 'high';
      }
      
      // Draw the text with proper positioning for Thai baseline
      const textY = actualFontSize + 10; // Position from top with proper baseline
      ctx.fillText(text, 10, textY);
      
      // Convert to data URL
      const dataURL = canvas.toDataURL('image/png');
      resolve(dataURL);
      
    } catch (error) {
      reject(error);
    }
  });
};

// Add Thai text as image to PDF
export const addThaiTextAsImage = async (
  pdf: jsPDF, 
  text: string, 
  x: number, 
  y: number, 
  fontSize: number = 12,
  fontWeight: string = 'normal'
): Promise<void> => {
  try {
    if (!containsThaiText(text)) {
      // For non-Thai text, use regular PDF text
      pdf.setFont('helvetica', fontWeight === 'bold' ? 'bold' : 'normal');
      pdf.setFontSize(fontSize);
      pdf.text(text, x, y);
      return;
    }

    // For Thai text, create an image
    const imageData = await createThaiTextImage(text, fontSize, fontWeight);
    
    // Create a temporary image to get actual dimensions
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = imageData;
    });
    
    // Calculate proper dimensions based on actual canvas size
    const scale = 2; // This matches the scale used in createThaiTextImage
    const actualWidth = img.width / scale; // Convert back from high-res canvas
    const actualHeight = img.height / scale;
    
    // Scale to match PDF font size
    const scaleFactor = fontSize / 12; // Normalize to 12pt base size
    const finalWidth = actualWidth * scaleFactor;
    const finalHeight = actualHeight * scaleFactor;
    
    // Add image to PDF with proper dimensions
    pdf.addImage(imageData, 'PNG', x, y - fontSize * 0.8, finalWidth, finalHeight);
    
  } catch (error) {
    console.warn('Failed to add Thai text as image, falling back to regular text:', error);
    // Fallback to regular text
    pdf.setFont('helvetica', fontWeight === 'bold' ? 'bold' : 'normal');
    pdf.setFontSize(fontSize);
    pdf.text(text, x, y);
  }
};

// Split Thai text for multi-line rendering
export const splitThaiTextForImage = (text: string, maxWidth: number, fontSize: number = 12): string[] => {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';
  
  const estimatedCharWidth = fontSize * 0.6; // Approximate character width
  
  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const estimatedWidth = testLine.length * estimatedCharWidth;
    
    if (estimatedWidth <= maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  
  if (currentLine) lines.push(currentLine);
  return lines;
};

// Enhanced Thai PDF export function
export const exportThaiPDFWithImages = async (
  blocks: Array<{id: string, type: string, content: string}>,
  title: string = 'Thai Screenplay',
  author: string = 'Author',
  contact: string = ''
): Promise<void> => {
  try {
    console.log('🚀 Starting enhanced Thai PDF export with image rendering...');
    
    // Show loading indicator
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]';
    loadingDiv.innerHTML = `
      <div class="bg-white p-6 rounded-lg shadow-xl flex flex-col items-center">
        <div class="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p class="text-gray-800 font-medium">Generating Thai PDF with Image Rendering...</p>
        <p class="text-gray-600 text-sm mt-1">This may take a moment for better Thai text quality.</p>
      </div>
    `;
    document.body.appendChild(loadingDiv);

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a4'
    });

    // Constants
    const PAGE_HEIGHT = 841.89;
    const PAGE_WIDTH = 595.28;
    const MARGIN_LEFT = 85;
    const MARGIN_TOP = 68;
    const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - 68;
    const LINE_HEIGHT = 16;

    // Title page
    await addThaiTextAsImage(pdf, title, PAGE_WIDTH / 2 - 100, PAGE_HEIGHT / 3, 18, 'bold');
    await addThaiTextAsImage(pdf, author, PAGE_WIDTH / 2 - 50, PAGE_HEIGHT / 2, 14, 'normal');

    // Add new page for content
    pdf.addPage();

    let y = MARGIN_TOP;
    let sceneCounter = 1;

    // Layout configurations
    const layouts = {
      'scene-heading': { marginLeft: 0, fontSize: 12, fontWeight: 'bold', spaceAfter: LINE_HEIGHT },
      'action': { marginLeft: 0, fontSize: 12, fontWeight: 'normal', spaceAfter: LINE_HEIGHT },
      'character': { marginLeft: 200, fontSize: 12, fontWeight: 'normal', spaceAfter: 0 },
      'dialogue': { marginLeft: 130, fontSize: 12, fontWeight: 'normal', spaceAfter: LINE_HEIGHT },
      'parenthetical': { marginLeft: 165, fontSize: 12, fontWeight: 'normal', spaceAfter: 0 },
      'transition': { marginLeft: 400, fontSize: 12, fontWeight: 'normal', spaceAfter: LINE_HEIGHT }
    };

    for (const block of blocks) {
      if (!block.content.trim()) continue;

      const layout = layouts[block.type as keyof typeof layouts] || layouts['action'];
      let text = block.content;

      // Add scene number for scene headings
      if (block.type === 'scene-heading') {
        text = `${sceneCounter}. ${text}`;
        sceneCounter++;
      }

      const x = MARGIN_LEFT + layout.marginLeft;
      const maxWidth = CONTENT_WIDTH - layout.marginLeft;

      // Split text into lines
      const lines = splitThaiTextForImage(text, maxWidth, layout.fontSize);

      for (const line of lines) {
        // Check for page break
        if (y > PAGE_HEIGHT - MARGIN_TOP - LINE_HEIGHT * 2) {
          pdf.addPage();
          y = MARGIN_TOP;
        }

        // Add text (as image for Thai, regular for English)
        await addThaiTextAsImage(pdf, line, x, y, layout.fontSize, layout.fontWeight);
        y += LINE_HEIGHT;
      }

      y += layout.spaceAfter || 0;
    }

    // Save PDF
    const filename = `${title.replace(/[^a-zA-Z0-9ก-๙\s]/g, '').replace(/\s+/g, '_')}_enhanced.pdf`;
    pdf.save(filename);

    // Remove loading indicator
    document.body.removeChild(loadingDiv);

    console.log('✅ Enhanced Thai PDF export completed successfully!');
    console.log('📄 Thai text rendered as high-quality images for better display');

  } catch (error) {
    console.error('❌ Enhanced Thai PDF export failed:', error);
    
    // Remove loading indicator
    const loadingDiv = document.querySelector('.fixed.inset-0.bg-black\\/50');
    if (loadingDiv && loadingDiv.parentNode) {
      loadingDiv.parentNode.removeChild(loadingDiv);
    }
    
    throw error;
  }
};
