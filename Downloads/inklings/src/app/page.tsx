"use client";

import { useState, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { PromptInput } from "@/components/prompt-input";
import { PresetChips } from "@/components/preset-chips";
import { ResultDisplay } from "@/components/result-display";
import { LoadingOverlay } from "@/components/loading-overlay";
import { getRandomPresets, type Preset } from "@/lib/presets";

interface GenerationResult {
  success: boolean;
  image?: string;
  prompt?: string;
  error?: string;
}

// Floating blob component
function FloatingBlob({ color, size, left, top, delay }: { 
  color: string; size: number; left: string; top: string; delay: number 
}) {
  return (
    <motion.div
      className="absolute rounded-full blur-3xl opacity-20 pointer-events-none"
      style={{
        background: color,
        width: size,
        height: size,
        left,
        top,
      }}
      animate={{
        x: [0, 30, -20, 0],
        y: [0, -40, 20, 0],
        scale: [1, 1.1, 0.9, 1],
      }}
      transition={{
        duration: 15 + delay,
        repeat: Infinity,
        ease: "easeInOut",
        delay,
      }}
    />
  );
}

// Sparkle component
function Sparkle({ style }: { style: React.CSSProperties }) {
  return (
    <motion.div
      className="absolute pointer-events-none"
      style={style}
      animate={{
        opacity: [0, 1, 0],
        scale: [0.5, 1, 0.5],
        rotate: [0, 180],
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut",
        delay: Math.random() * 2,
      }}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path
          d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z"
          fill="currentColor"
          className="text-rainbow-yellow"
        />
      </svg>
    </motion.div>
  );
}

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [presets, setPresets] = useState<Preset[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPresets(getRandomPresets(8));
  }, []);

  const generateImage = useCallback(async (promptText: string) => {
    if (!promptText.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: promptText,
          width: 1024,
          height: 1024,
        }),
      });

      const data: GenerationResult = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to generate image");
      }

      setResult(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(message);
      console.error("Generation error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSubmit = (submittedPrompt: string) => {
    setPrompt(submittedPrompt);
    generateImage(submittedPrompt);
  };

  const handlePresetSelect = (preset: Preset) => {
    setPrompt(preset.prompt);
    generateImage(preset.prompt);
  };

  const handleRegenerate = () => {
    if (prompt) {
      generateImage(prompt);
    }
  };

  const handleClose = () => {
    setResult(null);
    setPrompt("");
    setPresets(getRandomPresets(8));
  };

  return (
    <main className="min-h-screen relative overflow-hidden">
      {/* Animated gradient background */}
      <div className="fixed inset-0 bg-gradient-to-br from-[#1a1b2e] via-[#1c1d2e] to-[#1e1f32]" />
      
      {/* Floating blobs */}
      <FloatingBlob color="#ec4899" size={400} left="10%" top="20%" delay={0} />
      <FloatingBlob color="#8b5cf6" size={350} left="70%" top="10%" delay={2} />
      <FloatingBlob color="#22d3ee" size={300} left="80%" top="60%" delay={4} />
      <FloatingBlob color="#eab308" size={250} left="5%" top="70%" delay={1} />
      <FloatingBlob color="#22c55e" size={200} left="50%" top="80%" delay={3} />
      
      {/* Sparkles */}
      <Sparkle style={{ left: "15%", top: "25%" }} />
      <Sparkle style={{ left: "85%", top: "15%" }} />
      <Sparkle style={{ left: "75%", top: "70%" }} />
      <Sparkle style={{ left: "25%", top: "65%" }} />
      <Sparkle style={{ left: "90%", top: "45%" }} />
      <Sparkle style={{ left: "5%", top: "40%" }} />
      
      {/* Grid overlay */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '50px 50px',
        }}
      />
      
      {/* Main content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-12 min-h-screen">
        {/* Header with logo */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="flex flex-col items-center gap-6 mb-14"
        >
          {/* Logo with glow effect */}
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="relative"
          >
            {/* Glow behind logo */}
            <div className="absolute inset-0 blur-2xl opacity-50 scale-150">
              <div className="w-full h-full bg-gradient-to-r from-rainbow-pink via-rainbow-purple to-rainbow-cyan rounded-full" />
            </div>
            <Image
              src="/logo.png"
              alt="Inklings"
              width={320}
              height={70}
              priority
              className="h-auto relative z-10 drop-shadow-2xl"
            />
          </motion.div>
          
          {/* Tagline with gradient */}
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-xl text-center max-w-md bg-gradient-to-r from-rainbow-cyan via-rainbow-pink to-rainbow-purple bg-clip-text text-transparent font-medium"
          >
            Turn imagination into coloring pages ✨
          </motion.p>
          
          {/* Personal message in a nice card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="relative mt-4"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-rainbow-pink/20 via-rainbow-purple/20 to-rainbow-cyan/20 rounded-2xl blur-xl" />
            <div className="relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl px-8 py-5 max-w-2xl">
              <p className="text-white/80 text-lg md:text-xl text-center leading-relaxed font-light">
                We built this because we kept running out of ideas while coloring — hopefully it sparks some creativity for you too!
              </p>
            </div>
          </motion.div>
        </motion.div>

        {/* Prompt input with glow */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="w-full max-w-2xl mb-12 relative group"
        >
          {/* Input glow */}
          <div className="absolute -inset-1 bg-gradient-to-r from-rainbow-cyan via-rainbow-pink to-rainbow-purple rounded-2xl blur-lg opacity-30 group-hover:opacity-50 transition-opacity" />
          <div className="relative">
            <PromptInput
              value={prompt}
              onChange={setPrompt}
              onSubmit={handleSubmit}
              isLoading={isLoading}
            />
          </div>
        </motion.div>

        {/* Error display */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="mb-8 px-6 py-4 bg-rainbow-red/10 border border-rainbow-red/30 rounded-2xl text-rainbow-red text-sm max-w-md text-center backdrop-blur-sm"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Preset suggestions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="w-full"
        >
          <p className="text-center text-white/40 text-sm mb-6 font-medium tracking-wide uppercase">
            ✦ Or try one of these ideas ✦
          </p>
          <PresetChips
            presets={presets}
            onSelect={handlePresetSelect}
            disabled={isLoading}
          />
        </motion.div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 py-8 text-center">
        <div className="flex items-center justify-center gap-2 text-white/30 text-sm">
          <span>Made with</span>
          <motion.span
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            💖
          </motion.span>
          <span>for creative kids everywhere</span>
        </div>
      </footer>

      {/* Loading overlay */}
      <AnimatePresence>
        {isLoading && !result && <LoadingOverlay prompt={prompt} />}
      </AnimatePresence>

      {/* Result display */}
      <AnimatePresence>
        {result?.image && (
          <ResultDisplay
            imageUrl={result.image}
            prompt={result.prompt || prompt}
            onClose={handleClose}
            onRegenerate={handleRegenerate}
            isRegenerating={isLoading}
          />
        )}
      </AnimatePresence>
    </main>
  );
}
