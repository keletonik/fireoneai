"use client";

import { useState, FormEvent, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Sparkles, Loader2 } from "lucide-react";
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
      <div
        className={cn(
          "relative flex items-end gap-3",
          "bg-bg-card border-2 border-border rounded-2xl",
          "p-3 shadow-xl",
          "focus-within:border-rainbow-pink/50",
          "transition-colors duration-200"
        )}
      >
        <textarea
          ref={textareaRef}
          value={localValue}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="What would you like to color today? ✨"
          disabled={isLoading}
          rows={1}
          className={cn(
            "flex-1 bg-transparent resize-none",
            "text-text-primary placeholder:text-text-muted",
            "focus:outline-none",
            "min-h-[44px] max-h-[120px]",
            "py-2 px-1 text-lg"
          )}
        />
        <button
          type="submit"
          disabled={!localValue.trim() || isLoading}
          className={cn(
            "shrink-0 w-12 h-12 rounded-xl",
            "flex items-center justify-center",
            "bg-gradient-to-r from-rainbow-pink to-rainbow-purple",
            "text-white font-bold",
            "hover:opacity-90 hover:scale-105",
            "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100",
            "transition-all duration-200",
            "focus:outline-none focus:ring-2 focus:ring-rainbow-pink/50",
            "shadow-lg"
          )}
        >
          {isLoading ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : (
            <Sparkles className="w-6 h-6" />
          )}
        </button>
      </div>
      <p className="text-center text-text-muted text-sm mt-3">
        Press Enter to create your coloring page!
      </p>
    </motion.form>
  );
}
