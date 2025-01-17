const CryptoJS = require('crypto-js');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { randomBytes } = require('crypto');

// .env dosyasını yükle
dotenv.config();

// Güvenli bir şifreleme anahtarı oluştur
const ENCRYPTION_KEY = randomBytes(32).toString('hex');
console.log('Generated encryption key:', ENCRYPTION_KEY);
console.log('Please save this key as NEXT_PUBLIC_ENCRYPTION_KEY in your Netlify environment variables');

// Orijinal prompts
const prompts = {
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
  suggestions: {
    en: `${process.env.PROMPT_SUGGESTIONS_SYSTEM_EN}\n\n${process.env.PROMPT_SUGGESTIONS_RULES_EN}\n\n${process.env.PROMPT_SUGGESTIONS_FORMAT_EN}`,
    tr: `${process.env.PROMPT_SUGGESTIONS_SYSTEM_TR}\n\n${process.env.PROMPT_SUGGESTIONS_RULES_TR}\n\n${process.env.PROMPT_SUGGESTIONS_FORMAT_TR}`
  },
  translation: {
    en: `${process.env.PROMPT_TRANSLATE_SYSTEM_EN}\n\n${process.env.PROMPT_TRANSLATE_RULES_EN}\n\n${process.env.PROMPT_TRANSLATE_FORMAT_EN}`,
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

// Prompts'ları şifrele
const encryptedPrompts = {};

for (const [key, value] of Object.entries(prompts)) {
  encryptedPrompts[key] = {};
  if (typeof value === 'object') {
    for (const [lang, text] of Object.entries(value)) {
      encryptedPrompts[key][lang] = CryptoJS.AES.encrypt(text || '', ENCRYPTION_KEY).toString();
    }
  }
}

// Şifrelenmiş prompts'ları data.ts dosyasına yaz
const outputPath = path.join(process.cwd(), 'config', 'prompts', 'data.ts');
const outputContent = `export const encryptedPrompts = ${JSON.stringify(encryptedPrompts, null, 2)};`;

fs.writeFileSync(outputPath, outputContent);
console.log('Prompts encrypted and saved to data.ts'); 