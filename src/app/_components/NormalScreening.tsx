"use client";
/*options for forms (GHQ-12,WORK-STRESS ETC) */
import { useEffect, useState, useCallback } from "react";
import { ScaleConfig, SCALES_MAP } from "@/app/_utils/scales/scales";
import { useRouter } from "next/navigation";
import Button from "../_components/Button";
import DemographicForm from "./Demographic";
//import DemographicButton from "../_components/DemographicButton";

export default function NormalScreening({ currentUser }: { currentUser: string | null }) {
  const router = useRouter();
  const [submittedTypes, setSubmittedTypes] = useState<Record<string, boolean>>({});
  const [showCards, setShowCards] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkSubmissions = useCallback(async () => {
    const entryId = localStorage.getItem("entryId");

    // Case 1: No ID found, show the form immediately
    if (!entryId) {
      setShowCards(false);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/check-submissions?entryId=${entryId}`);
      
      // Case 2: ID exists but is invalid or expired in the database
      if (!res.ok) {
        throw new Error("Session expired or invalid");
      }

      const data = await res.json();
      setSubmittedTypes(data.submittedTypes || {});
      
      // Case 3: Valid ID and data found
      setShowCards(true);
    } catch (e) {
      console.error("Session reset:", e);
      // IMPORTANT: Clear the bad ID so the user can fill the form again
      localStorage.removeItem("entryId");
      localStorage.removeItem("normalDemographicData");
      setShowCards(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkSubmissions();
  }, [checkSubmissions]);

  // Debugging log - this will show the state after every render
  console.log("Current View:", showCards ? "Assessment Cards" : "Demographic Form");

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-6rem)] flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="font-bold text-primary animate-pulse">Loading your session...</p>
        </div>
      </div>
    );
  }
  return (
    <section>
      {!showCards ? (
        <DemographicForm
          currentUser={currentUser}
          onSuccess={() => {
            // This is called by the form after it saves a NEW entryId
            checkSubmissions(); 
          }}
        />
      ) : (
        <div className="min-h-[calc(100vh-6rem)] bg-primary/5 pb-24">
          {/* Hero Section */}
          <div
            className="w-full h-60 sm:h-96 relative overflow-hidden"
            style={{ background: `linear-gradient(135deg, var(--primary, #0094cf) 0%, var(--secondary, #9c2790) 100%)` }}
          >
            <div className="absolute inset-0 opacity-10 pointer-events-none">
              <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                <path d="M0 100 C 20 0 50 0 100 100 Z" fill="white" />
              </svg>
            </div>

            <div className="relative z-10 flex flex-col items-center justify-center h-full px-3 sm:px-6 text-center">
              <div className="bg-white/20 backdrop-blur-md px-4 py-1 sm:py-1.5 rounded-full text-white text-[10px] sm:text-[10px] font-black uppercase tracking-[0.3em] mb-2 sm:mb-4 border border-white/30">
                Professional Screening Tools
              </div>
              <h1 className="text-[28px] sm:text-4xl md:text-5xl font-black text-white tracking-tight drop-shadow-sm">
                Mental Health Screening
              </h1>
              <p className="text-white/80 mt-2 sm:mt-3 max-w-xl text-sm sm:text-lg font-medium leading-tight sm:leading-relaxed">
                Select a scale below to begin the assessment. These tools are clinically validated for accurate screening.
              </p>
              <div className="mt-8 sm:mt-10 md:mt-12 flex justify-center px-4">
                  <Button variant="demographic" onClick={() => setShowCards(false)}>
                    Change Demographics
                  </Button>
              </div>
            </div>
          </div>
                  
          {/* Main Content Grid */}
          <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-10 md:mt-16 relative z-20">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {Object.values(SCALES_MAP).map((s: ScaleConfig) => {
                const isSubmitted = submittedTypes[s.title];

                return (
                  <div
                    key={s.route}
                    onClick={() => router.push(`/assessment/${s.route}`)}
                    className="group relative bg-white rounded-[2.5rem] p-8 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.05)] border border-slate-100 cursor-pointer transition-all duration-500 hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.1)] hover:-translate-y-2"
                  >
                    {isSubmitted && (
                      <div className="absolute top-6 right-6 flex items-center gap-2 px-6 py-2 bg-green-50 text-green-600 rounded-full border border-green-100">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                        <span className="text-[15px] font-black uppercase tracking-wider">Submitted</span>
                      </div>
                    )}

                    <div className="mb-6">
                      <div className="w-14 h-14 bg-primary/5 rounded-2xl flex items-center justify-center mb-6 transition-colors group-hover:bg-primary/10">
                        <svg className="w-6 h-6 text-primary group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>

                      <h2 className="text-2xl font-bold text-primary tracking-tight mb-3">
                        {s.title}
                      </h2>
                      <p className="text-gray-700 text-xl leading-relaxed">
                        {s.description}
                      </p>
                    </div>

                    <div className="mt-auto">
                      <Button variant="pink">
                        {isSubmitted ? "Submit Again" : "Start Assessment →"}
                      </Button>
                    </div>
                    <div className="absolute bottom-0 left-8 right-8 h-1 bg-primary/20 rounded-t-full transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-center"></div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}