import type React from "react";
import { motion } from "framer-motion";
import type { VisualizerTheme } from "@/lib/shop";
import { getRainbowStyle } from "@/lib/shop";

interface AudioVisualizerProps {
  array: number[];
  activeIndices: number[];
  maxValue?: number;
  theme?: VisualizerTheme;
}

export function AudioVisualizer({ array, activeIndices, maxValue = 100, theme = 'default' }: AudioVisualizerProps) {
  return (
    <div className="flex items-end justify-center h-48 sm:h-64 w-full gap-1 p-4 rounded-2xl glass-panel overflow-hidden">
      {array.map((value, idx) => {
        const isActive = activeIndices.includes(idx);
        const heightPercent = Math.max(5, (value / maxValue) * 100);

        let className = `w-full max-w-[12px] rounded-t-sm `;
        let style: React.CSSProperties = { height: `${heightPercent}%` };

        if (theme === 'rainbow') {
          style = { ...style, ...getRainbowStyle(idx, array.length, isActive) };
        } else if (theme === 'neon-green') {
          className += isActive
            ? 'bg-green-400 shadow-[0_0_10px_rgba(74,222,128,0.8)]'
            : 'bg-green-400/40';
        } else if (theme === 'ocean-blue') {
          className += isActive
            ? 'bg-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.8)]'
            : 'bg-blue-400/40';
        } else if (theme === 'sunset') {
          className += isActive
            ? 'bg-orange-400 shadow-[0_0_10px_rgba(251,146,60,0.8)]'
            : 'bg-orange-400/40';
        } else if (theme === 'matrix') {
          className += isActive
            ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]'
            : 'bg-emerald-400/20';
        } else {
          className += isActive
            ? 'bg-accent shadow-[0_0_10px_rgba(217,70,239,0.8)]'
            : 'bg-primary/40';
        }

        return (
          <motion.div
            key={idx}
            transition={{ duration: 0 }}
            className={className}
            style={style}
          />
        );
      })}
    </div>
  );
}
