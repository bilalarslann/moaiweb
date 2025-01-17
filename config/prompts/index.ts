import { encryptedPrompts } from './data';

const CryptoJS = require('crypto-js');

const ENCRYPTION_KEY = process.env.NEXT_PUBLIC_ENCRYPTION_KEY || 'default-key';

function decryptText(encryptedText: string): string {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedText, ENCRYPTION_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error('Error decrypting prompt:', error);
    return '';
  }
}

export const prompts = {
  languageDetector: {
    en: decryptText(encryptedPrompts.languageDetector.en),
    tr: decryptText(encryptedPrompts.languageDetector.tr)
  },
  newsEditor: {
    en: decryptText(encryptedPrompts.newsEditor.en),
    tr: decryptText(encryptedPrompts.newsEditor.tr)
  },
  journalist: {
    en: decryptText(encryptedPrompts.journalist.en),
    tr: decryptText(encryptedPrompts.journalist.tr)
  },
  suggestions: {
    en: decryptText(encryptedPrompts.suggestions.en),
    tr: decryptText(encryptedPrompts.suggestions.tr)
  },
  translation: {
    en: decryptText(encryptedPrompts.translation.en),
    tr: decryptText(encryptedPrompts.translation.tr)
  },
  newsTranslation: {
    tr: decryptText(encryptedPrompts.newsTranslation.tr)
  },
  technicalAnalysis: {
    en: decryptText(encryptedPrompts.technicalAnalysis.en),
    tr: decryptText(encryptedPrompts.technicalAnalysis.tr)
  }
}; 