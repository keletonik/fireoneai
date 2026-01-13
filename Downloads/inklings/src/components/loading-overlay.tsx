"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Palette, Pencil, Sparkles, Star } from "lucide-react";
import Image from "next/image";

interface LoadingOverlayProps {
  prompt: string;
}

const funMessages = [
  { text: "Finding the perfect crayons...", icon: Palette },
  { text: "Sharpening pencils...", icon: Pencil },
  { text: "Drawing the outlines...", icon: Sparkles },
  { text: "Adding some magic...", icon: Star },
  { text: "Almost ready to color...", icon: Palette },
];

export function LoadingOverlay({ prompt }: LoadingOverlayProps) {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % funMessages.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const currentMessage = funMessages[messageIndex];
  const Icon = currentMessage.icon;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-bg-primary/98 backdrop-blur-sm flex flex-col items-center justify-center"
    >
      <div className="flex flex-col items-center gap-8 max-w-md mx-auto px-4 text-center">
        {/* Animated logo */}
        <motion.div
          animate={{ 
            scale: [1, 1.1, 1],
            rotate: [0, 5, -5, 0],
          }}
          transition={{ 
            duration: 2, 
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="relative"
        >
          <Image
            src="/favicon-512.png"
            alt="Inklings"
            width={100}
            height={100}
            className="rounded-2xl"
          />
        </motion.div>

        {/* Current prompt */}
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-text-primary">
            Creating your coloring page!
          </h2>
          <p className="text-text-secondary text-lg italic">
            &ldquo;{prompt.slice(0, 60)}{prompt.length > 60 ? "..." : ""}&rdquo;
          </p>
        </div>

        {/* Progress messages */}
        <div className="h-8 flex items-center justify-center gap-2">
          <AnimatePresence mode="wait">
            <motion.div
              key={messageIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center gap-2 text-text-muted"
            >
              <Icon className="w-5 h-5" />
              <span>{currentMessage.text}</span>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Rainbow progress bar */}
        <div className="w-full max-w-xs h-2 bg-bg-card rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-rainbow-cyan via-rainbow-pink via-rainbow-purple via-rainbow-yellow via-rainbow-green to-rainbow-orange"
            style={{ backgroundSize: "200% 100%" }}
            initial={{ width: "0%" }}
            animate={{ 
              width: "100%",
              backgroundPosition: ["0% 0%", "100% 0%"],
            }}
            transition={{ 
              width: { duration: 15, ease: "linear" },
              backgroundPosition: { duration: 2, repeat: Infinity, ease: "linear" }
            }}
          />
        </div>

        <p className="text-text-subtle text-sm">
          This usually takes 10-20 seconds ✨
        </p>
      </div>
    </motion.div>
  );
}
