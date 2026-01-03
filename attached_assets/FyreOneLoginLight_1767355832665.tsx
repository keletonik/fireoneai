/**
 * FyreOneLoginLight.tsx
 * 
 * Light theme login/splash page for FyreOne AI
 * Features Fire Safety Grid animated background
 * 
 * Usage:
 *   <FyreOneLoginLight onSignIn={(email, password) => {...}} />
 */

import { useState, useEffect, FormEvent } from 'react';
import { FireSafetyGrid } from './FireSafetyGrid';

interface FyreOneLoginLightProps {
  onSignIn?: (email: string, password: string) => void;
  onSignUp?: () => void;
  isLoading?: boolean;
  error?: string;
}

export function FyreOneLoginLight({
  onSignIn,
  onSignUp,
  isLoading = false,
  error,
}: FyreOneLoginLightProps) {
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
    <div className="relative bg-gradient-to-b from-slate-50 to-white min-h-screen flex flex-col overflow-hidden">
      {/* Animated Background */}
      <FireSafetyGrid isDark={false} />

      {/* Top Accent Line */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-orange-500 to-transparent opacity-80 z-10" />

      {/* Main Content */}
      <div className="relative flex-1 flex flex-col items-center justify-center z-10">
        <div className="max-w-sm mx-auto px-6 py-14 text-center w-full">
          {/* Logo Icon */}
          <div
            className={`transition-all duration-500 ease-out ${
              mounted ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
            }`}
          >
            <div className="inline-flex items-center justify-center w-14 h-14 mb-5">
              <svg viewBox="0 0 40 40" fill="none" className="w-full h-full drop-shadow-lg">
                <path
                  d="M20 4C20 4 12 14 12 22C12 26.4183 15.5817 30 20 30C24.4183 30 28 26.4183 28 22C28 14 20 4 20 4Z"
                  className="fill-orange-500"
                />
                <path
                  d="M20 12C20 12 16 18 16 22C16 24.2091 17.7909 26 20 26C22.2091 26 24 24.2091 24 22C24 18 20 12 20 12Z"
                  className="fill-orange-300"
                />
                <circle cx="20" cy="21" r="2" className="fill-orange-100" />
              </svg>
            </div>
          </div>

          {/* Brand Name */}
          <h1
            className={`text-3xl font-semibold tracking-tight mb-2 transition-all duration-500 delay-100 ${
              mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
            }`}
          >
            <span className="text-orange-500">Fyre</span>
            <span className="text-slate-800">One</span>
            <span className="text-slate-300 font-light ml-1.5">AI</span>
          </h1>

          {/* Subtitle */}
          <p
            className={`text-slate-500 text-base mb-8 transition-all duration-500 delay-200 ${
              mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
            }`}
          >
            NSW Fire Safety Compliance
          </p>

          {/* Login Form */}
          <div
            className={`transition-all duration-500 delay-300 ${
              mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
            }`}
          >
            <form onSubmit={handleSubmit}>
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-xl shadow-slate-200/50 border border-slate-100">
                {error && (
                  <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
                    {error}
                  </div>
                )}

                <div className="space-y-3">
                  <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                    className="w-full px-4 py-3 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-shadow disabled:opacity-50"
                  />
                  <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    className="w-full px-4 py-3 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-shadow disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-colors shadow-lg shadow-orange-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
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

                <p className="text-sm text-slate-400 mt-4">
                  New here?{' '}
                  <button
                    type="button"
                    onClick={onSignUp}
                    className="text-orange-500 hover:underline"
                  >
                    Create account
                  </button>
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Footer - Powered by Mentaris */}
      <div
        className={`relative pb-6 text-center z-10 transition-all duration-500 delay-500 ${
          mounted ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <a
          href="https://mentaris.io"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-600 transition-colors"
        >
          <span>Powered by</span>
          <span className="inline-flex items-center font-semibold tracking-wider text-sm">
            <span className="text-slate-500">MENT</span>
            <span className="text-cyan-500">A</span>
            <span className="text-slate-500">RIS</span>
          </span>
        </a>
      </div>
    </div>
  );
}

export default FyreOneLoginLight;
