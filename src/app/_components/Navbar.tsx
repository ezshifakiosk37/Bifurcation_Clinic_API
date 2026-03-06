'use client'
import React, { useState } from 'react';
import { cn } from '../_utils/cn/cn';
import Button from './Button';
import Image from 'next/image';
import logo from '../../../public/logo.png'
import app from '../../../app.json'
const Navbar = () => {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleSignOut = async () => {
    setIsLoggingOut(true);
    try {
      const res = await fetch('/api/auth/sign-out', {
        method: 'POST',
      });
      
      if (res.ok) {
        localStorage.removeItem("normalDemographicData")
        localStorage.removeItem("researchDemographicData")
        localStorage.removeItem("user_id")
        localStorage.removeItem("entryId")
        console.log("demographicData and researchDemographicData successfully removed")
        // Redirect to sign-in page
        window.location.href = '/sign-in';
      } else {
        console.error("Logout failed");
      }
    } catch (err) {
      console.error("Error during sign out:", err);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleSelectionRedirect = () => {
    window.location.href = '/';
  };

  return (
    <section className="z-50 w-full">
      <nav className="h-20 sm:h-24 bg-white/70 backdrop-blur-xl border-b border-slate-100 flex items-center justify-between px-2 sm:px-12 shadow-sm shadow-blue-900/5">

        {/* Logo Placeholder - Matches the branding theme */}
        <div className="flex relative items-center">
          <Image
            alt="logo"
            src={logo}
            width={140}
            height={40}
            className="w-40 md:w-56 h-auto transition-opacity hover:opacity-90"
            priority
          />
          <span className="absolute -top-1 -right-6 text-[10px] md:text-[12px] font-bold text-primary tracking-wider px-1 sm:px-1.5 sm:py-0.5 rounded-md border border-slate-100 shadow-sm">
            v{app.version}
          </span>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-4">
          <Button
            onClick={handleSignOut}
            disabled={isLoggingOut}
            className="w-auto px-4 py-3 sm:px-6 sm:py-2.5 text-[13px] sm:text-sm rounded-xl"
          >
            <span className="flex items-center gap-2">
              {isLoggingOut ? (
                <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              )}
              {isLoggingOut ? 'Leaving...' : 'Sign out'}
            </span>
          </Button>
        </div>
      </nav>

      {/* Floating bottom-right navigation button */}
      <button
        className="fixed bottom-20 right-6 sm:right-6 w-12 h-12 sm:w-16 sm:h-16 bg-white rounded-full flex items-center justify-center cursor-pointer z-50 transition-all hover:scale-110 shadow-black/30 shadow-lg group"
        onClick={handleSelectionRedirect}
        aria-label="Go to Selection"
      >
        <div className="relative w-5 h-5 sm:w-7 sm:h-7 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#0094cf" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </div>
  
      </button>
    </section>
  );
};

export default Navbar;



