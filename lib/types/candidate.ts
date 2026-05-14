// lib/types/candidate.ts

export interface CandidateProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  resumeText: string; // Testo estratto dal CV
  educationLevel?: string; // Es. 'Laurea', 'Diploma', 'Master'
  yearsOfExperience?: number;
  skills: string[];
}

export interface MatchingResult {
  score: number; // 0-100
  breakdown: {
    educationScore: number;
    experienceScore: number;
    keywordScore: number;
  };
  missingKeywords: string[];
  matchedKeywords: string[];
  recommendation: 'Highly Recommended' | 'Recommended' | 'Review' | 'Not Suitable';
}