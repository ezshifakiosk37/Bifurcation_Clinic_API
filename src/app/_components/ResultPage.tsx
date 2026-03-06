"use client";

import React, { useEffect, useState } from "react";
// Import from local constants
import { questionnairesConfig } from "../_utils/questionnairesConfig";

// Type for result fetched from API
type Result = {
  id: number;
  questionnaireType: string;
  totalScore: number;
  created_at: string;
};

// Utility function to get classification and color dynamically
const getClassificationAndColor = (questionnaireType: string, score: number) => {
  const config = questionnairesConfig[questionnaireType];
  if (!config) return { classification: "Unknown", color: "text-gray-500" };

  const range = config.scoreRanges.find((r: any) => score >= r.min && score <= r.max);
  if (!range) return { classification: "Unknown", color: "text-gray-500" };

  return { classification: range.classification, color: range.color };
};

const getScoreMeta = (questionnaireType: string, score: number) => {
  const config = questionnairesConfig[questionnaireType];
  if (!config) return null;

  const percentage = Math.min(100, (score / config.maxScore) * 100);

  return {
    maxScore: config.maxScore,
    percentage,
    ranges: config.scoreRanges
  };
};

const ResultPage = () => {
  const [results, setResults] = useState<Result[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });

      const entryIdStr = localStorage.getItem("entryId");

      // FOR DEMO/DEVELOPMENT: If no entryId, we simulate finding multiple results
      if (!entryIdStr && !results) {
        setTimeout(() => {
          setResults([
            { id: 1, questionnaireType: "GAD-7", totalScore: 12, created_at: new Date().toISOString()  },
            { id: 2, questionnaireType: "Work-Stress", totalScore: 22, created_at: new Date().toISOString()  },
            { id: 3, questionnaireType: "EPDS", totalScore: 8, created_at: new Date().toISOString()  }
          ]);
          setLoading(false);
        }, 1000);
        return;
      }

      const entryId = Number(entryIdStr);
      fetch(`/api/get-results?entryId=${entryId}`)
        .then(res => res.json())
        .then(data => {
          if (data.results && Array.isArray(data.results)) {
            setResults(data.results);
          } else if (data.result) {
            setResults(Array.isArray(data.result) ? data.result : [data.result]);
          } else {
            setResults([]);
          }
        })
        .catch(err => {
          console.error(err);
          setResults([]);
        })
        .finally(() => setLoading(false));
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-6rem)] flex flex-col justify-center items-center bg-gray-50">
        <div className="relative w-20 h-20 mb-4">
          <div className="absolute inset-0 rounded-full border-4 border-gray-200"></div>
          <div
            className="absolute inset-0 rounded-full border-4 border-t-transparent animate-spin"
            style={{ borderColor: "var(--primary, #0094cf)", borderTopColor: 'transparent' }}
          ></div>
        </div>
        <p className="text-gray-500 font-medium animate-pulse tracking-wide uppercase text-xs">Analyzing all assessments...</p>
      </div>
    );
  }

  if (!results || results.length === 0) {
    return (
      <div className="min-h-[calc(100vh-6rem)] flex flex-col justify-center items-center bg-gray-50 px-6">
        <div className="bg-white p-12 rounded-[2.5rem] shadow-xl shadow-gray-200 border border-gray-100 text-center max-w-lg">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-300">
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-3">No results found</h1>
          <p className="text-gray-500 mb-8 leading-relaxed">We couldn't find any completed assessments for this session.</p>
          <button
            onClick={() => window.location.href = '/'}
            className="px-8 py-3.5 rounded-2xl font-bold text-white shadow-lg transition-transform hover:scale-105"
            style={{ background: `linear-gradient(135deg, var(--primary, #0094cf), var(--secondary, #9c2790))` }}
          >
            Start Assessment
          </button>
        </div>
      </div>
    );
  }

  // // Filter results to only latest entry per questionnaireType
  // const latestResults = results.reduce((acc: Result[], curr) => {
  //   const existingIndex = acc.findIndex(r => r.questionnaireType === curr.questionnaireType);
  //   if (existingIndex === -1) {
  //     acc.push(curr);
  //   } else {
  //     if (curr.id > acc[existingIndex].id) {
  //       acc[existingIndex] = curr;
  //     }
  //   }
  //   return acc;
  // }, []);

  return (
    <div className="min-h-screen bg-gray-50/50 pb-20 overflow-x-hidden">
      <div
        className="w-full h-80 relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, var(--primary, #0094cf) 0%, var(--secondary, #9c2790) 100%)` }}
      >
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d="M0 100 C 20 0 50 0 100 100 Z" fill="white" />
          </svg>
        </div>
        <div className="relative z-10 flex flex-col items-center justify-center h-full px-6 pt-10 text-center">
          <div className="bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full text-white text-[16px] font-bold uppercase tracking-[0.2em] mb-4 border border-white/30">
            Comprehensive Analysis
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight drop-shadow-sm">
            Assessment Results
          </h1>
          <p className="text-white/80 mt-4 max-w-xl text-lg font-medium leading-relaxed">
            A complete overview of all assessments completed for this entry.
          </p>
        </div>
      </div>
         {/*cards*/ }
         <div className="max-w-full sm:max-w-6xl mx-auto px-8 sm:px-8 -mt-6 sm:mt-10 relative z-20">
        <div className="space-y-6">
          {results.map((r, index) => {
            const date = new Date(r.created_at);
            const formattedDate = date.toLocaleDateString();
            const formattedTime = date.toLocaleTimeString();
            const { classification, color } = getClassificationAndColor(r.questionnaireType, r.totalScore);
            
            const meta = getScoreMeta(r.questionnaireType, r.totalScore);

            return (
              <div
                key={r.id}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 py-10 px-3 sm:py-6 sm:px-4 md:py-12 md:px-8 transition-all hover:shadow-md animate-in fade-in slide-in-from-bottom-4 duration-500"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex flex-col md:flex-row items-center md:items-start gap-2 sm:gap-4 overflow-visible">
                  {/* Left Column: Score Dial */}
                  <div className="relative flex items-center justify-center shrink-0 mx-auto md:mx-0 mt-6 sm:mt-0">
                {/* Dial container: large on mobile */}
              <div className="relative w-44 h-44 sm:w-32 sm:h-32 md:w-32 md:h-32 flex items-center justify-center">
                <svg
                  viewBox="0 0 128 128"   // responsive viewBox
                  className="w-full h-full transform -rotate-90"
                >
              {/* Background circle */}
              <circle
                cx="64"
                cy="64"
                r="58"
                stroke="#f3f4f6"
                strokeWidth="8"
                fill="transparent"
              />
              {/* Progress circle */}
              <circle
                cx="64"
                cy="64"
                r="58"
                stroke="currentColor"
                strokeWidth="12"
                fill="transparent"
                strokeDasharray={364.4}
                strokeDashoffset={
                mounted ? 364.4 - (364.4 * (meta?.percentage || 0)) / 100 : 364.4
                }
                strokeLinecap="round"
                className={`transition-all duration-1000 ease-out ${color}`}
              />
                </svg>

              {/* Score in center */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center">
                <span className="text-3xl sm:text-2xl md:text-3xl font-bold text-gray-900 leading-none">
                  {r.totalScore}
                </span>
                <span className="text-[14px] font-extrabold text-gray-600 uppercase tracking-wider mt-1">
                  Total
                </span>
              </div>
            </div>
          </div>
                  {/* Right Column: Information & Spectrum */}
                  <div className="flex-1 w-full">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                      <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-gray-900">
                        {r.questionnaireType}
                        </h2>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold border ${color} bg-white shadow-sm`}>
                        {classification}
                      </span>
                      <span className="text-lg text-black-900 mt-1">
                        {formattedDate} • {formattedTime}
                      </span>
                    </div>

                    <p className="text-gray-500 text- font-medium mb-6">
                      Your score of <span className="font-bold text-gray-800">{r.totalScore}</span> falls within the <span className={`${color} font-bold`}>{classification.toLowerCase()}</span> range.
                    </p>

                    {/* Horizontal Spectrum Graph */}

                    <div className="flex justify-between items-center text-sm font-bold text-gray-400 uppercase tracking-widest">
                      <span>Severity Spectrum</span>
                      <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-600">Scale: 0 - {meta?.maxScore}</span>
                    </div>

                    <div className="relative h-6 w-full mt-10 group">
                      {/* Background Segments */}
                      <div className="absolute inset-0 flex h-3 my-auto bg-gray-100 rounded-full overflow-hidden">
                        {meta?.ranges.map((range: any, idx: number) => {
                          const prevMax = idx === 0 ? 0 : meta.ranges[idx - 1].max;
                          const rangeWidth = ((range.max - prevMax) / meta.maxScore) * 100;
                          const getHex = (cls: string) => {
                            if (cls.includes('green')) return '#22c55e';
                            if (cls.includes('yellow')) return '#facc15';
                            if (cls.includes('orange')) return '#f97316';
                            if (cls.includes('red')) return '#ef4444';
                            return '#94a3b8';
                          };

                          return (
                            <div
                              key={idx}
                              className="h-full border-x-2 border-white last:border-0 opacity-40"
                              style={{ width: `${rangeWidth}%`, backgroundColor: getHex(range.color) }}
                            />
                          );
                        })}
                      </div>

                      {/* User Location Marker */}
                      <div
                        className="absolute h-full z-10 flex flex-col items-center transition-all duration-700 ease-in-out"
                        style={{ left: mounted ? `${meta?.percentage}%` : '0%', transform: 'translateX(-50%)' }}
                      >
                        <div className="w-1 h-full bg-gray-900 rounded-full shadow-sm relative">
                          <div className="absolute -top-9 -left-8  bg-gray-900 text-white text-[12px] font-bold px-2 py-1 rounded whitespace-nowrap">
                            Score:{r.totalScore}
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Labels */}
                    <div className="flex justify-between w-full items-center px-2 mt-2 text-[13px] font-bold text-gray-400">

                      <div className="hidden sm:flex  justify-between w-full">
                        {meta?.ranges.map((range: any, idx: number) => (
                          <span key={idx} className={`${range.color} opacity-70`}>{range.classification}</span>
                        ))}
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ResultPage;