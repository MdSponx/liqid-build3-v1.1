import React, { useState } from 'react';
import { FileDown, Globe } from 'lucide-react';
import { exportToPDF } from '../../utils/pdfExport';
import { containsThaiText } from '../../utils/thai-pdf-support-simple';
import { Block } from '../../types';

interface ThaiPDFExportButtonProps {
  blocks: Block[];
  title?: string;
  author?: string;
  contact?: string;
  className?: string;
  showLanguageIndicator?: boolean;
}

const ThaiPDFExportButton: React.FC<ThaiPDFExportButtonProps> = ({
  blocks,
  title = 'Untitled Screenplay',
  author = '',
  contact = '',
  className = '',
  showLanguageIndicator = true
}) => {
  const [isExporting, setIsExporting] = useState(false);

  // Detect if the screenplay contains Thai content
  const hasThaiContent = blocks.some(block => containsThaiText(block.content)) ||
                        containsThaiText(title) ||
                        containsThaiText(author);

  const handleExport = async () => {
    if (isExporting) return;

    try {
      setIsExporting(true);
      
      // Import the export function dynamically
      const { exportToPDF } = await import('../../utils/pdfExport');
      
      // Use the Thai-supported PDF export
      await exportToPDF(blocks, title, author, contact);
      
      console.log('Thai PDF export completed successfully');
    } catch (error) {
      console.error('Error exporting Thai PDF:', error);
      alert('Failed to export PDF. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={isExporting || blocks.length === 0}
      className={`flex items-center px-4 py-2 rounded-lg transition-all duration-200 ${
        hasThaiContent
          ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white hover:opacity-90'
          : 'bg-[#E86F2C] text-white hover:bg-[#E86F2C]/90'
      } disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      title={hasThaiContent ? 'Export PDF with Thai language support (A4 format)' : 'Export PDF (A4 format)'}
    >
      {isExporting ? (
        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
      ) : (
        <FileDown size={18} className="mr-2" />
      )}
      
      <span>Export PDF</span>
      
      {showLanguageIndicator && hasThaiContent && (
        <div className="ml-2 flex items-center">
          <Globe size={16} className="mr-1" />
          <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
            TH
          </span>
        </div>
      )}
    </button>
  );
};

export default ThaiPDFExportButton;