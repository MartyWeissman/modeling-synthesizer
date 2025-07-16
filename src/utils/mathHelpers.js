// src/utils/mathHelpers.js

// Caffeine metabolism calculations
export const calculateCaffeineLevels = (doses, metabolicRate) => {
  const data = new Array(72 * 60).fill(0); // 72 hours * 60 minutes
  const startTime = new Date();
  startTime.setHours(0, 0, 0, 0);

  for (let day = 0; day < 3; day++) {
    doses.forEach(({ time, dose }) => {
      const [hours, minutes] = time.split(':').map(Number);
      const doseTime = new Date(startTime.getTime() + day * 24 * 60 * 60 * 1000);
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

  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  const padding = 40;

  ctx.clearRect(0, 0, width, height);

  // Draw grid lines
  ctx.strokeStyle = '#e0e0e0';
  ctx.lineWidth = 1;

  // Horizontal grid lines
  for (let i = 50; i <= 300; i += 50) {
    const y = height - padding - (height - 2 * padding) * i / 300;
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(width - padding, y);
    ctx.stroke();
  }

  // Vertical grid lines
  for (let i = 12; i <= 72; i += 12) {
    const x = padding + (width - 2 * padding) * i / 72;
    ctx.beginPath();
    ctx.moveTo(x, padding);
    ctx.lineTo(x, height - padding);
    ctx.stroke();
  }

  // Draw axes
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(padding, padding);
  ctx.lineTo(padding, height - padding);
  ctx.lineTo(width - padding, height - padding);
  ctx.stroke();

  // Draw x-axis labels
  ctx.fillStyle = '#000';
  ctx.font = '10px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (let i = 0; i <= 6; i++) {
    const x = padding + (width - 2 * padding) * i / 6;
    ctx.fillText(i * 12, x, height - padding + 5);
  }

  // Draw y-axis labels
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (let i = 0; i <= 6; i++) {
    const y = height - padding - (height - 2 * padding) * i / 6;
    ctx.fillText(i * 50, padding - 5, y);
  }

  // Draw data line
  if (data.length > 0) {
    ctx.beginPath();
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;

    for (let i = 0; i < data.length; i++) {
      const x = padding + (width - 2 * padding) * i / data.length;
      const y = height - padding - (height - 2 * padding) * Math.min(data[i], 300) / 300;
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
