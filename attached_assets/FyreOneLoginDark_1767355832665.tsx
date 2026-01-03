/**
 * FyreOneLoginDark.tsx
 * 
 * Premium dark theme login/splash page for FyreOne AI
 * Features Fire Safety Grid animated background with orange glow accents
 * 
 * Usage:
 *   <FyreOneLoginDark onSignIn={(email, password) => {...}} />
 */

import { useState, useEffect, FormEvent } from 'react';
import { FireSafetyGrid } from './FireSafetyGrid';

interface FyreOneLoginDarkProps {
  onSignIn?: (email: string, password: string) => void;
  onSignUp?: () => void;
  isLoading?: boolean;
  error?: string;
}

export function FyreOneLoginDark({
  onSignIn,
  onSignUp,
  isLoading = false,
  error,
}: FyreOneLoginDarkProps) {
  const [mounted, setMounted] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSignIn?.(email, password);
  };

  return (
    <div className="relative overflow-hidden bg-slate-950 min-h-screen flex flex-col">
      {/* Animated Background */}
      <FireSafetyGrid isDark={true} />

      {/* Gradient Overlays */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 50% -20%, rgba(249, 115, 22, 0.12), transparent),
            radial-gradient(ellipse 60% 40% at 80% 80%, rgba(249, 115, 22, 0.08), transparent)
          `,
        }}
      />

      {/* Main Content */}
      <div className="relative flex-1 flex flex-col items-center justify-center z-10">
        <div className="max-w-4xl mx-auto px-6 py-16 text-center w-full">
          {/* Badge */}
          <div
            className={`inline-flex items-center gap-2 px-3 py-1.5 mb-6 rounded-full bg-orange-500/10 border border-orange-500/20 backdrop-blur-sm transition-all duration-700 ${
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
            className={`text-5xl sm:text-6xl font-bold tracking-tight mb-4 transition-all duration-700 delay-100 ${
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
            className={`text-lg text-slate-400 max-w-xl mx-auto mb-10 transition-all duration-700 delay-200 ${
              mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            Your expert assistant for NSW fire safety compliance
          </p>

          {/* Login Form */}
          <div
            className={`max-w-sm mx-auto transition-all duration-700 delay-300 ${
              mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            <form onSubmit={handleSubmit}>
              <div className="bg-slate-900/70 backdrop-blur-md rounded-2xl border border-slate-800/80 p-6 shadow-2xl">
                {error && (
                  <div className="mb-4 p-3 rounded-lg bg-red-900/30 border border-red-800 text-red-400 text-sm">
                    {error}
                  </div>
                )}

                <div className="space-y-3">
                  <input
                    type="email"
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                    className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all disabled:opacity-50"
                  />
                  <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-xl font-medium transition-all shadow-lg shadow-orange-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                            fill="none"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        Signing in...
                      </span>
                    ) : (
                      'Sign in'
                    )}
                  </button>
                </div>

                <p className="text-center text-sm text-slate-500 mt-4">
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={onSignUp}
                    className="text-orange-400 hover:text-orange-300 transition-colors"
                  >
                    Sign up
                  </button>
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Footer - Powered by Mentaris */}
      <div
        className={`relative pb-8 text-center z-10 transition-all duration-700 delay-500 ${
          mounted ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <a
          href="https://mentaris.io"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-300 transition-colors"
        >
          <span>Powered by</span>
          <span className="inline-flex items-center font-semibold tracking-wider text-sm">
            <span className="text-slate-500">MENT</span>
            <span className="text-cyan-400">A</span>
            <span className="text-slate-500">RIS</span>
          </span>
        </a>
      </div>

      {/* Bottom Accent Line */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-orange-500/40 to-transparent" />
    </div>
  );
}

export default FyreOneLoginDark;
