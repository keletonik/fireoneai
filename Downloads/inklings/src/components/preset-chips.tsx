"use client";

import { motion } from "framer-motion";
import { Preset } from "@/lib/presets";
import { cn } from "@/lib/utils";

// Rainbow colors for chips
const chipColors = [
  "hover:border-rainbow-cyan/60 hover:bg-rainbow-cyan/10",
  "hover:border-rainbow-pink/60 hover:bg-rainbow-pink/10",
  "hover:border-rainbow-purple/60 hover:bg-rainbow-purple/10",
  "hover:border-rainbow-yellow/60 hover:bg-rainbow-yellow/10",
  "hover:border-rainbow-green/60 hover:bg-rainbow-green/10",
  "hover:border-rainbow-orange/60 hover:bg-rainbow-orange/10",
  "hover:border-rainbow-red/60 hover:bg-rainbow-red/10",
  "hover:border-rainbow-blue/60 hover:bg-rainbow-blue/10",
];

interface PresetChipsProps {
  presets: Preset[];
  onSelect: (preset: Preset) => void;
  disabled?: boolean;
}

export function PresetChips({ presets, onSelect, disabled }: PresetChipsProps) {
  return (
    <div className="flex flex-wrap justify-center gap-3 max-w-3xl mx-auto">
      {presets.map((preset, index) => (
        <motion.button
          key={preset.id}
          initial={{ opacity: 0, y: 10, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: index * 0.05, duration: 0.3 }}
          onClick={() => onSelect(preset)}
          disabled={disabled}
          className={cn(
            "px-4 py-2.5 rounded-full text-sm font-medium",
            "bg-bg-card border-2 border-border",
            "text-text-secondary hover:text-text-primary",
            "transition-all duration-200",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "focus:outline-none focus:ring-2 focus:ring-rainbow-cyan/50",
            "active:scale-95",
            chipColors[index % chipColors.length]
          )}
        >
          <span className="mr-2">{preset.emoji}</span>
          {preset.label}
        </motion.button>
      ))}
    </div>
  );
}
