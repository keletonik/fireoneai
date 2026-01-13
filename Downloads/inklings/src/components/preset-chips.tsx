"use client";

import { motion } from "framer-motion";
import { Preset } from "@/lib/presets";

// Rainbow gradient borders for chips
const chipGradients = [
  "from-rainbow-cyan to-rainbow-blue",
  "from-rainbow-pink to-rainbow-purple",
  "from-rainbow-purple to-rainbow-blue",
  "from-rainbow-yellow to-rainbow-orange",
  "from-rainbow-green to-rainbow-cyan",
  "from-rainbow-orange to-rainbow-red",
  "from-rainbow-red to-rainbow-pink",
  "from-rainbow-blue to-rainbow-purple",
];

interface PresetChipsProps {
  presets: Preset[];
  onSelect: (preset: Preset) => void;
  disabled?: boolean;
}

export function PresetChips({ presets, onSelect, disabled }: PresetChipsProps) {
  return (
    <div className="flex flex-wrap justify-center gap-3 max-w-4xl mx-auto px-4">
      {presets.map((preset, index) => (
        <motion.button
          key={preset.id}
          initial={{ opacity: 0, y: 15, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: index * 0.06, duration: 0.4, ease: "easeOut" }}
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onSelect(preset)}
          disabled={disabled}
          className="group relative disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none"
        >
          {/* Gradient border effect */}
          <div className={`absolute -inset-[2px] rounded-full bg-gradient-to-r ${chipGradients[index % chipGradients.length]} opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-[1px]`} />
          <div className={`absolute -inset-[2px] rounded-full bg-gradient-to-r ${chipGradients[index % chipGradients.length]} opacity-0 group-hover:opacity-60 transition-opacity duration-300`} />
          
          {/* Chip content */}
          <div className="relative px-5 py-2.5 rounded-full bg-[#252640] border border-white/10 group-hover:border-transparent group-hover:bg-[#2a2b4a] transition-all duration-300">
            <span className="flex items-center gap-2 text-sm font-medium text-white/70 group-hover:text-white transition-colors">
              <span className="text-base">{preset.emoji}</span>
              <span>{preset.label}</span>
            </span>
          </div>
        </motion.button>
      ))}
    </div>
  );
}
