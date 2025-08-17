import { useCallback, useEffect, useRef, useState } from 'react';

interface SceneHeadingSuggestion {
  label: string;
  description?: string;
  isNew?: boolean;
  count?: number;
  isDefault?: boolean;
  priority?: number;
}

interface UseSceneHeadingKeyboardControllerProps {
  blockId: string;
  suggestions: SceneHeadingSuggestion[];
  selectedIndex: number;
  setSelectedIndex: (index: number | ((prev: number) => number)) => void;
  onSelectSuggestion: (suggestion: string) => void;
  onClose: () => void;
  onCreateActionBlock: () => void;
}

export const useSceneHeadingKeyboardController = ({
  blockId,
  suggestions,
  selectedIndex,
  setSelectedIndex,
  onSelectSuggestion,
  onClose,
  onCreateActionBlock
}: UseSceneHeadingKeyboardControllerProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const processingRef = useRef(false);

  const handleKeyEvent = useCallback((e: KeyboardEvent) => {
    // Check if event is from active block
    const target = e.target as HTMLElement;
    const isFromActiveBlock = target.getAttribute('data-block-id') === blockId;
    const isFromSuggestions = target.closest('.scene-heading-suggestions-improved');
    
    if (!isFromActiveBlock && !isFromSuggestions) return;
    if (suggestions.length === 0) return;
    if (processingRef.current) return; // Prevent multiple processing

    console.log('🎯 Scene heading keyboard event:', e.key, 'from block:', blockId);

    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      
      console.log('🚀 Processing Enter key for scene heading selection');
      
      // Set processing lock
      processingRef.current = true;
      setIsProcessing(true);
      
      // Process synchronously
      if (suggestions[selectedIndex]) {
        const selectedSuggestion = suggestions[selectedIndex].label;
        console.log('🎯 Scene heading selected:', selectedSuggestion);
        
        onSelectSuggestion(selectedSuggestion);
        onClose();
        
        // Check if this is a complete scene heading (not just a prefix)
        const defaultPrefixes = ['INT.', 'EXT.', 'INT./EXT.', 'EXT./INT.', 'I/E.'];
        const isPrefixOnly = defaultPrefixes.some(prefix => 
          prefix === selectedSuggestion.trim()
        );
        
        if (!isPrefixOnly) {
          // Use requestAnimationFrame instead of setTimeout for precise timing
          requestAnimationFrame(() => {
            console.log('🚀 Creating action block after scene heading');
            onCreateActionBlock();
            processingRef.current = false;
            setIsProcessing(false);
          });
        } else {
          // For prefix-only selections, reset processing immediately
          processingRef.current = false;
          setIsProcessing(false);
        }
      }
      return;
    }
    
    // Handle Arrow keys
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      e.stopPropagation();
      console.log('🎯 Navigating suggestions: Arrow Down');
      setSelectedIndex(prev => (prev + 1) % suggestions.length);
    }
    
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      e.stopPropagation();
      console.log('🎯 Navigating suggestions: Arrow Up');
      setSelectedIndex(prev => prev === 0 ? suggestions.length - 1 : prev - 1);
    }
    
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      console.log('🎯 Closing suggestions: Escape key');
      onClose();
    }
  }, [blockId, suggestions, selectedIndex, setSelectedIndex, onSelectSuggestion, onClose, onCreateActionBlock]);

  useEffect(() => {
    // Use capture phase to catch events before other components
    document.addEventListener('keydown', handleKeyEvent, { capture: true });
    document.addEventListener('keypress', handleKeyEvent, { capture: true });
    
    return () => {
      document.removeEventListener('keydown', handleKeyEvent, { capture: true });
      document.removeEventListener('keypress', handleKeyEvent, { capture: true });
    };
  }, [handleKeyEvent]);

  // Cleanup processing state on unmount
  useEffect(() => {
    return () => {
      processingRef.current = false;
      setIsProcessing(false);
    };
  }, []);

  return { isProcessing };
};
