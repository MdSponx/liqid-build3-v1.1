// src/hooks/useEnhancedSelection.ts
import { useState, useCallback, useRef, useEffect } from 'react';
import type { Block } from '../types';

// Enhanced types for selection management
interface SelectionState {
  selectedBlocks: Set<string>;
  pastePosition: 'before' | 'after' | 'replace' | 'inside' | 'end' | null;
  pasteTargetId: string | null;
  hasActiveTextCursor: boolean;
  selectionMode: 'text' | 'block' | 'mixed' | 'normal';
  lastClickedBlockId: string | null;
}

interface PastePositionInfo {
  mode: 'before' | 'after' | 'replace' | 'inside' | 'end';
  targetId?: string;
  position?: number;
  replaceBlocks?: string[];
}

interface CursorPosition {
  blockId: string;
  offset: number;
}

export const useEnhancedSelection = (
  blocks: Block[],
  blockRefs: React.MutableRefObject<Record<string, HTMLElement | null>>,
  updateBlocks: (blocks: Block[]) => void,
  addToHistory: (blocks: Block[], description: string) => void,
  setHasChanges: (hasChanges: boolean) => void
) => {
  // Enhanced selection state
  const [selectionState, setSelectionState] = useState<SelectionState>({
    selectedBlocks: new Set(),
    pastePosition: null,
    pasteTargetId: null,
    hasActiveTextCursor: false,
    selectionMode: 'normal',
    lastClickedBlockId: null
  });

  // Confirmation dialogs state
  const [showPasteConfirmation, setShowPasteConfirmation] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [confirmationData, setConfirmationData] = useState<any>(null);

  // Clipboard reference
  const clipboardRef = useRef<Block[]>([]);

  // Clear all text cursors and selections
  const clearAllTextCursors = useCallback(() => {
    document.querySelectorAll('[contenteditable="true"]').forEach(el => {
      if (el === document.activeElement) {
        (el as HTMLElement).blur();
      }
    });

    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
    }
  }, []);

  // Get current cursor position
  const getCurrentCursorPosition = useCallback((): CursorPosition | null => {
    const activeElement = document.activeElement;
    if (!activeElement?.hasAttribute('contenteditable')) return null;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;

    const range = selection.getRangeAt(0);
    const blockId = Object.keys(blockRefs.current).find(
      id => blockRefs.current[id] === activeElement
    );

    if (!blockId) return null;

    return {
      blockId,
      offset: range.startOffset
    };
  }, [blockRefs]);

  // Determine keyboard context
  const determineKeyboardContext = useCallback(() => {
    const { selectedBlocks, hasActiveTextCursor } = selectionState;
    
    if (selectedBlocks.size === 0) return 'normal';
    if (selectedBlocks.size === 1 && hasActiveTextCursor) return 'text-editing';
    if (selectedBlocks.size === 1 && !hasActiveTextCursor) return 'block-selection';
    if (selectedBlocks.size > 1) return 'mixed-selection';
    return 'normal';
  }, [selectionState]);

  // Smart paste position detection
  const determinePastePosition = useCallback((
    selectedBlocks: Set<string>,
    lastClickedBlockId: string | null,
    cursorPosition: CursorPosition | null
  ): PastePositionInfo => {
    
    // Case 1: Single block with text cursor
    if (selectedBlocks.size === 1 && cursorPosition) {
      return {
        mode: 'inside',
        targetId: cursorPosition.blockId,
        position: cursorPosition.offset
      };
    }
    
    // Case 2: Multiple blocks selected
    if (selectedBlocks.size > 1) {
      const sortedBlocks = blocks
        .filter(b => selectedBlocks.has(b.id))
        .sort((a, b) => blocks.indexOf(a) - blocks.indexOf(b));
      
      return {
        mode: 'replace',
        targetId: sortedBlocks[0].id,
        replaceBlocks: sortedBlocks.map(b => b.id)
      };
    }
    
    // Case 3: Single block without cursor (block selected)
    if (selectedBlocks.size === 1) {
      const blockId = Array.from(selectedBlocks)[0];
      return {
        mode: 'after',
        targetId: blockId
      };
    }
    
    // Case 4: No selection - use last known position
    if (lastClickedBlockId) {
      return {
        mode: 'after',
        targetId: lastClickedBlockId
      };
    }
    
    // Fallback: end of document
    return {
      mode: 'end'
    };
  }, [blocks]);

  // Clear selection and update mode
  const clearSelection = useCallback(() => {
    clearAllTextCursors();
    setSelectionState(prev => ({
      ...prev,
      selectedBlocks: new Set(),
      pastePosition: null,
      pasteTargetId: null,
      hasActiveTextCursor: false,
      selectionMode: 'normal'
    }));
  }, [clearAllTextCursors]);

  // Handle block click with enhanced logic
  const handleBlockClick = useCallback((blockId: string, e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const isContentEditableClick = target.hasAttribute('contenteditable') || 
                                  target.closest('[contenteditable="true"]');

    if (e.ctrlKey || e.metaKey) {
      // Additive selection
      setSelectionState(prev => {
        const newSelection = new Set(prev.selectedBlocks);
        if (newSelection.has(blockId)) {
          newSelection.delete(blockId);
        } else {
          newSelection.add(blockId);
        }
        
        // Clear text cursor if multiple blocks selected
        if (newSelection.size > 1) {
          setTimeout(clearAllTextCursors, 0);
        }

        return {
          ...prev,
          selectedBlocks: newSelection,
          lastClickedBlockId: blockId,
          hasActiveTextCursor: Boolean(newSelection.size === 1 && isContentEditableClick),
          selectionMode: newSelection.size > 1 ? 'mixed' : 
                        newSelection.size === 1 && isContentEditableClick ? 'text' : 'block'
        };
      });
    } else if (e.shiftKey && selectionState.lastClickedBlockId) {
      // Range selection
      const lastIndex = blocks.findIndex(b => b.id === selectionState.lastClickedBlockId);
      const currentIndex = blocks.findIndex(b => b.id === blockId);
      const [start, end] = lastIndex < currentIndex ? [lastIndex, currentIndex] : [currentIndex, lastIndex];
      
      const rangeSelection = new Set<string>();
      for (let i = start; i <= end; i++) {
        rangeSelection.add(blocks[i].id);
      }
      
      setTimeout(clearAllTextCursors, 0);
      
      setSelectionState(prev => ({
        ...prev,
        selectedBlocks: rangeSelection,
        hasActiveTextCursor: false,
        selectionMode: 'mixed'
      }));
    } else {
      // Single selection
      setSelectionState(prev => ({
        ...prev,
        selectedBlocks: new Set([blockId]),
        lastClickedBlockId: blockId,
        hasActiveTextCursor: Boolean(isContentEditableClick),
        selectionMode: isContentEditableClick ? 'text' : 'block'
      }));
    }
  }, [blocks, selectionState.lastClickedBlockId, clearAllTextCursors]);

  // Copy selected blocks
  const copySelectedBlocks = useCallback(() => {
    if (selectionState.selectedBlocks.size === 0) return;

    const selectedBlocksArray = blocks.filter(block => 
      selectionState.selectedBlocks.has(block.id)
    );
    
    clipboardRef.current = selectedBlocksArray.map(block => ({
      ...block,
      id: `${block.id}-copy-${Date.now()}`
    }));

    console.log('📋 Copied', selectedBlocksArray.length, 'blocks to clipboard');
  }, [blocks, selectionState.selectedBlocks]);

  // Cut selected blocks
  const cutSelectedBlocks = useCallback(() => {
    copySelectedBlocks();
    
    // Find next focus position before deleting
    const selectedIds = Array.from(selectionState.selectedBlocks);
    const firstSelectedIndex = blocks.findIndex(b => selectedIds.includes(b.id));
    
    addToHistory(blocks, `Cut ${selectedIds.length} blocks`);
    const newBlocks = blocks.filter(block => !selectedIds.includes(block.id));
    updateBlocks(newBlocks);
    setHasChanges(true);
    
    clearSelection();
    
    // Focus next available block
    if (newBlocks.length > 0) {
      const nextFocusIndex = Math.min(firstSelectedIndex, newBlocks.length - 1);
      const nextFocusId = newBlocks[nextFocusIndex].id;
      
      setTimeout(() => {
        const element = blockRefs.current[nextFocusId];
        if (element) {
          element.focus();
        }
      }, 50);
    }

    console.log('✂️ Cut', selectedIds.length, 'blocks');
  }, [copySelectedBlocks, selectionState.selectedBlocks, blocks, addToHistory, updateBlocks, setHasChanges, clearSelection, blockRefs]);

  // Perform paste operation
  const performPaste = useCallback((pasteInfo: PastePositionInfo) => {
    if (clipboardRef.current.length === 0) return;

    addToHistory(blocks, `Paste ${clipboardRef.current.length} blocks`);
    let newBlocks = [...blocks];

    switch (pasteInfo.mode) {
      case 'inside':
        // Paste content inside block at cursor position
        if (pasteInfo.targetId && pasteInfo.position !== undefined) {
          const targetBlock = newBlocks.find(b => b.id === pasteInfo.targetId);
          if (targetBlock && clipboardRef.current.length === 1) {
            const pasteContent = clipboardRef.current[0].content;
            const currentContent = targetBlock.content;
            const newContent = 
              currentContent.slice(0, pasteInfo.position) + 
              pasteContent + 
              currentContent.slice(pasteInfo.position);
            
            targetBlock.content = newContent;
          }
        }
        break;

      case 'replace':
        // Replace selected blocks
        if (pasteInfo.replaceBlocks) {
          const firstReplaceIndex = newBlocks.findIndex(b => 
            pasteInfo.replaceBlocks!.includes(b.id)
          );
          
          // Remove replaced blocks
          newBlocks = newBlocks.filter(b => !pasteInfo.replaceBlocks!.includes(b.id));
          
          // Insert new blocks at the same position
          newBlocks.splice(firstReplaceIndex, 0, ...clipboardRef.current);
        }
        break;

      case 'after':
        // Insert after target block
        if (pasteInfo.targetId) {
          const targetIndex = newBlocks.findIndex(b => b.id === pasteInfo.targetId);
          if (targetIndex !== -1) {
            newBlocks.splice(targetIndex + 1, 0, ...clipboardRef.current);
          }
        }
        break;

      case 'before':
        // Insert before target block
        if (pasteInfo.targetId) {
          const targetIndex = newBlocks.findIndex(b => b.id === pasteInfo.targetId);
          if (targetIndex !== -1) {
            newBlocks.splice(targetIndex, 0, ...clipboardRef.current);
          }
        }
        break;

      case 'end':
        // Append to end
        newBlocks.push(...clipboardRef.current);
        break;
    }

    updateBlocks(newBlocks);
    setHasChanges(true);
    clearSelection();

    console.log('📄 Pasted', clipboardRef.current.length, 'blocks');
  }, [blocks, addToHistory, updateBlocks, setHasChanges, clearSelection]);

  // Handle paste with confirmation
  const handlePasteShortcut = useCallback((e: KeyboardEvent) => {
    if (!((e.ctrlKey || e.metaKey) && e.key === 'v')) return;
    if (clipboardRef.current.length === 0) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const pasteInfo = determinePastePosition(
      selectionState.selectedBlocks,
      selectionState.lastClickedBlockId,
      getCurrentCursorPosition()
    );
    
    // Show confirmation for complex operations
    if (pasteInfo.mode === 'replace' || selectionState.selectedBlocks.size > 1) {
      setConfirmationData({
        type: 'paste',
        pasteInfo,
        clipboardCount: clipboardRef.current.length
      });
      setShowPasteConfirmation(true);
    } else {
      // Direct paste for simple operations
      performPaste(pasteInfo);
    }
  }, [selectionState, getCurrentCursorPosition, determinePastePosition, performPaste]);

  // Handle delete with confirmation
  const handleDeleteShortcut = useCallback((e: KeyboardEvent) => {
    if (!['Delete', 'Backspace'].includes(e.key)) return;
    if (selectionState.selectedBlocks.size === 0) return;
    
    const context = determineKeyboardContext();
    if (context === 'text-editing') return; // Allow normal text editing
    
    e.preventDefault();
    e.stopPropagation();
    
    const selectedIds = Array.from(selectionState.selectedBlocks);
    
    // Show confirmation for multiple deletes
    if (selectedIds.length > 1) {
      setConfirmationData({
        type: 'delete',
        blockIds: selectedIds,
        count: selectedIds.length
      });
      setShowDeleteConfirmation(true);
    } else {
      // Single block delete - immediate
      performDelete(selectedIds);
    }
  }, [selectionState, determineKeyboardContext]);

  // Perform delete operation
  const performDelete = useCallback((blockIds: string[]) => {
    // Find position to focus after delete
    const firstBlockIndex = blocks.findIndex(b => blockIds.includes(b.id));
    const remainingBlocks = blocks.filter(block => !blockIds.includes(block.id));
    
    addToHistory(blocks, `Delete ${blockIds.length} blocks`);
    updateBlocks(remainingBlocks);
    setHasChanges(true);
    clearSelection();
    
    // Set focus to appropriate block
    if (remainingBlocks.length > 0) {
      const nextFocusIndex = Math.min(firstBlockIndex, remainingBlocks.length - 1);
      const nextFocusId = remainingBlocks[nextFocusIndex].id;
      
      setTimeout(() => {
        const element = blockRefs.current[nextFocusId];
        if (element) {
          element.focus();
          // Place cursor at start
          const range = document.createRange();
          const selection = window.getSelection();
          if (element.firstChild) {
            range.setStart(element.firstChild, 0);
            range.setEnd(element.firstChild, 0);
            selection?.removeAllRanges();
            selection?.addRange(range);
          }
        }
      }, 50);
    }

    console.log('🗑️ Deleted', blockIds.length, 'blocks');
  }, [blocks, addToHistory, updateBlocks, setHasChanges, clearSelection, blockRefs]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const context = determineKeyboardContext();
    
    // Global shortcuts that work in all contexts
    if ((e.ctrlKey || e.metaKey) && e.key === 'a' && context !== 'text-editing') {
      e.preventDefault();
      const allBlockIds = blocks.map(block => block.id);
      setSelectionState(prev => ({
        ...prev,
        selectedBlocks: new Set(allBlockIds),
        selectionMode: 'mixed',
        hasActiveTextCursor: false
      }));
      clearAllTextCursors();
      return;
    }

    // Escape to clear selection
    if (e.key === 'Escape') {
      e.preventDefault();
      clearSelection();
      return;
    }

    // Context-specific shortcuts
    switch (context) {
      case 'block-selection':
      case 'mixed-selection':
        // Copy
        if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
          e.preventDefault();
          e.stopPropagation();
          copySelectedBlocks();
          return;
        }

        // Cut
        if ((e.ctrlKey || e.metaKey) && e.key === 'x') {
          e.preventDefault();
          e.stopPropagation();
          cutSelectedBlocks();
          return;
        }

        // Paste
        handlePasteShortcut(e);

        // Delete
        handleDeleteShortcut(e);
        break;

      case 'text-editing':
        // Only handle paste in text editing mode
        if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
          handlePasteShortcut(e);
        }
        break;
    }
  }, [
    determineKeyboardContext, 
    blocks, 
    clearSelection, 
    clearAllTextCursors, 
    copySelectedBlocks, 
    cutSelectedBlocks, 
    handlePasteShortcut, 
    handleDeleteShortcut
  ]);

  // Update selection mode when blocks change
  useEffect(() => {
    if (selectionState.selectedBlocks.size > 1) {
      clearAllTextCursors();
      setSelectionState(prev => ({
        ...prev,
        hasActiveTextCursor: false,
        selectionMode: 'mixed'
      }));
    }
  }, [selectionState.selectedBlocks.size, clearAllTextCursors]);

  // Set up keyboard event listener
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [handleKeyDown]);

  return {
    // State
    selectionState,
    showPasteConfirmation,
    showDeleteConfirmation,
    confirmationData,
    clipboardRef,

    // Actions
    setSelectionState,
    clearSelection,
    handleBlockClick,
    copySelectedBlocks,
    cutSelectedBlocks,
    performPaste,
    performDelete,

    // Confirmation handlers
    confirmPaste: () => {
      if (confirmationData?.pasteInfo) {
        performPaste(confirmationData.pasteInfo);
      }
      setShowPasteConfirmation(false);
      setConfirmationData(null);
    },
    cancelPaste: () => {
      setShowPasteConfirmation(false);
      setConfirmationData(null);
    },
    confirmDelete: () => {
      if (confirmationData?.blockIds) {
        performDelete(confirmationData.blockIds);
      }
      setShowDeleteConfirmation(false);
      setConfirmationData(null);
    },
    cancelDelete: () => {
      setShowDeleteConfirmation(false);
      setConfirmationData(null);
    },

    // Utilities
    getCurrentCursorPosition,
    determinePastePosition,
    determineKeyboardContext
  };
};
