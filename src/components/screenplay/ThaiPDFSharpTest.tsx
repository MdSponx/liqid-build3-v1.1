import React from 'react';
import { exportToEnhancedStandardPDF } from '../../utils/pdfExport';
import { Block } from '../../types';

const ThaiPDFSharpTest: React.FC = () => {
  // Test data with Thai and English content
  const testBlocks: Block[] = [
    {
      id: '1',
      type: 'scene-heading',
      content: 'INT. ห้องนั่งเล่น - กลางวัน'
    },
    {
      id: '2',
      type: 'action',
      content: 'สมชาย นั่งอ่านหนังสือพิมพ์อยู่บนโซฟา แสงแดดส่องผ่านหน้าต่างใหญ่เข้ามาในห้อง บรรยากาศสงบและอบอุ่น'
    },
    {
      id: '3',
      type: 'character',
      content: 'สมชาย'
    },
    {
      id: '4',
      type: 'dialogue',
      content: 'วันนี้อากาศดีจัง เหมาะกับการอ่านหนังสือ'
    },
    {
      id: '5',
      type: 'action',
      content: 'เขาพลิกหน้าหนังสือพิมพ์ไปหน้าใหม่ แล้วหยุดอ่านเมื่อเห็นข่าวที่น่าสนใจ'
    },
    {
      id: '6',
      type: 'character',
      content: 'สมชาย'
    },
    {
      id: '7',
      type: 'parenthetical',
      content: '(อ่านออกเสียง)'
    },
    {
      id: '8',
      type: 'dialogue',
      content: '"ราคาทองคำปรับตัวขึ้น 200 บาทต่อบาท" น่าสนใจจริงๆ'
    },
    {
      id: '9',
      type: 'transition',
      content: 'FADE TO:'
    },
    {
      id: '10',
      type: 'scene-heading',
      content: 'EXT. สวนสาธารณะ - บ่าย'
    },
    {
      id: '11',
      type: 'action',
      content: 'Long line of Thai text to test text wrapping and overflow prevention: นี่คือข้อความภาษาไทยที่ยาวมากๆ เพื่อทดสอบการตัดบรรทัดและการป้องกันการล้นออกจากหน้ากระดาษ ซึ่งเป็นปัญหาสำคัญที่ต้องแก้ไขให้ได้ เพื่อให้ PDF ที่ส่งออกมีคุณภาพดีและอ่านง่าย'
    }
  ];

  const handleTestSharpPDF = async () => {
    try {
      console.log('🧪 Testing SHARP Thai PDF export...');
      
      await exportToEnhancedStandardPDF(
        testBlocks,
        'ทดสอบ PDF ภาษาไทยแบบคมชัด',
        'ผู้เขียนทดสอบ',
        'contact@test.com'
      );
      
      console.log('✅ Sharp Thai PDF test completed!');
    } catch (error) {
      console.error('❌ Sharp Thai PDF test failed:', error);
      alert('Test failed: ' + error);
    }
  };

  const handleTestMixedContent = async () => {
    const mixedBlocks: Block[] = [
      {
        id: '1',
        type: 'scene-heading',
        content: 'INT. OFFICE BUILDING - DAY'
      },
      {
        id: '2',
        type: 'action',
        content: 'Mixed content test: This is English text mixed with ภาษาไทย to test font switching and layout.'
      },
      {
        id: '3',
        type: 'character',
        content: 'JOHN'
      },
      {
        id: '4',
        type: 'dialogue',
        content: 'Hello, สวัสดีครับ! How are you today?'
      },
      {
        id: '5',
        type: 'character',
        content: 'สมหญิง'
      },
      {
        id: '6',
        type: 'dialogue',
        content: 'I am fine, thank you! ฉันสบายดี ขอบคุณค่ะ'
      }
    ];

    try {
      console.log('🧪 Testing MIXED content PDF export...');
      
      await exportToEnhancedStandardPDF(
        mixedBlocks,
        'Mixed Thai-English Test',
        'Test Author ผู้เขียนทดสอบ',
        'test@example.com'
      );
      
      console.log('✅ Mixed content PDF test completed!');
    } catch (error) {
      console.error('❌ Mixed content PDF test failed:', error);
      alert('Mixed content test failed: ' + error);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-[#1E4D3A] dark:text-white mb-6">
          🚀 Sharp Thai PDF Export Test
        </h2>
        
        <div className="space-y-4 mb-6">
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <h3 className="font-semibold text-green-800 dark:text-green-200 mb-2">
              ✅ Fixed Issues (Sharp + Perfect Layout)
            </h3>
            <ul className="text-sm text-green-700 dark:text-green-300 space-y-1">
              <li>• Sharp Thai text rendering (no image conversion)</li>
              <li>• Perfect page layout with proper margins</li>
              <li>• Text stays within page boundaries</li>
              <li>• Smart text splitting prevents overflow</li>
              <li>• Proper screenplay formatting and positioning</li>
              <li>• Smart page breaks that don't cut off content</li>
            </ul>
          </div>
          
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <h3 className="font-semibold text-red-800 dark:text-red-200 mb-2">
              ❌ Removed Problematic Functions
            </h3>
            <ul className="text-sm text-red-700 dark:text-red-300 space-y-1">
              <li>• renderThaiTextAsImage() - Caused blurry text</li>
              <li>• Complex font loading - Network dependencies</li>
              <li>• Over-processing - Too many transformations</li>
              <li>• Wrong PDF settings - High compression</li>
            </ul>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={handleTestSharpPDF}
            className="bg-[#E86F2C] hover:bg-[#d5612a] text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
          >
            <span>📄</span>
            <span>Test Sharp Thai PDF</span>
          </button>
          
          <button
            onClick={handleTestMixedContent}
            className="bg-[#577B92] hover:bg-[#4a6b7f] text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
          >
            <span>🌐</span>
            <span>Test Mixed Content</span>
          </button>
        </div>

        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
            🔧 Technical Implementation
          </h3>
          <div className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
            <p><strong>Sharp Rendering:</strong> Direct text rendering with Helvetica for Thai, Courier for English</p>
            <p><strong>Layout Control:</strong> Accurate text width measurement + position validation</p>
            <p><strong>Quality Settings:</strong> No compression + High precision (2 decimal places)</p>
            <p><strong>Overflow Prevention:</strong> Smart text splitting + margin validation</p>
          </div>
        </div>

        <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
          <p><strong>Expected Results:</strong></p>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li>Thai text will be sharp and clear (like build2-v1.4)</li>
            <li>All content stays within page margins</li>
            <li>Proper screenplay formatting and positioning</li>
            <li>Smart page breaks that maintain layout integrity</li>
            <li>Smaller file sizes due to no image conversion</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ThaiPDFSharpTest;
