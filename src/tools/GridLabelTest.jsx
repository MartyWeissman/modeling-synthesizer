// src/tools/GridLabelTest.jsx

import React from "react";
import { GridLabel } from "../components/grid";
import ToolContainer from "../components/ui/ToolContainer";
import { useTheme } from "../hooks/useTheme";

const GridLabelTest = () => {
  const { theme } = useTheme();

  return (
    <ToolContainer title="GridLabel Test" canvasWidth={6} canvasHeight={5}>
      {/* Basic label */}
      <GridLabel
        x={0}
        y={0}
        w={1}
        h={1}
        text="Basic"
        tooltip="Basic 1x1 label"
        theme={theme}
      />

      {/* Wide label */}
      <GridLabel
        x={1}
        y={0}
        w={2}
        h={1}
        text="Wide Label"
        tooltip="Wide 2x1 label"
        theme={theme}
      />

      {/* Tall label */}
      <GridLabel
        x={0}
        y={1}
        w={1}
        h={2}
        text="Tall"
        tooltip="Tall 1x2 label"
        theme={theme}
      />

      {/* Large label with custom alignment */}
      <GridLabel
        x={1}
        y={1}
        w={3}
        h={2}
        text="Large Label with Custom Text"
        fontSize="large"
        textAlign="center"
        verticalAlign="middle"
        tooltip="Large 3x2 label with custom settings"
        theme={theme}
      />

      {/* Small font size */}
      <GridLabel
        x={4}
        y={0}
        w={2}
        h={1}
        text="Small Font Label"
        fontSize="small"
        tooltip="Small font label"
        theme={theme}
      />

      {/* Left aligned */}
      <GridLabel
        x={4}
        y={1}
        w={2}
        h={1}
        text="Left Aligned"
        textAlign="left"
        tooltip="Left aligned label"
        theme={theme}
      />

      {/* Right aligned */}
      <GridLabel
        x={4}
        y={2}
        w={2}
        h={1}
        text="Right Aligned"
        textAlign="right"
        tooltip="Right aligned label"
        theme={theme}
      />

      {/* Empty label (blank area) */}
      <GridLabel
        x={0}
        y={3}
        w={1}
        h={1}
        text=""
        tooltip="Empty label (blank area)"
        theme={theme}
      />

      {/* Multi-line text */}
      <GridLabel
        x={1}
        y={3}
        w={2}
        h={1}
        text="Multi-word text that definitely wraps around"
        fontSize="medium"
        tooltip="Multi-line text label"
        theme={theme}
      />

      {/* Numbers */}
      <GridLabel
        x={3}
        y={3}
        w={1}
        h={1}
        text="123"
        fontSize="large"
        tooltip="Number label"
        theme={theme}
      />

      {/* Units */}
      <GridLabel
        x={4}
        y={3}
        w={1}
        h={1}
        text="mg"
        fontSize="medium"
        tooltip="Units label"
        theme={theme}
      />

      {/* Bottom row test */}
      <GridLabel
        x={5}
        y={3}
        w={1}
        h={1}
        text="Test"
        fontSize="small"
        tooltip="Bottom edge test"
        theme={theme}
      />

      {/* Extra row to test container size */}
      <GridLabel
        x={0}
        y={4}
        w={2}
        h={1}
        text="Bottom Row"
        fontSize="medium"
        tooltip="Bottom row label"
        theme={theme}
      />

      <GridLabel
        x={2}
        y={4}
        w={2}
        h={1}
        text="Container Size"
        fontSize="medium"
        tooltip="Container size test"
        theme={theme}
      />

      <GridLabel
        x={4}
        y={4}
        w={2}
        h={1}
        text="Fixed!"
        fontSize="medium"
        tooltip="Fixed container"
        theme={theme}
      />
    </ToolContainer>
  );
};

export default GridLabelTest;
