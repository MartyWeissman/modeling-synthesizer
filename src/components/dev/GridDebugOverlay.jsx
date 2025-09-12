// src/components/dev/GridDebugOverlay.jsx

import React, { useState, useEffect } from 'react';
import { CELL_SIZE } from '../../utils/gridLayoutHelper';

/**
 * GridDebugOverlay - Visual debugging overlay for grid layouts
 * Shows grid lines, component boundaries, and overlap detection
 */
const GridDebugOverlay = ({
  components = [],
  canvasWidth = 10,
  canvasHeight = 5,
  show = true,
  showGrid = true,
  showBounds = true,
  showOverlaps = true,
  showLabels = true
}) => {
  const [overlaps, setOverlaps] = useState([]);

  // Detect overlaps whenever components change
  useEffect(() => {
    const foundOverlaps = [];
    for (let i = 0; i < components.length; i++) {
      for (let j = i + 1; j < components.length; j++) {
        const comp1 = components[i];
        const comp2 = components[j];

        // Check overlap
        if (!(comp1.x + comp1.w <= comp2.x ||
              comp2.x + comp2.w <= comp1.x ||
              comp1.y + comp1.h <= comp2.y ||
              comp2.y + comp2.h <= comp1.y)) {
          foundOverlaps.push({ comp1, comp2, index1: i, index2: j });
        }
      }
    }
    setOverlaps(foundOverlaps);
  }, [components]);

  if (!show) return null;

  const containerStyle = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: `${canvasWidth * CELL_SIZE}px`,
    height: `${canvasHeight * CELL_SIZE}px`,
    pointerEvents: 'none',
    zIndex: 1000,
    overflow: 'hidden'
  };

  return (
    <div style={containerStyle}>
      <svg
        width={canvasWidth * CELL_SIZE}
        height={canvasHeight * CELL_SIZE}
        style={{ position: 'absolute', top: 0, left: 0 }}
      >
        {/* Grid lines */}
        {showGrid && (
          <g stroke="#e0e0e0" strokeWidth="1" opacity="0.5">
            {/* Vertical lines */}
            {Array.from({ length: canvasWidth + 1 }, (_, i) => (
              <line
                key={`v${i}`}
                x1={i * CELL_SIZE}
                y1={0}
                x2={i * CELL_SIZE}
                y2={canvasHeight * CELL_SIZE}
              />
            ))}
            {/* Horizontal lines */}
            {Array.from({ length: canvasHeight + 1 }, (_, i) => (
              <line
                key={`h${i}`}
                x1={0}
                y1={i * CELL_SIZE}
                x2={canvasWidth * CELL_SIZE}
                y2={i * CELL_SIZE}
              />
            ))}
          </g>
        )}

        {/* Component boundaries */}
        {showBounds && components.map((comp, index) => {
          const x = comp.x * CELL_SIZE;
          const y = comp.y * CELL_SIZE;
          const w = comp.w * CELL_SIZE;
          const h = comp.h * CELL_SIZE;

          const isInOverlap = overlaps.some(overlap =>
            overlap.index1 === index || overlap.index2 === index
          );

          return (
            <g key={index}>
              {/* Component boundary */}
              <rect
                x={x + 2}
                y={y + 2}
                width={w - 4}
                height={h - 4}
                fill="none"
                stroke={isInOverlap ? "#ff4444" : "#4444ff"}
                strokeWidth="2"
                strokeDasharray={isInOverlap ? "5,5" : "none"}
                opacity="0.7"
              />

              {/* Component label */}
              {showLabels && (
                <text
                  x={x + 8}
                  y={y + 16}
                  fontSize="10"
                  fill={isInOverlap ? "#ff4444" : "#4444ff"}
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  {comp.name || comp.type || `C${index}`}
                </text>
              )}

              {/* Size label */}
              {showLabels && (
                <text
                  x={x + 8}
                  y={y + 28}
                  fontSize="8"
                  fill={isInOverlap ? "#ff4444" : "#666666"}
                  fontFamily="monospace"
                >
                  {comp.w}×{comp.h}
                </text>
              )}
            </g>
          );
        })}

        {/* Overlap highlights */}
        {showOverlaps && overlaps.map((overlap, index) => {
          // Calculate intersection rectangle
          const comp1 = overlap.comp1;
          const comp2 = overlap.comp2;

          const x1 = Math.max(comp1.x, comp2.x);
          const y1 = Math.max(comp1.y, comp2.y);
          const x2 = Math.min(comp1.x + comp1.w, comp2.x + comp2.w);
          const y2 = Math.min(comp1.y + comp1.h, comp2.y + comp2.h);

          if (x2 > x1 && y2 > y1) {
            return (
              <rect
                key={`overlap-${index}`}
                x={x1 * CELL_SIZE}
                y={y1 * CELL_SIZE}
                width={(x2 - x1) * CELL_SIZE}
                height={(y2 - y1) * CELL_SIZE}
                fill="#ff4444"
                opacity="0.3"
                stroke="#ff0000"
                strokeWidth="2"
              />
            );
          }
          return null;
        })}

        {/* Grid coordinates */}
        {showGrid && (
          <g fill="#999" fontSize="8" fontFamily="monospace" opacity="0.7">
            {Array.from({ length: canvasWidth }, (_, x) =>
              Array.from({ length: canvasHeight }, (_, y) => (
                <text
                  key={`coord-${x}-${y}`}
                  x={x * CELL_SIZE + 4}
                  y={y * CELL_SIZE + 12}
                >
                  {x},{y}
                </text>
              ))
            )}
          </g>
        )}
      </svg>

      {/* Overlap warning panel */}
      {overlaps.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            backgroundColor: '#ffebee',
            border: '2px solid #f44336',
            borderRadius: '8px',
            padding: '12px',
            fontSize: '12px',
            fontFamily: 'monospace',
            color: '#c62828',
            maxWidth: '200px',
            pointerEvents: 'auto'
          }}
        >
          <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
            ⚠️ {overlaps.length} Overlap{overlaps.length > 1 ? 's' : ''} Detected
          </div>
          {overlaps.slice(0, 3).map((overlap, i) => {
            const name1 = overlap.comp1.name || overlap.comp1.type || `C${overlap.index1}`;
            const name2 = overlap.comp2.name || overlap.comp2.type || `C${overlap.index2}`;
            return (
              <div key={i} style={{ marginBottom: '4px' }}>
                {name1} ↔ {name2}
              </div>
            );
          })}
          {overlaps.length > 3 && (
            <div style={{ fontStyle: 'italic' }}>
              ...and {overlaps.length - 3} more
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * GridDebugControls - Control panel for the debug overlay
 */
export const GridDebugControls = ({
  show,
  onToggleShow,
  showGrid,
  onToggleGrid,
  showBounds,
  onToggleBounds,
  showOverlaps,
  onToggleOverlaps,
  showLabels,
  onToggleLabels
}) => {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        backgroundColor: '#f5f5f5',
        border: '1px solid #ccc',
        borderRadius: '8px',
        padding: '12px',
        fontSize: '12px',
        fontFamily: 'sans-serif',
        zIndex: 1001,
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
      }}
    >
      <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
        Grid Debug
      </div>

      <label style={{ display: 'block', marginBottom: '4px', cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={show}
          onChange={onToggleShow}
          style={{ marginRight: '6px' }}
        />
        Show Overlay
      </label>

      {show && (
        <>
          <label style={{ display: 'block', marginBottom: '4px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={showGrid}
              onChange={onToggleGrid}
              style={{ marginRight: '6px' }}
            />
            Grid Lines
          </label>

          <label style={{ display: 'block', marginBottom: '4px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={showBounds}
              onChange={onToggleBounds}
              style={{ marginRight: '6px' }}
            />
            Component Bounds
          </label>

          <label style={{ display: 'block', marginBottom: '4px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={showOverlaps}
              onChange={onToggleOverlaps}
              style={{ marginRight: '6px' }}
            />
            Overlap Detection
          </label>

          <label style={{ display: 'block', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={showLabels}
              onChange={onToggleLabels}
              style={{ marginRight: '6px' }}
            />
            Labels
          </label>
        </>
      )}
    </div>
  );
};

export default GridDebugOverlay;
