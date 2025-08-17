import { useCallback } from 'react';

export const useFocusController = () => {
  const moveToActionBlock = useCallback((currentBlockId: string) => {
    console.log('🎯 Moving focus to action block after:', currentBlockId);
    
    requestAnimationFrame(() => {
      // Find next action block
      const currentElement = document.querySelector(`[data-block-id="${currentBlockId}"]`);
      if (currentElement) {
        const nextBlock = currentElement.nextElementSibling as HTMLElement;
        if (nextBlock && nextBlock.getAttribute('data-block-type') === 'action') {
          const editableArea = nextBlock.querySelector('[contenteditable="true"]') as HTMLElement;
          if (editableArea) {
            editableArea.focus();
            
            // Place cursor at end of text
            const range = document.createRange();
            const selection = window.getSelection();
            
            if (selection && editableArea.firstChild) {
              range.selectNodeContents(editableArea);
              range.collapse(false); // collapse to end
              selection.removeAllRanges();
              selection.addRange(range);
            }
            
            console.log('✅ Focus moved to action block successfully');
          }
        }
      }
    });
  }, []);

  const ensureCursorPosition = useCallback((element: HTMLElement, position: 'start' | 'end' = 'end') => {
    requestAnimationFrame(() => {
      const range = document.createRange();
      const selection = window.getSelection();
      
      if (selection) {
        let textNode = element.firstChild;
        
        // Ensure we have a text node
        if (!textNode || textNode.nodeType !== Node.TEXT_NODE) {
          textNode = document.createTextNode('');
          element.innerHTML = '';
          element.appendChild(textNode);
        }
        
        const textLength = textNode.textContent?.length || 0;
        const cursorPosition = position === 'end' ? textLength : 0;
        
        range.setStart(textNode, cursorPosition);
        range.setEnd(textNode, cursorPosition);
        
        selection.removeAllRanges();
        selection.addRange(range);
      }
    });
  }, []);

  const focusBlockById = useCallback((blockId: string, cursorPosition: 'start' | 'end' = 'end') => {
    console.log('🎯 Focusing block:', blockId, 'cursor position:', cursorPosition);
    
    requestAnimationFrame(() => {
      const blockElement = document.querySelector(`[data-block-id="${blockId}"]`);
      if (blockElement) {
        const editableArea = blockElement.querySelector('[contenteditable="true"]') as HTMLElement;
        if (editableArea) {
          editableArea.focus();
          ensureCursorPosition(editableArea, cursorPosition);
          console.log('✅ Block focused successfully:', blockId);
        }
      }
    });
  }, [ensureCursorPosition]);

  return { 
    moveToActionBlock, 
    ensureCursorPosition, 
    focusBlockById 
  };
};
