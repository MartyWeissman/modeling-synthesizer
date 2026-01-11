// src/tools/RapidCoinFlipperTool.jsx

import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  GridSliderHorizontal,
  GridButton,
  GridGraphDualY,
  GridWindow,
  GridDisplay,
  GridInput,
} from "../components/grid";
import ToolContainer from "../components/ui/ToolContainer";
import { useTheme } from "../hooks/useTheme";

// Precomputed vertical scale values for 90 frames of coin flip animation (3 full rotations)
const COIN_FLIP_SCALES = Array.from({ length: 90 }, (_, i) => {
  // 3 full rotations over 90 frames = 3 * 2π radians (slower, 1.5 seconds)
  const angle = (i / 90) * 3 * 2 * Math.PI;
  return Math.abs(Math.cos(angle));
});

const RapidCoinFlipperTool = () => {
  const { theme, currentTheme } = useTheme();

  // Parameters - linked probabilities
  const [probHeads, setProbHeads] = useState(0.5);
  const [numFlips, setNumFlips] = useState(100);

  // Simulation results
  const [flipSequence, setFlipSequence] = useState([]);
  const [randomWalkData, setRandomWalkData] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [events, setEvents] = useState(null);
  const [isFlipping, setIsFlipping] = useState(false);

  // Animation state
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationFrame, setAnimationFrame] = useState(0);
  const animationRef = useRef(null);

  // Linked probability handler
  const handleProbHeadsChange = useCallback((value) => {
    // Slider gives 0-100, convert to 0-1
    setProbHeads(value / 100);
  }, []);

  // Start coin flip animation
  const startAnimation = useCallback(() => {
    setIsAnimating(true);
    setAnimationFrame(0);

    let frame = 0;
    const animate = () => {
      frame++;
      setAnimationFrame(frame);

      if (frame < 90) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setIsAnimating(false);
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  }, []);

  // Cleanup animation on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Run simulation
  const runSimulation = useCallback(() => {
    setIsFlipping(true);

    // Start the coin flip animation
    startAnimation();

    // Generate random flips
    const flips = [];
    let cumulativeDiff = 0;
    const walkData = [{ flip: 0, diff: 0 }];

    for (let i = 0; i < numFlips; i++) {
      const isHeads = Math.random() < probHeads;
      flips.push(isHeads ? "H" : "T");

      cumulativeDiff += isHeads ? 1 : -1;
      walkData.push({ flip: i + 1, diff: cumulativeDiff });
    }

    setFlipSequence(flips);
    setRandomWalkData(walkData);

    // Calculate statistics
    const numHeads = flips.filter((f) => f === "H").length;
    const numTails = flips.filter((f) => f === "T").length;
    const observedDiff = numHeads - numTails;

    const expectedHeads = numFlips * probHeads;
    const expectedTails = numFlips * (1 - probHeads);
    const expectedDiff = expectedHeads - expectedTails;

    // Standard deviation for binomial difference
    const variance = numFlips * probHeads * (1 - probHeads);
    const stdDev = 2 * Math.sqrt(variance); // Factor of 2 for difference of two binomials

    setStatistics({
      numHeads,
      numTails,
      observedDiff,
      expectedHeads,
      expectedTails,
      expectedDiff,
      stdDev,
      zScore: stdDev > 0 ? (observedDiff - expectedDiff) / stdDev : 0,
    });

    // Calculate events
    const firstH = flips.indexOf("H");
    const firstT = flips.indexOf("T");

    // Calculate longest runs with start/end positions
    let longestH = 0;
    let longestT = 0;
    let longestHStart = -1;
    let longestTStart = -1;
    let currentH = 0;
    let currentT = 0;
    let currentHStart = -1;
    let currentTStart = -1;

    for (let i = 0; i < flips.length; i++) {
      if (flips[i] === "H") {
        if (currentH === 0) currentHStart = i;
        currentH++;
        currentT = 0;
        if (currentH > longestH) {
          longestH = currentH;
          longestHStart = currentHStart;
        }
      } else {
        if (currentT === 0) currentTStart = i;
        currentT++;
        currentH = 0;
        if (currentT > longestT) {
          longestT = currentT;
          longestTStart = currentTStart;
        }
      }
    }

    setEvents({
      firstH: firstH >= 0 ? firstH + 1 : null, // 1-indexed, null if not found
      firstT: firstT >= 0 ? firstT + 1 : null,
      longestH,
      longestT,
      longestHStart, // 0-indexed
      longestHEnd: longestHStart >= 0 ? longestHStart + longestH - 1 : -1, // 0-indexed
      longestTStart, // 0-indexed
      longestTEnd: longestTStart >= 0 ? longestTStart + longestT - 1 : -1, // 0-indexed
    });

    setTimeout(() => setIsFlipping(false), 500);
  }, [probHeads, numFlips, startAnimation]);

  // Calculate dynamic y-range for random walk graph
  const getYRange = useCallback(() => {
    if (!statistics) {
      // Before first simulation, use default range
      return [-10, 10];
    }

    const exp = statistics.expectedDiff;
    const std = statistics.stdDev;

    // Find min/max of {0, exp - 3σ, exp + 3σ}
    const candidates = [0, exp - 3 * std, exp + 3 * std];
    const minVal = Math.min(...candidates);
    const maxVal = Math.max(...candidates);

    // Add 10% padding
    const range = maxVal - minVal;
    const padding = range * 0.1;

    return [minVal - padding, maxVal + padding];
  }, [statistics]);

  // Calculate left y-axis ticks (0 and expected difference)
  const getLeftYTicks = useCallback(() => {
    if (!statistics) return [0];
    return [0, Math.round(statistics.expectedDiff)].sort((a, b) => a - b);
  }, [statistics]);

  // Calculate right y-axis tick positions (expected ± 1σ, 2σ, 3σ)
  const getRightYTicks = useCallback(() => {
    if (!statistics) return [0];
    const exp = statistics.expectedDiff;
    const std = statistics.stdDev;
    // Return the actual numeric positions for the ticks
    return [
      exp - 3 * std,
      exp - 2 * std,
      exp - std,
      exp,
      exp + std,
      exp + 2 * std,
      exp + 3 * std,
    ];
  }, [statistics]);

  // Format right y-axis tick labels (μ, ±1σ, ±2σ, ±3σ)
  const getRightYTickLabels = useCallback(() => {
    if (!statistics) return ["0"];
    return ["-3σ", "-2σ", "-1σ", "μ", "+1σ", "+2σ", "+3σ"];
  }, [statistics]);

  // Draw random walk on canvas (using GridGraphDualY's internal canvas)
  const drawRandomWalk = useCallback(() => {
    setTimeout(() => {
      const graphComponent = document.querySelector(
        '[title="Random walk of cumulative heads minus tails"]',
      );
      if (!graphComponent) return;

      const canvas = graphComponent.querySelector("canvas");
      if (!canvas || randomWalkData.length === 0) return;

      const ctx = canvas.getContext("2d");
      const { width, height } = canvas;

      ctx.clearRect(0, 0, width, height);

      // Canvas is already positioned correctly by GridGraphDualY
      // Use full canvas dimensions
      const chartWidth = width;
      const chartHeight = height;

      // Data ranges - use the same range as the graph axes
      const yRange = getYRange();
      const [minDiff, maxDiff] = yRange;
      const diffRange = maxDiff - minDiff;
      const maxFlip = numFlips;

      // Helper to convert y value to pixel position
      const yToPixel = (yVal) => {
        return chartHeight - ((yVal - minDiff) / diffRange) * chartHeight;
      };

      // Draw sigma lines if we have statistics
      if (statistics) {
        const exp = statistics.expectedDiff;
        const std = statistics.stdDev;

        // Draw expectation line (gray)
        ctx.strokeStyle = currentTheme === "dark" ? "#888888" : "#666666";
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(0, yToPixel(exp));
        ctx.lineTo(chartWidth, yToPixel(exp));
        ctx.stroke();

        // Draw positive sigma lines (faded green)
        [1, 2, 3].forEach((sigma) => {
          const opacity = 0.6 - sigma * 0.15; // Fade more for higher sigma
          ctx.strokeStyle =
            currentTheme === "dark"
              ? `rgba(74, 222, 128, ${opacity})`
              : `rgba(34, 197, 94, ${opacity})`;
          ctx.lineWidth = 1;
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ctx.moveTo(0, yToPixel(exp + sigma * std));
          ctx.lineTo(chartWidth, yToPixel(exp + sigma * std));
          ctx.stroke();
        });

        // Draw negative sigma lines (faded red)
        [1, 2, 3].forEach((sigma) => {
          const opacity = 0.6 - sigma * 0.15; // Fade more for higher sigma
          ctx.strokeStyle =
            currentTheme === "dark"
              ? `rgba(248, 113, 113, ${opacity})`
              : `rgba(239, 68, 68, ${opacity})`;
          ctx.lineWidth = 1;
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ctx.moveTo(0, yToPixel(exp - sigma * std));
          ctx.lineTo(chartWidth, yToPixel(exp - sigma * std));
          ctx.stroke();
        });

        ctx.setLineDash([]);
      }

      // Draw random walk path
      ctx.strokeStyle = currentTheme === "dark" ? "#60a5fa" : "#3b82f6";
      ctx.lineWidth = 2;
      ctx.beginPath();

      randomWalkData.forEach((point, index) => {
        const x = (point.flip / maxFlip) * chartWidth;
        const y =
          chartHeight - ((point.diff - minDiff) / diffRange) * chartHeight;

        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();

      // Draw current position marker
      if (randomWalkData.length > 0) {
        const lastPoint = randomWalkData[randomWalkData.length - 1];
        const x = (lastPoint.flip / maxFlip) * chartWidth;
        const y =
          chartHeight - ((lastPoint.diff - minDiff) / diffRange) * chartHeight;

        ctx.fillStyle = currentTheme === "dark" ? "#60a5fa" : "#3b82f6";
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, 2 * Math.PI);
        ctx.fill();
      }
    }, 100);
  }, [randomWalkData, numFlips, currentTheme, getYRange, statistics]);

  // Update canvas when data changes
  useEffect(() => {
    if (randomWalkData.length > 0) {
      drawRandomWalk();
    }
  }, [randomWalkData, drawRandomWalk]);

  // Format flip sequence for display (groups of 5, lines of 50)
  const formatFlipSequence = useCallback(() => {
    if (flipSequence.length === 0) return "";

    let formatted = "";
    for (let i = 0; i < flipSequence.length; i++) {
      formatted += flipSequence[i];

      // Space every 5 characters
      if ((i + 1) % 5 === 0 && (i + 1) % 50 !== 0) {
        formatted += " ";
      }

      // New line every 50 characters
      if ((i + 1) % 50 === 0 && i + 1 < flipSequence.length) {
        formatted += "\n";
      }
    }

    return formatted;
  }, [flipSequence]);

  const probTails = 1 - probHeads;

  return (
    <ToolContainer title="Rapid Coin Flipper" canvasWidth={9} canvasHeight={6}>
      {/* Flip sequence display (GridWindow) - top left 6x2 */}
      <GridWindow x={0} y={0} w={6} h={2} title="Flip Sequence" theme={theme}>
        <div
          style={{
            padding: "6px 8px",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          {flipSequence.length === 0 && !isAnimating ? (
            <div
              style={{
                fontFamily: "monospace",
                fontSize: "14px",
                color: currentTheme === "dark" ? "#ffffff" : "#000000",
                opacity: 0.6,
              }}
            >
              Click 'Flip!' to start
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(5, 14px) 10px repeat(5, 14px) 10px repeat(5, 14px) 10px repeat(5, 14px) 10px repeat(5, 14px)",
                gap: "2px 0px",
                justifyContent: "center",
              }}
            >
              {Array.from({ length: Math.min(numFlips, 200) }, (_, i) => {
                const row = Math.floor(i / 25);
                const posInRow = i % 25;
                const groupOf5 = Math.floor(posInRow / 5);
                const posInGroup = posInRow % 5;

                // Calculate grid column: each group of 5 + spacer = 6 columns
                const gridColumn = groupOf5 * 6 + posInGroup + 1;
                const gridRow = row + 1;

                if (isAnimating) {
                  const scale = COIN_FLIP_SCALES[animationFrame] || 0;
                  const height = Math.max(2, 12 * scale);
                  return (
                    <span
                      key={i}
                      style={{
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        width: "14px",
                        height: "14px",
                        gridColumn,
                        gridRow,
                      }}
                    >
                      <span
                        style={{
                          width: "12px",
                          height: `${height}px`,
                          backgroundColor: "#c0c0c0",
                          border: `1px solid ${currentTheme === "dark" ? "#444" : "#888"}`,
                          borderRadius: "50%",
                        }}
                      />
                    </span>
                  );
                } else {
                  const letter = flipSequence[i];
                  const isFirstH = events && events.firstH === i + 1;
                  const isFirstT = events && events.firstT === i + 1;
                  const isInLongestH =
                    events &&
                    i >= events.longestHStart &&
                    i <= events.longestHEnd;
                  const isInLongestT =
                    events &&
                    i >= events.longestTStart &&
                    i <= events.longestTEnd;
                  const circleColor = isFirstH
                    ? currentTheme === "dark"
                      ? "#4ade80"
                      : "#16a34a"
                    : isFirstT
                      ? currentTheme === "dark"
                        ? "#f87171"
                        : "#dc2626"
                      : "transparent";
                  const underlineColor = isInLongestH
                    ? currentTheme === "dark"
                      ? "#4ade80"
                      : "#16a34a"
                    : isInLongestT
                      ? currentTheme === "dark"
                        ? "#f87171"
                        : "#dc2626"
                      : null;
                  const hasCircle = isFirstH || isFirstT;
                  const hasUnderline = isInLongestH || isInLongestT;
                  return (
                    <span
                      key={i}
                      style={{
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        width: "14px",
                        height: "14px",
                        gridColumn,
                        gridRow,
                        position: "relative",
                      }}
                    >
                      <span
                        style={{
                          display: "flex",
                          justifyContent: "center",
                          alignItems: "center",
                          width: "14px",
                          height: "14px",
                          fontFamily: "monospace",
                          fontSize: "13px",
                          fontWeight: "bold",
                          color:
                            currentTheme === "dark" ? "#ffffff" : "#000000",
                          borderRadius: hasCircle ? "50%" : undefined,
                          border: hasCircle
                            ? `2px solid ${circleColor}`
                            : "none",
                          boxSizing: "border-box",
                        }}
                      >
                        {letter || ""}
                      </span>
                      {hasUnderline && (
                        <span
                          style={{
                            position: "absolute",
                            bottom: "-1px",
                            left: "0",
                            right: "0",
                            height: "2px",
                            backgroundColor: underlineColor,
                          }}
                        />
                      )}
                    </span>
                  );
                }
              })}
            </div>
          )}
        </div>
      </GridWindow>

      {/* Number of flips input at (6,0) - 2x1 */}
      <GridInput
        x={6}
        y={0}
        w={2}
        h={1}
        value={numFlips}
        onChange={setNumFlips}
        min={1}
        max={200}
        step={1}
        variable="Number of Flips (N)"
        title="Number of flips"
        theme={theme}
      />

      {/* Flip button at (8,0) */}
      <GridButton
        x={8}
        y={0}
        w={1}
        h={1}
        type="momentary"
        variant="function"
        onPress={runSimulation}
        disabled={isFlipping}
        theme={theme}
      >
        {isFlipping ? "..." : "Flip!"}
      </GridButton>

      {/* P(Heads) horizontal slider at (6,1) - 3x1 */}
      <GridSliderHorizontal
        x={6}
        y={1}
        w={3}
        h={1}
        value={probHeads * 100}
        onChange={handleProbHeadsChange}
        variant="unipolar"
        label={`Prob(Heads) = ${probHeads.toFixed(2)}`}
        theme={theme}
      />

      {/* P(Tails) horizontal slider at (6,2) - 3x1 */}
      <GridSliderHorizontal
        x={6}
        y={2}
        w={3}
        h={1}
        value={probTails * 100}
        onChange={(value) => handleProbHeadsChange(100 - value)}
        variant="unipolar"
        label={`Prob(Tails) = ${probTails.toFixed(2)}`}
        theme={theme}
      />

      {/* Random walk graph - 6x3 at (0,2) */}
      <GridGraphDualY
        x={0}
        y={2}
        w={6}
        h={3}
        xLabel="Flip Number"
        yLabelLeft="Difference"
        yLabelRight=""
        xRange={[0, numFlips]}
        yRangeLeft={getYRange()}
        yRangeRight={getYRange()}
        xTicks={[
          0,
          Math.floor(numFlips / 4),
          Math.floor(numFlips / 2),
          Math.floor((3 * numFlips) / 4),
          numFlips,
        ]}
        yTicksLeft={getLeftYTicks()}
        yTicksRight={getRightYTicks()}
        yTickLabelsRight={getRightYTickLabels()}
        leftAxisColor={currentTheme === "dark" ? "#ffffff" : "#000000"}
        rightAxisColor={currentTheme === "dark" ? "#ffffff" : "#000000"}
        theme={theme}
        tooltip="Random walk of cumulative heads minus tails"
      />

      {/* Statistics display at (6,3) as 3x3 */}
      <GridDisplay
        x={6}
        y={3}
        w={3}
        h={3}
        variant="info"
        align="center"
        theme={theme}
      >
        {statistics ? (
          <div
            style={{
              padding: "8px 6px",
              fontFamily: "monospace",
              fontSize: "12px",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-start",
            }}
          >
            <div
              style={{
                textAlign: "center",
                fontWeight: "bold",
                fontSize: "13px",
                marginBottom: "4px",
              }}
            >
              Results
            </div>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                borderSpacing: "0",
              }}
            >
              <thead>
                <tr style={{ lineHeight: "1.2" }}>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "2px 4px 0px 4px",
                      fontWeight: "bold",
                    }}
                  >
                    Outcomes
                  </th>
                  <th
                    style={{
                      textAlign: "center",
                      padding: "2px 4px 0px 4px",
                      fontWeight: "bold",
                    }}
                  >
                    Expected
                  </th>
                  <th
                    style={{
                      textAlign: "right",
                      padding: "2px 4px 0px 4px",
                      fontWeight: "bold",
                    }}
                  >
                    Observed
                  </th>
                </tr>
                <tr style={{ lineHeight: "1" }}>
                  <td style={{ padding: "0px 4px" }}></td>
                  <td
                    style={{
                      textAlign: "center",
                      padding: "0px 4px",
                      fontStyle: "italic",
                    }}
                  >
                    μ ± σ
                  </td>
                  <td style={{ padding: "0px 4px" }}></td>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ textAlign: "left", padding: "2px 4px" }}>
                    Heads
                  </td>
                  <td style={{ textAlign: "center", padding: "2px 4px" }}>
                    {statistics.expectedHeads.toFixed(0)} ±{" "}
                    {(statistics.stdDev / 2).toFixed(1)}
                  </td>
                  <td style={{ textAlign: "right", padding: "2px 4px" }}>
                    {statistics.numHeads}
                  </td>
                </tr>
                <tr>
                  <td style={{ textAlign: "left", padding: "2px 4px" }}>
                    Tails
                  </td>
                  <td style={{ textAlign: "center", padding: "2px 4px" }}>
                    {statistics.expectedTails.toFixed(0)} ±{" "}
                    {(statistics.stdDev / 2).toFixed(1)}
                  </td>
                  <td style={{ textAlign: "right", padding: "2px 4px" }}>
                    {statistics.numTails}
                  </td>
                </tr>
                <tr>
                  <td style={{ textAlign: "left", padding: "2px 4px" }}>
                    Difference
                  </td>
                  <td style={{ textAlign: "center", padding: "2px 4px" }}>
                    {statistics.expectedDiff.toFixed(0)} ±{" "}
                    {statistics.stdDev.toFixed(1)}
                  </td>
                  <td style={{ textAlign: "right", padding: "2px 4px" }}>
                    {statistics.observedDiff}
                  </td>
                </tr>
              </tbody>
            </table>
            <div
              style={{
                textAlign: "center",
                marginTop: "6px",
                fontSize: "11px",
              }}
            >
              Z-score = {statistics.zScore.toFixed(1)} (
              {Math.abs(statistics.zScore) < 1
                ? "typical"
                : Math.abs(statistics.zScore) < 2
                  ? "a bit unusual"
                  : Math.abs(statistics.zScore) < 3
                    ? "unusual"
                    : "surprising"}
              )
            </div>
          </div>
        ) : (
          <div
            style={{ padding: "12px", fontSize: "14px", textAlign: "center" }}
          >
            Click "Flip!" to simulate
          </div>
        )}
      </GridDisplay>

      {/* Events display at (0,5) as 6x1 */}
      <GridDisplay
        x={0}
        y={5}
        w={6}
        h={1}
        variant="info"
        align="left"
        theme={theme}
      >
        <div
          style={{
            padding: "2px 8px",
            fontFamily: "monospace",
            fontSize: "12px",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          {events ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                width: "100%",
              }}
            >
              <div
                style={{
                  fontWeight: "bold",
                  fontSize: "13px",
                  marginBottom: "2px",
                }}
              >
                Events
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "0px 24px",
                  lineHeight: "1.3",
                }}
              >
                <span
                  style={{
                    color: currentTheme === "dark" ? "#4ade80" : "#16a34a",
                  }}
                >
                  First occurrence of H: {events.firstH ?? "—"}
                </span>
                <span
                  style={{
                    color: currentTheme === "dark" ? "#f87171" : "#dc2626",
                  }}
                >
                  First occurrence of T: {events.firstT ?? "—"}
                </span>
                <span
                  style={{
                    color: currentTheme === "dark" ? "#4ade80" : "#16a34a",
                  }}
                >
                  Longest run of H: {events.longestH}
                </span>
                <span
                  style={{
                    color: currentTheme === "dark" ? "#f87171" : "#dc2626",
                  }}
                >
                  Longest run of T: {events.longestT}
                </span>
              </div>
            </div>
          ) : (
            <div style={{ opacity: 0.6 }}>
              Events will appear after flipping
            </div>
          )}
        </div>
      </GridDisplay>
    </ToolContainer>
  );
};

export default RapidCoinFlipperTool;
