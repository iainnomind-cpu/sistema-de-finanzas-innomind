'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Image from 'next/image';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(
        error.message === 'Invalid login credentials'
          ? 'Credenciales incorrectas. Verifica tu email y contraseña.'
          : error.message
      );
      setLoading(false);
      return;
    }

    window.location.href = '/dashboard';
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #0D1B2A 0%, #1B4965 50%, #132D46 100%)' }}>
      
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Circuit-like dots inspired by Innomind logo */}
        <div className="absolute top-1/4 left-1/4 w-2 h-2 rounded-full bg-white/10 animate-pulse-soft" />
        <div className="absolute top-1/3 left-1/3 w-1.5 h-1.5 rounded-full bg-white/15" style={{ animationDelay: '0.5s' }} />
        <div className="absolute top-1/5 right-1/3 w-2.5 h-2.5 rounded-full bg-white/8" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-1/4 right-1/4 w-2 h-2 rounded-full bg-white/12 animate-pulse-soft" style={{ animationDelay: '1.5s' }} />
        <div className="absolute top-2/3 left-1/5 w-1.5 h-1.5 rounded-full bg-white/10 animate-pulse-soft" style={{ animationDelay: '0.7s' }} />
        
        {/* Subtle line connectors */}
        <div className="absolute top-0 left-1/2 w-px h-full bg-gradient-to-b from-transparent via-white/5 to-transparent" />
        <div className="absolute top-1/2 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />
      </div>

      <div className="relative z-10 w-full max-w-md px-6">
        {/* Logo & Brand */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center justify-center w-20 h-20 mb-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 shadow-xl">
            <Image
              src="/logo.png"
              alt="Innomind Logo"
              width={56}
              height={56}
              className="rounded-lg"
            />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-wide">INNOMIND</h1>
          <p className="text-sm text-brand-300 mt-1 tracking-widest uppercase">Finance Hub</p>
        </div>

        {/* Login Card */}
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl p-8 animate-fade-in"
          style={{ animationDelay: '0.15s' }}>
          
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-white">Iniciar Sesión</h2>
            <p className="text-sm text-brand-300 mt-1">Accede a tu panel financiero</p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-400/30 text-red-200 text-sm animate-fade-in">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-brand-200 mb-1.5">
                Correo electrónico
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="tu@innomind.mx"
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-brand-400
                  focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent
                  transition-all duration-200"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-brand-200 mb-1.5">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-brand-400
                  focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent
                  transition-all duration-200"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl font-semibold text-white
                bg-gradient-to-r from-brand-600 to-brand-500 
                hover:from-brand-500 hover:to-brand-400
                focus:outline-none focus:ring-2 focus:ring-brand-400 focus:ring-offset-2 focus:ring-offset-brand-900
                disabled:opacity-50 disabled:cursor-not-allowed
                shadow-lg shadow-brand-900/30
                transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Ingresando...
                </span>
              ) : (
                'Ingresar'
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-brand-400 mt-6 animate-fade-in" style={{ animationDelay: '0.3s' }}>
          Innomind Finance Hub · Make it better with AI
        </p>
      </div>
    </div>
  );
}
