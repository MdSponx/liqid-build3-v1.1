import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import type { BlockComponentProps, CharacterDocument, ElementDocument, Comment } from '../types';
import { getBlockStyle, getBlockMargin } from '../utils/styleUtils';
import SceneHeadingSuggestionsImproved from './SceneHeadingSuggestionsImproved';
import TransitionSuggestions from './TransitionSuggestions';
import ShotTypeSuggestions from './ShotTypeSuggestions';
import CharacterSuggestions from './CharacterSuggestions';
import ElementSuggestions from './ElementSuggestions';
import FloatingContextMenu from './ScreenplayEditor/FloatingContextMenu';
import CommentInputPopup from './ScreenplayEditor/CommentInputPopup';
import CommentTooltip from './ScreenplayEditor/CommentTooltip';
import { MenuAction } from './ScreenplayEditor/ContextMenuIcons';
import { v4 as uuidv4 } from 'uuid';
import { Timestamp } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';

interface ExtendedBlockComponentProps extends BlockComponentProps {
  projectCharacters?: CharacterDocument[];
  projectElements?: ElementDocument[];
  projectId?: string;
  screenplayId?: string;
  projectUniqueSceneHeadings?: any[];
  onEnterAction?: () => void;
  isProcessingSuggestion?: boolean;
  setIsProcessingSuggestion?: (processing: boolean) => void;
  isCharacterBlockAfterDialogue?: (blockId: string) => boolean;
  isSceneSelectionActive?: boolean;
  addComment?: (comment: Comment) => Promise<boolean>;
  activeCommentId?: string | null;
  comments?: Comment[];
  onCommentSelect?: (comment: Comment) => void;
  showCommentsPanel?: boolean;
  setShowCommentsPanel?: (show: boolean) => void;
}

