// src/tools/ComponentTestTool.jsx

import React, { useState } from "react";
import {
  GridButton,
  GridSlider,
  GridGraph,
  GridDisplay,
  GridStaircase,
  GridTimePicker,
} from "../components/grid";
import ToolContainer from "../components/ui/ToolContainer";
import { useTheme } from "../hooks/useTheme";

const ComponentTestTool = () => {
  const { theme } = useTheme();
  const [bipolarValue, setBipolarValue] = useState(0);
  const [unipolarValue, setUnipolarValue] = useState(0);
  const [toggleState, setToggleState] = useState(false);
  const [staircaseLevel, setStaircaseLevel] = useState(2);
  const [selectedTime, setSelectedTime] = useState("9:30 AM");

  return (
    <ToolContainer title="Component Test">
      {/* Test Buttons */}
      <GridButton
        x={0}
        y={0}
        type="momentary"
        variant="number"
        onPress={() => console.log("Number pressed")}
        tooltip="Number button"
        theme={theme}
      >
        7
      </GridButton>

      <GridButton
        x={1}
        y={0}
        type="toggle"
        variant="function"
        active={toggleState}
        onToggle={setToggleState}
        tooltip="Toggle button"
        theme={theme}
      >
        GRID
      </GridButton>

      <GridButton
        x={2}
        y={0}
        type="momentary"
        variant="default"
        onPress={() => console.log("Default pressed")}
        tooltip="Default button"
        theme={theme}
      >
        CLR
      </GridButton>

      {/* Test Staircase */}
      <GridStaircase
        x={3}
        y={0}
        value={staircaseLevel}
        onChange={setStaircaseLevel}
        tooltip={`Level: ${staircaseLevel}`}
        theme={theme}
      />

      {/* Test Sliders */}
      <GridSlider
        x={4}
        y={0}
        value={bipolarValue}
        onChange={setBipolarValue}
        variant="bipolar"
        tooltip={`Bipolar: ${bipolarValue}`}
        theme={theme}
      />

      <GridSlider
        x={5}
        y={0}
        value={unipolarValue}
        onChange={setUnipolarValue}
        variant="unipolar"
        tooltip={`Unipolar: ${unipolarValue}`}
        theme={theme}
      />

      {/* Test Time Picker */}
      <GridTimePicker
        x={8}
        y={0}
        value={selectedTime}
        onChange={setSelectedTime}
        tooltip="Select time"
        theme={theme}
      />

      {/* Test Displays */}
      <GridDisplay
        x={6}
        y={0}
        w={2}
        h={1}
        value="HELLO"
        variant="default"
        tooltip="Default display"
        theme={theme}
      />

      <GridDisplay
        x={6}
        y={1}
        w={2}
        h={1}
        value="123.45"
        variant="numeric"
        tooltip="Numeric display"
        theme={theme}
      />

      {/* Test Graph - 4x3 size */}
      <GridGraph
        x={0}
        y={1}
        w={4}
        h={3}
        xLabel="time"
        yLabel="value"
        tooltip="Test graph area"
        theme={theme}
      />

      {/* Values display */}
      <div
        className={`absolute ${theme.text} text-sm`}
        style={{ left: "0px", top: "420px" }}
      >
        Bipolar: {bipolarValue} | Unipolar: {unipolarValue} | Toggle:{" "}
        {toggleState ? "ON" : "OFF"} | Staircase: {staircaseLevel} | Time:{" "}
        {selectedTime}
      </div>
    </ToolContainer>
  );
};

export default ComponentTestTool;
