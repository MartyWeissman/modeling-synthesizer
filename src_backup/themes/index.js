// src/themes/index.js

export const themes = {
  minimal: {
    bg: 'bg-gray-100',
    container: 'bg-gray-200',
    component: 'bg-gray-50 border-gray-300',
    componentActive: 'bg-blue-100 border-blue-400',
    componentHover: 'hover:bg-gray-100',
    screen: 'bg-gray-900 text-green-400',
    knobTrack: 'bg-gray-300',
    knobHandle: 'bg-blue-500',
    text: 'text-gray-800',
    textSecondary: 'text-gray-600',
    shadow: 'shadow-sm'
  },
  dark: {
    bg: 'bg-gray-900',
    container: 'bg-gray-800',
    component: 'bg-gray-700 border-gray-600',
    componentActive: 'bg-blue-900 border-blue-500',
    componentHover: 'hover:bg-gray-600',
    screen: 'bg-black text-green-400',
    knobTrack: 'bg-gray-600',
    knobHandle: 'bg-blue-400',
    text: 'text-gray-100',
    textSecondary: 'text-gray-300',
    shadow: 'shadow-sm shadow-black/50'
  }
};

export const CELL_SIZE = 100;

export default themes;
