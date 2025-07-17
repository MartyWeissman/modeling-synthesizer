// src/components/grid/GridScreen.jsx

import React from "react";
import GridComponent from "./GridComponent";
import { getFontStyle } from "../../utils/typography";

const GridScreen = ({
  x,
  y,
  w,
  h,
  children,
  title,
  theme,
  skinType = "minimal", // pass the current skin type
}) => {
  return (
    <GridComponent
      x={x}
      y={y}
      w={w}
      h={h}
      title={title}
      theme={theme}
      className={`${skinType === "dark" ? theme.screen + " border-2 border-gray-700" : theme.componentActive + " border"}`}
    >
      <div
        className={`w-full h-full flex items-center justify-center p-2 text-xs ${skinType === "dark" ? "" : theme.text}`}
        style={getFontStyle("mono", "400")}
      >
        {children}
      </div>
    </GridComponent>
  );
};

export default GridScreen;
