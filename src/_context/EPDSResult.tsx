// app/context/EPDSResultContext.tsx
"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

type EPDSContextType = {
  score: number | null;
  setScore: (score: number) => void;
  showGHQ: boolean
  setShowGHQ: (showGHQ: boolean) => void;
};

const EPDSResultContext = createContext<EPDSContextType | undefined>(undefined);

export const EPDSProvider = ({ children }: { children: ReactNode }) => {
  const [score, setScore] = useState<number | null>(null);
  const [showGHQ, setShowGHQ] = useState(false);

  return (
    <EPDSResultContext.Provider value={{ score, setScore, showGHQ, setShowGHQ }}>
      {children}
    </EPDSResultContext.Provider>
  );
};

export const useEPDSResult = () => {
  const context = useContext(EPDSResultContext);
  if (!context) {
    throw new Error("useEPDSResult must be used within EPDSProvider");
  }
  return context;
};
