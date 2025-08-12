import React, { useRef, useState } from 'react';
import { useReactToPrint } from 'react-to-print';
import PrintableScreenplay from './PrintableScreenplay';
import { Block } from '../../types';

// Sample screenplay data for demonstration
const sampleBlocks: Block[] = [
  {
    id: '1',
    type: 'scene-heading',
    content: 'EXT. ชายทะเล บางแสน - DAWN'
  },
  {
    id: '2',
    type: 'action',
    content: 'คำบรรยายเหตุการณ์ที่เกิดขึ้นในฉากนี้ เป็นการบรรยายที่ยาวพอสมควรเพื่อทดสอบการจัดรูปแบบ'
  },
  {
    id: '3',
    type: 'character',
    content: 'ปูเป้'
  },
  {
    id: '4',
    type: 'dialogue',
    content: 'ประโยคบทพูดที่ยาวพอสมควรเพื่อทดสอบการจัดรูปแบบและการแสดงหมายเลขบทพูด'
  },
  {
    id: '5',
    type: 'character',
    content: 'เอ๋'
  },
  {
    id: '6',
    type: 'parenthetical',
    content: 'ด้วยความประหลาดใจ'
  },
  {
    id: '7',
    type: 'dialogue',
    content: 'บทพูดตอบกลับที่แสดงอารมณ์ความรู้สึก'
  },
  {
    id: '8',
    type: 'transition',
    content: 'CUT TO:'
  },
  {
    id: '9',
    type: 'scene-heading',
    content: 'INT. ห้องนั่งเล่น - DAY'
  },
  {
    id: '10',
    type: 'action',
    content: 'Write your scene description here.'
  },
  {
    id: '11',
    type: 'character',
    content: 'JOHN'
  },
  {
    id: '12',
    type: 'dialogue',
    content: 'This is a sample dialogue to test the English text formatting.'
  },
  {
    id: '13',
    type: 'transition',
    content: 'FADE OUT:'
  }
];

const ReactToPrintGridDemo: React.FC = () => {
  const printRef = useRef<HTMLDivElement>(null);
  const [isPreparing, setIsPreparing] = useState(false);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: 'Screenplay_Grid_Layout_Demo.pdf',
    onBeforePrint: async () => {
      setIsPreparing(true);
    },
    onAfterPrint: () => {
      setIsPreparing(false);
    }
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Grid-Based Screenplay Layout Demo
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            This demo showcases the new grid-based layout system with:
          </p>
          <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 mb-6 space-y-2">
            <li>Two-column grid layout (content + right rail)</li>
            <li>Transitions flush to right margin</li>
            <li>Dialog numbers flush to right margin</li>
            <li>Optional cover page with metadata</li>
            <li>Proper page breaks and print formatting</li>
            <li>Thai and English text support</li>
          </ul>

          <button 
            onClick={handlePrint}
            disabled={isPreparing}
            className="screen-only bg-[#E86F2C] hover:bg-[#d85a1a] text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPreparing ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin inline-block mr-2" />
                Preparing...
              </>
            ) : (
              <>🖨️ Print / Save as PDF</>
            )}
          </button>
        </div>

        {/* Print Preview Area */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Print Preview
          </h2>
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white">
            <PrintableScreenplay
              ref={printRef}
              blocks={sampleBlocks}
              title="Sample Screenplay"
              author="Demo Author"
              contact="demo@example.com"
              director="Demo Director"
              writer="Demo Writer"
              runtime="90 minutes"
              school="Film School"
              logline="A demonstration of the new grid-based screenplay layout system with proper formatting and professional presentation."
            />
          </div>
        </div>

        {/* Layout Explanation */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mt-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Layout Features
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                Grid System
              </h3>
              <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                <li>• Two-column grid: content + right rail</li>
                <li>• Single-column for content-only blocks</li>
                <li>• Proper alignment and spacing</li>
                <li>• No overlap or clipping issues</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                Right Rail Elements
              </h3>
              <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                <li>• Transitions (CUT TO:, FADE OUT:)</li>
                <li>• Dialog numbers (1, 2, 3...)</li>
                <li>• Flush to right margin</li>
                <li>• Professional formatting</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                Cover Page
              </h3>
              <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                <li>• Optional poster image</li>
                <li>• Title and logline</li>
                <li>• Credits and metadata</li>
                <li>• Automatic page break</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                Print Features
              </h3>
              <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                <li>• A4 page size with proper margins</li>
                <li>• Courier Prime monospace font</li>
                <li>• Page break controls</li>
                <li>• Screen/print visibility controls</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReactToPrintGridDemo;
