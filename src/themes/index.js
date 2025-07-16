// src/themes/index.js

export const themes = {
  light: {
    bg: "bg-gray-100",
    container: "bg-gray-200",
    component: "bg-gray-50 border-gray-300",
    componentActive: "bg-blue-100 border-blue-400",
    componentHover: "hover:bg-gray-100",
    screen: "bg-gray-900 text-green-400",
    knobTrack: "bg-gray-300",
    knobHandle: "bg-blue-500",
    text: "text-gray-800",
    textSecondary: "text-gray-600",
    shadow: "shadow-sm",
  },
  dark: {
    bg: "bg-gray-900",
    container: "bg-gray-800",
    component: "bg-gray-700 border-gray-600",
    componentActive: "bg-blue-900 border-blue-500",
    componentHover: "hover:bg-gray-600",
    screen: "bg-black text-green-400",
    knobTrack: "bg-gray-600",
    knobHandle: "bg-blue-400",
    text: "text-gray-100",
    textSecondary: "text-gray-300",
    shadow: "shadow-sm shadow-black/50",
  },
  unicorn: {
    bg: "bg-gradient-to-br from-pink-50 to-purple-50",
    container: "bg-gradient-to-br from-pink-100 to-purple-100",
    component: "bg-gradient-to-br from-white to-pink-50 border-pink-200",
    componentActive:
      "bg-gradient-to-br from-pink-100 to-purple-100 border-purple-300",
    componentHover:
      "hover:bg-gradient-to-br hover:from-pink-50 hover:to-purple-50",
    screen: "bg-gradient-to-br from-purple-900 to-pink-900 text-yellow-300",
    knobTrack: "bg-gradient-to-r from-pink-200 to-purple-200",
    knobHandle: "bg-gradient-to-r from-yellow-300 to-pink-300",
    text: "text-purple-800",
    textSecondary: "text-purple-600",
    shadow: "shadow-lg shadow-pink-200/50",
  },
};

export const CELL_SIZE = 100;

export { textures, getTexture, getTexturedBackground } from "./textures";

export default themes;
