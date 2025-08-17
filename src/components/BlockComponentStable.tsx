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

const BlockComponentStable: React.FC<ExtendedBlockComponentProps> = ({
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
  const { user } = useAuth();
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionsPosition, setSuggestionsPosition] = useState<{ x: number; y: number } | null>(null);
  const [suggestionType, setSuggestionType] = useState<'scene' | 'transition' | 'shot' | 'character' | 'element' | null>(null);
  const [currentInput, setCurrentInput] = useState('');
  const [contentElement, setContentElement] = useState<HTMLDivElement | null>(null);
  const [isProcessingSelection, setIsProcessingSelection] = useState(false);
  const ignoreBlurRef = useRef(false);
  const suggestionClosingRef = useRef(false);
  const portalRoot = typeof document !== 'undefined' ? document.getElementById('portal-root') : null;

  // Context menu and comment states
  const [menuState, setMenuState] = useState<{ top: number; left: number } | null>(null);
  const [selectedRange, setSelectedRange] = useState<Range | null>(null);
  const [selectedText, setSelectedText] = useState<string>('');
  const [commentPopupState, setCommentPopupState] = useState<{ top: number; left: number } | null>(null);

  // Tooltip state
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

  // Cursor jumping fix state
  const [cursorFixActive, setCursorFixActive] = useState(false);
  const lastInputEventRef = useRef<{ type: string; timestamp: number } | null>(null);

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

  // CURSOR JUMPING FIX: Core function to detect if cursor is at highlight edge
  const isAtHighlightEdge = useCallback((range: Range) => {
    const container = range.startContainer;
    const offset = range.startOffset;

    // Check if we're at the end of a highlight span
    if (container.nodeType === Node.TEXT_NODE) {
      const parent = container.parentNode as HTMLElement;
      if (parent && parent.classList && parent.classList.contains('comment-highlight')) {
        // At the end of highlighted text
        if (offset === container.textContent!.length) {
          return { position: 'end', highlight: parent };
        }
        // At the beginning of highlighted text
        if (offset === 0) {
          return { position: 'start', highlight: parent };
        }
      }
    }

    return false;
  }, []);

  // CURSOR JUMPING FIX: Move cursor outside highlight when typing
  const moveCursorOutsideHighlight = useCallback((range: Range, isTyping = false) => {
    const edgeInfo = isAtHighlightEdge(range);
    if (!edgeInfo) return false;

    const { position, highlight } = edgeInfo;
    
    if (isTyping && position === 'end') {
      // Create a new text node after the highlight
      const newTextNode = document.createTextNode('');
      highlight.parentNode!.insertBefore(newTextNode, highlight.nextSibling);
      
      // Move cursor to the new text node
      const newRange = document.createRange();
      newRange.setStart(newTextNode, 0);
      newRange.setEnd(newTextNode, 0);
      
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(newRange);
      }
      
      console.log('🔧 Cursor moved outside highlight for typing');
      return true;
    }
    
    return false;
  }, [isAtHighlightEdge]);

  // CURSOR JUMPING FIX: Handle beforeinput event to intercept typing
  const handleBeforeInput = useCallback((e: Event) => {
    const beforeInputEvent = e as InputEvent;
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    
    // Check if we're typing at the edge of a highlight
    if (beforeInputEvent.inputType === 'insertText' || beforeInputEvent.inputType === 'insertCompositionText') {
      if (moveCursorOutsideHighlight(range, true)) {
        setCursorFixActive(true);
        // Let the input continue naturally at the new cursor position
      }
    }
  }, [moveCursorOutsideHighlight]);

  // CURSOR JUMPING FIX: Enhanced input handling with cursor fix
  const handleInput = useCallback((e: React.FormEvent<HTMLDivElement>) => {
    if (!contentElement) return;
    
    const content = contentElement.textContent || '';
    setCurrentInput(content);
    
    // Track input events for cursor fix
    lastInputEventRef.current = {
      type: 'input',
      timestamp: Date.now()
    };

    // Apply highlight preservation after input
    setTimeout(() => {
      applyHighlightPreservation();
    }, 0);
    
    // Don't open suggestions if just closed or if scene selection is active
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
  }, [block.type, block.id, updateSuggestionsPosition, contentElement, isCharacterBlockAfterDialogue, isSceneSelectionActive]);

  // CURSOR JUMPING FIX: Preserve highlights after content changes (only for unresolved comments)
  const applyHighlightPreservation = useCallback(() => {
    if (!contentElement || !comments) return;

    // Get all comments for this block
    const blockComments = comments.filter(c => c.blockId === block.id);
    
    // Filter out resolved comments - only preserve highlights for unresolved comments
    const unresolvedComments = blockComments.filter(c => !c.isResolved);
    if (unresolvedComments.length === 0) return;

    // Clear existing highlights first
    const existingHighlights = contentElement.querySelectorAll('.comment-highlight');
    existingHighlights.forEach(el => {
      const parent = el.parentNode;
      if (parent) {
        parent.replaceChild(document.createTextNode(el.textContent || ''), el);
        parent.normalize();
      }
    });

    // Reapply highlights only for unresolved comments
    try {
      applyAllCommentHighlights(unresolvedComments);
    } catch (e) {
      console.error('Error preserving highlights:', e);
    }
  }, [contentElement, comments, block.id]);

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
        const isAfterDialogue = isCharacterBlockAfterDialogue?.(block.id) ?? false;
        
        if (!isAfterDialogue) {
          updateSuggestionsPosition();
          setSuggestionType('character');
          setCurrentInput(content);
          setShowSuggestions(true);
        } else {
          updateSuggestionsPosition();
          setSuggestionType('character');
          setCurrentInput(content);
          setShowSuggestions(false);
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
      const isAfterDialogue = isCharacterBlockAfterDialogue?.(block.id) ?? false;
      
      updateSuggestionsPosition();
      setSuggestionType('character');
      setCurrentInput(block.content);
      
      if (!isAfterDialogue) {
        setShowSuggestions(true);
      } else {
        setShowSuggestions(false);
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
    onContentChange(block.id, value, block.type);
    
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

  // CURSOR JUMPING FIX: Setup beforeinput event listener
  useEffect(() => {
    if (!contentElement) return;

    contentElement.addEventListener('beforeinput', handleBeforeInput);
    
    return () => {
      contentElement.removeEventListener('beforeinput', handleBeforeInput);
    };
  }, [contentElement, handleBeforeInput]);

  // Effect to handle persistent text highlighting for UNRESOLVED comments on this block
  useEffect(() => {
    if (!contentElement) return;
    
    // Get all comments for this block
    const blockComments = comments?.filter(c => c.blockId === block.id) || [];
    
    // Filter out resolved comments - only show highlights for unresolved comments
    const unresolvedComments = blockComments.filter(c => !c.isResolved);
    
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
    
    // If no unresolved comments, nothing to highlight
    if (unresolvedComments.length === 0) return;
    
    // Apply highlights only for unresolved comments
    try {
      applyAllCommentHighlights(unresolvedComments);
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
  }, [block.id, contentElement, comments, activeCommentId]);

  // Enhanced function to apply highlights based on actual text content (sticky to words)
  const applyAllCommentHighlights = useCallback((blockComments: Comment[]) => {
    if (!contentElement || blockComments.length === 0) return;
    
    // Get the current text content
    const currentTextContent = contentElement.textContent || '';
    if (!currentTextContent) return;
    
    // Create highlight ranges based on actual text matching (content-based, not position-based)
    const highlightRanges: Array<{
      start: number;
      end: number;
      commentIds: string[];
      comments: Comment[];
      matchedText: string;
    }> = [];
    
    // Process each comment to find its current position in the text
    blockComments.forEach(comment => {
      if (comment.highlightedText && comment.highlightedText.trim()) {
        // Find the highlighted text in the current content
        const highlightedText = comment.highlightedText;
        let searchStartIndex = 0;
        let foundIndex = -1;
        
        // Handle multiple occurrences by using stored offset as a hint
        const originalOffset = comment.startOffset || 0;
        
        // First, try to find the text near its original position
        const searchRadius = 50; // Search within 50 characters of original position
        const searchStart = Math.max(0, originalOffset - searchRadius);
        const searchEnd = Math.min(currentTextContent.length, originalOffset + highlightedText.length + searchRadius);
        const nearbyText = currentTextContent.substring(searchStart, searchEnd);
        
        let localIndex = nearbyText.indexOf(highlightedText);
        if (localIndex !== -1) {
          foundIndex = searchStart + localIndex;
        } else {
          // Fallback: search the entire text
          foundIndex = currentTextContent.indexOf(highlightedText, searchStartIndex);
        }
        
        // If we found the text, create a highlight range
        if (foundIndex !== -1) {
          const start = foundIndex;
          const end = foundIndex + highlightedText.length;
          
          // Check if this range overlaps with existing ranges
          let merged = false;
          
          for (let i = 0; i < highlightRanges.length; i++) {
            const existing = highlightRanges[i];
            
            // Check for overlap
            if (start < existing.end && end > existing.start) {
              // Merge overlapping ranges
              existing.start = Math.min(existing.start, start);
              existing.end = Math.max(existing.end, end);
              existing.commentIds.push(comment.id);
              existing.comments.push(comment);
              // Update matched text to include both
              const mergedStart = existing.start;
              const mergedEnd = existing.end;
              existing.matchedText = currentTextContent.substring(mergedStart, mergedEnd);
              merged = true;
              break;
            }
          }
          
          // If not merged, create new range
          if (!merged) {
            highlightRanges.push({
              start,
              end,
              commentIds: [comment.id],
              comments: [comment],
              matchedText: highlightedText
            });
          }
          
          // Update the comment's stored offsets to the new position
          comment.startOffset = start;
          comment.endOffset = end;
        } else {
          // Text not found - might have been deleted or significantly modified
          console.warn(`Comment highlight text not found: "${highlightedText}"`);
        }
      } else if (comment.startOffset !== undefined && comment.endOffset !== undefined) {
        // Fallback to position-based highlighting for comments without stored text
        const start = Math.min(comment.startOffset, currentTextContent.length);
        const end = Math.min(comment.endOffset, currentTextContent.length);
        
        if (start < end && start >= 0) {
          const matchedText = currentTextContent.substring(start, end);
          
          // Check for overlap with existing ranges
          let merged = false;
          
          for (let i = 0; i < highlightRanges.length; i++) {
            const existing = highlightRanges[i];
            
            if (start < existing.end && end > existing.start) {
              existing.start = Math.min(existing.start, start);
              existing.end = Math.max(existing.end, end);
              existing.commentIds.push(comment.id);
              existing.comments.push(comment);
              existing.matchedText = currentTextContent.substring(existing.start, existing.end);
              merged = true;
              break;
            }
          }
          
          if (!merged) {
            highlightRanges.push({
              start,
              end,
              commentIds: [comment.id],
              comments: [comment],
              matchedText
            });
          }
        }
      }
    });
    
    // Sort ranges by start position (reverse order for proper DOM manipulation)
    highlightRanges.sort((a, b) => b.start - a.start);
    
    // Apply highlights to the DOM
    let textNode = contentElement.firstChild;
    if (!textNode || textNode.nodeType !== Node.TEXT_NODE) {
      // Create a text node if it doesn't exist
      textNode = document.createTextNode(currentTextContent);
      contentElement.innerHTML = '';
      contentElement.appendChild(textNode);
    }
    
    // Apply each highlight range
    highlightRanges.forEach(range => {
      try {
        // Find the current text node that contains our range
        let currentNode = contentElement.firstChild;
        let currentOffset = 0;
        
        // Navigate to the correct text node
        while (currentNode && currentOffset + (currentNode.textContent?.length || 0) <= range.start) {
          currentOffset += currentNode.textContent?.length || 0;
          currentNode = currentNode.nextSibling;
        }
        
        if (currentNode && currentNode.nodeType === Node.TEXT_NODE) {
          const nodeStartOffset = range.start - currentOffset;
          const nodeEndOffset = Math.min(range.end - currentOffset, currentNode.textContent?.length || 0);
          
          if (nodeStartOffset >= 0 && nodeEndOffset > nodeStartOffset) {
            const domRange = document.createRange();
            domRange.setStart(currentNode, nodeStartOffset);
            domRange.setEnd(currentNode, nodeEndOffset);
            
            const span = document.createElement('span');
            
            // Determine highlight class based on overlap count and active state
            const overlapCount = range.comments.length;
            const isActive = range.commentIds.includes(activeCommentId || '');
            
            let className = 'comment-highlight';
            if (overlapCount > 1) {
              className += ` overlap-${Math.min(overlapCount - 1, 3)}`; // Cap at overlap-3
            }
            if (isActive) {
              className += ' active';
            }
            
            span.className = className;
            span.dataset.commentIds = range.commentIds.join(',');
            
            // CURSOR JUMPING FIX: Add special data attribute for cursor fix
            span.dataset.cursorFix = 'true';
            
            // Add click handler for opening comments panel
            span.addEventListener('click', (e) => {
              e.preventDefault();
              e.stopPropagation();
              handleHighlightClick(range.commentIds[0]); // Use first comment ID
            });

            // Add hover handlers for tooltip
            span.addEventListener('mouseenter', (e) => {
              handleHighlightHover(e, range.comments);
            });

            span.addEventListener('mouseleave', () => {
              handleHighlightLeave();
            });
            
            span.style.cursor = 'pointer';
            
            domRange.surroundContents(span);
          }
        }
      } catch (e) {
        console.error('Error applying individual highlight:', e);
      }
    });
  }, [contentElement, activeCommentId]);

  // Handle highlight hover to show tooltip
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

  // Handle highlight leave to hide tooltip
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

  // Handle highlight click to open comments panel and scroll to comment
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

export default BlockComponentStable;
