export interface Prompts {
  languageDetector: {
    en: string;
    tr: string;
  };
  journalist: {
    en: string;
    tr: string;
  };
  suggestions: {
    en: string;
    tr: string;
  };
  translation: {
    en: string;
    tr: string;
  };
  newsEditor: {
    en: string;
    tr: string;
  };
  analyst: {
    en: {
      questionAnalysisPrompt: string;
      analysisPrompt: string;
    };
    tr: {
      questionAnalysisPrompt: string;
      analysisPrompt: string;
    };
  };
  technicalAnalysis: {
    en: string;
    tr: string;
  };
} 