'use client'
import React, { useState } from 'react';
import { cn } from '../_utils/cn/cn';
import Button from '../_components/Button';

export type AuthResponse = {
  message?: string;
  error?: string;
  user_id?: string | number
};

const AuthPage = () => {
  const [view, setView] = useState<'signin' | 'signup'>('signup');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Sign In Logic
  async function handleSignIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const data = Object.fromEntries(formData);

    try {
      const res = await fetch('/api/auth/sign-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.username,
          password: data.password,
        }),
      });

      const result: AuthResponse = await res.json();
      if (!res.ok) throw new Error(result.error || 'Invalid credentials');

      window.location.href = '/';
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Sign Up Logic
  async function handleSignUp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const name = formData.get('username') as string;
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/sign-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, password }),
      });

      const result: AuthResponse = await res.json();
      if (!res.ok) throw new Error(result.error || 'Something went wrong');

      if (result.user_id) {
        // localStorage only stores strings, so we convert it just in case it's a number
        localStorage.setItem("user_id", String(result.user_id));
      }

      setSuccessMessage('Registered successfully! Please sign in.');
      setView('signin');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-6rem)] bg-primary/5 pb-20 font-sans transition-colors duration-500">
      {/* Hero Section with Gradient Background and Wave Effect */}
      <div
        className="w-full h-64 sm:h-80 relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, #0094cf 0%, #9c2790 100%)` }}
      >
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d="M0 100 C 20 0 50 0 100 100 Z" fill="white" />
          </svg>
        </div>

        <div className="relative z-10 flex flex-col items-center justify-center h-full px-6 text-center">
          <div className="bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full text-white text-[10px] font-black uppercase tracking-[0.3em] mb-4 border border-white/30">
            {view === 'signin' ? 'Secure Access' : 'Join Our Community'}
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight drop-shadow-sm">
            {view === 'signin' ? 'Welcome Back' : 'Create Account'}
          </h1>
          <p className="text-white/80 mt-3 max-w-xl text-sm sm:text-lg font-medium leading-relaxed">
            {view === 'signin'
              ? 'Please enter your credentials to access your secure assessment dashboard.'
              : 'Sign up today to begin your journey and track your mental well-being progress.'}
          </p>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 sm:px-6 -mt-12 relative z-20">
        <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-blue-900/5 border border-slate-100 p-8 sm:p-12 transition-all animate-in fade-in slide-in-from-bottom-8 duration-700">

          {successMessage && view === 'signin' && (
            <div className="mb-8 p-4 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center gap-3">
              <svg className="w-5 h-5 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-sm text-emerald-700 font-bold">{successMessage}</p>
            </div>
          )}

          <form className="space-y-8" onSubmit={view === 'signin' ? handleSignIn : handleSignUp}>
            {/* Username Field */}
            <div className="space-y-4">
              <label className="text-xl font-bold text-primary flex items-center gap-2">
                <span className="w-1.5 h-6 bg-secondary rounded-full"></span>
                Username
              </label>
              <input
                name="username"
                type="text"
                required
                placeholder="Enter your username"
                className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 bg-slate-50 text-black font-medium transition-all focus:border-primary focus:ring-0 focus:outline-none placeholder:text-slate-400"
              />
            </div>

            {/* Password Field */}
            <div className="space-y-4">
              <label className="text-xl font-bold text-primary flex items-center gap-2">
                <span className="w-1.5 h-6 bg-secondary rounded-full"></span>
                Password
              </label>
              <input
                name="password"
                type="password"
                required
                placeholder="••••••••"
                className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 bg-slate-50 text-black font-medium transition-all focus:border-primary focus:ring-0 focus:outline-none placeholder:text-slate-400"
              />
            </div>

            {/* Confirm Password Field (Sign Up Only) */}
            {view === 'signup' && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                <label className="text-xl font-bold text-primary flex items-center gap-2">
                  <span className="w-1.5 h-6 bg-secondary rounded-full"></span>
                  Confirm Password
                </label>
                <input
                  name="confirmPassword"
                  type="password"
                  required
                  placeholder="••••••••"
                  className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 bg-slate-50 text-black font-medium transition-all focus:border-primary focus:ring-0 focus:outline-none placeholder:text-slate-400"
                />
              </div>
            )}

            {error && (
              <div className="p-4 rounded-2xl bg-red-50 border border-red-100 flex items-center gap-3 animate-in shake duration-300">
                <svg className="w-5 h-5 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-red-600 font-bold">{error}</p>
              </div>
            )}

            <div className="pt-4">
              <Button
                type="submit"
                disabled={loading}
                className="group relative overflow-hidden"
              >
                <span className="flex items-center justify-center gap-2">
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {view === 'signin' ? 'Signing in...' : 'Registering...'}
                    </span>
                  ) : (
                    <>
                      {view === 'signin' ? 'Sign In' : 'Register'}
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="ml-1 transition-transform group-hover:translate-x-1">
                        <path d="M5 12h14m-7-7 7 7-7 7" />
                      </svg>
                    </>
                  )}
                </span>
              </Button>
            </div>
          </form>

          <div className="mt-10 pt-8 border-t border-slate-100 text-center">
            {view === 'signin' ? (
              <p className="text-slate-500 font-medium">
                Don't have an account?{' '}
                <button
                  onClick={() => { setView('signup'); setError(null); }}
                  className="font-bold text-secondary hover:underline underline-offset-4 decoration-2"
                >
                  Register here
                </button>
              </p>
            ) : (
              <p className="text-slate-500 font-medium">
                Already have an account?{' '}
                <button
                  onClick={() => { setView('signin'); setError(null); }}
                  className="font-bold text-secondary hover:underline underline-offset-4 decoration-2"
                >
                  Sign in
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
