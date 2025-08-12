import React, { useState } from 'react';
import { runThaiPDFTest } from '../../utils/thai-pdf-simple-test';
import { testThaiPDFExportFix } from '../../utils/thai-pdf-fix-test';
import { exportThaiPDFWithImages } from '../../utils/thai-pdf-canvas-support';

const ThaiPDFTestPage: React.FC = () => {
  const [status, setStatus] = useState<{ message: string; type: 'info' | 'success' | 'error' }>({
    message: 'Ready to test Thai PDF export...',
    type: 'info'
  });
  const [logs, setLogs] = useState<string[]>(['Thai PDF Test Page Loaded']);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const runBasicTest = async () => {
    try {
      setStatus({ message: '🧪 Running Basic Thai PDF Test...', type: 'info' });
      addLog('🧪 Starting Basic Thai PDF Export Test...');
      
      await runThaiPDFTest();
      
      setStatus({ message: '✅ Basic test completed! Check downloaded PDF.', type: 'success' });
      addLog('✅ Basic Thai PDF test completed successfully!');
      addLog('📄 Check the downloaded PDF file');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setStatus({ message: `❌ Basic test failed: ${errorMessage}`, type: 'error' });
      addLog(`❌ Basic Thai PDF test failed: ${errorMessage}`);
    }
  };

  const runAdvancedTest = async () => {
    try {
      setStatus({ message: '🔬 Running Advanced Thai PDF Test...', type: 'info' });
      addLog('🔬 Starting Advanced Thai PDF Export Test...');
      
      await testThaiPDFExportFix();
      
      setStatus({ message: '✅ Advanced test completed! Check downloaded PDF.', type: 'success' });
      addLog('✅ Advanced Thai PDF test completed successfully!');
      addLog('📄 Check the downloaded PDF file');
      addLog('🔧 Applied fixes:');
      addLog('   ✓ Unicode normalization (NFC)');
      addLog('   ✓ Helvetica font for Thai support');
      addLog('   ✓ Proper screenplay formatting');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setStatus({ message: `❌ Advanced test failed: ${errorMessage}`, type: 'error' });
      addLog(`❌ Advanced Thai PDF test failed: ${errorMessage}`);
    }
  };

  const runCanvasTest = async () => {
    try {
      setStatus({ message: '🎨 Running Canvas-Based Thai PDF Test...', type: 'info' });
      addLog('🎨 Starting Canvas-Based Thai PDF Export Test...');
      
      // Test data for canvas approach
      const testBlocks = [
        { id: 'scene-1', type: 'scene-heading', content: 'EXT. ถนนกรุงเทพ - กลางวัน' },
        { id: 'action-1', type: 'action', content: 'คนเดินผ่านไปมาในถนนที่คึกคัก รถยนต์และรถจักรยานยนต์วิ่งผ่านไปมาอย่างไม่หยุดหย่อน' },
        { id: 'character-1', type: 'character', content: 'สมชาย' },
        { id: 'dialogue-1', type: 'dialogue', content: 'สวัสดีครับ วันนี้อากาศดีจังเลย' },
        { id: 'parenthetical-1', type: 'parenthetical', content: '(ยิ้มแย้มแจ่มใส)' },
        { id: 'dialogue-2', type: 'dialogue', content: 'ขอกาแฟร้อนหนึ่งแก้วครับ' },
        { id: 'transition-1', type: 'transition', content: 'CUT TO:' }
      ];
      
      await exportThaiPDFWithImages(
        testBlocks,
        'บททดสอบภาษาไทย - Canvas',
        'นักเขียนไทย',
        'thai.writer@example.com'
      );
      
      setStatus({ message: '✅ Canvas test completed! Check downloaded PDF.', type: 'success' });
      addLog('✅ Canvas-based Thai PDF test completed successfully!');
      addLog('📄 Check the downloaded PDF file');
      addLog('🎨 Applied canvas rendering:');
      addLog('   ✓ Thai text rendered as high-quality images');
      addLog('   ✓ System fonts with proper Thai support');
      addLog('   ✓ Canvas-based text measurement');
      addLog('   ✓ Better character positioning');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setStatus({ message: `❌ Canvas test failed: ${errorMessage}`, type: 'error' });
      addLog(`❌ Canvas-based Thai PDF test failed: ${errorMessage}`);
    }
  };

  const clearLogs = () => {
    setLogs(['Console cleared...']);
    setStatus({ message: 'Ready to test Thai PDF export...', type: 'info' });
  };

  const getStatusClass = () => {
    switch (status.type) {
      case 'success': return 'bg-green-100 text-green-800 border-green-200';
      case 'error': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-[#1E4D3A] text-center mb-8">
            🇹🇭 Thai PDF Export Test
          </h1>
          
          {/* Test Content Section */}
          <div className="mb-8 p-6 bg-gray-50 rounded-lg border">
            <h3 className="text-xl font-semibold mb-4">Test Content (Thai + English)</h3>
            <div className="space-y-3">
              <div className="p-3 bg-white border-l-4 border-[#E86F2C] rounded">
                <strong>Scene Heading:</strong> EXT. ถนนกรุงเทพ - กลางวัน
              </div>
              <div className="p-3 bg-white border-l-4 border-[#E86F2C] rounded">
                <strong>Action:</strong> คนเดินผ่านไปมาในถนนที่คึกคัก รถยนต์และรถจักรยานยนต์วิ่งผ่านไปมาอย่างไม่หยุดหย่อน
              </div>
              <div className="p-3 bg-white border-l-4 border-[#E86F2C] rounded">
                <strong>Character:</strong> สมชาย
              </div>
              <div className="p-3 bg-white border-l-4 border-[#E86F2C] rounded">
                <strong>Dialogue:</strong> สวัสดีครับ วันนี้อากาศดีจังเลย
              </div>
              <div className="p-3 bg-white border-l-4 border-[#E86F2C] rounded">
                <strong>Parenthetical:</strong> (ยิ้มแย้มแจ่มใส)
              </div>
              <div className="p-3 bg-white border-l-4 border-[#E86F2C] rounded">
                <strong>More Dialogue:</strong> ขอกาแฟร้อนหนึ่งแก้วครับ
              </div>
            </div>
          </div>

          {/* Test Actions Section */}
          <div className="mb-8 p-6 bg-gray-50 rounded-lg border">
            <h3 className="text-xl font-semibold mb-4">Test Actions</h3>
            <div className="flex flex-wrap gap-4">
              <button
                onClick={runBasicTest}
                className="px-6 py-3 bg-gradient-to-r from-[#E86F2C] to-[#1E4D3A] text-white rounded-lg hover:shadow-lg transition-all duration-200 transform hover:-translate-y-1"
              >
                🧪 Run Basic Thai Test
              </button>
              <button
                onClick={runAdvancedTest}
                className="px-6 py-3 bg-gradient-to-r from-[#E86F2C] to-[#1E4D3A] text-white rounded-lg hover:shadow-lg transition-all duration-200 transform hover:-translate-y-1"
              >
                🔬 Run Advanced Thai Test
              </button>
              <button
                onClick={runCanvasTest}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:shadow-lg transition-all duration-200 transform hover:-translate-y-1"
              >
                🎨 Run Canvas Thai Test
              </button>
              <button
                onClick={clearLogs}
                className="px-6 py-3 bg-gradient-to-r from-[#E86F2C] to-[#1E4D3A] text-white rounded-lg hover:shadow-lg transition-all duration-200 transform hover:-translate-y-1"
              >
                🧹 Clear Console
              </button>
            </div>
          </div>

          {/* Status Section */}
          <div className={`mb-6 p-4 rounded-lg border font-semibold ${getStatusClass()}`}>
            {status.message}
          </div>

          {/* Console Output Section */}
          <div className="p-6 bg-gray-50 rounded-lg border">
            <h3 className="text-xl font-semibold mb-4">Console Output</h3>
            <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm max-h-80 overflow-y-auto">
              {logs.map((log, index) => (
                <div key={index} className="mb-1">
                  {log}
                </div>
              ))}
            </div>
          </div>

          {/* Instructions */}
          <div className="mt-8 p-6 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="text-lg font-semibold text-blue-800 mb-3">📋 Test Instructions</h3>
            <ul className="text-blue-700 space-y-2">
              <li>• <strong>Basic Test:</strong> Tests simple Thai PDF export with basic formatting</li>
              <li>• <strong>Advanced Test:</strong> Tests full screenplay formatting with Thai support</li>
              <li>• <strong>Canvas Test:</strong> 🆕 Uses canvas rendering to convert Thai text to images for perfect display</li>
              <li>• <strong>Expected Result:</strong> Thai characters should display correctly in the downloaded PDF</li>
              <li>• <strong>Previous Issue:</strong> Thai text appeared as garbled/alien characters</li>
              <li>• <strong>Applied Fixes:</strong> Unicode normalization, font improvements, canvas-based rendering</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThaiPDFTestPage;
