// src/utils/mathHelpers.js

// Caffeine metabolism calculations
export const calculateCaffeineLevels = (doses, metabolicRate) => {
  const data = new Array(72 * 60).fill(0); // 72 hours * 60 minutes
  const startTime = new Date();
  startTime.setHours(0, 0, 0, 0);

  for (let day = 0; day < 3; day++) {
    doses.forEach(({ time, dose }) => {
      const [hours, minutes] = time.split(":").map(Number);
      const doseTime = new Date(
        startTime.getTime() + day * 24 * 60 * 60 * 1000,
      );
      doseTime.setHours(hours, minutes);
      const startIndex = Math.floor((doseTime - startTime) / (1000 * 60));

      for (let j = 0; j < 60; j++) {
        if (startIndex + j < data.length) {
          data[startIndex + j] += dose / 60;
        }
      }
    });
  }

  for (let i = 1; i < data.length; i++) {
    data[i] += data[i - 1] * Math.exp(-metabolicRate / 60);
  }

  return data;
};

// Canvas plotting utilities
export const drawCaffeineGraph = (canvas, data) => {
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  const padding = 40;

  ctx.clearRect(0, 0, width, height);

  // Draw grid lines
  ctx.strokeStyle = "#e0e0e0";
  ctx.lineWidth = 1;

  // Horizontal grid lines
  for (let i = 50; i <= 300; i += 50) {
    const y = height - padding - ((height - 2 * padding) * i) / 300;
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(width - padding, y);
    ctx.stroke();
  }

  // Vertical grid lines
  for (let i = 12; i <= 72; i += 12) {
    const x = padding + ((width - 2 * padding) * i) / 72;
    ctx.beginPath();
    ctx.moveTo(x, padding);
    ctx.lineTo(x, height - padding);
    ctx.stroke();
  }

  // Draw axes
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(padding, padding);
  ctx.lineTo(padding, height - padding);
  ctx.lineTo(width - padding, height - padding);
  ctx.stroke();

  // Draw x-axis labels
  ctx.fillStyle = "#000";
  ctx.font = "10px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  for (let i = 0; i <= 6; i++) {
    const x = padding + ((width - 2 * padding) * i) / 6;
    ctx.fillText(i * 12, x, height - padding + 5);
  }

  // Draw y-axis labels
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  for (let i = 0; i <= 6; i++) {
    const y = height - padding - ((height - 2 * padding) * i) / 6;
    ctx.fillText(i * 50, padding - 5, y);
  }

  // Draw data line
  if (data.length > 0) {
    ctx.beginPath();
    ctx.strokeStyle = "#3b82f6";
    ctx.lineWidth = 2;

    for (let i = 0; i < data.length; i++) {
      const x = padding + ((width - 2 * padding) * i) / data.length;
      const y =
        height -
        padding -
        ((height - 2 * padding) * Math.min(data[i], 300)) / 300;
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
  }
};

// General math utilities
export const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export const lerp = (start, end, factor) => start + (end - start) * factor;

export const formatNumber = (num, decimals = 2) => {
  return Number(num).toFixed(decimals);
};

// Time utilities
export const getCurrentCaffeineLevel = (data) => {
  if (data.length === 0) return 0;
  const now = new Date();
  const minutes = now.getHours() * 60 + now.getMinutes();
  return Math.round(data[minutes] || 0);
};

export const calculateHalfLife = (metabolicRate) => {
  return Math.round(0.693 / metabolicRate);
};

// Linear regression utilities
export const calculateLinearRegression = (points) => {
  if (!points || points.length < 2) {
    return {
      slope: 0,
      intercept: 0,
      rSquared: 0,
      isValid: false,
    };
  }

  const n = points.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  let sumYY = 0;

  // Calculate sums
  for (const point of points) {
    sumX += point.x;
    sumY += point.y;
    sumXY += point.x * point.y;
    sumXX += point.x * point.x;
    sumYY += point.y * point.y;
  }

  // Calculate slope (m) and intercept (b) for y = mx + b
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // Calculate R-squared (coefficient of determination)
  const meanY = sumY / n;
  let ssRes = 0; // Sum of squares of residuals
  let ssTot = 0; // Total sum of squares

  for (const point of points) {
    const predicted = slope * point.x + intercept;
    ssRes += Math.pow(point.y - predicted, 2);
    ssTot += Math.pow(point.y - meanY, 2);
  }

  const rSquared = ssTot === 0 ? 1 : 1 - ssRes / ssTot;

  return {
    slope,
    intercept,
    rSquared,
    isValid: true,
    pointCount: n,
  };
};

// Generate points for regression line within given bounds
export const generateRegressionLine = (
  slope,
  intercept,
  xRange,
  numPoints = 100,
) => {
  const [xMin, xMax] = xRange;
  const points = [];

  for (let i = 0; i <= numPoints; i++) {
    const x = xMin + (xMax - xMin) * (i / numPoints);
    const y = slope * x + intercept;
    points.push({ x, y });
  }

  return points;
};

// Calculate correlation coefficient (Pearson's r)
export const calculateCorrelation = (points) => {
  if (!points || points.length < 2) return 0;

  const n = points.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  let sumYY = 0;

  for (const point of points) {
    sumX += point.x;
    sumY += point.y;
    sumXY += point.x * point.y;
    sumXX += point.x * point.x;
    sumYY += point.y * point.y;
  }

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt(
    (n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY),
  );

  return denominator === 0 ? 0 : numerator / denominator;
};

// Statistical utilities for regression
export const calculateStandardError = (points, slope, intercept) => {
  if (!points || points.length < 3) return 0;

  let sumSquaredResiduals = 0;
  for (const point of points) {
    const predicted = slope * point.x + intercept;
    sumSquaredResiduals += Math.pow(point.y - predicted, 2);
  }

  return Math.sqrt(sumSquaredResiduals / (points.length - 2));
};

// Validate regression data points
export const validateRegressionData = (points) => {
  if (!Array.isArray(points))
    return { isValid: false, error: "Data must be an array" };
  if (points.length < 2)
    return { isValid: false, error: "Need at least 2 data points" };

  for (let i = 0; i < points.length; i++) {
    const point = points[i];
    if (!point || typeof point !== "object") {
      return { isValid: false, error: `Invalid point at index ${i}` };
    }
    if (typeof point.x !== "number" || typeof point.y !== "number") {
      return {
        isValid: false,
        error: `Point at index ${i} must have numeric x and y values`,
      };
    }
    if (!isFinite(point.x) || !isFinite(point.y)) {
      return {
        isValid: false,
        error: `Point at index ${i} contains infinite or NaN values`,
      };
    }
  }

  return { isValid: true };
};
