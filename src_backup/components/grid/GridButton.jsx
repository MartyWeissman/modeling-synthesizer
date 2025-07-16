// src/components/grid/GridButton.jsx

import React from 'react';
import GridComponent from './GridComponent';

const GridButton = ({
  x,
  y,
  children,
  active = false,
  onClick,
  tooltip,
  theme
}) => {
  return (
    <GridComponent
      x={x}
      y={y}
      w={1}
      h={1}
      active={active}
      onClick={onClick}
      title={tooltip}
      theme={theme}
      className={`${theme.componentHover} cursor-pointer flex items-center justify-center font-medium ${theme.text}`}
    >
      {children}
    </GridComponent>
  );
};

export default GridButton;
