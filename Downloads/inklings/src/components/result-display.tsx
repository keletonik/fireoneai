"use client";

import { motion } from "framer-motion";
import { Download, Printer, RefreshCw, X, Sparkles, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface ResultDisplayProps {
  imageUrl: string;
  prompt: string;
  onClose: () => void;
  onRegenerate: () => void;
  isRegenerating?: boolean;
}

export function ResultDisplay({
  imageUrl,
  prompt,
  onClose,
  onRegenerate,
  isRegenerating = false,
}: ResultDisplayProps) {
  const [downloaded, setDownloaded] = useState(false);

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = imageUrl;
    const filename = prompt
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .slice(0, 30);
    link.download = `inklings-${filename}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 2000);
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Inklings - ${prompt}</title>
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body { 
                display: flex; 
                justify-content: center; 
                align-items: center; 
                min-height: 100vh;
                background: white;
              }
              img { 
                max-width: 100%; 
                max-height: 100vh; 
                object-fit: contain;
              }
              @media print {
                body { background: white; }
                img { width: 100%; height: auto; page-break-inside: avoid; }
              }
            </style>
          </head>
          <body>
            <img src="${imageUrl}" alt="Coloring page: ${prompt}" onload="window.print(); window.close();" />
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col overflow-hidden"
    >
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#1a1b2e] via-[#1c1d2e] to-[#1e1f32]" />
      
      {/* Subtle glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-gradient-to-r from-rainbow-pink/10 to-rainbow-purple/10 blur-[100px] pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rainbow-yellow to-rainbow-orange flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <p className="text-white/60 text-sm truncate">
            {prompt}
          </p>
        </div>
        <div className="flex items-center gap-2 ml-4">
          <motion.button
            onClick={onRegenerate}
            disabled={isRegenerating}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium",
              "bg-white/5 border border-white/10",
              "text-white/70 hover:text-white hover:bg-white/10",
              "transition-all duration-200",
              "disabled:opacity-50"
            )}
          >
            <RefreshCw className={cn("w-4 h-4", isRegenerating && "animate-spin")} />
            <span className="hidden sm:inline">Try Again</span>
          </motion.button>
          <motion.button
            onClick={handleDownload}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium",
              "bg-white/5 border border-white/10",
              "text-white/70 hover:text-white hover:bg-white/10",
              "transition-all duration-200"
            )}
          >
            {downloaded ? <Check className="w-4 h-4 text-rainbow-green" /> : <Download className="w-4 h-4" />}
            <span className="hidden sm:inline">{downloaded ? "Saved!" : "Save"}</span>
          </motion.button>
          <motion.button
            onClick={handlePrint}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold",
              "bg-gradient-to-r from-rainbow-pink to-rainbow-purple",
              "text-white shadow-lg shadow-rainbow-pink/20",
              "hover:shadow-rainbow-pink/40",
              "transition-all duration-200"
            )}
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">Print</span>
          </motion.button>
          <motion.button
            onClick={onClose}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={cn(
              "w-10 h-10 flex items-center justify-center rounded-xl",
              "bg-white/5 border border-white/10",
              "text-white/50 hover:text-white hover:bg-white/10",
              "transition-all duration-200"
            )}
          >
            <X className="w-5 h-5" />
          </motion.button>
        </div>
      </div>

      {/* Image display */}
      <div className="relative z-10 flex-1 flex items-center justify-center p-6 overflow-auto">
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ delay: 0.1, type: "spring", damping: 20 }}
          className="relative"
        >
          {/* Decorative border glow */}
          <div className="absolute -inset-1 bg-gradient-to-r from-rainbow-cyan via-rainbow-pink to-rainbow-purple rounded-2xl blur-sm opacity-50" />
          
          {/* Image container */}
          <div className="relative bg-white rounded-2xl shadow-2xl overflow-hidden max-w-3xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt={`Coloring page: ${prompt}`}
              className="w-full h-auto"
            />
            {isRegenerating && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 bg-white/95 flex items-center justify-center"
              >
                <div className="flex flex-col items-center gap-4">
                  <div className="relative">
                    <div className="w-16 h-16 border-4 border-rainbow-pink/30 rounded-full" />
                    <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-rainbow-pink rounded-full animate-spin" />
                  </div>
                  <p className="text-gray-600 font-medium">Creating a new masterpiece...</p>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Footer */}
      <div className="relative z-10 p-4 text-center border-t border-white/10">
        <p className="text-white/30 text-sm">
          🎨 Pro tip: Print on A4 paper at 100% scale for best coloring results!
        </p>
      </div>
    </motion.div>
  );
}
