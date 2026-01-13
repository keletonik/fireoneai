"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Palette, Pencil, Sparkles, Star, Heart, Wand2 } from "lucide-react";

interface LoadingOverlayProps {
  prompt: string;
}

const funMessages = [
  { text: "Finding the perfect crayons...", icon: Palette },
  { text: "Sharpening our magic pencils...", icon: Pencil },
  { text: "Drawing beautiful outlines...", icon: Sparkles },
  { text: "Sprinkling some fairy dust...", icon: Star },
  { text: "Adding a touch of wonder...", icon: Wand2 },
  { text: "Almost ready to color...", icon: Heart },
];

// Floating shapes for visual interest
function FloatingShape({ delay, color }: { delay: number; color: string }) {
  return (
    <motion.div
      className="absolute w-4 h-4 rounded-full opacity-40"
      style={{ background: color }}
      initial={{ 
        x: Math.random() * 300 - 150,
        y: Math.random() * 200 - 100,
        scale: 0,
      }}
      animate={{ 
        x: [null, Math.random() * 100 - 50],
        y: [null, Math.random() * 100 - 50],
        scale: [0, 1, 0],
        opacity: [0, 0.6, 0],
      }}
      transition={{ 
        duration: 3,
        delay,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />
  );
}

export function LoadingOverlay({ prompt }: LoadingOverlayProps) {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % funMessages.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  const currentMessage = funMessages[messageIndex];
  const Icon = currentMessage.icon;

  const colors = ["#22d3ee", "#ec4899", "#a855f7", "#eab308", "#22c55e", "#f97316"];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden"
    >
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#1a1b2e] via-[#1c1d2e] to-[#1e1f32]" />
      
      {/* Animated background glow */}
      <motion.div
        className="absolute w-[600px] h-[600px] rounded-full blur-[120px] opacity-30"
        style={{
          background: "radial-gradient(circle, #ec4899 0%, #8b5cf6 50%, transparent 70%)",
        }}
        animate={{
          scale: [1, 1.2, 1],
          rotate: [0, 180, 360],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "linear",
        }}
      />

      {/* Floating shapes */}
      <div className="absolute inset-0 flex items-center justify-center">
        {colors.map((color, i) => (
          <FloatingShape key={i} delay={i * 0.5} color={color} />
        ))}
      </div>

      <div className="relative z-10 flex flex-col items-center gap-10 max-w-lg mx-auto px-6 text-center">
        {/* Animated icon */}
        <motion.div
          className="relative"
          animate={{ 
            scale: [1, 1.1, 1],
          }}
          transition={{ 
            duration: 2, 
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          {/* Glow rings */}
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{
              background: "conic-gradient(from 0deg, #22d3ee, #ec4899, #a855f7, #eab308, #22c55e, #22d3ee)",
              padding: "3px",
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          >
            <div className="w-full h-full rounded-full bg-[#1c1d2e]" />
          </motion.div>
          
          <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-rainbow-pink to-rainbow-purple flex items-center justify-center shadow-2xl shadow-rainbow-pink/30">
            <Sparkles className="w-10 h-10 text-white" />
          </div>
        </motion.div>

        {/* Title */}
        <div className="space-y-3">
          <h2 className="text-3xl font-bold text-white">
            Creating Magic
          </h2>
          <p className="text-white/60 text-lg max-w-sm mx-auto leading-relaxed">
            &ldquo;{prompt.slice(0, 50)}{prompt.length > 50 ? "..." : ""}&rdquo;
          </p>
        </div>

        {/* Progress messages */}
        <div className="h-10 flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={messageIndex}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="flex items-center gap-3 text-white/50"
            >
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 0.5, repeat: Infinity }}
              >
                <Icon className="w-5 h-5" />
              </motion.div>
              <span className="text-lg">{currentMessage.text}</span>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Rainbow progress bar */}
        <div className="w-full max-w-sm">
          <div className="h-2 bg-white/10 rounded-full overflow-hidden backdrop-blur-sm">
            <motion.div
              className="h-full rounded-full"
              style={{
                background: "linear-gradient(90deg, #22d3ee, #ec4899, #a855f7, #eab308, #22c55e, #f97316, #22d3ee)",
                backgroundSize: "200% 100%",
              }}
              initial={{ width: "0%" }}
              animate={{ 
                width: "100%",
                backgroundPosition: ["0% 0%", "100% 0%"],
              }}
              transition={{ 
                width: { duration: 20, ease: "linear" },
                backgroundPosition: { duration: 1.5, repeat: Infinity, ease: "linear" }
              }}
            />
          </div>
          <p className="text-white/30 text-sm mt-4">
            Usually takes 15-30 seconds ✨
          </p>
        </div>
      </div>
    </motion.div>
  );
}
