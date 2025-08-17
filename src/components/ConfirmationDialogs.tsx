// src/components/ConfirmationDialogs.tsx
import React from 'react';
import { AlertTriangle, Copy, Trash2, X } from 'lucide-react';

interface PasteConfirmationProps {
  show: boolean;
  pasteInfo: any;
  clipboardCount: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export const PasteConfirmationDialog: React.FC<PasteConfirmationProps> = ({
  show,
  pasteInfo,
  clipboardCount,
  onConfirm,
  onCancel
}) => {
  if (!show) return null;

  const getMessage = () => {
    switch (pasteInfo?.mode) {
      case 'replace':
        return `Replace ${pasteInfo.replaceBlocks?.length || 0} selected blocks with ${clipboardCount} new blocks?`;
      case 'after':
        return `Paste ${clipboardCount} blocks after the selected block?`;
      case 'before':
        return `Paste ${clipboardCount} blocks before the selected block?`;
      case 'inside':
        return `Paste content inside the block at cursor position?`;
      case 'end':
        return `Paste ${clipboardCount} blocks at the end of document?`;
      default:
        return `Paste ${clipboardCount} blocks?`;
    }
  };

  const getIcon = () => {
    switch (pasteInfo?.mode) {
      case 'replace':
        return <AlertTriangle className="text-yellow-500" size={24} />;
      default:
        return <Copy className="text-blue-500" size={24} />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg max-w-md w-full mx-4">
        <div className="p-6">
          <div className="flex items-center mb-4">
            {getIcon()}
            <h3 className="text-xl font-semibold ml-3 text-gray-900 dark:text-white">
              Confirm Paste
            </h3>
          </div>

          <p className="text-gray-600 dark:text-gray-300 mb-6">
            {getMessage()}
          </p>

          {pasteInfo?.mode === 'replace' && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 mb-4">
              <p className="text-yellow-800 dark:text-yellow-200 text-sm">
                ⚠️ This action will delete the selected blocks and cannot be undone (except via Undo)
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={onConfirm}
              className="flex-1 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors flex items-center justify-center"
            >
              <Copy size={18} className="mr-2" />
              Paste
            </button>
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center justify-center"
            >
              <X size={18} className="mr-2" />
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface DeleteConfirmationProps {
  show: boolean;
  count: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export const DeleteConfirmationDialog: React.FC<DeleteConfirmationProps> = ({
  show,
  count,
  onConfirm,
  onCancel
}) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg max-w-md w-full mx-4">
        <div className="p-6">
          <div className="flex items-center text-red-500 mb-4">
            <Trash2 size={24} />
            <h3 className="text-xl font-semibold ml-3 text-gray-900 dark:text-white">
              Confirm Delete
            </h3>
          </div>

          <p className="text-gray-600 dark:text-gray-300 mb-4">
            Are you sure you want to delete <strong>{count} blocks</strong>?
          </p>

          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-6">
            <p className="text-red-800 dark:text-red-200 text-sm">
              ⚠️ This action cannot be undone (except via Undo)
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onConfirm}
              className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors flex items-center justify-center"
            >
              <Trash2 size={18} className="mr-2" />
              Delete
            </button>
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center justify-center"
            >
              <X size={18} className="mr-2" />
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Selection Indicator Component
interface SelectionIndicatorProps {
  selectedCount: number;
  selectionMode: string;
  hasActiveTextCursor: boolean;
  clipboardCount: number;
}

export const SelectionIndicator: React.FC<SelectionIndicatorProps> = ({
  selectedCount,
  selectionMode,
  hasActiveTextCursor,
  clipboardCount
}) => {
  if (selectedCount === 0) return null;

  const getModeText = () => {
    switch (selectionMode) {
      case 'text': return 'Text Editing Mode';
      case 'block': return 'Block Selection Mode';
      case 'mixed': return 'Multiple Block Selection';
      default: return '';
    }
  };

  const getModeColor = () => {
    switch (selectionMode) {
      case 'text': return 'bg-blue-500';
      case 'block': return 'bg-orange-500';
      case 'mixed': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-40">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg px-4 py-3">
        <div className="flex items-center gap-4">
          {/* Selection Info */}
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${getModeColor()}`}></div>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {selectedCount} blocks selected
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              ({getModeText()})
            </span>
            {hasActiveTextCursor && (
              <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                cursor active
              </span>
            )}
          </div>

          {/* Keyboard Shortcuts */}
          <div className="border-l border-gray-200 dark:border-gray-700 pl-4">
            <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs">Ctrl+C</kbd>
                <span>Copy</span>
              </div>
              <div className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs">Ctrl+X</kbd>
                <span>Cut</span>
              </div>
              {clipboardCount > 0 && (
                <div className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs">Ctrl+V</kbd>
                  <span>Paste ({clipboardCount})</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs">Del</kbd>
                <span>Delete</span>
              </div>
              <div className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs">Esc</kbd>
                <span>Clear</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Paste Position Preview Component
interface PastePositionPreviewProps {
  pasteInfo: any;
  blockRefs: React.MutableRefObject<Record<string, HTMLElement | null>>;
  show: boolean;
}

export const PastePositionPreview: React.FC<PastePositionPreviewProps> = ({
  pasteInfo,
  blockRefs,
  show
}) => {
  if (!show || !pasteInfo || !pasteInfo.targetId) return null;

  const targetElement = blockRefs.current[pasteInfo.targetId];
  if (!targetElement) return null;

  const rect = targetElement.getBoundingClientRect();
  
  const getIndicatorStyle = () => {
    const baseStyle: React.CSSProperties = {
      position: 'fixed',
      left: rect.left - 4,
      right: rect.right + 4,
      zIndex: 30,
      pointerEvents: 'none'
    };

    switch (pasteInfo.mode) {
      case 'before':
        return {
          ...baseStyle,
          top: rect.top - 2,
          height: 4,
          background: '#E86F2C',
          borderRadius: '2px'
        };
      case 'after':
        return {
          ...baseStyle,
          top: rect.bottom - 2,
          height: 4,
          background: '#E86F2C',
          borderRadius: '2px'
        };
      case 'replace':
        return {
          ...baseStyle,
          top: rect.top - 2,
          bottom: window.innerHeight - rect.bottom - 2,
          background: 'rgba(232, 111, 44, 0.2)',
          border: '2px solid #E86F2C',
          borderRadius: '4px'
        };
      case 'inside':
        return {
          ...baseStyle,
          top: rect.top + 2,
          bottom: window.innerHeight - rect.bottom + 2,
          background: 'rgba(59, 130, 246, 0.1)',
          border: '2px dashed #3B82F6',
          borderRadius: '4px'
        };
      default:
        return { display: 'none' };
    }
  };

  const getIndicatorText = () => {
    switch (pasteInfo.mode) {
      case 'before': return 'Paste Before';
      case 'after': return 'Paste After';
      case 'replace': return `Replace ${pasteInfo.replaceBlocks?.length || 1} blocks`;
      case 'inside': return 'Paste at Cursor';
      default: return '';
    }
  };

  return (
    <>
      <div style={getIndicatorStyle()} />
      {pasteInfo.mode === 'replace' && (
        <div
          style={{
            position: 'fixed',
            left: rect.left,
            top: rect.top - 30,
            zIndex: 31,
            pointerEvents: 'none'
          }}
        >
          <div className="bg-orange-500 text-white px-2 py-1 rounded text-xs font-medium">
            {getIndicatorText()}
          </div>
        </div>
      )}
    </>
  );
};
