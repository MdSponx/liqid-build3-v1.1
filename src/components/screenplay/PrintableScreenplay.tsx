import React from 'react';
import { Block } from '../../types';

interface PrintableScreenplayProps {
  blocks: Block[];
  title: string;
  author: string;
  contact: string;
  director?: string;
  writer?: string;
  runtime?: string;
  school?: string;
  logline?: string;
  posterUrl?: string;
}

const PrintableScreenplay = React.forwardRef<HTMLDivElement, PrintableScreenplayProps>(
  ({ blocks, title, author, contact, director, writer, runtime, school, logline, posterUrl }, ref) => {
    // Detect Thai content for proper "Written by" text
    const hasThaiContent = blocks.some(block => /[\u0E00-\u0E7F]/.test(block.content)) ||
                          /[\u0E00-\u0E7F]/.test(title) || 
                          /[\u0E00-\u0E7F]/.test(author);

    // Track scene and dialog numbers
    let sceneNumber = 1;
    let dialogNumber = 1;

    const renderBlock = (block: Block, index: number) => {
      const blockKey = block.id || `${index}-${block.type}`;
      
      // Scene heading - Scene Number + Scene Heading on same line
      if (block.type === 'scene-heading') {
        const currentSceneNumber = sceneNumber++;
        return (
          <div key={blockKey} className="script-element scene-line" data-block-type="scene-heading">
            <span className="sceneNumber">{currentSceneNumber}</span>
            <span className="scene">{block.content.toUpperCase()}</span>
          </div>
        );
      }

      // Action/description blocks
      if (block.type === 'action' || block.type === 'text') {
        return (
          <div key={blockKey} className="script-element action" data-block-type={block.type}>
            {block.content}
          </div>
        );
      }

      // Character name - ALL CAPS
      if (block.type === 'character') {
        return (
          <div key={blockKey} className="script-element character" data-block-type="character">
            {block.content.toUpperCase()}
          </div>
        );
      }

      // Dialogue
      if (block.type === 'dialogue') {
        const currentDialogNumber = dialogNumber++;
        return (
          <div key={blockKey} className="script-element dialogue" data-block-type="dialogue">
            {block.content}
            <span className="dialogue-number">{currentDialogNumber}</span>
          </div>
        );
      }

      // Parenthetical
      if (block.type === 'parenthetical') {
        return (
          <div key={blockKey} className="script-element paren" data-block-type="parenthetical">
            ({block.content})
          </div>
        );
      }

      // Shot descriptions - ALL CAPS
      if (block.type === 'shot') {
        return (
          <div key={blockKey} className="script-element shot" data-block-type="shot">
            {block.content.toUpperCase()}
          </div>
        );
      }

      // Transitions - right-aligned with colon
      if (block.type === 'transition') {
        const transitionText = block.content.toUpperCase();
        const hasColon = transitionText.endsWith(':');
        return (
          <div key={blockKey} className="script-element transition" data-block-type="transition">
            {hasColon ? transitionText : `${transitionText}:`}
          </div>
        );
      }

      // Default fallback
      return (
        <div key={blockKey} className="script-element action" data-block-type={block.type}>
          {block.content}
        </div>
      );
    };

    return (
      <div ref={ref} className="script-document">
        {/* COVER PAGE - visible only on print */}
        <div className="print-only cover-page">
          {posterUrl && (
            <img src={posterUrl} alt="Poster" className="cover-poster" />
          )}
          <h1 className="cover-title">{title.toUpperCase()}</h1>
          {logline && <p className="cover-logline">{logline}</p>}
          <div className="cover-credits">
            {director && <div>Director: {director}</div>}
            {writer && <div>Writer: {writer}</div>}
            {author && <div>Author: {author}</div>}
            {runtime && <div>Runtime: {runtime}</div>}
            {school && <div>School: {school}</div>}
            {contact && <div>Contact: {contact}</div>}
          </div>
        </div>

        {/* Force page break after cover */}
        <div className="print-only page-break-after"></div>

        {/* SCRIPT CONTENT */}
        <div className="script-content">
          {blocks.map((block, index) => renderBlock(block, index))}
        </div>
      </div>
    );
  }
);

PrintableScreenplay.displayName = 'PrintableScreenplay';

export default PrintableScreenplay;
