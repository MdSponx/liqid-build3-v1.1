import { useCallback } from 'react';
import { Block, BlockHandlers } from '../types';
import { useBlockFocusManagement } from './useBlockFocusManagement';
import { useBlockTypeUtilities } from './useBlockTypeUtilities';
import { useBlockSelection } from './useBlockSelection';
import { useEnterKeyLogic } from './useEnterKeyLogic';
import { useBackspaceKeyLogic } from './useBackspaceKeyLogic';
import { useTabKeyLogic } from './useTabKeyLogic';
import { useBlockFormatting } from './useBlockFormatting';
import { useBlockContentSync } from './useBlockContentSync';
import { useBlockKeyboardInput } from './useBlockKeyboardInput';
import { v4 as uuidv4 } from 'uuid';

interface UseBlockHandlersImprovedProps {
  blocks: Block[];
  activeBlock: string | null;
  textContent: Record<string, string>;
  selectedBlocks: Set<string>;
  blockRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
  addToHistory: (blocks: Block[]) => void;
  updateBlocks: (blocks: Block[]) => void;
  setSelectedBlocks: (blocks: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
  setHasChanges?: (hasChanges: boolean) => void;
  projectId?: string;
  screenplayId?: string;
  onSceneHeadingUpdate?: () => Promise<void>;
  setActiveBlock?: (blockId: string) => void;
}

export const useBlockHandlersImproved = (
  {
    blocks,
    activeBlock,
    textContent,
    selectedBlocks,
    blockRefs,
    addToHistory,
    updateBlocks,
    setSelectedBlocks,
    setHasChanges,
    projectId,
    screenplayId,
    onSceneHeadingUpdate,
    setActiveBlock
  }: UseBlockHandlersImprovedProps
): BlockHandlers => {
  // Initialize focus management
  const { setFocusWithRetry } = useBlockFocusManagement({ blockRefs });

  // Initialize block type utilities
  const { isCharacterBlockAfterDialogue } = useBlockTypeUtilities({ blocks });

  // Initialize block selection
  const { 
    clearSelection,
    handleBlockClick,
    handleBlockDoubleClick,
    handleMouseDown
  } = useBlockSelection({ 
    blocks, 
    selectedBlocks, 
    setSelectedBlocks 
  });

  // Enhanced action block creation after scene heading
  const createActionBlockAfterSceneHeading = useCallback(() => {
    console.log('🎬 Creating action block after scene heading:', activeBlock);
    
    if (!activeBlock) return;
    
    const sceneHeadingIndex = blocks.findIndex((b) => b.id === activeBlock);
    if (sceneHeadingIndex === -1) return;

    // Check if next block is already an action block
    const nextBlock = blocks[sceneHeadingIndex + 1];
    if (nextBlock && nextBlock.type === 'action') {
      console.log('✅ Action block already exists, focusing it');
      // Focus existing action block
      requestAnimationFrame(() => {
        const actionElement = document.querySelector(`[data-block-id="${nextBlock.id}"]`);
        if (actionElement) {
          const editableArea = actionElement.querySelector('[contenteditable="true"]') as HTMLElement;
          if (editableArea) {
            editableArea.focus();
            console.log('✅ Focused existing action block');
          }
        }
      });
      return nextBlock.id;
    }

    // Create new action block
    const newActionBlock: Block = {
      id: `action-${uuidv4()}`,
      type: 'action',
      content: ''
    };

    console.log('📝 Inserting new action block:', newActionBlock.id);

    // Insert the new block
    const newBlocks = [...blocks];
    newBlocks.splice(sceneHeadingIndex + 1, 0, newActionBlock);

    // Update state
    updateBlocks(newBlocks);
    setHasChanges?.(true);

    // Focus the new action block
    requestAnimationFrame(() => {
      const newElement = document.querySelector(`[data-block-id="${newActionBlock.id}"]`);
      if (newElement) {
        const editableArea = newElement.querySelector('[contenteditable="true"]') as HTMLElement;
        if (editableArea) {
          editableArea.focus();
          console.log('✅ Focused new action block');
        }
      }
    });

    return newActionBlock.id;
  }, [activeBlock, blocks, updateBlocks, setHasChanges]);

  // Initialize block formatting
  const { handleFormatChange } = useBlockFormatting({
    blocks,
    activeBlock,
    updateBlocks,
    addToHistory,
    setHasChanges,
    blockRefs,
    setActiveBlock
  });

  // Initialize Enter key logic
  const { handleEnterKey } = useEnterKeyLogic({
    blocks,
    updateBlocks,
    addToHistory,
    setHasChanges,
    blockRefs,
    setFocusWithRetry,
    createActionBlockAfterSceneHeading
  });

  // Initialize Backspace key logic
  const { handleBackspaceInEmptyBlock } = useBackspaceKeyLogic({
    blocks,
    updateBlocks,
    addToHistory,
    setHasChanges,
    blockRefs
  });

  // Initialize Tab key logic
  const { handleTabKey } = useTabKeyLogic({
    blocks,
    activeBlock,
    handleFormatChange
  });

  // Initialize content sync
  const { handleContentChange } = useBlockContentSync({
    blocks,
    updateBlocks,
    addToHistory,
    setHasChanges,
    blockRefs,
    projectId,
    screenplayId,
    onSceneHeadingUpdate
  });

  // Initialize keyboard input handling
  const { handleKeyDown } = useBlockKeyboardInput({
    blocks,
    activeBlock,
    handleEnterKey,
    handleTabKey,
    handleBackspaceInEmptyBlock,
    setHasChanges,
    selectedBlocks,
    setSelectedBlocks
  });

  return {
    handleContentChange,
    handleEnterKey,
    handleKeyDown,
    handleBlockClick,
    handleBlockDoubleClick,
    handleFormatChange,
    handleMouseDown,
    clearSelection,
    isCharacterBlockAfterDialogue,
    createActionBlockAfterSceneHeading
  };
};
