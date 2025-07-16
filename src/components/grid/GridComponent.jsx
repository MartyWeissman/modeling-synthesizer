// src/components/grid/GridComponent.jsx

import React from 'react';
import { CELL_SIZE } from '../../themes';

const GridComponent = ({
  x,
  y,
  w,
  h,
  children,
  className = "",
  title,
  active = false,
  onClick,
  onMouseDown,
  onMouseUp,
  onMouseLeave,
  style = {},
  theme
}) => {
  const baseClasses = `absolute border rounded-lg ${theme.component} ${theme.shadow} ${active ? theme.componentActive : ''} ${className}`;
  const position = {
    left: `${x * CELL_SIZE}px`,
    top: `${y * CELL_SIZE}px`,
    width: `${w * CELL_SIZE}px`,
    height: `${h * CELL_SIZE}px`,
    ...style
  };

  return (
    <div
      className={baseClasses}
      style={position}
      title={title}
      onClick={onClick}
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseLeave}
    >
      {children}
    </div>
  );
};

export default GridComponent;
