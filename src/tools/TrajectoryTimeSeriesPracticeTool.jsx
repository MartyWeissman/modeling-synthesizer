import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  GridDisplay,
  GridButton,
  GridGraph,
  GridLabel,
} from "../components/grid";
import ToolContainer from "../components/ui/ToolContainer";
import { useTheme } from "../hooks/useTheme";

const TrajectoryTimeSeriesPracticeTool = () => {
  const { theme, currentTheme } = useTheme();

  // Canvas refs
  const trajectoryCanvasRef = useRef(null);
  const timeSeriesCanvasRef = useRef(null);
  const trajectoryTransformRef = useRef(null);
  const timeSeriesTransformRef = useRef(null);

  // State for show/hide toggles
  const [showTrajectory, setShowTrajectory] = useState(false);
  const [showTimeSeries, setShowTimeSeries] = useState(false);
  const [currentProblem, setCurrentProblem] = useState(null);

  // Random helpers
  const getRandomElement = (array) =>
    array[Math.floor(Math.random() * array.length)];
  const randomInRange = (min, max) => Math.random() * (max - min) + min;

  // Generate trajectory data
  const generateTrajectory = useCallback(() => {
    const animals = [
      "sharks",
      "tuna",
      "rabbits",
      "foxes",
      "lions",
      "zebras",
      "wolves",
      "deer",
      "owls",
      "mice",
      "hawks",
      "sparrows",
      "cats",
    ];

    const animal1 = getRandomElement(animals);
    let animal2 = getRandomElement(animals);
    while (animal2 === animal1) {
      animal2 = getRandomElement(animals);
    }

    const trajectoryType = Math.floor(Math.random() * 3); // 0: line, 1: circle, 2: spiral
    const numPoints = 11; // 11 points for times t=0,1,2,...,10
    const points = [];

    if (trajectoryType === 0) {
      // Ascending or descending line
      const isAscending = Math.random() > 0.5;
      const startX = randomInRange(10, 30);
      const startY = isAscending
        ? randomInRange(10, 30)
        : randomInRange(70, 90);
      const endX = randomInRange(70, 90);
      const endY = isAscending ? randomInRange(70, 90) : randomInRange(10, 30);

      for (let i = 0; i < numPoints; i++) {
        const t = i / (numPoints - 1);
        const x = startX + (endX - startX) * t + randomInRange(-2, 2);
        const y = startY + (endY - startY) * t + randomInRange(-2, 2);
        points.push({ x, y, t: i });
      }
    } else if (trajectoryType === 1) {
      // Circle
      const centerX = 50;
      const centerY = 50;
      const radius = randomInRange(25, 35);
      const startAngle = randomInRange(0, 2 * Math.PI);

      for (let i = 0; i < numPoints; i++) {
        const angle = startAngle + (i / numPoints) * 2 * Math.PI;
        const x = centerX + radius * Math.cos(angle) + randomInRange(-1, 1);
        const y = centerY + radius * Math.sin(angle) + randomInRange(-1, 1);
        points.push({ x, y, t: i });
      }
    } else {
      // Spiral
      const centerX = 50;
      const centerY = 50;
      const startRadius = randomInRange(5, 15);
      const endRadius = randomInRange(35, 45);
      const startAngle = randomInRange(0, 2 * Math.PI);
      const spiralDirection = Math.random() > 0.5 ? 1 : -1; // inward or outward

      for (let i = 0; i < numPoints; i++) {
        const t = i / (numPoints - 1);
        const radius =
          spiralDirection > 0
            ? startRadius + (endRadius - startRadius) * t
            : endRadius - (endRadius - startRadius) * t;
        const angle = startAngle + (i / numPoints) * 4 * Math.PI;
        const x = centerX + radius * Math.cos(angle) + randomInRange(-1, 1);
        const y = centerY + radius * Math.sin(angle) + randomInRange(-1, 1);
        points.push({ x, y, t: i });
      }
    }

    return { animal1, animal2, points };
  }, []);

  // Generate new problem
  const generateNewProblem = useCallback(() => {
    // Reset reveals
    setShowTrajectory(false);
    setShowTimeSeries(false);

    const trajectory = generateTrajectory();
    setCurrentProblem(trajectory);
  }, [generateTrajectory]);

  // Draw trajectory plot
  const drawTrajectory = useCallback(() => {
    const canvas = trajectoryCanvasRef.current;
    const transform = trajectoryTransformRef.current;
    if (!canvas || !transform || !currentProblem) return;

    const ctx = canvas.getContext("2d");
    const { dataToPixel } = transform;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!showTrajectory) return;

    // Draw trajectory in green
    ctx.strokeStyle = currentTheme === "dark" ? "#22c55e" : "#16a34a";
    ctx.lineWidth = 2;
    ctx.beginPath();

    currentProblem.points.forEach((point, index) => {
      const pos = dataToPixel(point.x, point.y);

      if (index === 0) {
        ctx.moveTo(pos.x, pos.y);
      } else {
        ctx.lineTo(pos.x, pos.y);
      }
    });

    ctx.stroke();

    // Draw start point (darker green)
    const startPoint = currentProblem.points[0];
    const startPos = dataToPixel(startPoint.x, startPoint.y);
    ctx.fillStyle = currentTheme === "dark" ? "#15803d" : "#14532d";
    ctx.beginPath();
    ctx.arc(startPos.x, startPos.y, 5, 0, 2 * Math.PI);
    ctx.fill();
  }, [currentProblem, showTrajectory, currentTheme]);

  // Draw time series plot
  const drawTimeSeries = useCallback(() => {
    const canvas = timeSeriesCanvasRef.current;
    const transform = timeSeriesTransformRef.current;
    if (!canvas || !transform || !currentProblem) return;

    const ctx = canvas.getContext("2d");
    const { dataToPixel } = transform;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!showTimeSeries) return;

    // Draw both time series (x and y vs time)
    const colors = [
      currentTheme === "dark" ? "#60a5fa" : "#2563eb", // animal1 (x)
      currentTheme === "dark" ? "#f87171" : "#dc2626", // animal2 (y)
    ];

    // Draw animal1 (x coordinate vs time)
    ctx.strokeStyle = colors[0];
    ctx.lineWidth = 2;
    ctx.beginPath();

    currentProblem.points.forEach((point, index) => {
      const pos = dataToPixel(point.t, point.x);

      if (index === 0) {
        ctx.moveTo(pos.x, pos.y);
      } else {
        ctx.lineTo(pos.x, pos.y);
      }
    });

    ctx.stroke();

    // Draw animal2 (y coordinate vs time)
    ctx.strokeStyle = colors[1];
    ctx.lineWidth = 2;
    ctx.beginPath();

    currentProblem.points.forEach((point, index) => {
      const pos = dataToPixel(point.t, point.y);

      if (index === 0) {
        ctx.moveTo(pos.x, pos.y);
      } else {
        ctx.lineTo(pos.x, pos.y);
      }
    });

    ctx.stroke();

    // Draw start markers at t=0 for both series
    if (currentProblem.points.length > 0) {
      const startPoint = currentProblem.points[0];

      // Animal1 start marker (blue)
      const pos1 = dataToPixel(0, startPoint.x);
      ctx.fillStyle = colors[0];
      ctx.beginPath();
      ctx.arc(pos1.x, pos1.y, 5, 0, 2 * Math.PI);
      ctx.fill();

      // Animal2 start marker (red)
      const pos2 = dataToPixel(0, startPoint.y);
      ctx.fillStyle = colors[1];
      ctx.beginPath();
      ctx.arc(pos2.x, pos2.y, 5, 0, 2 * Math.PI);
      ctx.fill();
    }
  }, [currentProblem, showTimeSeries, currentTheme]);

  // Redraw when visibility or problem changes
  useEffect(() => {
    drawTrajectory();
  }, [drawTrajectory]);

  useEffect(() => {
    drawTimeSeries();
  }, [drawTimeSeries]);

  // Generate initial problem on mount
  React.useEffect(() => {
    if (!currentProblem) {
      generateNewProblem();
    }
  }, [currentProblem, generateNewProblem]);

  if (!currentProblem) {
    return (
      <ToolContainer
        title="Trajectory & Time Series Practice"
        canvasWidth={11}
        canvasHeight={7}
      >
        <GridDisplay
          x={0}
          y={0}
          w={6}
          h={1}
          variant="info"
          fontSize="large"
          theme={theme}
        >
          Loading...
        </GridDisplay>
      </ToolContainer>
    );
  }

  return (
    <ToolContainer
      title="Trajectory & Time Series Practice"
      canvasWidth={9}
      canvasHeight={6}
    >
      {/* Instructions Display */}
      <GridDisplay
        x={0}
        y={0}
        w={9}
        h={1}
        variant="info"
        align="center"
        fontSize="large"
        theme={theme}
      >
        <div style={{ padding: "8px", fontSize: "16px" }}>
          Click New Plots to get started. Show the plots, and figure out how
          they are related to each other. When you are ready, click a new plot,
          and show only one of the plots (the trajectory or the time series).
          Try to figure out the other plot on a sheet of paper. Use the "Show"
          button to check your answer, and repeat!
        </div>
      </GridDisplay>

      {/* Trajectory Show Button */}
      <GridButton
        x={0}
        y={1}
        w={1}
        h={1}
        type="toggle"
        active={showTrajectory}
        onToggle={setShowTrajectory}
        theme={theme}
      >
        <div style={{ fontSize: "16px" }}>
          {showTrajectory ? "Hide" : "Show"}
        </div>
      </GridButton>

      {/* Trajectory Plot Label */}
      <GridLabel
        x={1}
        y={1}
        w={2}
        h={1}
        text="Trajectory Plot"
        textAlign="left"
        fontWeight="bold"
        fontSize="small"
        theme={theme}
      />

      {/* New Plots Button - centered */}
      <GridButton
        x={4}
        y={1}
        w={1}
        h={1}
        type="momentary"
        onPress={generateNewProblem}
        theme={theme}
      >
        <div
          style={{ textAlign: "center", lineHeight: "1.1", fontSize: "16px" }}
        >
          <div>New</div>
          <div>Plots</div>
        </div>
      </GridButton>

      {/* Trajectory Plot */}
      <GridGraph
        x={0}
        y={2}
        w={4}
        h={4}
        xLabel={currentProblem.animal1}
        yLabel={currentProblem.animal2}
        xLabelColor={currentTheme === "dark" ? "#60a5fa" : "#2563eb"}
        yLabelColor={currentTheme === "dark" ? "#f87171" : "#dc2626"}
        xRange={[0, 100]}
        yRange={[0, 100]}
        xTicks={[0, 25, 50, 75, 100]}
        yTicks={[0, 25, 50, 75, 100]}
        variant="default"
        theme={theme}
      >
        {(transform) => {
          trajectoryTransformRef.current = transform;
          return (
            <canvas
              ref={trajectoryCanvasRef}
              className="absolute pointer-events-none"
              style={transform.plotStyle}
              width={transform.plotWidth}
              height={transform.plotHeight}
            />
          );
        }}
      </GridGraph>

      {/* Legend for Time Series */}
      <GridDisplay
        x={4}
        y={2}
        w={1}
        h={2}
        variant="info"
        align="left"
        fontSize="small"
        theme={theme}
      >
        <div style={{ padding: "4px", fontSize: "11px", lineHeight: "1.4" }}>
          <div style={{ fontWeight: "bold", marginBottom: "4px" }}>Legend</div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: "4px",
            }}
          >
            <div
              style={{
                width: "16px",
                height: "2px",
                backgroundColor:
                  currentTheme === "dark" ? "#60a5fa" : "#2563eb",
                marginRight: "4px",
              }}
            />
            <span>{currentProblem.animal1}</span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: "6px",
            }}
          >
            <div
              style={{
                width: "16px",
                height: "2px",
                backgroundColor:
                  currentTheme === "dark" ? "#f87171" : "#dc2626",
                marginRight: "4px",
              }}
            />
            <span>{currentProblem.animal2}</span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              fontSize: "10px",
              opacity: 0.9,
            }}
          >
            <div
              style={{
                width: "10px",
                height: "10px",
                borderRadius: "50%",
                backgroundColor:
                  currentTheme === "dark" ? "#6b7280" : "#9ca3af",
                marginRight: "4px",
              }}
            />
            <span>Start</span>
          </div>
        </div>
      </GridDisplay>

      {/* Time Series Show Button */}
      <GridButton
        x={6}
        y={1}
        w={1}
        h={1}
        type="toggle"
        active={showTimeSeries}
        onToggle={setShowTimeSeries}
        theme={theme}
      >
        <div style={{ fontSize: "16px" }}>
          {showTimeSeries ? "Hide" : "Show"}
        </div>
      </GridButton>

      {/* Time Series Plot Label */}
      <GridLabel
        x={7}
        y={1}
        w={2}
        h={1}
        text="Time Series Plot"
        textAlign="left"
        fontWeight="bold"
        fontSize="small"
        theme={theme}
      />

      {/* Time Series Plot */}
      <GridGraph
        x={5}
        y={2}
        w={4}
        h={4}
        xLabel="time"
        yLabel="population"
        xRange={[0, 10]}
        yRange={[0, 100]}
        xTicks={[0, 5, 10]}
        yTicks={[0, 25, 50, 75, 100]}
        variant="time-series-static"
        theme={theme}
      >
        {(transform) => {
          timeSeriesTransformRef.current = transform;
          return (
            <canvas
              ref={timeSeriesCanvasRef}
              className="absolute pointer-events-none"
              style={transform.plotStyle}
              width={transform.plotWidth}
              height={transform.plotHeight}
            />
          );
        }}
      </GridGraph>
    </ToolContainer>
  );
};

export default TrajectoryTimeSeriesPracticeTool;
