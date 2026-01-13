"use client";

import { useState, FormEvent, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Sparkles, Loader2, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PromptInputProps {
  onSubmit: (prompt: string) => void;
  isLoading?: boolean;
  value?: string;
  onChange?: (value: string) => void;
}

export function PromptInput({
  onSubmit,
  isLoading = false,
  value = "",
  onChange,
}: PromptInputProps) {
  const [localValue, setLocalValue] = useState(value);
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, [localValue]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (localValue.trim() && !isLoading) {
      onSubmit(localValue.trim());
    }
  };

  const handleChange = (newValue: string) => {
    setLocalValue(newValue);
    onChange?.(newValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <motion.form
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      onSubmit={handleSubmit}
      className="w-full max-w-2xl mx-auto"
    >
      <div className="relative group">
        {/* Animated gradient border */}
        <div 
          className={cn(
            "absolute -inset-[2px] rounded-2xl transition-opacity duration-500",
            "bg-gradient-to-r from-rainbow-cyan via-rainbow-pink to-rainbow-purple",
            isFocused ? "opacity-100" : "opacity-40"
          )}
          style={{
            backgroundSize: "200% 200%",
            animation: "gradient-shift 3s ease infinite",
          }}
        />
        
        {/* Inner container */}
        <div className="relative bg-[#1e1f32] rounded-2xl p-4 shadow-2xl">
          <div className="flex items-end gap-3">
            {/* Wand icon */}
            <div className="hidden sm:flex shrink-0 w-10 h-10 items-center justify-center text-white/30">
              <Wand2 className="w-5 h-5" />
            </div>
            
            <textarea
              ref={textareaRef}
              value={localValue}
              onChange={(e) => handleChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="Describe your perfect coloring page..."
              disabled={isLoading}
              rows={1}
              className={cn(
                "flex-1 bg-transparent resize-none",
                "text-white placeholder:text-white/30",
                "focus:outline-none",
                "min-h-[48px] max-h-[120px]",
                "py-2 text-lg leading-relaxed"
              )}
            />
            
            {/* Submit button with animated gradient */}
            <motion.button
              type="submit"
              disabled={!localValue.trim() || isLoading}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={cn(
                "shrink-0 w-14 h-14 rounded-xl",
                "flex items-center justify-center",
                "bg-gradient-to-br from-rainbow-pink via-rainbow-purple to-rainbow-cyan",
                "text-white font-bold",
                "disabled:opacity-30 disabled:cursor-not-allowed",
                "transition-all duration-300",
                "focus:outline-none",
                "shadow-lg shadow-rainbow-pink/25"
              )}
              style={{
                backgroundSize: "200% 200%",
                animation: isLoading ? "none" : "gradient-shift 3s ease infinite",
              }}
            >
              {isLoading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <Sparkles className="w-6 h-6" />
              )}
            </motion.button>
          </div>
        </div>
      </div>
      
      <p className="text-center text-white/30 text-sm mt-4 font-medium">
        Press Enter or click the sparkle button to create magic ✨
      </p>
      
      {/* Gradient shift animation */}
      <style jsx>{`
        @keyframes gradient-shift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
    </motion.form>
  );
}
