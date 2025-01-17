export const prompts = {
  languageDetector: {
    en: `${process.env.PROMPT_LANG_DETECT_SYSTEM_EN}\n\n${process.env.PROMPT_LANG_DETECT_RULES_EN}`,
    tr: `${process.env.PROMPT_LANG_DETECT_SYSTEM_TR}\n\n${process.env.PROMPT_LANG_DETECT_RULES_TR}`
  },
  newsEditor: {
    en: `${process.env.PROMPT_NEWS_EDITOR_SYSTEM_EN}\n\n${process.env.PROMPT_NEWS_EDITOR_RULES_EN}`,
    tr: `${process.env.PROMPT_NEWS_EDITOR_SYSTEM_TR}\n\n${process.env.PROMPT_NEWS_EDITOR_RULES_TR}`
  },
  journalist: {
    en: `${process.env.PROMPT_JOURNALIST_SYSTEM_EN}\n\n${process.env.PROMPT_JOURNALIST_RULES_EN}`,
    tr: `${process.env.PROMPT_JOURNALIST_SYSTEM_TR}\n\n${process.env.PROMPT_JOURNALIST_RULES_TR}`
  },
  translation: {
    tr: `${process.env.PROMPT_TRANSLATE_SYSTEM_TR}\n\n${process.env.PROMPT_TRANSLATE_RULES_TR}\n\n${process.env.PROMPT_TRANSLATE_FORMAT_TR}`
  },
  newsTranslation: {
    tr: `${process.env.PROMPT_NEWS_TRANSLATE_SYSTEM_TR}\n\n${process.env.PROMPT_NEWS_TRANSLATE_RULES_TR}\n\n${process.env.PROMPT_NEWS_TRANSLATE_FORMAT_TR}`
  },
  technicalAnalysis: {
    en: `${process.env.PROMPT_TECH_ANALYSIS_SYSTEM_EN}\n\n${process.env.PROMPT_TECH_ANALYSIS_RULES_EN}`,
    tr: `${process.env.PROMPT_TECH_ANALYSIS_SYSTEM_TR}\n\n${process.env.PROMPT_TECH_ANALYSIS_RULES_TR}`
  }
}; 