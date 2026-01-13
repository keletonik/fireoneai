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
    <main className="min-h-screen dot-grid flex flex-col">
      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        {/* Header with logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-4 mb-12"
        >
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            <Image
              src="/logo.png"
              alt="Inklings"
              width={280}
              height={60}
              priority
              className="h-auto"
            />
          </motion.div>
          <p className="text-text-secondary text-lg text-center max-w-md">
            Turn imagination into coloring pages ✨
          </p>
          <p className="text-white/90 text-xl md:text-2xl text-center max-w-2xl mt-6 leading-relaxed font-light">
            We built this because we kept running out of ideas while coloring — hopefully it sparks some creativity for you too!
          </p>
        </motion.div>

        {/* Prompt input */}
        <div className="w-full max-w-2xl mb-10">
          <PromptInput
            value={prompt}
            onChange={setPrompt}
            onSubmit={handleSubmit}
            isLoading={isLoading}
          />
        </div>

        {/* Error display */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6 px-5 py-3 bg-rainbow-red/10 border-2 border-rainbow-red/30 rounded-xl text-rainbow-red text-sm max-w-md text-center"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Preset suggestions */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="w-full"
        >
          <p className="text-center text-text-muted text-sm mb-5">
            Or pick one of these fun ideas:
          </p>
          <PresetChips
            presets={presets}
            onSelect={handlePresetSelect}
            disabled={isLoading}
          />
        </motion.div>
      </div>

      {/* Footer */}
      <footer className="py-6 text-center border-t border-border">
        <p className="text-text-subtle text-xs">
          Made with 💖 for creative kids everywhere
        </p>
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
