/**
 * FyreOne AI - Minimal Intro Header
 * 
 * Ultra-clean, minimal version with refined typography and subtle elegance.
 */

import { useEffect, useState } from 'react';

export function FyreOneIntroMinimal() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="relative bg-white">
      {/* Very subtle top accent line */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-orange-500 to-transparent opacity-80" />

      <div className="max-w-3xl mx-auto px-6 py-14 sm:py-18 text-center">
        {/* Logo mark */}
        <div 
          className={`transition-all duration-500 ease-out ${
            mounted ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
          }`}
        >
          <div className="inline-flex items-center justify-center w-12 h-12 mb-5">
            <svg viewBox="0 0 40 40" fill="none" className="w-full h-full">
              {/* Stylized flame icon */}
              <path
                d="M20 4C20 4 12 14 12 22C12 26.4183 15.5817 30 20 30C24.4183 30 28 26.4183 28 22C28 14 20 4 20 4Z"
                className="fill-orange-500"
              />
              <path
                d="M20 12C20 12 16 18 16 22C16 24.2091 17.7909 26 20 26C22.2091 26 24 24.2091 24 22C24 18 20 12 20 12Z"
                className="fill-orange-300"
              />
              {/* Small inner glow */}
              <circle cx="20" cy="21" r="2" className="fill-orange-100" />
            </svg>
          </div>
        </div>

        {/* Brand name */}
        <h1 
          className={`text-3xl sm:text-4xl font-semibold tracking-tight mb-3 transition-all duration-500 delay-100 ease-out ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
          }`}
        >
          <span className="text-orange-500">Fyre</span>
          <span className="text-slate-800">One</span>
          <span className="text-slate-300 font-light ml-1.5">AI</span>
        </h1>

        {/* Subtitle */}
        <p 
          className={`text-slate-500 text-base sm:text-lg transition-all duration-500 delay-200 ease-out ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
          }`}
        >
          NSW Fire Safety Compliance Assistant
        </p>

        {/* Subtle divider */}
        <div 
          className={`mt-8 flex justify-center transition-all duration-500 delay-300 ease-out ${
            mounted ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div className="w-12 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
        </div>
      </div>
    </div>
  );
}

export default FyreOneIntroMinimal;
