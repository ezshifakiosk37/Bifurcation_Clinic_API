
"use client";


import { useEffect, useState } from "react";
import { ScaleConfig, ScaleData, SCALES_MAP } from "@/app/_utils/scales/scales";
import { useRouter } from "next/navigation";
import Button from "./Button";


export default function LandingPage({currentUser}:{currentUser: string | null}) {
  const router = useRouter();
  const [submittedTypes, setSubmittedTypes] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const entryId = localStorage.getItem("entryId");
    if (!entryId) return;

    const check = async () => {
      try {
        const res = await fetch(`/api/check-submissions?entryId=${entryId}`);
        if (!res.ok) throw new Error("API error");

        const data = await res.json();
        console.log("Fetched submittedTypes:", data.submittedTypes); // debug
        setSubmittedTypes(data.submittedTypes || {});
      } catch (e) {
        console.error("Error checking submission:", e);
      }
    };

    check();
  }, []);

  return (
    <div className="min-h-[calc(100vh-6rem)] bg-primary/5 pb-24">
      {/* Hero Section: Maintaining the 'perfect' wave embroidery with requested gradient */}
      <div
        className="w-full h-60 sm:h-96 relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, var(--primary, #0094cf) 0%, var(--secondary, #9c2790) 100%)` }}
      >
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            {/* The background 'embroidery' wave pattern */}
            <path d="M0 100 C 20 0 50 0 100 100 Z" fill="white" />
          </svg>
        </div>
        
        <div className="relative z-10 flex flex-col items-center justify-center h-full px-3 sm:px-6 text-center">
          <div className="bg-white/20 backdrop-blur-md 
                px-3 py-1 sm:px-5 sm:py-2 
                rounded-full 
                text-white 
                text-[11px] sm:text-[14px] 
                font-black 
                uppercase 
                tracking-[0.2em] sm:tracking-[0.3em] 
                mb-4 sm:mb-6 
                border border-white/30">
            Professional Screening Tools
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tighter mb-4 drop-shadow-md">
            Select The Screening Type
          </h1>
          <p className="text-white/80 max-w-xl leading-5 md:text-lg font-medium md:leading-relaxed">
            Select a scale below to begin the assessment. These tools are clinically validated for accurate screening.
          </p>
        </div>
      </div>

      {/* Main Content Grid: Card design with theme-specific colors */}
      <div className="max-w-6xl mx-auto px-3 sm:px-6 -mt-5 md:-mt-16 relative z-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
           <div
                onClick={() => router.push(`/normalScreening`)}
                className="group relative bg-white rounded-[2.5rem] p-8 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.05)] border border-slate-100 cursor-pointer transition-all duration-500 hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.1)] hover:-translate-y-2"
              >
                {/* Card Top Section */}
                <div className="mb-6">
                  <div className="w-14 h-14 bg-primary/5 rounded-2xl flex items-center justify-center mb-6 transition-colors group-hover:bg-primary/10">
                    <svg className="w-6 h-6 text-primary group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  
                  <h2 className="text-2xl font-bold text-primary tracking-tight mb-3">
                    Daily Check-in
                  </h2>
                  <p className="text-gray-700 text-lg leading-relaxed">
                    Log your daily emotional state.
                  </p>
                </div>
                
                {/* Card Action: Using 'secondary' color as specified in the theme */}
                <div className="mt-auto">
                  <Button variant="pink">
                    Proceed →
                  </Button>
                </div>

                {/* Subtle Hover Accent */}
                <div className="absolute bottom-0 left-8 right-8 h-1 bg-primary/20 rounded-t-full transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-center"></div>
          </div>


          {
            currentUser === "Admin" &&
         
          <div
                onClick={() => router.push(`/researchCenter`)}
                className="group relative bg-white rounded-[2.5rem] p-8 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.05)] border border-slate-100 cursor-pointer transition-all duration-500 hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.1)] hover:-translate-y-2"
              >
                {/* Card Top Section */}
                <div className="mb-6">
                  <div className="w-14 h-14 bg-primary/5 rounded-2xl flex items-center justify-center mb-6 transition-colors group-hover:bg-primary/10">
                    <svg className="w-6 h-6 text-primary group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  
                  <h2 className="text-2xl font-bold text-primary tracking-tight mb-3">
                    Research Center
                  </h2>
                  <p className="text-gray-700 text-sm leading-relaxed">
                    Research EPDS Questionnaire
                  </p>
                </div>

                {/* Card Action: Using 'secondary' color as specified in the theme */}
                <div className="mt-auto">
                  <Button variant="pink">
                    Proceed →
                  </Button>
                </div>

                {/* Subtle Hover Accent */}
                <div className="absolute bottom-0 left-8 right-8 h-1 bg-primary/20 rounded-t-full transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-center"></div>
          </div>
           }
        </div>
      </div>
    </div>
  );
}

