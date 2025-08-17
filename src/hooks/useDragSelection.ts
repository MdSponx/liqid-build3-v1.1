import { useCallback, useEffect, useRef, useState } from 'react';
import { Block } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { NotificationData } from '../components/ClipboardNotification';

interface UseDragSelectionProps {
  blocks: Block[];
  selectedBlocks: Set<string>;
  setSelectedBlocks: (blocks: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
  containerRef: React.RefObject<HTMLElement>;
  blockRefs: React.RefObject<Record<string, HTMLDivElement | null>>;
  updateBlocks: (blocks: Block[]) => void;
  addToHistory: (blocks: Block[]) => void;
  setHasChanges?: (hasChanges: boolean) => void;
}

interface DragState {
  isDragging: boolean;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

export const useDragSelection = ({
  blocks,
  selectedBlocks,
  setSelectedBlocks,
  containerRef,
  blockRefs,
  updateBlocks,
  addToHistory,
  setHasChanges
}: UseDragSelectionProps) => {
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0
  });

  const [notification, setNotification] = useState<NotificationData | null>(null);

  const dragOverlayRef = useRef<HTMLDivElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isMouseDownOnContentEditable = useRef(false);
  const initialSelectedBlocks = useRef<Set<string>>(new Set());
  const clipboardRef = useRef<Block[]>([]);

  // Helper function to show notifications
  const showNotification = useCallback((type: NotificationData['type'], count: number) => {
    const newNotification: NotificationData = {
      id: uuidv4(),
      type,
      count,
      timestamp: Date.now()
    };
    setNotification(newNotification);
  }, []);

  // Handle notification dismissal
  const handleNotificationDismiss = useCallback((id: string) => {
    setNotification(prev => prev?.id === id ? null : prev);
  }, []);

  // Create and manage drag overlay element
  useEffect(() => {
    const overlay = document.createElement('div');
    overlay.id = 'drag-selection-overlay';
    overlay.style.display = 'none';
    overlay.style.position = 'fixed';
    overlay.style.border = '1px solid rgba(232, 111, 44, 0.5)';
    overlay.style.backgroundColor = 'rgba(232, 111, 44, 0.1)';
    overlay.style.pointerEvents = 'none';
    overlay.style.zIndex = '1000';
    document.body.appendChild(overlay);
    dragOverlayRef.current = overlay;

    return () => {
      if (overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
    };
  }, []);

  // Get blocks that intersect with the selection rectangle
  const getIntersectingBlocks = useCallback((rect: DOMRect): string[] => {
    if (!blockRefs.current) return [];

    const intersecting: string[] = [];
    
    Object.entries(blockRefs.current).forEach(([blockId, blockElement]) => {
      if (!blockElement) return;

      const blockRect = blockElement.getBoundingClientRect();
      
      // Check if rectangles intersect
      const intersects = !(
        rect.right < blockRect.left ||
        rect.left > blockRect.right ||
        rect.bottom < blockRect.top ||
        rect.top > blockRect.bottom
      );

      if (intersects) {
        intersecting.push(blockId);
      }
    });

    return intersecting;
  }, [blockRefs]);

  // Update drag overlay position and size
  const updateDragOverlay = useCallback(() => {
    if (!dragOverlayRef.current || !dragState.isDragging) return;

    const overlay = dragOverlayRef.current;
    const startX = Math.min(dragState.startX, dragState.currentX);
    const startY = Math.min(dragState.startY, dragState.currentY);
    const width = Math.abs(dragState.currentX - dragState.startX);
    const height = Math.abs(dragState.currentY - dragState.startY);

    overlay.style.left = `${startX}px`;
    overlay.style.top = `${startY}px`;
    overlay.style.width = `${width}px`;
    overlay.style.height = `${height}px`;
    overlay.style.display = 'block';

    // Get selection rectangle and find intersecting blocks
    const selectionRect = new DOMRect(startX, startY, width, height);
    const intersectingBlockIds = getIntersectingBlocks(selectionRect);

    // Update selected blocks based on intersection
    if (intersectingBlockIds.length > 0) {
      setSelectedBlocks(new Set(intersectingBlockIds));
    } else {
      // If no blocks intersect, maintain initial selection
      setSelectedBlocks(initialSelectedBlocks.current);
    }
  }, [dragState, getIntersectingBlocks, setSelectedBlocks]);

  // Handle mouse down - start drag selection
  const handleMouseDown = useCallback((e: MouseEvent) => {
    // Only handle left mouse button
    if (e.button !== 0) return;

    const target = e.target as HTMLElement;
    
    // Check if clicking on contenteditable element or its children
    const isContentEditableClick = target.hasAttribute('contenteditable') || 
                                  target.closest('[contenteditable="true"]');
    
    if (isContentEditableClick) {
      isMouseDownOnContentEditable.current = true;
      return;
    }

    // Check if clicking on a block container but not on contenteditable content
    const blockContainer = target.closest('.block-container');
    const isClickOnBlockMargin = blockContainer && !isContentEditableClick;

    // Only start drag selection if clicking in empty space or block margins
    if (!blockContainer || isClickOnBlockMargin) {
      e.preventDefault();
      
      // Store initial selection state
      initialSelectedBlocks.current = new Set(selectedBlocks);
      
      // Handle Ctrl/Cmd+Click for additive selection
      if (e.ctrlKey || e.metaKey) {
        // For additive selection, we'll modify the selection during drag
        // but start with current selection as base
      } else {
        // For normal drag selection, clear selection initially
        initialSelectedBlocks.current = new Set();
      }

      setDragState({
        isDragging: true,
        startX: e.clientX,
        startY: e.clientY,
        currentX: e.clientX,
        currentY: e.clientY
      });

      // Prevent text selection during drag
      document.body.style.userSelect = 'none';
      document.body.style.webkitUserSelect = 'none';
    }
  }, [selectedBlocks, setSelectedBlocks]);

  // Handle mouse move - update drag selection
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragState.isDragging) return;

