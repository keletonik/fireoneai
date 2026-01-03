/**
 * FyreOne AI - Premium Intro Header
 * 
 * Sophisticated intro with subtle animated gradient and refined details.
 * Professional enough for enterprise, elegant enough to impress.
 */

import { useEffect, useState } from 'react';
import { ChevronRight } from 'lucide-react';

export function FyreOneIntroPremium() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="relative overflow-hidden bg-slate-950">
      {/* Animated gradient background */}
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 50% -20%, rgba(249, 115, 22, 0.3), transparent),
            radial-gradient(ellipse 60% 40% at 80% 50%, rgba(249, 115, 22, 0.15), transparent),
            radial-gradient(ellipse 60% 40% at 20% 50%, rgba(251, 146, 60, 0.1), transparent)
          `,
        }}
      />

      {/* Subtle grid overlay */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '64px 64px',
        }}
      />

      {/* Glow orb */}
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(249, 115, 22, 0.08) 0%, transparent 60%)',
          filter: 'blur(40px)',
        }}
      />

      <div className="relative max-w-4xl mx-auto px-6 py-16 sm:py-24">
        <div className="text-center">
          {/* Badge */}
          <div 
            className={`inline-flex items-center gap-2 px-3 py-1.5 mb-6 rounded-full bg-orange-500/10 border border-orange-500/20 transition-all duration-700 ${
              mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
            <span className="text-xs font-medium text-orange-400 tracking-wide uppercase">
              AI-Powered Compliance
            </span>
          </div>

          {/* Logo & Title */}
          <h1 
            className={`text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-6 transition-all duration-700 delay-100 ${
              mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            <span className="bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600 bg-clip-text text-transparent">
              Fyre
            </span>
            <span className="text-white">One</span>
          </h1>

          {/* Tagline */}
          <p 
            className={`text-lg sm:text-xl text-slate-400 max-w-xl mx-auto mb-10 leading-relaxed transition-all duration-700 delay-200 ${
              mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            Your expert assistant for NSW fire safety compliance. 
            Navigate AFSS, NCC/BCA, and Australian Standards with confidence.
          </p>

          {/* CTA area */}
          <div 
            className={`flex flex-col sm:flex-row items-center justify-center gap-4 transition-all duration-700 delay-300 ${
              mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            <div className="flex items-center gap-6 text-sm text-slate-500">
              <span className="flex items-center gap-2">
                <CheckIcon /> AS1851 Compliance
              </span>
              <span className="flex items-center gap-2">
                <CheckIcon /> AFSS Documentation
              </span>
              <span className="flex items-center gap-2">
                <CheckIcon /> NCC/BCA Guidance
              </span>
            </div>
          </div>
        </div>

        {/* Bottom fade line */}
        <div 
          className={`absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-orange-500/30 to-transparent transition-all duration-1000 delay-500 ${
            mounted ? 'opacity-100' : 'opacity-0'
          }`}
        />
      </div>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg className="w-4 h-4 text-orange-500" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
      <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default FyreOneIntroPremium;