const BlockComponentImproved: React.FC<ExtendedBlockComponentProps> = ({
  block,
  isDarkMode,
  onContentChange,
  onKeyDown,
  onFocus,
  onClick,
  onMouseDown,
  onDoubleClick,
  isSelected,
  isActive,
  blockRefs,
  projectCharacters = [],
  projectElements = [],
  projectId,
  screenplayId,
  projectUniqueSceneHeadings = [],
  onEnterAction,
  isProcessingSuggestion,
  setIsProcessingSuggestion,
  isCharacterBlockAfterDialogue,
  isSceneSelectionActive = false,
  addComment,
  activeCommentId,
  comments = [],
  onCommentSelect,
  showCommentsPanel,
  setShowCommentsPanel,
}) => {
  const { user } = useAuth(); // Get the current user from auth context
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionsPosition, setSuggestionsPosition] = useState<{ x: number; y: number } | null>(null);
  const [suggestionType, setSuggestionType] = useState<'scene' | 'transition' | 'shot' | 'character' | 'element' | null>(null);
  const [currentInput, setCurrentInput] = useState('');
  const [contentElement, setContentElement] = useState<HTMLDivElement | null>(null);
  const [isProcessingSelection, setIsProcessingSelection] = useState(false);
  const ignoreBlurRef = useRef(false);
  const suggestionClosingRef = useRef(false);
  const portalRoot = typeof document !== 'undefined' ? document.getElementById('portal-root') : null;

  // New state for context menu
  const [menuState, setMenuState] = useState<{ top: number; left: number } | null>(null);
  const [selectedRange, setSelectedRange] = useState<Range | null>(null);
  const [selectedText, setSelectedText] = useState<string>('');
  
  // New state for comment popup - decoupled from menuState
  const [commentPopupState, setCommentPopupState] = useState<{ top: number; left: number } | null>(null);

  // New state for hover tooltip
  const [tooltipState, setTooltipState] = useState<{
    visible: boolean;
    position: { x: number; y: number };
    comments: Comment[];
  }>({
    visible: false,
    position: { x: 0, y: 0 },
    comments: []
  });
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Enhanced action block creation after scene heading completion
  const handleEnterActionCreation = useCallback(() => {
    if (onEnterAction) {
      onEnterAction();
    }
  }, [onEnterAction]);

  // Function to check if the current scene heading is new
  const isNewSceneHeading = useCallback(() => {
    if (block.type !== 'scene-heading') return false;
    
    const trimmedInput = block.content.trim();
    if (!trimmedInput) return false;
    
    const inputUpper = trimmedInput.toUpperCase();
    
    // Default scene type suggestions
    const defaultSceneTypes = [
      { label: 'INT. ' },
      { label: 'EXT. ' },
      { label: 'INT./EXT. ' },
      { label: 'EXT./INT. ' },
      { label: 'I/E. ' }
    ];
    
    // Create suggestions array like dropdown does
    const allLabelsUpper = new Set();
    
    // Add default scene types
    defaultSceneTypes.forEach(type => {
      allLabelsUpper.add(type.label.toUpperCase().trim());
    });
    
    // Add existing scene headings
    projectUniqueSceneHeadings.forEach(heading => {
      allLabelsUpper.add(heading.text.toUpperCase().trim());
    });
    
    // Check exact match
    const exactMatch = allLabelsUpper.has(inputUpper);
    
    // Check valid prefix
    const hasValidPrefix = /^(INT\.|EXT\.|INT\.\/EXT\.|EXT\.\/INT\.|I\/E\.)/i.test(trimmedInput);
    
    // Check if it's only a prefix in defaults
    const isOnlyPrefixInDefaults = defaultSceneTypes.some(d => d.label.toUpperCase().trim() === inputUpper);
    
    // Show NEW badge if input exists, no exact match, has valid prefix, and not just a default prefix
    const shouldShowNew = trimmedInput && !exactMatch && hasValidPrefix && !isOnlyPrefixInDefaults;
    
    // Show when suggestions are active OR when the block is active
    return shouldShowNew && (showSuggestions || isActive);
  }, [block.type, block.content, projectUniqueSceneHeadings, showSuggestions, isActive]);

  const updateSuggestionsPosition = useCallback(() => {
    if (!contentElement) return;

    const blockRect = contentElement.getBoundingClientRect();
    
    // Use viewport-relative coordinates
    setSuggestionsPosition({
      x: blockRect.left,
      y: blockRect.bottom
    });
  }, [contentElement]);

  // Enhanced suggestions closing
  const closeSuggestions = useCallback(() => {
    setShowSuggestions(false);
    setSuggestionType(null);
    setSuggestionsPosition(null);
    suggestionClosingRef.current = true;
    
    // Reset flag after short delay
    setTimeout(() => {
      suggestionClosingRef.current = false;
    }, 100);
  }, []);

  // Enhanced suggestions management based on block state
  useEffect(() => {
    // Don't show suggestions if scene selection is active
    if (isSceneSelectionActive) {
      setShowSuggestions(false);
      return;
    }
    
    if (isActive && !suggestionClosingRef.current) {
      const content = block.content;
      
      if (block.type === 'scene-heading') {
        updateSuggestionsPosition();
        setSuggestionType('scene');
        setCurrentInput(content);
        setShowSuggestions(true);
      } else if (block.type === 'transition' && !content.trim()) {
        updateSuggestionsPosition();
        setSuggestionType('transition');
        setShowSuggestions(true);
      } else if (block.type === 'shot' && !content.trim()) {
        updateSuggestionsPosition();
        setSuggestionType('shot');
        setShowSuggestions(true);
      } else if (block.type === 'character') {
        // NEW BEHAVIOR: Don't show character suggestions immediately for blocks created after dialogue
        const isAfterDialogue = isCharacterBlockAfterDialogue?.(block.id) ?? false;
        
        if (!isAfterDialogue) {
          // Original behavior for character blocks not created after dialogue
          updateSuggestionsPosition();
          setSuggestionType('character');
          setCurrentInput(content);
          setShowSuggestions(true);
        } else {
          // New behavior: Don't show suggestions immediately for blocks created after dialogue
          updateSuggestionsPosition();
          setSuggestionType('character');
          setCurrentInput(content);
          setShowSuggestions(false); // Don't show immediately
        }
      } else {
        setShowSuggestions(false);
      }
    } else {
      setShowSuggestions(false);
    }
  }, [block.type, block.content, isActive, updateSuggestionsPosition, isCharacterBlockAfterDialogue, isSceneSelectionActive]);

  // Update suggestion position on scroll
  useEffect(() => {
    const handleScroll = () => {
      if (isActive && showSuggestions) {
        updateSuggestionsPosition();
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [isActive, showSuggestions, updateSuggestionsPosition]);

  const handleFocus = useCallback(() => {
    onFocus(block.id);
    
    // Don't open suggestions if just closed or if scene selection is active
    if (suggestionClosingRef.current || isSceneSelectionActive) return;
    
    if (block.type === 'scene-heading') {
      updateSuggestionsPosition();
      setSuggestionType('scene');
      setCurrentInput(block.content);
      setShowSuggestions(true);
    } else if (block.type === 'transition' && !block.content.trim()) {
      updateSuggestionsPosition();
      setSuggestionType('transition');
      setShowSuggestions(true);
    } else if (block.type === 'shot' && !block.content.trim()) {
      updateSuggestionsPosition();
      setSuggestionType('shot');
      setShowSuggestions(true);
    } else if (block.type === 'character') {
      // NEW BEHAVIOR: Don't show character suggestions immediately for blocks created after dialogue
      const isAfterDialogue = isCharacterBlockAfterDialogue?.(block.id) ?? false;
      
      updateSuggestionsPosition();
      setSuggestionType('character');
      setCurrentInput(block.content);
      
      if (!isAfterDialogue) {
        // Original behavior for character blocks not created after dialogue
        setShowSuggestions(true);
      } else {
        // New behavior: Don't show suggestions immediately for blocks created after dialogue
        setShowSuggestions(false); // Don't show immediately
      }
    }
  }, [onFocus, block.id, block.type, block.content, updateSuggestionsPosition, isCharacterBlockAfterDialogue, isSceneSelectionActive]);

  // Enhanced suggestion selection with processing state to prevent multiple events
  const handleSuggestionSelect = useCallback((value: string) => {
    // Prevent multiple selections if already processing
    if (isProcessingSelection) return;
    
    console.log(`Selected suggestion: "${value}" for block type: ${block.type}`);
    
    // Set processing state immediately (both local and global)
    setIsProcessingSelection(true);
    if (setIsProcessingSuggestion) {
      setIsProcessingSuggestion(true);
    }
    
    // Check if this is a scene heading prefix selection
    const isSceneTypePrefix = block.type === 'scene-heading' && 
                             /^(INT\.|EXT\.|INT\.\/EXT\.|EXT\.\/INT\.|I\/E\.)\s?$/i.test(value.trim());
    
    // OPTIMISTIC UPDATE: Update content immediately
    onContentChange(block.id, value);
    
    // For prefix-only selections, keep suggestions open and maintain focus
    if (isSceneTypePrefix) {
      setCurrentInput(value);
      
      // Enhanced focus management for prefix selections
      requestAnimationFrame(() => {
        const el = blockRefs.current[block.id];
        if (el) {
          el.focus();
          
          // Place cursor at the end of the text with improved reliability
          const range = document.createRange();
          const selection = window.getSelection();
          
          if (selection) {
            let textNode = el.firstChild;
            
            // Ensure we have a text node
            if (!textNode || textNode.nodeType !== Node.TEXT_NODE) {
              textNode = document.createTextNode(value);
              el.innerHTML = '';
              el.appendChild(textNode);
            }
            
            const textLength = textNode.textContent?.length || 0;
            range.setStart(textNode, textLength);
            range.setEnd(textNode, textLength);
            
            selection.removeAllRanges();
            selection.addRange(range);
          }
        }
        
        // Reset processing state after prefix selection
        setIsProcessingSelection(false);
        if (setIsProcessingSuggestion) {
          setIsProcessingSuggestion(false);
        }
      });
      
      return; // Don't close suggestions
    }
    
    // For complete selections, close suggestions immediately
    closeSuggestions();
    
    // Enhanced focus management for complete selections
    requestAnimationFrame(() => {
      const el = blockRefs.current[block.id];
      if (el) {
        // Update the element content first to ensure it matches the selected value
        el.textContent = value;
        el.focus();
        
        // Set cursor at the end for complete scene headings with improved reliability
        setTimeout(() => {
          const selection = window.getSelection();
          if (selection && el) {
            selection.removeAllRanges();
            const range = document.createRange();
            
            // Ensure we have the correct text content
            if (el.textContent !== value) {
              el.textContent = value;
            }
            
            let textNode = el.firstChild;
            if (!textNode || textNode.nodeType !== Node.TEXT_NODE) {
              textNode = document.createTextNode(value);
              el.innerHTML = '';
              el.appendChild(textNode);
            }
            
            const textLength = textNode.textContent?.length || 0;
            range.setStart(textNode, textLength);
            range.setEnd(textNode, textLength);
            selection.addRange(range);
            
            console.log(`Cursor positioned at end of scene heading: "${value}" (length: ${textLength})`);
          }
        }, 10);
      }
      
      // Reset processing state after complete selection
      setIsProcessingSelection(false);
      if (setIsProcessingSuggestion) {
        setIsProcessingSuggestion(false);
      }
      
      // If this is a scene heading, create an action block after a short delay
      if (block.type === 'scene-heading' && !isSceneTypePrefix) {
        setTimeout(() => {
          handleEnterActionCreation();
        }, 100);
      }
    });
  }, [block.id, block.type, onContentChange, blockRefs, closeSuggestions, handleEnterActionCreation, isProcessingSelection, setIsProcessingSuggestion]);

  // Enhanced keyboard handling that properly prevents conflicts with suggestions
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    // If suggestions are active, only allow Tab key to pass through for block type cycling
    if (showSuggestions) {
      console.log('📝 Suggestions active - checking key:', e.key);
      if (e.key === 'Tab') {
        console.log('📝 Tab key detected - allowing parent handler for block type cycling');
        // Allow Tab key to pass through for block type cycling
        onKeyDown(e, block.id);
        return;
      }
      // For all other keys when suggestions are active, don't do anything
      console.log('📝 Non-Tab key - delegating to suggestion controller');
      return;
    }
    
    // If suggestion is processing, block all events except Tab
    if (isProcessingSuggestion) {
      if (e.key === 'Tab') {
        console.log('⏳ Tab key during processing - allowing for block type cycling');
        onKeyDown(e, block.id);
        return;
      }
      console.log('⏳ Suggestion processing - blocking event:', e.key);
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    
    // For all other cases, forward to parent handler
    onKeyDown(e, block.id);
    
    // Update current input for suggestion filtering
    if (showSuggestions) {
      setTimeout(() => {
        const content = e.currentTarget.textContent || '';
        setCurrentInput(content);
        updateSuggestionsPosition();
      }, 0);
    }
  }, [showSuggestions, isProcessingSuggestion, onKeyDown, block.id, updateSuggestionsPosition]);

  // Add Comment Offset Update Function - MOVED BEFORE USE
  const updateCommentOffsetsAfterEdit = useCallback((blockComments: Comment[], newContent: string) => {
    blockComments.forEach(comment => {
      if (comment.highlightedText && comment.startOffset !== undefined && comment.endOffset !== undefined) {
        // Find new position of highlighted text in new content
        const highlightedText = comment.highlightedText;
        const newStartIndex = newContent.indexOf(highlightedText);
        
        if (newStartIndex !== -1) {
          // Update offsets
          comment.startOffset = newStartIndex;
          comment.endOffset = newStartIndex + highlightedText.length;
        } else {
          // If text not found, mark comment as potentially outdated
          console.warn('Comment text not found in updated content:', highlightedText);
        }
      }
    });
  }, []);

  // Handle highlight hover to show tooltip - MOVED BEFORE USE
  const handleHighlightHover = useCallback((e: MouseEvent, hoverComments: Comment[]) => {
    // Clear any existing timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }

    // Set a timeout to show tooltip after 300ms (debounced)
    hoverTimeoutRef.current = setTimeout(() => {
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      setTooltipState({
        visible: true,
        position: {
          x: rect.left + rect.width / 2,
          y: rect.top
        },
        comments: hoverComments
      });
    }, 300);
  }, []);

  // Handle highlight leave to hide tooltip - MOVED BEFORE USE
  const handleHighlightLeave = useCallback(() => {
    // Clear any pending timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }

    // Hide tooltip immediately
    setTooltipState(prev => ({
      ...prev,
      visible: false
    }));
  }, []);

  // Handle highlight click to open comments panel and scroll to comment - MOVED BEFORE USE
  const handleHighlightClick = useCallback((commentId: string) => {
    // Open comments panel immediately if not already open
    if (setShowCommentsPanel && !showCommentsPanel) {
      setShowCommentsPanel(true);
    }
    
    // Find the comment and trigger the selection handler
    const comment = comments?.find(c => c.id === commentId);
    if (comment && onCommentSelect) {
      // If panel was just opened, add a small delay to ensure comment card is rendered
      if (!showCommentsPanel) {
        setTimeout(() => {
          onCommentSelect(comment);
        }, 100);
      } else {
        // Panel was already open, select immediately
        onCommentSelect(comment);
      }
    }
  }, [comments, onCommentSelect, setShowCommentsPanel, showCommentsPanel]);

  // Enhanced applyAllCommentHighlights with Cursor Preservation
  const applyAllCommentHighlights = useCallback((blockComments: Comment[]) => {
    if (!contentElement || blockComments.length === 0) return;
    
    const textContent = contentElement.textContent || '';
    if (!textContent) return;
    
    // Save cursor position before highlighting
    const selection = window.getSelection();
    let savedCursorOffset = 0;
    
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const preCaretRange = document.createRange();
      preCaretRange.setStart(contentElement, 0);
      preCaretRange.setEnd(range.startContainer, range.startOffset);
      savedCursorOffset = preCaretRange.toString().length;
    }
    
    // Clear existing highlights first
    const existingHighlights = contentElement.querySelectorAll('.comment-highlight');
    existingHighlights.forEach(el => {
      const parent = el.parentNode;
      if (parent) {
        parent.replaceChild(document.createTextNode(el.textContent || ''), el);
        parent.normalize();
      }
    });
    
    // Create highlight ranges
    const highlightRanges: Array<{
      start: number;
      end: number;
      commentIds: string[];
      comments: Comment[];
    }> = [];
    
    blockComments.forEach(comment => {
      if (comment.startOffset !== undefined && comment.endOffset !== undefined) {
        if (comment.startOffset >= 0 && comment.endOffset <= textContent.length && comment.startOffset < comment.endOffset) {
          let merged = false;
          
          for (let i = 0; i < highlightRanges.length; i++) {
            const existing = highlightRanges[i];
            
            if (comment.startOffset < existing.end && comment.endOffset > existing.start) {
              existing.start = Math.min(existing.start, comment.startOffset);
              existing.end = Math.max(existing.end, comment.endOffset);
              existing.commentIds.push(comment.id);
              existing.comments.push(comment);
              merged = true;
              break;
            }
          }
          
          if (!merged) {
            highlightRanges.push({
              start: comment.startOffset,
              end: comment.endOffset,
              commentIds: [comment.id],
              comments: [comment]
            });
          }
        }
      }
    });
    
    // Sort ranges by start position (reverse order)
    highlightRanges.sort((a, b) => b.start - a.start);
    
    // Apply highlights
    let textNode = contentElement.firstChild;
    if (!textNode || textNode.nodeType !== Node.TEXT_NODE) {
      textNode = document.createTextNode(textContent);
      contentElement.innerHTML = '';
      contentElement.appendChild(textNode);
    }
    
    highlightRanges.forEach(range => {
      try {
        const domRange = document.createRange();
        domRange.setStart(textNode!, range.start);
        domRange.setEnd(textNode!, range.end);
        
        const span = document.createElement('span');
        span.className = `comment-highlight ${range.comments.length > 1 ? `overlap-${Math.min(range.comments.length - 1, 3)}` : ''}`;
        span.dataset.commentIds = range.commentIds.join(',');
        
        span.addEventListener('mouseenter', (e) => handleHighlightHover(e, range.comments));
        span.addEventListener('mouseleave', handleHighlightLeave);
        span.addEventListener('click', (e) => {
          e.stopPropagation();
          handleHighlightClick(range.commentIds[0]);
        });
        
        domRange.surroundContents(span);
      } catch (e) {
        console.error('Error applying highlight for range:', range, e);
      }
    });
    
    // Restore cursor position after highlighting
    setTimeout(() => {
      if (selection) {
        try {
          const currentTextContent = contentElement.textContent || '';
          const validOffset = Math.min(savedCursorOffset, currentTextContent.length);
          
          // Find new text node
          const walker = document.createTreeWalker(
            contentElement,
            NodeFilter.SHOW_TEXT,
            null
          );
          
          let currentOffset = 0;
          let targetNode: Text | null = null;
          let targetOffset = 0;
          
          let node = walker.nextNode();
          while (node) {
            const nodeLength = node.textContent?.length || 0;
            
            if (currentOffset + nodeLength >= validOffset) {
              targetNode = node as Text;
              targetOffset = validOffset - currentOffset;
              break;
            }
            currentOffset += nodeLength;
            node = walker.nextNode();
          }
          
          if (targetNode) {
            const range = document.createRange();
            const safeOffset = Math.min(targetOffset, targetNode.textContent?.length || 0);
            
            range.setStart(targetNode, safeOffset);
            range.setEnd(targetNode, safeOffset);
            selection.removeAllRanges();
            selection.addRange(range);
          }
        } catch (error) {
          console.error('Error restoring cursor after highlighting:', error);
        }
      }
    }, 0);
  }, [contentElement, handleHighlightHover, handleHighlightLeave, handleHighlightClick]);

  // Simplified cursor position preservation function
  const preserveCursorPosition = useCallback((beforeUpdate: () => number, afterUpdate: () => void) => {
    const cursorOffset = beforeUpdate();
    
    // Call update function
    afterUpdate();
    
    // Use longer timeout for DOM stabilization
    setTimeout(() => {
      if (contentElement) {
        const selection = window.getSelection();
        if (selection) {
          try {
            // Get all text content in element
            const textContent = contentElement.textContent || '';
            
            // Ensure cursor offset is still valid
            const validOffset = Math.min(cursorOffset, textContent.length);
            
            // Find text nodes at target position
            const textNodes: Text[] = [];
            const walker = document.createTreeWalker(
              contentElement,
              NodeFilter.SHOW_TEXT,
              null
            );
            
            let currentNode = walker.nextNode();
            while (currentNode) {
              textNodes.push(currentNode as Text);
              currentNode = walker.nextNode();
            }
            
            if (textNodes.length === 0) {
              // If no text nodes, create new one
              const newTextNode = document.createTextNode(textContent);
              contentElement.innerHTML = '';
              contentElement.appendChild(newTextNode);
              textNodes.push(newTextNode);
            }
            
            // Calculate position within text nodes
            let currentOffset = 0;
            let targetNode: Text | null = null;
            let targetOffset = 0;
            
            for (const node of textNodes) {
              const nodeLength = node.textContent?.length || 0;
              
              if (currentOffset + nodeLength >= validOffset) {
                targetNode = node;
                targetOffset = validOffset - currentOffset;
                break;
              }
              currentOffset += nodeLength;
            }
            
            // If target node not found, use last node
            if (!targetNode && textNodes.length > 0) {
              targetNode = textNodes[textNodes.length - 1];
              targetOffset = targetNode.textContent?.length || 0;
            }
            
            if (targetNode) {
              const range = document.createRange();
              
              // Ensure targetOffset is valid
              const maxOffset = targetNode.textContent?.length || 0;
              const safeOffset = Math.min(targetOffset, maxOffset);
              
              range.setStart(targetNode, safeOffset);
              range.setEnd(targetNode, safeOffset);
              
              selection.removeAllRanges();
              selection.addRange(range);
              
              console.log(`Cursor restored to offset: ${validOffset} (node offset: ${safeOffset})`);
            }
          } catch (error) {
            console.error('Error restoring cursor position:', error);
            // Fallback: place cursor at end of text
            try {
              const range = document.createRange();
              const textContent = contentElement.textContent || '';
              
              if (contentElement.firstChild) {
                range.setStart(contentElement.firstChild, textContent.length);
                range.setEnd(contentElement.firstChild, textContent.length);
              } else {
                const textNode = document.createTextNode(textContent);
                contentElement.appendChild(textNode);
                range.setStart(textNode, textContent.length);
                range.setEnd(textNode, textContent.length);
              }
              
              selection.removeAllRanges();
              selection.addRange(range);
            } catch (fallbackError) {
              console.error('Fallback cursor positioning failed:', fallbackError);
            }
          }
        }
      }
    }, 50); // Increased delay to 50ms
  }, [contentElement]);

  // Simplified handleInput function
  const handleInput = useCallback((e: React.FormEvent<HTMLDivElement>) => {
    if (!contentElement) {
      return;
    }
    
    // Simple function to get cursor position
    const getCursorPosition = () => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return 0;
      
      const range = selection.getRangeAt(0);
      
      // Create range from start of element to cursor position
      const preCaretRange = document.createRange();
      preCaretRange.setStart(contentElement, 0);
      preCaretRange.setEnd(range.startContainer, range.startOffset);
      
      // Use toString() to get text length before cursor
      return preCaretRange.toString().length;
    };
    
    // Check if typing is happening inside a comment highlight
    const selection = window.getSelection();
    const isTypingInHighlight = selection && 
      selection.rangeCount > 0 && 
      (selection.getRangeAt(0).startContainer.parentElement?.classList.contains('comment-highlight') ||
       selection.getRangeAt(0).startContainer.parentNode?.parentElement?.classList.contains('comment-highlight'));
    
    if (isTypingInHighlight) {
      console.log('Detected typing in highlight, cleaning up...');
      
      // Use simpler approach: save offset before, restore after
      const cursorOffset = getCursorPosition();
      const content = contentElement.textContent || '';
      
      // Remove highlights and create new DOM
      contentElement.innerHTML = '';
      const newTextNode = document.createTextNode(content);
      contentElement.appendChild(newTextNode);
      
      // Restore cursor position immediately
      setTimeout(() => {
        const selection = window.getSelection();
        if (selection && newTextNode) {
          const validOffset = Math.min(cursorOffset, content.length);
          const range = document.createRange();
          
          try {
            range.setStart(newTextNode, validOffset);
            range.setEnd(newTextNode, validOffset);
            selection.removeAllRanges();
            selection.addRange(range);
            
            console.log(`Cursor restored to position: ${validOffset}`);
          } catch (error) {
            console.error('Error setting cursor position:', error);
            // Fallback: place at end of text
            range.setStart(newTextNode, content.length);
            range.setEnd(newTextNode, content.length);
            selection.removeAllRanges();
            selection.addRange(range);
          }
        }
        
        // Re-apply highlights after cursor restoration
        setTimeout(() => {
          const blockComments = comments?.filter(c => c.blockId === block.id) || [];
          if (blockComments.length > 0) {
            updateCommentOffsetsAfterEdit(blockComments, content);
            applyAllCommentHighlights(blockComments);
          }
        }, 10);
      }, 10);
    }
    
    const content = contentElement.textContent || '';
    setCurrentInput(content);
    onContentChange(block.id, content);
    
    // Original suggestion logic remains the same...
    if (suggestionClosingRef.current || isSceneSelectionActive) return;
    
    if (block.type === 'scene-heading') {
      updateSuggestionsPosition();
      setSuggestionType('scene');
      setShowSuggestions(true);
    } else if (block.type === 'transition' && !content.trim()) {
      updateSuggestionsPosition();
      setSuggestionType('transition');
      setShowSuggestions(true);
    } else if (block.type === 'shot' && !content.trim()) {
      updateSuggestionsPosition();
      setSuggestionType('shot');
      setShowSuggestions(true);
    } else if (block.type === 'character') {
      const isAfterDialogue = isCharacterBlockAfterDialogue?.(block.id) ?? false;
      
      if (isAfterDialogue && content.trim().length > 0) {
        updateSuggestionsPosition();
        setSuggestionType('character');
        setShowSuggestions(true);
      } else if (!isAfterDialogue) {
        updateSuggestionsPosition();
        setSuggestionType('character');
        setShowSuggestions(true);
      }
    } else {
      setShowSuggestions(false);
    }
  }, [
    contentElement, 
    suggestionClosingRef, 
    isSceneSelectionActive, 
    block.type, 
    block.id, 
    updateSuggestionsPosition, 
    isCharacterBlockAfterDialogue, 
    comments,
    onContentChange,
    applyAllCommentHighlights,
    updateCommentOffsetsAfterEdit
  ]);

  // Enhanced blur handling
  const handleBlur = useCallback((e: React.FocusEvent<HTMLDivElement>) => {
    if (ignoreBlurRef.current) {
      return;
    }
    
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (!relatedTarget?.closest('.scene-heading-suggestions-improved, .transition-suggestions, .shot-type-suggestions, .character-suggestions, .element-suggestions')) {
      onContentChange(block.id, e.currentTarget.textContent || '');
      closeSuggestions();
    }
  }, [onContentChange, block.id, closeSuggestions]);

  const handleDoubleClickInternal = useCallback((e: React.MouseEvent) => {
    if (onDoubleClick) {
      onDoubleClick(block.id, e);
    }
  }, [onDoubleClick, block.id]);

  // Handle context menu (right-click) for text selection
  const handleContextMenu = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault(); // Prevent default browser context menu
    
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      // No text selected, hide the menu
      setMenuState(null);
      setSelectedRange(null);
      setSelectedText('');
      return;
    }
    
    // Check if selection is within this block
    const range = selection.getRangeAt(0);
    const blockElement = e.currentTarget;
    
    // Ensure the selection is within this block
    if (!blockElement.contains(range.commonAncestorContainer)) {
      return;
    }
    
    // Save the selected range and text
    setSelectedRange(range.cloneRange());
    setSelectedText(range.toString());
    
    // Calculate position for the menu (above the selection)
    const rangeRect = range.getBoundingClientRect();
    setMenuState({
      top: rangeRect.top - 10, // Position above the selection
      left: rangeRect.left + (rangeRect.width / 2) // Center horizontally
    });
  }, []);

  // Handle menu actions
  const handleMenuAction = useCallback((action: MenuAction) => {
    if (action === 'comments' && selectedRange) {
      // Set the comment popup state using the current menu position
      setCommentPopupState(menuState);
    }
    
    // Hide the context menu
    setMenuState(null);
  }, [selectedRange, menuState]);

  // Handle comment submission from the popup
  const handleCommentSubmit = useCallback(async (commentText: string) => {
    try {
      if (selectedRange && addComment && user) {
        // Create a new comment object with all required fields
        const newComment: Comment = {
          id: uuidv4(), // Temporary ID, will be replaced by Firestore
          blockId: block.id,
          authorId: user.id, // Use the current user's ID
          authorName: user.nickname || user.firstName || user.email || 'Anonymous', // Use the user's name or email
          text: commentText,
          createdAt: Timestamp.now(),
          isResolved: false,
          startOffset: selectedRange.startOffset,
          endOffset: selectedRange.endOffset,
          highlightedText: selectedText
        };
        
        // Add the comment to Firestore and wait for the result
        const success = await addComment(newComment);
        
        // Only apply highlight if the comment was successfully saved
        if (success && contentElement) {
          // Apply highlight to the selected text
          const span = document.createElement('span');
          span.className = 'comment-highlight';
          span.title = 'Comment: ' + commentText;
          span.dataset.commentId = newComment.id;
          
          try {
            selectedRange.surroundContents(span);
            // Update the content in the state to preserve the highlight
            if (contentElement.textContent) {
              onContentChange(block.id, contentElement.textContent);
            }
          } catch (e) {
            console.error('Error applying highlight:', e);
          }
        }
      }
    } finally {
      // Always reset states, regardless of success or failure
      setCommentPopupState(null);
      setSelectedRange(null);
      setSelectedText('');
    }
  }, [addComment, block.id, selectedRange, selectedText, contentElement, onContentChange, user]);

  // Handle comment cancel
  const handleCommentCancel = useCallback(() => {
    setCommentPopupState(null);
    setSelectedRange(null);
    setSelectedText('');
  }, []);

  // Handle tooltip close
  const handleTooltipClose = useCallback(() => {
    setTooltipState(prev => ({
      ...prev,
      visible: false
    }));
  }, []);

  // Cleanup hover timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  // Effect to handle persistent text highlighting for ALL comments on this block
  useEffect(() => {
    if (!contentElement) return;
    
    // Get all comments for this block
    const blockComments = comments?.filter(c => c.blockId === block.id) || [];
    
    // Clear any existing highlights first
    const existingHighlights = contentElement.querySelectorAll('.comment-highlight');
    existingHighlights.forEach(el => {
      const parent = el.parentNode;
      if (parent) {
        // Replace the highlight span with its text content
        parent.replaceChild(document.createTextNode(el.textContent || ''), el);
        // Normalize to merge adjacent text nodes
        parent.normalize();
      }
    });
    
    // If no comments, nothing to highlight
    if (blockComments.length === 0) return;
    
    // Apply highlights for all comments
    try {
      applyAllCommentHighlights(blockComments);
    } catch (e) {
      console.error('Error applying comment highlights:', e);
    }
    
    // Cleanup function to remove highlights when component unmounts
    return () => {
      if (contentElement) {
        const existingHighlights = contentElement.querySelectorAll('.comment-highlight');
        existingHighlights.forEach(el => {
          const parent = el.parentNode;
          if (parent) {
            parent.replaceChild(document.createTextNode(el.textContent || ''), el);
            parent.normalize();
          }
        });
      }
    };
  }, [block.id, contentElement, comments, activeCommentId, applyAllCommentHighlights]);

  // Render suggestion components using portals
  const renderSuggestions = () => {
    if (!showSuggestions || !suggestionsPosition || !portalRoot) return null;

    const suggestionContent = (
      <>
        {suggestionType === 'scene' && (
          <SceneHeadingSuggestionsImproved
            blockId={block.id}
            onSelect={handleSuggestionSelect}
            position={suggestionsPosition}
            onClose={closeSuggestions}
            projectId={projectId}
            screenplayId={screenplayId}
            currentInput={currentInput}
            onEnterAction={handleEnterActionCreation}
          />
        )}
        
        {suggestionType === 'transition' && (
          <TransitionSuggestions
            blockId={block.id}
            onSelect={handleSuggestionSelect}
            position={suggestionsPosition}
            onClose={closeSuggestions}
          />
        )}
        
        {suggestionType === 'shot' && (
          <ShotTypeSuggestions
            blockId={block.id}
            onSelect={handleSuggestionSelect}
            position={suggestionsPosition}
            onClose={closeSuggestions}
          />
        )}
        
        {suggestionType === 'character' && (
          <CharacterSuggestions
            blockId={block.id}
            onSelect={handleSuggestionSelect}
            position={suggestionsPosition}
            onClose={closeSuggestions}
            projectCharacters={projectCharacters}
            projectId={projectId}
            currentInput={currentInput}
          />
        )}

        {suggestionType === 'element' && projectElements && (
          <ElementSuggestions
            blockId={block.id}
            onSelect={handleSuggestionSelect}
            position={suggestionsPosition}
            onClose={closeSuggestions}
            projectElements={projectElements}
            currentInput={currentInput}
          />
        )}
      </>
    );

    return createPortal(suggestionContent, portalRoot);
  };

  // Render the context menu using portal
  const renderContextMenu = () => {
    if (!menuState || !portalRoot) return null;
    
    return createPortal(
      <FloatingContextMenu 
        position={menuState} 
        onMenuClick={handleMenuAction} 
      />, 
      portalRoot
    );
  };

  // Render the comment input popup using portal
  const renderCommentPopup = () => {
    if (!commentPopupState || !portalRoot) return null;
    
    return createPortal(
      <CommentInputPopup
        position={commentPopupState}
        onSubmit={handleCommentSubmit}
        onCancel={handleCommentCancel}
      />,
      portalRoot
    );
  };

  // Render the comment tooltip using portal
  const renderTooltip = () => {
    if (!portalRoot) return null;
    
    return createPortal(
      <CommentTooltip
        comments={tooltipState.comments}
        position={tooltipState.position}
        isVisible={tooltipState.visible}
        onClose={handleTooltipClose}
      />,
      portalRoot
    );
  };

  return (
    <div 
      className={`relative screenplay-block block-container ${getBlockMargin(block.type)} ${
        isSelected ? 'selecting' : ''
      } ${isSelected ? 'multi-selected' : ''} drag-selectable`}
      onClick={(e) => onClick(block.id, e)}
      onMouseDown={(e) => onMouseDown(block.id, e)}
      onDoubleClick={handleDoubleClickInternal}
      data-block-id={block.id}
      data-active={isActive}
      data-selected={isSelected}
      data-block-type={block.type}
    >
      {block.type === 'scene-heading' && (
        <div
          className={`absolute inset-0 ${
            isDarkMode ? 'bg-gray-800/50' : 'bg-gray-100'
          } rounded`}
          style={{
            transform: 'translateY(2px)',
            height: '1.75rem',
          }}
        />
      )}
      {block.type === 'scene-heading' && block.number && (
        <div
          className={`absolute -left-8 top-1/2 -translate-y-1/2 text-sm ${
            isDarkMode ? 'text-gray-400' : 'text-gray-500'
          }`}
        >
          {block.number}
        </div>
      )}
      <div
        ref={(el) => {
          if (blockRefs && blockRefs.current) {
            blockRefs.current[block.id] = el;
          }
          setContentElement(el);
        }}
        contentEditable
        suppressContentEditableWarning
        className={`block-editor ${getBlockStyle({ type: block.type, isDarkMode, isSelected })} ${
          isSelected ? (isDarkMode ? 'bg-blue-900/30' : 'bg-blue-100') : ''
        }`}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onInput={handleInput}
        onContextMenu={handleContextMenu}
        data-block-id={block.id}
        style={{
          WebkitUserSelect: 'text',
          MozUserSelect: 'text',
          msUserSelect: 'text',
          userSelect: 'text',
        }}
      >
        {block.content}
      </div>
      {block.type === 'dialogue' && block.number && (
        <div
          className={`absolute -right-8 top-1/2 -translate-y-1/2 text-sm ${
            isDarkMode ? 'text-gray-400' : 'text-gray-500'
          }`}
        >
          {block.number}
        </div>
      )}
      
      {/* Enhanced NEW badge for new scene headings */}
      {isNewSceneHeading() && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2 z-10">
          <span className="px-2 py-0.5 bg-green-500 text-white text-xs font-semibold rounded-full shadow-sm animate-pulse">
            NEW
          </span>
        </div>
      )}
      
      {/* Render suggestions using portals */}
      {renderSuggestions()}
      
      {/* Render context menu using portal */}
      {renderContextMenu()}
      
      {/* Render comment input popup using portal */}
      {renderCommentPopup()}
      
      {/* Render comment tooltip using portal */}
      {renderTooltip()}
    </div>
  );
};

export default BlockComponentImproved;
