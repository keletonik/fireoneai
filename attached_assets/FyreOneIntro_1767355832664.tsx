/**
 * FyreOne AI - Professional Intro Header
 * 
 * A clean, elegant intro component with subtle animations.
 * Designed for a fire safety compliance assistant.
 */

import { useEffect, useState } from 'react';
import { Flame, Shield, FileCheck, Building2 } from 'lucide-react';

export function FyreOneIntro() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="relative overflow-hidden bg-gradient-to-b from-slate-50 to-white">
      {/* Subtle background pattern */}
      <div 
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23f97316' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      {/* Ambient glow */}
      <div 
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] opacity-20 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, #fed7aa 0%, transparent 70%)',
        }}
      />

      <div className="relative max-w-4xl mx-auto px-6 py-16 sm:py-20">
        {/* Logo & Title */}
        <div 
          className={`text-center transition-all duration-700 ease-out ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          {/* Icon */}
          <div className="inline-flex items-center justify-center w-16 h-16 mb-6 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg shadow-orange-500/25">
            <Flame className="w-8 h-8 text-white" />
          </div>

          {/* Brand */}
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-3">
            <span className="text-orange-500">Fyre</span>
            <span className="text-slate-800">One</span>
            <span className="text-slate-400 font-normal ml-2">AI</span>
          </h1>

          {/* Tagline */}
          <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Your NSW fire safety compliance assistant. Expert guidance on AFSS, 
            NCC/BCA provisions, and Australian Standards.
          </p>
        </div>

        {/* Feature pills */}
        <div 
          className={`flex flex-wrap justify-center gap-3 mt-10 transition-all duration-700 delay-200 ease-out ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <FeaturePill icon={<Shield className="w-4 h-4" />} text="AS1851 Compliance" />
          <FeaturePill icon={<FileCheck className="w-4 h-4" />} text="AFSS Documentation" />
          <FeaturePill icon={<Building2 className="w-4 h-4" />} text="NCC/BCA Guidance" />
        </div>

        {/* Decorative line */}
        <div 
          className={`flex items-center justify-center gap-3 mt-12 transition-all duration-700 delay-300 ease-out ${
            mounted ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div className="h-px w-16 bg-gradient-to-r from-transparent to-slate-200" />
          <div className="w-1.5 h-1.5 rounded-full bg-orange-400" />
          <div className="h-px w-16 bg-gradient-to-l from-transparent to-slate-200" />
        </div>
      </div>
    </div>
  );
}

function FeaturePill({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-slate-200 shadow-sm text-sm text-slate-600 hover:border-orange-200 hover:shadow-md transition-all duration-200">
      <span className="text-orange-500">{icon}</span>
      {text}
    </div>
  );
}

export default FyreOneIntro;
