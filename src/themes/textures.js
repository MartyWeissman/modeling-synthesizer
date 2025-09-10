// src/themes/textures.js

// Generate noise texture patterns
export const generateNoiseTexture = (
  isDark = false,
  brightness = 1.0,
  variationAmount = 8,
) => {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");

  const imageData = ctx.createImageData(64, 64);
  const data = imageData.data;

  // Base colors with brightness adjustment
  const baseR = (isDark ? 80 : 245) * brightness;
  const baseG = (isDark ? 70 : 240) * brightness;
  const baseB = (isDark ? 60 : 230) * brightness;

  for (let i = 0; i < data.length; i += 4) {
    const variation = (Math.random() - 0.5) * variationAmount;
    data[i] = Math.max(0, Math.min(255, baseR + variation));
    data[i + 1] = Math.max(0, Math.min(255, baseG + variation));
    data[i + 2] = Math.max(0, Math.min(255, baseB + variation));
    data[i + 3] = 255;
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL();
};

// Precomputed standard textures - generated once at module load
export const LIGHT_NOISE_TEXTURE = generateNoiseTexture(false);
export const DARK_NOISE_TEXTURE = generateNoiseTexture(true);

// Precomputed variants for different brightness levels used by ToolContainer
export const LIGHT_NOISE_TEXTURE_DIM = generateNoiseTexture(false, 0.9); // 90% brightness for light theme
export const DARK_NOISE_TEXTURE_DIM = generateNoiseTexture(true, 0.85); // 85% brightness for dark theme
export const UNICORN_NOISE_TEXTURE = generateNoiseTexture(false, 0.95); // 95% brightness for unicorn theme

// Texture definitions for different materials and themes
export const textures = {
  plastic: {
    light: LIGHT_NOISE_TEXTURE,
    dark: DARK_NOISE_TEXTURE,
    lightDim: LIGHT_NOISE_TEXTURE_DIM,
    darkDim: DARK_NOISE_TEXTURE_DIM,
    unicorn: UNICORN_NOISE_TEXTURE,
  },
  // Add other materials as needed
};

// Helper function to get texture for current theme
export const getTexture = (material, theme) => {
  const isDark = theme.component.includes("gray-70");
  return (
    textures[material]?.[isDark ? "dark" : "light"] ||
    textures.plastic[isDark ? "dark" : "light"]
  );
};

// Helper function to get the appropriate cached texture based on theme mode
export const getBackgroundTexture = (theme) => {
  const isDarkMode = theme.component.includes("gray-700");
  const isUnicornMode = theme.text.includes("purple-800");

  if (isUnicornMode) {
    return UNICORN_NOISE_TEXTURE;
  } else if (isDarkMode) {
    return DARK_NOISE_TEXTURE_DIM;
  } else {
    return LIGHT_NOISE_TEXTURE_DIM;
  }
};

// Common texture styles that components can use
export const getTexturedBackground = (
  material,
  theme,
  active = false,
  activeGradient = null,
) => {
  const texture = getTexture(material, theme);

  if (active && activeGradient) {
    return {
      background: `${activeGradient}, url(${texture})`,
      backgroundSize: "cover, 64px 64px",
      backgroundBlendMode: "multiply, normal",
    };
  }

  return {
    background: `url(${texture})`,
    backgroundSize: "64px 64px",
  };
};
