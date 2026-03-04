import { motion } from "framer-motion";

interface AudioVisualizerProps {
  array: number[];
  activeIndices: number[];
  maxValue?: number;
}

export function AudioVisualizer({ array, activeIndices, maxValue = 100 }: AudioVisualizerProps) {
  return (
    <div className="flex items-end justify-center h-48 sm:h-64 w-full gap-1 p-4 rounded-2xl glass-panel overflow-hidden">
      {array.map((value, idx) => {
        const isActive = activeIndices.includes(idx);
        const heightPercent = Math.max(5, (value / maxValue) * 100);
        
        return (
          <motion.div
            key={idx}
            layout
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className={`w-full max-w-[12px] rounded-t-sm ${
              isActive 
                ? 'bg-accent shadow-[0_0_10px_rgba(217,70,239,0.8)]' 
                : 'bg-primary/40'
            }`}
            style={{ height: `${heightPercent}%` }}
          />
        );
      })}
    </div>
  );
}
