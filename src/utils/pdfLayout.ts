// Updated for A4 format with Thai support
export const FONT_SIZE = 12;
export const LINE_HEIGHT_MULTIPLIER = 1.2; // Slightly reduced for A4
export const LINE_HEIGHT = FONT_SIZE * LINE_HEIGHT_MULTIPLIER;

// Page dimensions in points for A4 (Thai standard)
export const PAGE_WIDTH = 595.28; // A4 width
export const PAGE_HEIGHT = 841.89; // A4 height

// Margins in points (Thai industry standard)
export const MARGIN_TOP = 68; // ~24mm
export const MARGIN_BOTTOM = 68; // ~24mm  
export const MARGIN_LEFT = 85; // ~30mm
export const MARGIN_RIGHT = 68; // ~24mm

// Content area dimensions
export const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;
export const CONTENT_HEIGHT = PAGE_HEIGHT - MARGIN_TOP - MARGIN_BOTTOM;

// Maximum lines per page for A4
export const MAX_LINES_PER_PAGE = Math.floor(CONTENT_HEIGHT / LINE_HEIGHT);

// Layout configuration for each block type (updated for Thai standards)
export const layoutConfig = {
  'scene-heading': {
    indent: 0, // No indent for scene headings
    fontStyle: 'bold',
    textTransform: 'uppercase',
    spaceBefore: LINE_HEIGHT,
    spaceAfter: FONT_SIZE,
    maxWidth: CONTENT_WIDTH
  },
  'action': {
    indent: 0,
    fontStyle: 'normal',
    spaceAfter: FONT_SIZE,
    maxWidth: CONTENT_WIDTH
  },
  'character': {
    indent: 200, // 200pt from left margin (Thai standard)
    fontStyle: 'normal',
    textTransform: 'uppercase',
    spaceAfter: 0,
    maxWidth: CONTENT_WIDTH - 200
  },
  'parenthetical': {
    indent: 165, // 165pt from left margin
    fontStyle: 'normal',
    spaceAfter: 0,
    maxWidth: CONTENT_WIDTH - 165 - 50 // Indent from left and right
  },
  'dialogue': {
    indent: 130, // 130pt from left margin
    fontStyle: 'normal',
    spaceAfter: FONT_SIZE,
    maxWidth: CONTENT_WIDTH - 130 - 50 // Indent from left and right
  },
  'transition': {
    indent: 400, // 400pt from left margin (right-aligned)
    fontStyle: 'normal',
    textTransform: 'uppercase',
    alignment: 'right',
    spaceAfter: FONT_SIZE,
    maxWidth: CONTENT_WIDTH
  },
  'shot': {
    indent: 0,
    fontStyle: 'bold',
    textTransform: 'uppercase',
    spaceAfter: FONT_SIZE,
    maxWidth: CONTENT_WIDTH
  },
  'text': {
    indent: 0,
    fontStyle: 'normal',
    spaceAfter: FONT_SIZE,
    maxWidth: CONTENT_WIDTH
  }
};

// Helper function to get layout for a specific block type
export const getLayoutForBlockType = (blockType: string) => {
  return layoutConfig[blockType as keyof typeof layoutConfig] || layoutConfig['text'];
};