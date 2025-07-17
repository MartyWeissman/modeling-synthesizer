// src/components/grid/GridInput.jsx

import React from "react";
import GridComponent from "./GridComponent";
import { getFontStyle } from "../../utils/typography";

const GridInput = ({
  x,
  y,
  w,
  h,
  type,
  value,
  onChange,
  options,
  title,
  theme,
  min,
  max,
  step,
}) => {
  return (
    <GridComponent
      x={x}
      y={y}
      w={w}
      h={h}
      title={title}
      theme={theme}
      className="p-2 flex flex-col justify-center"
    >
      {type === "select" ? (
        <select
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value))}
          className={`w-full h-8 px-2 text-xs ${theme.component} ${theme.text} border rounded`}
          style={getFontStyle("sans", "400")}
        >
          {options?.map((opt) => (
            <option key={opt} value={opt}>
              {opt}mg
            </option>
          ))}
        </select>
      ) : type === "time" ? (
        <input
          type="time"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full h-8 px-2 text-xs ${theme.component} ${theme.text} border rounded`}
          style={getFontStyle("sans", "400")}
        />
      ) : (
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          step={step || "0.1"}
          min={min || "0.1"}
          max={max || "1.0"}
          className={`w-full h-8 px-2 text-xs ${theme.component} ${theme.text} border rounded`}
          style={getFontStyle("sans", "400")}
        />
      )}
    </GridComponent>
  );
};

export default GridInput;
