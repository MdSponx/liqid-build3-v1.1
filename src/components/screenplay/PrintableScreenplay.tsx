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

    const renderScriptBlock = (block: Block, index: number) => {
      let content = block.content;
      let rightRailContent = '';
      let hasRightRail = false;
      let sceneNumberElement = null;

      // Handle scene headings with separate scene number
      if (block.type === 'scene-heading') {
        sceneNumberElement = (
          <div className="script-row--single">
            <div className="scene-number">{sceneNumber}.</div>
          </div>
        );
        sceneNumber++;
      }

      // Add dialog numbers to dialogue blocks
      if (block.type === 'dialogue') {
        rightRailContent = `${dialogNumber}`;
        hasRightRail = true;
        dialogNumber++;
      }

      // Transitions go in the right rail
      if (block.type === 'transition') {
        rightRailContent = content;
        content = '';
        hasRightRail = true;
      }

      // Determine grid layout class
      const gridClass = hasRightRail ? 'script-row' : 'script-row--single';

      return (
        <React.Fragment key={block.id || index}>
          {/* Scene number (if applicable) */}
          {sceneNumberElement}
          
          {/* Main content block */}
          <div className={`${gridClass} block-${block.type}`} data-block-type={block.type}>
            {/* Left column - main content */}
            <div className="script-content">
              {content && (
                <>
                  {block.type === 'scene-heading' && (
                    <div className="scene-heading">{content}</div>
                  )}
                  {block.type === 'action' && (
                    <div className="action">{content}</div>
                  )}
                  {block.type === 'character' && (
                    <div className="character">{content}</div>
                  )}
                  {block.type === 'dialogue' && (
                    <div className="dialogue">{content}</div>
                  )}
                  {block.type === 'parenthetical' && (
                    <div className="parenthetical">({content})</div>
                  )}
                  {block.type === 'text' && (
                    <div className="text">{content}</div>
                  )}
                  {block.type === 'shot' && (
                    <div className="shot">{content}</div>
                  )}
                </>
              )}
            </div>
            
            {/* Right column - rail content (transitions, dialog numbers) */}
            {hasRightRail && (
              <div className="rail-right">
                {rightRailContent}
              </div>
            )}
          </div>
        </React.Fragment>
      );
    };

    return (
      <div ref={ref} className="printable-screenplay">
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

        {/* SCRIPT BODY */}
        <div className="script">
          {blocks.map((block, index) => renderScriptBlock(block, index))}
        </div>
      </div>
    );
  }
);

PrintableScreenplay.displayName = 'PrintableScreenplay';

export default PrintableScreenplay;
