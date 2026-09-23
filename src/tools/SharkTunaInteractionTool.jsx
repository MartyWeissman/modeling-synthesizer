// src/tools/SharkTunaInteractionTool.jsx

import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  GridWindow,
  GridSliderHorizontal,
  GridButton,
  GridDisplay,
} from "../components/grid";
import ToolContainer from "../components/ui/ToolContainer";
import { useTheme } from "../hooks/useTheme";

const SharkTunaInteractionTool = () => {
  const { theme } = useTheme();

  // State for shark and tuna counts
  const [numSharks, setNumSharks] = useState(10);
  const [numTuna, setNumTuna] = useState(50);
  const [tunaEaten, setTunaEaten] = useState(0);

  // State for creatures on the grid
  const [sharks, setSharks] = useState([]);
  const [tuna, setTuna] = useState([]);
  const [eatenTuna, setEatenTuna] = useState([]);
  const [showEatenMarkers, setShowEatenMarkers] = useState(false);
  const markerTimeoutRef = useRef(null);

  // Cancel a pending "show eaten markers" timer on unmount
  useEffect(() => () => clearTimeout(markerTimeoutRef.current), []);

  // Grid dimensions for the 4x4 window
  const GRID_SIZE = 20; // 20x20 grid within the window

  // Generate random position within grid
  const getRandomPosition = () => ({
    x: Math.floor(Math.random() * GRID_SIZE),
    y: Math.floor(Math.random() * GRID_SIZE),
  });

  // Check if two positions are adjacent (within 1 grid unit)
  const areAdjacent = (pos1, pos2) => {
    const dx = Math.abs(pos1.x - pos2.x);
    const dy = Math.abs(pos1.y - pos2.y);
    return dx <= 1 && dy <= 1 && !(dx === 0 && dy === 0);
  };

  // Place sharks and tuna on the grid and count interactions
  const placeMarine = useCallback(() => {
    const occupiedPositions = new Set();

    // Helper function to get a unique position
    const getUniquePosition = () => {
      let attempts = 0;
      const maxAttempts = 1000; // Prevent infinite loop

      while (attempts < maxAttempts) {
        const pos = getRandomPosition();
        const key = `${pos.x},${pos.y}`;

        if (!occupiedPositions.has(key)) {
          occupiedPositions.add(key);
          return pos;
        }
        attempts++;
      }

      // Fallback: return a position even if occupied (shouldn't happen with reasonable numbers)
      return getRandomPosition();
    };

    // Generate unique positions for sharks
    const newSharks = Array.from({ length: numSharks }, (_, i) => ({
      id: i,
      ...getUniquePosition(),
    }));

    // Generate unique positions for tuna
    const newTuna = Array.from({ length: numTuna }, (_, i) => ({
      id: i,
      ...getUniquePosition(),
    }));

    // Count how many tuna are eaten (adjacent to sharks)
    let eaten = 0;
    const eatenTunaPositions = [];
    newTuna.forEach((tunaFish) => {
      const isEaten = newSharks.some((shark) => areAdjacent(shark, tunaFish));
      if (isEaten) {
        eaten++;
        eatenTunaPositions.push(tunaFish);
      }
    });

    // Update state immediately - show all tuna, track which are eaten
    setSharks(newSharks);
    setTuna(newTuna); // Show all tuna, not just survivors
    setTunaEaten(eaten);
    setEatenTuna(eatenTunaPositions);
    setShowEatenMarkers(false);

    // Show eaten markers after 1 second delay (cancel the timer from any
    // earlier placement so it cannot reveal this placement's markers early)
    clearTimeout(markerTimeoutRef.current);
    markerTimeoutRef.current = setTimeout(() => {
      setShowEatenMarkers(true);
    }, 1000);
  }, [numSharks, numTuna]);

  // Calculate positions for display
  const oceanStyle = {
    width: "100%",
    height: "100%",
    backgroundColor: "#87CEEB",
    position: "relative",
    overflow: "hidden",
  };

  return (
    <ToolContainer
      title="Shark-Tuna Interactions"
      canvasWidth={7}
      canvasHeight={4}
    >
      {/* Ocean Window (4x4 on left) */}
      <GridWindow
        x={0}
        y={0}
        w={4}
        h={4}
        tooltip="Ocean with sharks (🦈) and tuna (🐟)"
        theme={theme}
      >
        <div style={oceanStyle}>
          {/* Display sharks */}
          {sharks.map((shark) => (
            <div
              key={`shark-${shark.id}`}
              style={{
                position: "absolute",
                left: `${((shark.x + 0.5) / GRID_SIZE) * 100}%`,
                top: `${((shark.y + 0.5) / GRID_SIZE) * 100}%`,
                fontSize: "24px",
                transform: "translate(-50%, -50%)",
              }}
            >
              🦈
            </div>
          ))}

          {/* Display tuna */}
          {tuna.map((tunaFish) => (
            <div
              key={`tuna-${tunaFish.id}`}
              style={{
                position: "absolute",
                left: `${((tunaFish.x + 0.5) / GRID_SIZE) * 100}%`,
                top: `${((tunaFish.y + 0.5) / GRID_SIZE) * 100}%`,
                fontSize: "21px",
                transform: "translate(-50%, -50%)",
              }}
            >
              🐟
            </div>
          ))}

          {/* Display eaten tuna markers with delay */}
          {showEatenMarkers &&
            eatenTuna.map((deadTuna) => (
              <div
                key={`eaten-${deadTuna.id}`}
                style={{
                  position: "absolute",
                  left: `${((deadTuna.x + 0.5) / GRID_SIZE) * 100}%`,
                  top: `${((deadTuna.y + 0.5) / GRID_SIZE) * 100}%`,
                  fontSize: "20px",
                  color: "red",
                  fontWeight: "bold",
                  transform: "translate(-50%, -50%)",
                  zIndex: 10,
                  backgroundColor: "transparent",
                  textShadow: "0 0 3px rgba(255,255,255,0.8)",
                }}
              >
                ❌
              </div>
            ))}
        </div>
      </GridWindow>

      {/* Controls on the right side */}

      {/* Sharks slider */}
      <GridSliderHorizontal
        x={4}
        y={0}
        w={3}
        h={1}
        value={(numSharks / 50) * 100}
        onChange={(value) => setNumSharks(Math.round((value / 100) * 50))}
        variant="unipolar"
        label={`Number of sharks = ${numSharks}`}
        tooltip={`Sharks: ${numSharks}`}
        theme={theme}
      />

      {/* Tuna slider */}
      <GridSliderHorizontal
        x={4}
        y={1}
        w={3}
        h={1}
        value={(numTuna / 200) * 100}
        onChange={(value) => setNumTuna(Math.round((value / 100) * 200))}
        variant="unipolar"
        label={`Number of tuna = ${numTuna}`}
        tooltip={`Tuna: ${numTuna}`}
        theme={theme}
      />

      {/* Place button */}
      <GridButton
        x={4}
        y={2}
        w={3}
        h={1}
        onPress={placeMarine}
        variant="default"
        tooltip="Place sharks and tuna randomly"
        theme={theme}
      >
        Place
      </GridButton>

      {/* Results display */}
      <GridDisplay
        x={4}
        y={3}
        w={3}
        h={1}
        value={`Tuna Eaten: ${tunaEaten}\nSurviving: ${tuna.length - tunaEaten}`}
        variant="status"
        align="center"
        fontSize="medium"
        tooltip={`${tunaEaten} tuna were eaten by sharks, ${tuna.length - tunaEaten} survived`}
        theme={theme}
      />
    </ToolContainer>
  );
};

export default SharkTunaInteractionTool;
