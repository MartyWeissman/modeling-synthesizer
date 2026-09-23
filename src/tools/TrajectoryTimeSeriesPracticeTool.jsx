import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  GridDisplay,
  GridButton,
  GridGraph,
  GridLabel,
} from "../components/grid";
import ToolContainer from "../components/ui/ToolContainer";
import { useTheme } from "../hooks/useTheme";
import { setupCanvas } from "../utils/canvas";

const ANIMALS = [
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
const T_MAX = 10; // time runs from 0 to 10
const SAMPLES_PER_UNIT = 20; // smooth curves: 201 samples, every 20th at an integer time

const getRandomElement = (array) =>
  array[Math.floor(Math.random() * array.length)];
const randomInRange = (min, max) => Math.random() * (max - min) + min;
const randomSign = () => (Math.random() < 0.5 ? -1 : 1);

/**
 * A random trajectory: a straight line, a circle (one full turn), or a
 * spiral (two turns, inward or outward), traversed in a random direction.
 * Returns {animal1, animal2, points: [{t, x, y}], markers: [{t, x, y}]}
 * where markers are the points at t = 0, 1, ..., 10.
 */
const generateTrajectory = () => {
  const animal1 = getRandomElement(ANIMALS);
  let animal2 = getRandomElement(ANIMALS);
  while (animal2 === animal1) animal2 = getRandomElement(ANIMALS);

  const type = Math.floor(Math.random() * 3); // 0: line, 1: circle, 2: spiral
  let position; // s in [0, 1] -> {x, y}

  if (type === 0) {
    // Line: rising or falling, traversed left-to-right or right-to-left
    const low = () => randomInRange(10, 30);
    const high = () => randomInRange(70, 90);
    const leftToRight = Math.random() < 0.5;
    const rising = Math.random() < 0.5; // as seen left to right
    let x0 = low();
    let x1 = high();
    let y0 = rising ? low() : high();
    let y1 = rising ? high() : low();
    if (!leftToRight) {
      [x0, x1] = [x1, x0];
      [y0, y1] = [y1, y0];
    }
    position = (s) => ({ x: x0 + (x1 - x0) * s, y: y0 + (y1 - y0) * s });
  } else if (type === 1) {
    // Circle: one full turn, clockwise or counterclockwise
    const radius = randomInRange(25, 35);
    const startAngle = randomInRange(0, 2 * Math.PI);
    const direction = randomSign();
    position = (s) => {
      const angle = startAngle + direction * 2 * Math.PI * s;
      return { x: 50 + radius * Math.cos(angle), y: 50 + radius * Math.sin(angle) };
    };
  } else {
    // Spiral: two turns, inward or outward, clockwise or counterclockwise
    const innerRadius = randomInRange(5, 15);
    const outerRadius = randomInRange(35, 45);
    const outward = Math.random() < 0.5;
    const startAngle = randomInRange(0, 2 * Math.PI);
    const direction = randomSign();
    position = (s) => {
      const radius = outward
        ? innerRadius + (outerRadius - innerRadius) * s
        : outerRadius - (outerRadius - innerRadius) * s;
      const angle = startAngle + direction * 4 * Math.PI * s;
      return { x: 50 + radius * Math.cos(angle), y: 50 + radius * Math.sin(angle) };
    };
  }

  const n = T_MAX * SAMPLES_PER_UNIT;
  const points = [];
  for (let i = 0; i <= n; i++) {
    const t = i / SAMPLES_PER_UNIT;
    points.push({ t, ...position(t / T_MAX) });
  }
  const markers = points.filter((_, i) => i % SAMPLES_PER_UNIT === 0);
  return { animal1, animal2, points, markers };
};

const TrajectoryTimeSeriesPracticeTool = () => {
  const { theme, currentTheme } = useTheme();
  const dark = currentTheme === "dark";

  // Canvas refs
  const trajectoryCanvasRef = useRef(null);
  const timeSeriesCanvasRef = useRef(null);
  const trajectoryTransformRef = useRef(null);
  const timeSeriesTransformRef = useRef(null);

  // State for show/hide toggles (the first problem is created right away)
  const [showTrajectory, setShowTrajectory] = useState(false);
  const [showTimeSeries, setShowTimeSeries] = useState(false);
  const [currentProblem, setCurrentProblem] = useState(() =>
    generateTrajectory(),
  );

  // Colors: trajectory green; animal 1 blue (solid), animal 2 red (dashed);
  // the start (t = 0) is a ring in the text color on every plot.
  const trajectoryColor = dark ? "#22c55e" : "#16a34a";
  const color1 = dark ? "#60a5fa" : "#2563eb";
  const color2 = dark ? "#f87171" : "#dc2626";
  const startColor = dark ? "#ffffff" : "#000000";
  const DASH2 = [6, 4];

  const generateNewProblem = useCallback(() => {
    setShowTrajectory(false);
    setShowTimeSeries(false);
    setCurrentProblem(generateTrajectory());
  }, []);

  // Small dots at integer times, and a ring at t = 0
  const drawMarkers = (ctx, positions, color) => {
    ctx.fillStyle = color;
    positions.forEach((pos) => {
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 3, 0, 2 * Math.PI);
      ctx.fill();
    });
    const start = positions[0];
    ctx.strokeStyle = startColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(start.x, start.y, 6, 0, 2 * Math.PI);
    ctx.stroke();
  };

  const drawCurve = (ctx, pixels, color, dash = []) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.setLineDash(dash);
    ctx.beginPath();
    pixels.forEach((pos, index) => {
      if (index === 0) ctx.moveTo(pos.x, pos.y);
      else ctx.lineTo(pos.x, pos.y);
    });
    ctx.stroke();
    ctx.setLineDash([]);
  };

  const prepare = (canvasRef, transformRef) => {
    const transform = transformRef.current;
    if (!transform) return null;
    const setup = setupCanvas(canvasRef.current, {
      width: transform.plotWidth,
      height: transform.plotHeight,
    });
    if (!setup) return null;
    setup.ctx.clearRect(0, 0, setup.width, setup.height);
    return { ctx: setup.ctx, dataToPixel: transform.dataToPixel };
  };

  // Draw both plots after every render (cheap; also follows size changes)
  useEffect(() => {
    const traj = prepare(trajectoryCanvasRef, trajectoryTransformRef);
    if (traj && showTrajectory) {
      const { ctx, dataToPixel } = traj;
      drawCurve(
        ctx,
        currentProblem.points.map((p) => dataToPixel(p.x, p.y)),
        trajectoryColor,
      );
      drawMarkers(
        ctx,
        currentProblem.markers.map((p) => dataToPixel(p.x, p.y)),
        trajectoryColor,
      );
    }

    const ts = prepare(timeSeriesCanvasRef, timeSeriesTransformRef);
    if (ts && showTimeSeries) {
      const { ctx, dataToPixel } = ts;
      drawCurve(
        ctx,
        currentProblem.points.map((p) => dataToPixel(p.t, p.x)),
        color1,
      );
      drawCurve(
        ctx,
        currentProblem.points.map((p) => dataToPixel(p.t, p.y)),
        color2,
        DASH2,
      );
      drawMarkers(
        ctx,
        currentProblem.markers.map((p) => dataToPixel(p.t, p.x)),
        color1,
      );
      drawMarkers(
        ctx,
        currentProblem.markers.map((p) => dataToPixel(p.t, p.y)),
        color2,
      );
    }
  });

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
          Show both plots and work out how they are related. Then click New
          Plots, show only one plot, sketch the other on paper, and click Show
          to check your answer. Dots mark t = 0, 1, …, 10; the ring marks t = 0.
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
        xLabelColor={color1}
        yLabelColor={color2}
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
            style={{ display: "flex", alignItems: "center", marginBottom: "4px" }}
          >
            <div
              style={{
                width: "16px",
                borderTop: `2px solid ${color1}`,
                marginRight: "4px",
                flexShrink: 0,
              }}
            />
            <span>{currentProblem.animal1}</span>
          </div>
          <div
            style={{ display: "flex", alignItems: "center", marginBottom: "6px" }}
          >
            <div
              style={{
                width: "16px",
                borderTop: `2px dashed ${color2}`,
                marginRight: "4px",
                flexShrink: 0,
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
                border: `2px solid ${startColor}`,
                marginRight: "4px",
                flexShrink: 0,
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
            />
          );
        }}
      </GridGraph>
    </ToolContainer>
  );
};

export default TrajectoryTimeSeriesPracticeTool;
