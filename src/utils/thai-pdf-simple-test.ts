// Simple non-JSX test for Thai PDF export
import { Block } from '../types';

// Test data with Thai characters
const testBlocks: Block[] = [
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

// Simple test function that can be called from browser console
export const runThaiPDFTest = async (): Promise<void> => {
  try {
    console.log('🧪 Starting Thai PDF Export Test...');
    console.log('📝 Sample content includes:');
    console.log('   - Scene heading: EXT. ถนนกรุงเทพ - กลางวัน');
    console.log('   - Action: คนเดินผ่านไปมาในถนนที่คึกคัก...');
    console.log('   - Character: สมชาย');
    console.log('   - Dialogue: สวัสดีครับ วันนี้อากาศดีจังเลย');
    
    // Import the export function
    const { exportToEnhancedStandardPDF } = await import('./pdfExport');
    
    // Test with Thai content
    await exportToEnhancedStandardPDF(
      testBlocks,
      'บททดสอบภาษาไทย', // Thai title
      'นักเขียนไทย', // Thai author
      'thai.writer@example.com'
    );
    
    console.log('✅ Thai PDF export test completed successfully!');
    console.log('📄 Check the downloaded PDF file');
    console.log('🔧 Applied fixes:');
    console.log('   ✓ Unicode normalization (NFC)');
    console.log('   ✓ Helvetica font for Thai support');
    console.log('   ✓ Removed problematic font embedding');
    console.log('   ✓ Enhanced text processing');
    console.log('');
    console.log('🎯 Expected result: Thai characters should display correctly');
    console.log('❌ Previous issue: Thai text appeared as garbled/alien characters');
    
  } catch (error) {
    console.error('❌ Thai PDF export test failed:', error);
    console.log('');
    console.log('🔍 Troubleshooting:');
    console.log('   1. Check browser console for detailed errors');
    console.log('   2. Ensure jsPDF library is loaded');
    console.log('   3. Verify network connectivity');
    throw error;
  }
};

// Export test data for use in other components
export { testBlocks };

// Make it available globally for easy testing
if (typeof window !== 'undefined') {
  (window as any).runThaiPDFTest = runThaiPDFTest;
  console.log('🌐 Thai PDF test function available globally as: runThaiPDFTest()');
}

export default runThaiPDFTest;
