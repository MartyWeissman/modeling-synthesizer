// src/tools/ComponentTestTool.jsx

import React, { useState, useEffect, useRef } from "react";
import {
  GridButton,
  GridSlider,
  GridGraph,
  GridDisplay,
  GridStaircase,
  GridTimePicker,
  GridWindow,
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

  // Swimming alpha animation state
  const [animationPosition, setAnimationPosition] = useState({ x: 50, y: 50 });
  const [animationDirection, setAnimationDirection] = useState({
    dx: 2,
    dy: 1.5,
  });
  const animationRef = useRef(null);
  const isDarkMode = theme.component.includes("gray-700");
  const isUnicornMode = theme.text.includes("purple-800");

  // Swimming alpha animation
  useEffect(() => {
    const animate = () => {
      setAnimationPosition((prev) => {
        const newPos = { ...prev };
        const newDir = { ...animationDirection };

        // Update position
        newPos.x += newDir.dx;
        newPos.y += newDir.dy;

        // Bounce off circular boundary (45% radius)
        const centerX = 50;
        const centerY = 50;
        const radius = 42; // Slightly smaller than window radius
        const distance = Math.sqrt(
          Math.pow(newPos.x - centerX, 2) + Math.pow(newPos.y - centerY, 2),
        );

        if (distance > radius) {
          // Reflect off circular boundary
          const angle = Math.atan2(newPos.y - centerY, newPos.x - centerX);
          newDir.dx = -Math.cos(angle) * Math.abs(newDir.dx);
          newDir.dy = -Math.sin(angle) * Math.abs(newDir.dy);

          // Move back inside
          newPos.x = centerX + Math.cos(angle) * radius;
          newPos.y = centerY + Math.sin(angle) * radius;
        }

        setAnimationDirection(newDir);
        return newPos;
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [animationDirection]);

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

      {/* Test GridWindow with swimming alpha animation - 2x2 size */}
      <GridWindow
        x={8}
        y={1}
        w={2}
        h={2}
        variant="circular"
        tooltip="Window with swimming alpha"
        theme={theme}
      >
        {/* Swimming alpha animation */}
        <div
          className="absolute transition-none pointer-events-none"
          style={{
            left: `${animationPosition.x}%`,
            top: `${animationPosition.y}%`,
            transform: "translate(-50%, -50%)",
            fontSize: "24px",
            fontWeight: "bold",
            color: isUnicornMode
              ? "#7c3aed"
              : isDarkMode
                ? "#60a5fa"
                : "#1e40af",
            textShadow: "0 1px 2px rgba(0,0,0,0.3)",
            userSelect: "none",
          }}
        >
          α
        </div>
      </GridWindow>

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
