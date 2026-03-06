'use client'
import React, { useState } from 'react';
import { cn } from '../_utils/cn/cn';
import Button from '../_components/Button';
import { useRouter } from 'next/navigation';
import { db } from '../_utils/db';
import { users } from '../_utils/db/schema';
import { Eye, EyeOff } from 'lucide-react';

export type AuthResponse = {
  message?: string;
  error?: string;
  user_id?: string | number;
};

const SignInPage = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter()

  // Note: Standard React implementation of your handleSubmit logic
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const data = Object.fromEntries(formData);

    try {
      // Logic preserved exactly as requested
      const res = await fetch('/api/auth/sign-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.username,
          password: data.password,
        }),
      });

      const result: AuthResponse = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Invalid credentials');
      }

      console.log("user_id: " + result.user_id)

      if (result.user_id) {
        // localStorage only stores strings, so we convert it just in case it's a number
        localStorage.setItem("user_id", String(result.user_id));
      }
      // Successful login logic
      router.push('/')
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  }

  return (
    <div className="min-h-[calc(100vh-6rem)] bg-primary/5 pb-20 font-sans">
      {/* Hero Section with Gradient Background and Wave Effect */}
      <div
        className="w-full h-45 sm:h-64 md:h-80 relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, #0094cf 0%, #9c2790 100%)` }}
      >
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d="M0 100 C 20 0 50 0 100 100 Z" fill="white" />
          </svg>
        </div>

        <div className="relative z-10 flex flex-col items-center justify-center h-full px-6 text-center">
          <div className="bg-white/20 backdrop-blur-md px-4 py-1 sm:py-1.5 rounded-full text-white text-[8px] sm:text-[10px] font-black uppercase tracking-[0.3em] mb-2 sm:mb-4 border border-white/30">
            Secure Access
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight drop-shadow-sm">
            Welcome Back
          </h1>
          <p className="text-white/80 mt-2 sm:mt-3 max-w-xl text-sm sm:text-lg font-medium leading-tight sm:leading-relaxed">
            Please enter your credentials to securely access your assessment portal.
          </p>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-3 sm:px-6 -mt-5 sm:-mt-12 relative z-20">
        <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-blue-900/5 border border-slate-100 px-6 py-8 sm:p-12 transition-all animate-in fade-in slide-in-from-bottom-8 duration-700">

          <form className="space-y-6 sm:space-y-8" onSubmit={handleSubmit}>
            {/* Username Field */}
            <div className="space-y-2 sm:space-y-4">
              <label className="text-[15px] sm:text-xl font-bold text-primary flex items-center gap-2">
                <span className="w.5 h-6 bg-secondary rounded-full"></span>
                Username
              </label>
              <input
                name="username"
                type="text"
                required
                placeholder="Enter your username"
                className="w-full px-5 py-3 sm:py-4 rounded-2xl border-2 border-slate-100 bg-slate-50 text-black font-medium transition-all focus:border-primary focus:ring-0 focus:outline-none sm:placeholder:text-base placeholder:text-sm placeholder:text-slate-400"
              />
            </div>

            {/* Password Field */}
            <div className="space-y-2 sm:space-y-4 relative">
              <label className="text-[15px] sm:text-xl font-bold text-primary flex items-center gap-2">
                <span className="w-1.5 h-6 bg-secondary rounded-full"></span>
                Password
              </label>
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                required
                placeholder="••••••••"
                className="w-full px-5 py-3 sm:py-4 rounded-2xl border-2 border-slate-100 bg-slate-50 text-black font-medium transition-all focus:border-primary focus:ring-0 focus:outline-none sm:placeholder:text-base placeholder:text-sm placeholder:text-slate-400"
              />
              <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  className="absolute cursor-pointer right-5 top-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 sm:h-6 sm:w-6" />
                  ) : (
                    <Eye className="h-5 w-5 sm:h-6 sm:w-6" />
                  )}
                </button>
            </div>

            {error && (
              <div className="p-4 rounded-2xl bg-red-50 border border-red-100 flex items-center gap-3">
                <svg className="w-5 h-5 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-red-600 font-bold">{error}</p>
              </div>
            )}

            <div className="pt-2 sm:pt-4">
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
                      Signing in...
                    </span>
                  ) : (
                    <>
                      Sign In
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="ml-1 transition-transform group-hover:translate-x-1">
                        <path d="M5 12h14m-7-7 7 7-7 7" />
                      </svg>
                    </>
                  )}
                </span>
              </Button>
            </div>
          </form>

          <div className="text-sm sm:text-base mt-5 sm:mt-10 pt-4 sm:pt-8 border-t border-slate-200 text-center">
            <p className="text-slate-500 font-medium">
              Don't have an account?{' '}
              <a href="/sign-up" className="font-bold text-secondary hover:underline underline-offset-4 decoration-2">
                Register here
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignInPage;
