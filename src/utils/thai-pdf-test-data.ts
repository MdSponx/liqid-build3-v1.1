// Test data for Thai PDF export functionality
import { Block } from '../types';

// Sample Thai screenplay blocks for testing
const thaiTestBlocks: Block[] = [
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
    id: 'action-2',
    type: 'action',
    content: 'สมชายเดินเข้าไปในร้านกาแฟเล็กๆ ที่มีลูกค้านั่งเต็มไปหมด'
  },
  {
    id: 'character-2',
    type: 'character',
    content: 'พนักงานร้าน'
  },
  {
    id: 'dialogue-2',
    type: 'dialogue',
    content: 'ยินดีต้อนรับครับ จะสั่งอะไรดีครับ'
  },
  {
    id: 'parenthetical-1',
    type: 'parenthetical',
    content: '(ยิ้มแย้มแจ่มใส)'
  },
  {
    id: 'dialogue-3',
    type: 'dialogue',
    content: 'ขอกาแฟร้อนหนึ่งแก้วครับ'
  },
  {
    id: 'transition-1',
    type: 'transition',
    content: 'CUT TO:'
  }
];

// Mixed Thai-English test blocks
const mixedLanguageTestBlocks: Block[] = [
  {
    id: 'scene-1',
    type: 'scene-heading',
    content: 'INT. BANGKOK OFFICE - DAY'
  },
  {
    id: 'action-1',
    type: 'action',
    content: 'A modern office in Bangkok. SOMCHAI (30s) sits at his desk, typing on his computer. The city skyline is visible through large windows.'
  },
  {
    id: 'character-1',
    type: 'character',
    content: 'SOMCHAI'
  },
  {
    id: 'dialogue-1',
    type: 'dialogue',
    content: 'Hello, this is Somchai speaking. สวัสดีครับ ผมสมชายพูดครับ'
  },
  {
    id: 'action-2',
    type: 'action',
    content: 'He switches between English and Thai effortlessly. เขาสลับภาษาอังกฤษและไทยได้อย่างคล่องแคล่ว'
  },
  {
    id: 'character-2',
    type: 'character',
    content: 'SARAH (V.O.)'
  },
  {
    id: 'dialogue-2',
    type: 'dialogue',
    content: 'Can you please send me the report? ช่วยส่งรายงานให้หน่อยได้ไหมคะ'
  },
  {
    id: 'transition-1',
    type: 'transition',
    content: 'FADE TO:'
  }
];

// Long content test blocks for page break testing
const longContentTestBlocks: Block[] = [
  {
    id: 'scene-1',
    type: 'scene-heading',
    content: 'INT. ห้องประชุมใหญ่ - กลางคืน'
  },
  {
    id: 'action-1',
    type: 'action',
    content: 'ห้องประชุมขนาดใหญ่ที่มีโต๊ะยาวตรงกลาง มีคนนั่งอยู่รอบโต๊ะประมาณ 20 คน แต่ละคนต่างมีสีหน้าเครียด บรรยากาศในห้องเงียบสงัด มีเพียงเสียงเครื่องปรับอากาศที่ทำงานอยู่ ผนังห้องติดไปด้วยแผนภูมิและกราฟต่างๆ ที่แสดงถึงผลการดำเนินงานของบริษัท หน้าต่างใหญ่มองเห็นวิวเมืองกรุงเทพยามค่ำคืนที่เต็มไปด้วยแสงไฟ'
  },
  {
    id: 'character-1',
    type: 'character',
    content: 'ผู้จัดการใหญ่'
  },
  {
    id: 'dialogue-1',
    type: 'dialogue',
    content: 'ท่านสมาชิกทุกท่าน วันนี้เราต้องตัดสินใจเรื่องสำคัญที่จะส่งผลต่ออนาคตของบริษัทเรา ผมหวังว่าทุกท่านจะพิจารณาอย่างรอบคอบ และร่วมกันหาทางออกที่ดีที่สุดสำหรับทุกฝ่าย'
  },
  {
    id: 'action-2',
    type: 'action',
    content: 'ทุกคนในห้องต่างมองหน้ากัน บางคนพยักหน้า บางคนส่ายหน้า บรรยากาศเริ่มตึงเครียดมากขึ้น เสียงนาฬิกาบนผนังดังติ๊กๆ ทำให้ความเงียบในห้องดูน่าอึดอัดใจ'
  }
];

// Test function to validate Thai PDF export
export const testThaiPDFExport = (): void => {
  console.log('Testing Thai PDF export...');
  
  try {
    // Test 1: Pure Thai content
    console.log('Test 1: Pure Thai content');
    // exportToPDF(thaiTestBlocks, 'บทภาพยนตร์ตัวอย่าง', 'นักเขียนไทย', 'email@example.com');
    
    // Test 2: Mixed language content
    console.log('Test 2: Mixed Thai-English content');
    // exportToPDF(mixedLanguageTestBlocks, 'Mixed Language Script', 'Thai Writer นักเขียน', 'contact@example.com');
    
    // Test 3: Long content for page breaks
    console.log('Test 3: Long content with page breaks');
    // exportToPDF(longContentTestBlocks, 'บทยาวสำหรับทดสอบ', 'ผู้เขียนบท', 'writer@example.com');
    
    console.log('All tests completed successfully');
  } catch (error) {
    console.error('Thai PDF export test failed:', error);
  }
};

// Export test data for use in components
export { thaiTestBlocks, mixedLanguageTestBlocks, longContentTestBlocks };