import React from 'react';
import ReactToPrintExporter from './ReactToPrintExporter';
import { Block } from '../../types';

const ReactToPrintDemo: React.FC = () => {
  // Sample screenplay blocks for demonstration
  const sampleBlocks: Block[] = [
    {
      id: 'scene-1',
      type: 'scene-heading',
      content: 'INT. COFFEE SHOP - DAY'
    },
    {
      id: 'action-1',
      type: 'action',
      content: 'A bustling coffee shop filled with the aroma of freshly brewed coffee. SARAH, a young writer in her twenties, sits at a corner table with her laptop.'
    },
    {
      id: 'character-1',
      type: 'character',
      content: 'SARAH'
    },
    {
      id: 'dialogue-1',
      type: 'dialogue',
      content: 'This new PDF export system is amazing! No more blurry Thai text.'
    },
    {
      id: 'action-2',
      type: 'action',
      content: 'She types enthusiastically on her laptop, a smile spreading across her face.'
    }
  ];

  // Sample Thai screenplay blocks
  const thaiBlocks: Block[] = [
    {
      id: 'scene-thai-1',
      type: 'scene-heading',
      content: 'ภายใน. ร้านกาแฟ - กลางวัน'
    },
    {
      id: 'action-thai-1',
      type: 'action',
      content: 'ร้านกาแฟที่คึกคักเต็มไปด้วยกลิ่นหอมของกาแฟที่เพิ่งชงใหม่ สาราห์ นักเขียนสาววัยยี่สิบต้นๆ นั่งอยู่ที่โต๊ะมุมพร้อมแล็ปท็อป'
    },
    {
      id: 'character-thai-1',
      type: 'character',
      content: 'สาราห์'
    },
    {
      id: 'dialogue-thai-1',
      type: 'dialogue',
      content: 'ระบบส่งออก PDF ใหม่นี้เยี่ยมมาก! ไม่มีตัวอักษรไทยเบลอแล้ว'
    },
    {
      id: 'action-thai-2',
      type: 'action',
      content: 'เธอพิมพ์อย่างกระตือรือร้นบนแล็ปท็อป รอยยิ้มค่อยๆ แผ่ขยายบนใบหน้า'
    }
  ];

  return (
    <div className="max-w-4xl mx-auto p-8 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-[#1E4D3A] mb-4">
          React-to-Print PDF Export Demo
        </h1>
        <p className="text-[#577B92] mb-8">
          Perfect Thai PDF export using browser's native print capabilities
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* English Sample */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-[#1E4D3A] mb-4">
            English Screenplay Sample
          </h2>
          
          <div className="space-y-3 mb-6 text-sm">
            {sampleBlocks.map((block) => (
              <div key={block.id} className={`block-${block.type}`}>
                <div className="text-xs text-gray-500 uppercase tracking-wide">
                  {block.type}
                </div>
                <div className="font-mono">{block.content}</div>
              </div>
            ))}
          </div>

          <ReactToPrintExporter
            blocks={sampleBlocks}
            title="Sample English Screenplay"
            author="LiQid Demo"
            contact="demo@liqid.com"
            className="w-full justify-center"
          />
        </div>

        {/* Thai Sample */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-[#1E4D3A] mb-4">
            Thai Screenplay Sample
          </h2>
          
          <div className="space-y-3 mb-6 text-sm">
            {thaiBlocks.map((block) => (
              <div key={block.id} className={`block-${block.type}`}>
                <div className="text-xs text-gray-500 uppercase tracking-wide">
                  {block.type}
                </div>
                <div className="font-mono">{block.content}</div>
              </div>
            ))}
          </div>

          <ReactToPrintExporter
            blocks={thaiBlocks}
            title="ตัวอย่างบทภาพยนตร์ไทย"
            author="LiQid เดโม"
            contact="demo@liqid.com"
            className="w-full justify-center"
          />
        </div>
      </div>

      <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-[#1E4D3A] mb-3">
          ✅ Benefits of React-to-Print Approach
        </h3>
        <ul className="space-y-2 text-[#577B92]">
          <li>• <strong>Perfect Thai text rendering</strong> - Browser native fonts</li>
          <li>• <strong>No blurry text</strong> - Native browser rendering</li>
          <li>• <strong>Proper A4 layout</strong> - CSS @page control</li>
          <li>• <strong>No overflow issues</strong> - CSS handles layout perfectly</li>
          <li>• <strong>Faster implementation</strong> - Much simpler code</li>
          <li>• <strong>More reliable</strong> - Browser print system is bulletproof</li>
          <li>• <strong>Better user experience</strong> - Familiar print dialog</li>
          <li>• <strong>Future-proof</strong> - Works with any new fonts/languages</li>
        </ul>
      </div>

      <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-[#1E4D3A] mb-3">
          🚀 How It Works
        </h3>
        <ol className="space-y-2 text-[#577B92] list-decimal list-inside">
          <li>Click "Export PDF" button</li>
          <li>Browser print dialog opens with perfect preview</li>
          <li>Choose "Save as PDF" from destination</li>
          <li>Get perfect A4 PDF with crisp Thai text</li>
        </ol>
      </div>
    </div>
  );
};

export default ReactToPrintDemo;
