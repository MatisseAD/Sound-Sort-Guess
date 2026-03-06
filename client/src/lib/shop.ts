import type React from "react";

export type VisualizerTheme = 'default' | 'neon-green' | 'ocean-blue' | 'sunset' | 'rainbow' | 'matrix';

export interface ShopItem {
  id: string;
  name: string;
  description: string;
  price: number;
  type: 'theme';
  themeId: VisualizerTheme;
  emoji: string;
}

export const SHOP_ITEMS: ShopItem[] = [
  {
    id: 'theme-neon-green',
    name: 'Neon Green',
    description: 'Bright neon green visualizer bars',
    price: 100,
    type: 'theme',
    themeId: 'neon-green',
    emoji: '🟢',
  },
  {
    id: 'theme-ocean-blue',
    name: 'Ocean Blue',
    description: 'Deep ocean blue visualizer bars',
    price: 150,
    type: 'theme',
    themeId: 'ocean-blue',
    emoji: '🔵',
  },
  {
    id: 'theme-sunset',
    name: 'Sunset',
    description: 'Warm orange-red sunset gradient',
    price: 200,
    type: 'theme',
    themeId: 'sunset',
    emoji: '🌅',
  },
  {
    id: 'theme-matrix',
    name: 'Matrix',
    description: 'Dark green Matrix-style bars',
    price: 250,
    type: 'theme',
    themeId: 'matrix',
    emoji: '💚',
  },
  {
    id: 'theme-rainbow',
    name: 'Rainbow',
    description: 'Full spectrum rainbow colors based on position',
    price: 300,
    type: 'theme',
    themeId: 'rainbow',
    emoji: '🌈',
  },
];

export function getThemeColors(theme: VisualizerTheme, index: number, total: number): { active: string; inactive: string } {
  switch (theme) {
    case 'neon-green':
      return {
        active: 'bg-green-400 shadow-[0_0_10px_rgba(74,222,128,0.8)]',
        inactive: 'bg-green-400/40',
      };
    case 'ocean-blue':
      return {
        active: 'bg-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.8)]',
        inactive: 'bg-blue-400/40',
      };
    case 'sunset':
      return {
        active: 'bg-orange-400 shadow-[0_0_10px_rgba(251,146,60,0.8)]',
        inactive: 'bg-orange-400/40',
      };
    case 'matrix':
      return {
        active: 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]',
        inactive: 'bg-emerald-400/20',
      };
    case 'rainbow': {
      const hue = Math.round((index / total) * 360);
      return {
        active: `hsl-rainbow-active-${hue}`,
        inactive: `hsl-rainbow-inactive-${hue}`,
      };
    }
    default:
      return {
        active: 'bg-accent shadow-[0_0_10px_rgba(217,70,239,0.8)]',
        inactive: 'bg-primary/40',
      };
  }
}

export function getRainbowStyle(index: number, total: number, isActive: boolean): React.CSSProperties {
  const hue = Math.round((index / total) * 360);
  if (isActive) {
    return {
      backgroundColor: `hsl(${hue}, 90%, 60%)`,
      boxShadow: `0 0 10px hsl(${hue}, 90%, 60%)`,
    };
  }
  return {
    backgroundColor: `hsl(${hue}, 70%, 40%)`,
    opacity: 0.5,
  };
}
