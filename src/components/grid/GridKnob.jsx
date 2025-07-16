// src/components/grid/GridKnob.jsx

import React from "react";
import GridComponent from "./GridComponent";

const GridKnob = ({
  x,
  y,
  value = 50,
  min = 0,
  max = 100,
  tooltip,
  size = "normal",
  theme,
}) => {
  const normalizedValue = ((value - min) / (max - min)) * 100;
  const rotation = (normalizedValue / 100) * 270 - 135;
  const knobSize = size === "small" ? "w-12 h-12" : "w-16 h-16";
  const indicatorOffset = size === "small" ? "20px" : "28px";

  return (
    <GridComponent
      x={x}
      y={y}
      w={1}
      h={1}
      title={tooltip}
      theme={theme}
      className="flex items-center justify-center cursor-pointer"
    >
      <div className={`${knobSize} relative`}>
        <div
          className={`w-full h-full rounded-full ${theme.knobTrack} border-2 border-gray-400 relative`}
        >
          <div
            className="absolute w-0.5 h-4 bg-white top-2 left-1/2 transform -translate-x-1/2"
            style={{
              transform: `translateX(-50%) rotate(${rotation}deg)`,
              transformOrigin: `50% ${indicatorOffset}`,
            }}
          />
        </div>
      </div>
    </GridComponent>
  );
};

export default GridKnob;
