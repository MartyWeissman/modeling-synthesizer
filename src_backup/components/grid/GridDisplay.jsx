// src/components/grid/GridDisplay.jsx

import React from 'react';
import GridComponent from './GridComponent';

const GridDisplay = ({
  x,
  y,
  w,
  h,
  children,
  title,
  theme
}) => {
  return (
    <GridComponent
      x={x}
      y={y}
      w={w}
      h={h}
      title={title}
      theme={theme}
      className="p-4"
    >
      <div className="w-full h-full bg-white rounded border-2 border-gray-300 flex items-center justify-center">
        {children}
      </div>
    </GridComponent>
  );
};

export default GridDisplay;
