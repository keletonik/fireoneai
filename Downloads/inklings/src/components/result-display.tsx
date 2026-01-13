"use client";

import { motion } from "framer-motion";
import { Download, Printer, RefreshCw, X, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

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
      className="fixed inset-0 z-50 bg-bg-primary/98 backdrop-blur-sm flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Sparkles className="w-5 h-5 text-rainbow-yellow shrink-0" />
          <p className="text-text-secondary text-sm truncate">
            {prompt}
          </p>
        </div>
        <div className="flex items-center gap-2 ml-4">
          <button
            onClick={onRegenerate}
            disabled={isRegenerating}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-xl text-sm",
              "bg-bg-card border-2 border-border",
              "text-text-secondary hover:text-text-primary",
              "hover:border-rainbow-purple/50",
              "transition-all duration-200",
              "disabled:opacity-50"
            )}
          >
            <RefreshCw className={cn("w-4 h-4", isRegenerating && "animate-spin")} />
            <span className="hidden sm:inline">Try Again</span>
          </button>
          <button
            onClick={handleDownload}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-xl text-sm",
              "bg-bg-card border-2 border-border",
              "text-text-secondary hover:text-text-primary",
              "hover:border-rainbow-cyan/50",
              "transition-all duration-200"
            )}
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Save</span>
          </button>
          <button
            onClick={handlePrint}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold",
              "bg-gradient-to-r from-rainbow-pink to-rainbow-purple",
              "text-white",
              "hover:opacity-90",
              "transition-all duration-200"
            )}
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">Print</span>
          </button>
          <button
            onClick={onClose}
            className={cn(
              "w-10 h-10 flex items-center justify-center rounded-xl",
              "bg-bg-card border-2 border-border",
              "text-text-secondary hover:text-text-primary",
              "hover:border-rainbow-red/50",
              "transition-all duration-200"
            )}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Image display */}
      <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="relative bg-white rounded-2xl shadow-2xl overflow-hidden max-w-3xl w-full"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={`Coloring page: ${prompt}`}
            className="w-full h-auto"
          />
          {isRegenerating && (
            <div className="absolute inset-0 bg-white/90 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 border-4 border-rainbow-pink border-t-transparent rounded-full animate-spin" />
                <p className="text-bg-primary text-sm font-medium">Creating new version...</p>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Footer */}
      <div className="p-4 text-center border-t border-border">
        <p className="text-text-muted text-sm">
          🎨 Tip: Print on A4 paper at 100% scale for best results!
        </p>
      </div>
    </motion.div>
  );
}