    // Use requestAnimationFrame for smooth updates
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    animationFrameRef.current = requestAnimationFrame(() => {
      setDragState(prev => ({
        ...prev,
        currentX: e.clientX,
        currentY: e.clientY
      }));
    });
  }, [dragState.isDragging]);

  // Handle mouse up - end drag selection
  const handleMouseUp = useCallback((e: MouseEvent) => {
    if (isMouseDownOnContentEditable.current) {
      isMouseDownOnContentEditable.current = false;
      return;
    }

    if (dragState.isDragging) {
      // Hide drag overlay
      if (dragOverlayRef.current) {
        dragOverlayRef.current.style.display = 'none';
      }

      // Restore text selection
      document.body.style.userSelect = '';
      document.body.style.webkitUserSelect = '';

      setDragState(prev => ({
        ...prev,
        isDragging: false
      }));

      // Cancel any pending animation frame
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    }
  }, [dragState.isDragging]);

  // Copy selected blocks to clipboard
  const copySelectedBlocks = useCallback(() => {
    if (selectedBlocks.size === 0) return;

    const selectedBlocksArray = blocks.filter(block => selectedBlocks.has(block.id));
    clipboardRef.current = selectedBlocksArray.map(block => ({
      ...block,
      id: block.id // Keep original ID for reference, will generate new ID on paste
    }));

    // Show notification
    showNotification('copy', selectedBlocks.size);

    console.log('📋 Copied blocks to clipboard:', clipboardRef.current.length);
  }, [blocks, selectedBlocks, showNotification]);

  // Cut selected blocks to clipboard
  const cutSelectedBlocks = useCallback(() => {
    if (selectedBlocks.size === 0) return;

    const cutCount = selectedBlocks.size;

    // First copy the blocks (without notification)
    const selectedBlocksArray = blocks.filter(block => selectedBlocks.has(block.id));
    clipboardRef.current = selectedBlocksArray.map(block => ({
      ...block,
      id: block.id
    }));

    // Then remove them from the document
    const newBlocks = blocks.filter(block => !selectedBlocks.has(block.id));
    
    // Add to history before making changes
    addToHistory(blocks);
    
    // Update blocks
    updateBlocks(newBlocks);
    setHasChanges?.(true);
    
    // Clear selection
    setSelectedBlocks(new Set());

    // Show notification
    showNotification('cut', cutCount);

    console.log('✂️ Cut blocks to clipboard:', clipboardRef.current.length);
  }, [blocks, selectedBlocks, addToHistory, updateBlocks, setHasChanges, setSelectedBlocks, showNotification]);

  // Paste blocks from clipboard
  const pasteBlocks = useCallback(() => {
    if (clipboardRef.current.length === 0) return;

    // Find insertion point - after the last selected block, or at the end
    let insertionIndex = blocks.length;
    
    if (selectedBlocks.size > 0) {
      // Find the highest index of selected blocks
      const selectedIndices = Array.from(selectedBlocks)
        .map(blockId => blocks.findIndex(block => block.id === blockId))
        .filter(index => index !== -1)
        .sort((a, b) => b - a); // Sort descending
      
      if (selectedIndices.length > 0) {
        insertionIndex = selectedIndices[0] + 1;
      }
    }

    // Create new blocks with new IDs
    const newBlocks = clipboardRef.current.map(block => ({
      ...block,
      id: `${block.type}-${uuidv4()}`
    }));

    // Add to history before making changes
    addToHistory(blocks);

    // Insert the new blocks
    const updatedBlocks = [...blocks];
    updatedBlocks.splice(insertionIndex, 0, ...newBlocks);
    
    // Update blocks
    updateBlocks(updatedBlocks);
    setHasChanges?.(true);

    // Select the newly pasted blocks
    const newBlockIds = new Set(newBlocks.map(block => block.id));
    setSelectedBlocks(newBlockIds);

    // Show notification
    showNotification('paste', newBlocks.length);

    console.log('📄 Pasted blocks from clipboard:', newBlocks.length);
  }, [blocks, selectedBlocks, addToHistory, updateBlocks, setHasChanges, setSelectedBlocks, showNotification]);

  // Delete selected blocks
  const deleteSelectedBlocks = useCallback(() => {
    if (selectedBlocks.size === 0) return;

    const deleteCount = selectedBlocks.size;

    // Add to history before making changes
    addToHistory(blocks);

    // Remove selected blocks
    const newBlocks = blocks.filter(block => !selectedBlocks.has(block.id));
    
    // Update blocks
    updateBlocks(newBlocks);
    setHasChanges?.(true);
    
    // Clear selection
    setSelectedBlocks(new Set());

    // Show notification
    showNotification('delete', deleteCount);

    console.log('🗑️ Deleted selected blocks:', deleteCount);
  }, [blocks, selectedBlocks, addToHistory, updateBlocks, setHasChanges, setSelectedBlocks, showNotification]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Debug logging
    console.log('🎹 Keyboard event:', {
      key: e.key,
      ctrlKey: e.ctrlKey,
      metaKey: e.metaKey,
      selectedBlocks: selectedBlocks.size,
      clipboardCount: clipboardRef.current.length,
      target: e.target,
      activeElement: document.activeElement
    });

    // Only handle shortcuts when we have focus and not typing in contenteditable
    const activeElement = document.activeElement;
    const isTypingInEditor = activeElement && (
      activeElement.hasAttribute('contenteditable') ||
      activeElement.tagName === 'INPUT' ||
      activeElement.tagName === 'TEXTAREA' ||
      activeElement.closest('[contenteditable="true"]')
    );

    // More permissive check - allow clipboard operations even when some elements are focused
    const isClipboardOperation = (e.ctrlKey || e.metaKey) && ['c', 'x', 'v'].includes(e.key.toLowerCase());
    const shouldAllowClipboard = isClipboardOperation && !isTypingInEditor;

    console.log('🔍 Event analysis:', {
      isTypingInEditor,
      isClipboardOperation,
      shouldAllowClipboard,
      activeElementTag: activeElement?.tagName,
      hasContentEditable: activeElement?.hasAttribute('contenteditable')
    });

    // Ctrl/Cmd+A - Select all blocks
    if ((e.ctrlKey || e.metaKey) && e.key === 'a' && !isTypingInEditor) {
      console.log('📋 Select All triggered');
      e.preventDefault();
      const allBlockIds = blocks.map(block => block.id);
      setSelectedBlocks(new Set(allBlockIds));
      return;
    }

    // Ctrl/Cmd+C - Copy selected blocks
    if ((e.ctrlKey || e.metaKey) && e.key === 'c' && selectedBlocks.size > 0 && shouldAllowClipboard) {
      console.log('📋 Copy triggered for', selectedBlocks.size, 'blocks');
      e.preventDefault();
      e.stopPropagation();
      copySelectedBlocks();
      return;
    }

    // Ctrl/Cmd+X - Cut selected blocks
    if ((e.ctrlKey || e.metaKey) && e.key === 'x' && selectedBlocks.size > 0 && shouldAllowClipboard) {
      console.log('✂️ Cut triggered for', selectedBlocks.size, 'blocks');
      e.preventDefault();
      e.stopPropagation();
      cutSelectedBlocks();
      return;
    }

    // Ctrl/Cmd+V - Paste blocks
    if ((e.ctrlKey || e.metaKey) && e.key === 'v' && clipboardRef.current.length > 0 && shouldAllowClipboard) {
      console.log('📄 Paste triggered for', clipboardRef.current.length, 'blocks');
      e.preventDefault();
      e.stopPropagation();
      pasteBlocks();
      return;
    }

    // Delete/Backspace - Delete selected blocks
    if ((e.key === 'Delete' || e.key === 'Backspace') && selectedBlocks.size > 0 && !isTypingInEditor) {
      console.log('🗑️ Delete triggered for', selectedBlocks.size, 'blocks');
      e.preventDefault();
      deleteSelectedBlocks();
      return;
    }

    // Escape - Clear selection
    if (e.key === 'Escape') {
      console.log('🚫 Escape - clearing selection');
      setSelectedBlocks(new Set());
      
      // Also cancel any ongoing drag
      if (dragState.isDragging) {
        if (dragOverlayRef.current) {
          dragOverlayRef.current.style.display = 'none';
        }
        document.body.style.userSelect = '';
        document.body.style.webkitUserSelect = '';
        setDragState(prev => ({ ...prev, isDragging: false }));
      }
      return;
    }
  }, [blocks, selectedBlocks, setSelectedBlocks, dragState.isDragging, copySelectedBlocks, cutSelectedBlocks, pasteBlocks, deleteSelectedBlocks]);

  // Handle Ctrl+Click for individual block selection
  const handleBlockCtrlClick = useCallback((blockId: string, e: React.MouseEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      e.stopPropagation();
      
      setSelectedBlocks(prev => {
        const newSelection = new Set(prev);
        if (newSelection.has(blockId)) {
          newSelection.delete(blockId);
        } else {
          newSelection.add(blockId);
        }
        return newSelection;
      });
    }
  }, [setSelectedBlocks]);

  // Set up event listeners
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Use capture phase to intercept events before they reach child elements
    container.addEventListener('mousedown', handleMouseDown, { capture: true });
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    // Use capture phase for keyboard events to ensure they're handled before other listeners
    document.addEventListener('keydown', handleKeyDown, { capture: true });

    return () => {
      container.removeEventListener('mousedown', handleMouseDown, { capture: true });
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('keydown', handleKeyDown, { capture: true });
      
      // Clean up any pending animation frame
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [handleMouseDown, handleMouseMove, handleMouseUp, handleKeyDown, containerRef]);

  // Update drag overlay when drag state changes
  useEffect(() => {
    updateDragOverlay();
  }, [updateDragOverlay]);

  // Add drag-selecting class to blocks during drag
  useEffect(() => {
    if (!blockRefs.current) return;

    Object.values(blockRefs.current).forEach(blockElement => {
      if (blockElement) {
        if (dragState.isDragging) {
          blockElement.classList.add('drag-selecting');
        } else {
          blockElement.classList.remove('drag-selecting');
        }
      }
    });
  }, [dragState.isDragging, blockRefs]);

  return {
    isDragging: dragState.isDragging,
    selectedBlocks,
    handleBlockCtrlClick,
    copySelectedBlocks,
    cutSelectedBlocks,
    pasteBlocks,
    deleteSelectedBlocks,
    clipboardCount: clipboardRef.current.length,
    notification,
    handleNotificationDismiss
  };
};
