// src/components/grid/GridSlider.jsx

import React from 'react';
import GridComponent from './GridComponent';

const GridSlider = ({
  x,
  y,
  value,
  onChange,
  tooltip,
  label,
  theme
}) => {
  return (
    <>
      {/* Slider track (1x3) */}
      <GridComponent
        x={x}
        y={y}
        w={1}
        h={3}
        title={tooltip}
        theme={theme}
        className="flex flex-col items-center justify-center p-2"
      >
        <div className="w-6 h-full bg-gray-300 rounded-full relative">
          <div
            className="w-6 h-6 bg-blue-500 rounded-full absolute left-0 shadow-md cursor-pointer"
            style={{ top: `${(100 - value) * 0.8}%`, transform: 'translateY(-50%)' }}
          />
        </div>
      </GridComponent>

      {/* Value display (1x1) */}
      <GridComponent
        x={x}
        y={y + 3}
        w={1}
        h={1}
        theme={theme}
        className={`flex flex-col items-center justify-center ${theme.text}`}
      >
        <div className="text-xs font-mono">{value}</div>
        {label && <div className="text-xs opacity-75">{label}</div>}
      </GridComponent>
    </>
  );
};

export default GridSlider;
