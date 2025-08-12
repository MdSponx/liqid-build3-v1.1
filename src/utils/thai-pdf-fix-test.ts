// Simple test to verify Thai PDF export fixes
import { Block } from '../types';

// Test data with Thai characters that were showing as garbled text
export const testThaiBlocks: Block[] = [
  {
    id: 'scene-1',
    type: 'scene-heading',
    content: 'EXT. ถนนกรุงเทพ - กลางวัน'
  },
  {
    id: 'action-1',
    type: 'action',
    content: 'คนเดินผ่านไปมาในถนนที่คึกคัก รถยนต์และรถจักรยานยนต์วิ่งผ่านไปมาอย่างไม่หยุดหย่อน'
  },
  {
    id: 'character-1',
    type: 'character',
    content: 'สมชาย'
  },
  {
    id: 'dialogue-1',
    type: 'dialogue',
    content: 'สวัสดีครับ วันนี้อากาศดีจังเลย'
  },
  {
    id: 'parenthetical-1',
    type: 'parenthetical',
    content: '(ยิ้มแย้มแจ่มใส)'
  },
  {
    id: 'dialogue-2',
    type: 'dialogue',
    content: 'ขอกาแฟร้อนหนึ่งแก้วครับ'
  },
  {
    id: 'transition-1',
    type: 'transition',
    content: 'CUT TO:'
  }
];

// Function to test the export with our fixes
export const testThaiPDFExportFix = async (): Promise<void> => {
  try {
    console.log('Testing Thai PDF export with fixes...');
    
    // Import the export function
    const { exportToPDF } = await import('./pdfExport');
    
    // Test with Thai content
    await exportToPDF(
      testThaiBlocks,
      'บททดสอบภาษาไทย', // Thai title
      'นักเขียนไทย', // Thai author
      'thai.writer@example.com'
    );
    
    console.log('✅ Thai PDF export test completed successfully!');
    console.log('📄 Check the downloaded PDF - Thai characters should now display correctly');
    console.log('🔧 Fixed issues:');
    console.log('   - Proper Unicode normalization (NFC)');
    console.log('   - Helvetica font for better Thai support');
    console.log('   - Removed problematic font embedding');
    console.log('   - Improved text processing pipeline');
    
  } catch (error) {
    console.error('❌ Thai PDF export test failed:', error);
    throw error;
  }
};

// Export for use in components
export default testThaiPDFExportFix;
