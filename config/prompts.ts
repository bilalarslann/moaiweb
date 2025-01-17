export const prompts = {
  languageDetector: {
    en: process.env.PROMPT_LANG_DETECT_EN || '',
    tr: process.env.PROMPT_LANG_DETECT_TR || ''
  },
  newsEditor: {
    en: process.env.PROMPT_NEWS_EDITOR_EN || '',
    tr: process.env.PROMPT_NEWS_EDITOR_TR || ''
  },
  journalist: {
    en: process.env.PROMPT_JOURNALIST_EN || '',
    tr: process.env.PROMPT_JOURNALIST_TR || ''
  },
  suggestions: {
    en: process.env.PROMPT_SUGGESTIONS_EN || '',
    tr: process.env.PROMPT_SUGGESTIONS_TR || ''
  },
  translation: {
    en: process.env.PROMPT_TRANSLATE_EN || '',
    tr: process.env.PROMPT_TRANSLATE_TR || ''
  },
  newsTranslation: {
    tr: process.env.PROMPT_NEWS_TRANSLATE_TR || ''
  },
  technicalAnalysis: {
    en: process.env.PROMPT_TECH_ANALYSIS_EN || '',
    tr: process.env.PROMPT_TECH_ANALYSIS_TR || ''
  }
}; 