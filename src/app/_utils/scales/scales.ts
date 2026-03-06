import { epdsQuestions, urduEpdsQuestions } from "./epdsQuestions";
import { gad7Questions, urduGad7Questions } from "./gad7Questions";
import { ghqQuestions, urduGhqQuestions } from "./ghqQuestions";
import { urduWorkStressQuestions, workStressQuestions } from "./workStressQuestions";

// 1. Define the internal structures
export interface Option {
  Label: string;
  value: number;
}

export interface Question {
  question: string;
  options: Option[];
}

export interface ScaleData {
  type: string;
  questions: Question[];
}

// 2. Define the structure for each Scale Item
export interface ScaleConfig {
  title: string;
  description: string;
  route: string;
  en: ScaleData;
  ur: ScaleData;
}

// 3. Define the Record type using the keys of your scales
export const SCALES_MAP: Record<string, ScaleConfig> = {
  "ghq": {
    title: "GHQ-12",
    description: "General Health Questionnaire",
    route: "/ghq",
    en: ghqQuestions,
    ur: urduGhqQuestions,
  },
  "workStress": {
    title: "Work-Stress",
    description: "The Workplace Stress Scale",
    route: "/workStress",
    en: workStressQuestions,
    ur: urduWorkStressQuestions,
  },
  "epds": {
    title: "EPDS",
    description: "EPDS Questionnaire",
    route: "/epds",
    en: epdsQuestions,
    ur: urduEpdsQuestions,
  },
  "gad7": {
    title: "GAD-7",
    description: "General Anxiety Disorder Screening",
    route: "/gad7",
    en: gad7Questions,
    ur: urduGad7Questions,
  },
};