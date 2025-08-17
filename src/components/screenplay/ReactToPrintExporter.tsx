import React, { useRef, useState } from 'react';
import { useReactToPrint } from 'react-to-print';
import { FileDown, Printer, Globe } from 'lucide-react';
import PrintableScreenplay from './PrintableScreenplay';
import { Block } from '../../types';
import { exportToEnhancedStandardPDF } from '../../utils/pdfExport';

interface ReactToPrintExporterProps {
  blocks: Block[];
  title: string;
  author: string;
  contact: string;
  className?: string;
}

const ReactToPrintExporter: React.FC<ReactToPrintExporterProps> = ({
  blocks,
  title,
  author,
  contact,
  className = ''
}) => {
  const printRef = useRef<HTMLDivElement>(null);
  const [isPreparing, setIsPreparing] = useState(false);

  // Detect Thai content for UI indicators
  const hasThaiContent = blocks.some(block => /[\u0E00-\u0E7F]/.test(block.content)) ||
                        /[\u0E00-\u0E7F]/.test(title) ||
                        /[\u0E00-\u0E7F]/.test(author);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `${title}.pdf`,
    onBeforePrint: async () => {
      setIsPreparing(true);
    },
    onAfterPrint: () => {
      setIsPreparing(false);
    }
  });

  const handlePDFExport = async () => {
    if (blocks.length === 0) return;
    
    try {
      setIsPreparing(true);
      await exportToEnhancedStandardPDF(blocks, title, author, contact);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Failed to export PDF. Please try again.');
    } finally {
      setIsPreparing(false);
    }
  };

  const handlePrintClick = () => {
    if (blocks.length === 0) return;
    handlePrint();
  };

  return (
    <div className="react-to-print-exporter">
      <button
        onClick={handlePDFExport}
        className={`flex items-center px-4 py-2 rounded-lg transition-all duration-200 ${
          hasThaiContent
            ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white hover:opacity-90'
            : 'bg-[#E86F2C] text-white hover:bg-[#E86F2C]/90'
        } disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
        disabled={isPreparing || blocks.length === 0}
        title={hasThaiContent ? 'Export Enhanced Standard PDF with Thai support + Scene Numbers' : 'Export Enhanced Standard PDF with Scene Numbers'}
      >
        {isPreparing ? (
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
        ) : (
          <FileDown size={18} className="mr-2" />
        )}
        
        <span>Export PDF</span>
        
        {hasThaiContent && (
          <div className="ml-2 flex items-center">
            <Globe size={16} className="mr-1" />
            <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">TH</span>
          </div>
        )}
      </button>
      
      {/* Hidden printable content */}
      <div style={{ display: 'none' }}>
        <PrintableScreenplay
          ref={printRef}
          blocks={blocks}
          title={title}
          author={author}
          contact={contact}
        />
      </div>

      {/* Instructions for users */}
      {isPreparing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl text-center">
            <div className="w-12 h-12 border-4 border-[#E86F2C] border-t-transparent rounded-full animate-spin mb-4 mx-auto"></div>
            <p className="text-[#1E4D3A] dark:text-white font-medium mb-2">กำลังสร้าง PDF มาตรฐานที่ปรับปรุงแล้ว...</p>
            <p className="text-[#577B92] dark:text-gray-400 text-sm">
              {hasThaiContent ? 'เลขฉากชัด + จัดรูปแบบเป็นมาตรฐาน + รองรับภาษาไทย' : 'Scene numbers on left + Standard formatting'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReactToPrintExporter;
