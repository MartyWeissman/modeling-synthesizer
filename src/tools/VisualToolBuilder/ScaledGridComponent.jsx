// src/tools/VisualToolBuilder/ScaledGridComponent.jsx

import React from 'react';
import { 
  GridDisplay,
  GridGraph
} from '../../components/grid';

/**
 * ScaledGridComponent - Handles complex scaling for graph and display components
 * that need special treatment to maintain proper proportions and readability
 */
const ScaledGridComponent = ({ 
  type, 
  scale = 1.0, 
  theme, 
  props = {},
  componentProps = {}
}) => {
  const baseSize = 100;
  const dimensions = type === 'graph' ? { w: 4, h: 3 } : { w: 2, h: 1 };
  const fullWidth = dimensions.w * baseSize;
  const fullHeight = dimensions.h * baseSize;

  // For very small scales, we need custom rendering
  const useCustomRender = scale < 0.8;

  if (type === 'graph' && useCustomRender) {
    const scaledWidth = fullWidth * scale;
    const scaledHeight = fullHeight * scale;
    
    // Calculate axis margins that scale appropriately
    const axisMargin = Math.max(10, 25 * scale);
    const plotWidth = scaledWidth - axisMargin;
    const plotHeight = scaledHeight - axisMargin;

    return (
      <div 
        style={{
          width: scaledWidth,
          height: scaledHeight,
          position: 'relative',
          border: '1px solid #666',
          borderRadius: '4px',
          backgroundColor: theme.component?.includes('gray-700') ? '#374151' : '#f3f4f6'
        }}
      >
        {/* Graph plot area */}
        <div
          style={{
            position: 'absolute',
            left: axisMargin,
            bottom: axisMargin,
            width: plotWidth,
            height: plotHeight,
            backgroundColor: theme.component?.includes('gray-700') ? '#1f2937' : '#ffffff',
            border: '1px solid #666'
          }}
        >
          {/* Simple grid lines */}
          <svg style={{ width: '100%', height: '100%', position: 'absolute' }}>
            <defs>
              <pattern id={`grid-${scale}`} width="20" height="15" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 15" fill="none" stroke="#ccc" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill={`url(#grid-${scale})`} />
            {/* Sample curve */}
            <path 
              d={`M 5,${plotHeight-10} Q ${plotWidth/2},10 ${plotWidth-5},${plotHeight/2}`}
              fill="none" 
              stroke="#ef4444" 
              strokeWidth="1.5"
            />
          </svg>
        </div>

        {/* X-axis label */}
        <div
          style={{
            position: 'absolute',
            bottom: '2px',
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: Math.max(8, 10 * scale) + 'px',
            fontFamily: 'monospace',
            color: theme.text?.includes('gray-100') ? '#ffffff' : '#000000',
            fontWeight: 'bold'
          }}
        >
          {props.xLabel || 'x'}
        </div>

        {/* Y-axis label */}
        <div
          style={{
            position: 'absolute',
            left: '2px',
            top: '50%',
            transform: 'translateY(-50%) rotate(-90deg)',
            transformOrigin: 'center',
            fontSize: Math.max(8, 10 * scale) + 'px',
            fontFamily: 'monospace',
            color: theme.text?.includes('gray-100') ? '#ffffff' : '#000000',
            fontWeight: 'bold'
          }}
        >
          {props.yLabel || 'y'}
        </div>
      </div>
    );
  }

  if (type === 'display' && useCustomRender) {
    const scaledWidth = fullWidth * scale;
    const scaledHeight = fullHeight * scale;

    // Determine background color
    let backgroundColor = 'transparent';
    let textColor = theme.text?.includes('gray-100') ? '#ffffff' : '#000000';
    
    if (props.background === 'white') {
      backgroundColor = '#ffffff';
      textColor = '#000000';
    } else if (props.background === 'black') {
      backgroundColor = '#000000';
      textColor = '#00ff00'; // Green text on black background (LCD style)
    }

    return (
      <div
        style={{
          width: scaledWidth,
          height: scaledHeight,
          border: '1px solid #666',
          borderRadius: '4px',
          backgroundColor: backgroundColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: Math.max(8, 12 * scale) + 'px',
          fontFamily: 'monospace',
          fontWeight: 'bold',
          color: textColor,
          boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.2)'
        }}
      >
        {props.text || props.value || 'Display'}
      </div>
    );
  }

  // For larger scales or other components, use normal scaling
  const scaledWrapperStyle = {
    transform: `scale(${scale})`,
    transformOrigin: 'top left',
    width: fullWidth,
    height: fullHeight,
    pointerEvents: 'none'
  };

  const commonProps = {
    x: 0,
    y: 0,
    theme,
    tooltip: ''
  };

  if (type === 'graph') {
    return (
      <div style={scaledWrapperStyle}>
        <GridGraph
          {...commonProps}
          {...componentProps}
          w={4}
          h={3}
          xLabel={props.xLabel || "x"}
          yLabel={props.yLabel || "y"}
        />
      </div>
    );
  }

  if (type === 'display') {
    const displayStyle = {};
    if (props.background === 'white') {
      displayStyle.backgroundColor = '#ffffff';
    } else if (props.background === 'black') {
      displayStyle.backgroundColor = '#000000';
    }

    return (
      <div style={scaledWrapperStyle}>
        <div style={displayStyle}>
          <GridDisplay
            {...commonProps}
            {...componentProps}
            w={2}
            value={props.text || props.value || "Display"}
            variant="default"
          />
        </div>
      </div>
    );
  }

  return null;
};

export default ScaledGridComponent;