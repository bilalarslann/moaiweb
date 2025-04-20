import { URL } from 'url';

// Güvenli karakter listesi
const SAFE_CHARS = /^[a-zA-Z0-9\-._~:/?#[\]@!$&'()*+,;=]*$/;

// XSS koruması için input temizleme - gelişmiş versiyon
export const sanitizeInput = (input: string | unknown): string => {
  if (typeof input !== 'string') {
    return '';
  }

  return input
    .replace(/[&<>"'`/]/g, (char) => {
      const entities: { [key: string]: string } = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '`': '&#96;',
        '/': '&#x2F;'
      };
      return entities[char];
    })
    .replace(/javascript:/gi, '')
    .replace(/data:/gi, '')
    .replace(/vbscript:/gi, '')
    .replace(/expression\(/gi, '')
    .replace(/onload/gi, '')
    .replace(/onerror/gi, '')
    .replace(/onclick/gi, '')
    .replace(/onmouseover/gi, '')
    .replace(/onfocus/gi, '')
    .replace(/onblur/gi, '')
    .replace(/onkeyup/gi, '')
    .replace(/onkeydown/gi, '')
    .replace(/onkeypress/gi, '')
    .replace(/onchange/gi, '')
    .replace(/onsubmit/gi, '')
    .replace(/onreset/gi, '')
    .replace(/onselect/gi, '')
    .replace(/onabort/gi, '')
    .trim();
};

// SQL Injection koruması - gelişmiş versiyon
export const sanitizeSQLInput = (input: string | unknown): string => {
  if (typeof input !== 'string') {
    return '';
  }

  return input
    .replace(/'/g, "''")
    .replace(/\\/g, '\\\\')
    .replace(/\x00/g, '\\0')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\x1a/g, '\\Z')
    .replace(/;/g, '')
    .replace(/--/g, '')
    .replace(/\/\*/g, '')
    .replace(/\*\//g, '')
    .replace(/xp_/gi, '')
    .replace(/union/gi, '')
    .replace(/select/gi, '')
    .replace(/insert/gi, '')
    .replace(/update/gi, '')
    .replace(/delete/gi, '')
    .replace(/drop/gi, '')
    .replace(/exec/gi, '')
    .trim();
};

// URL güvenlik kontrolü
export const validateURL = (url: string): boolean => {
  try {
    const parsedUrl = new URL(url);
    
    // Protokol kontrolü
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return false;
    }

    // Hostname kontrolü
    const allowedDomains = [
      'api.coingecko.com',
      'pro-api.coingecko.com',
      'api.openai.com',
      's3.tradingview.com'
    ];
    
    if (!allowedDomains.includes(parsedUrl.hostname)) {
      return false;
    }

    // Path ve query kontrolü
    if (!SAFE_CHARS.test(parsedUrl.pathname + parsedUrl.search)) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
};

// Coin sembolü doğrulama - gelişmiş versiyon
export const validateCoinSymbol = (symbol: string | unknown): boolean => {
  if (typeof symbol !== 'string') {
    return false;
  }

  // Sadece izin verilen karakterler ve uzunluk kontrolü
  const symbolRegex = /^[A-Za-z0-9\-]{2,15}$/;
  if (!symbolRegex.test(symbol)) {
    return false;
  }

  // Yasaklı kelimeler kontrolü
  const blacklistedWords = [
    'admin',
    'root',
    'system',
    'config',
    'script',
    'alert',
    'console'
  ];

  return !blacklistedWords.some(word => 
    symbol.toLowerCase().includes(word.toLowerCase())
  );
};

// Query parametrelerini doğrulama - gelişmiş versiyon
export const validateQueryParams = (params: string | unknown): boolean => {
  if (typeof params !== 'string') {
    return false;
  }

  try {
    const queryParams = new URLSearchParams(params);
    const allowedParams = new Set([
      'vs_currency',
      'days',
      'interval',
      'localization',
      'tickers',
      'market_data',
      'community_data',
      'developer_data',
      'sparkline'
    ]);

    const allowedValues = {
      vs_currency: /^[a-z]{2,5}$/,
      days: /^[1-9][0-9]{0,3}$/,
      interval: /^(daily|hourly|minutely)$/,
      localization: /^(true|false)$/,
      tickers: /^(true|false)$/,
      market_data: /^(true|false)$/,
      community_data: /^(true|false)$/,
      developer_data: /^(true|false)$/,
      sparkline: /^(true|false)$/
    };

    // Parametre sayısı kontrolü
    if (queryParams.toString().length > 1000) {
      return false;
    }

    let isValid = true;
    queryParams.forEach((value, key) => {
      // Parametre adı kontrolü
      if (!allowedParams.has(key)) {
        isValid = false;
        return;
      }

      // Parametre değeri kontrolü
      const valueRegex = allowedValues[key as keyof typeof allowedValues];
      if (!valueRegex?.test(value)) {
        isValid = false;
        return;
      }

      // Maksimum değer uzunluğu kontrolü
      if (value.length > 100) {
        isValid = false;
        return;
      }
    });

    return isValid;
  } catch {
    return false;
  }
};

// API yanıtlarını doğrulama - gelişmiş versiyon
export const validateApiResponse = (data: unknown): boolean => {
  if (!data || typeof data !== 'object') {
    return false;
  }

  // Hata yanıtlarını kontrol et
  if ('error' in data) {
    return false;
  }

  try {
    // Maksimum boyut kontrolü
    const dataSize = new TextEncoder().encode(JSON.stringify(data)).length;
    if (dataSize > 10 * 1024 * 1024) { // 10MB
      return false;
    }

    // Zorunlu alanları kontrol et
    const requiredFields = ['id', 'symbol', 'name'];
    for (const field of requiredFields) {
      if (!(field in data)) {
        return false;
      }
    }

    // Veri tiplerini kontrol et
    const typedData = data as Record<string, unknown>;
    if (
      typeof typedData.id !== 'string' ||
      typeof typedData.symbol !== 'string' ||
      typeof typedData.name !== 'string'
    ) {
      return false;
    }

    // Maksimum string uzunluğu kontrolü
    const MAX_STRING_LENGTH = 1000;
    if (
      typedData.id.length > MAX_STRING_LENGTH ||
      typedData.symbol.length > MAX_STRING_LENGTH ||
      typedData.name.length > MAX_STRING_LENGTH
    ) {
      return false;
    }

    // Recursive olarak iç içe objeleri kontrol et
    const checkNestedObjects = (obj: Record<string, unknown>, depth = 0): boolean => {
      if (depth > 5) return false; // Maksimum derinlik kontrolü

      for (const value of Object.values(obj)) {
        if (typeof value === 'object' && value !== null) {
          if (!checkNestedObjects(value as Record<string, unknown>, depth + 1)) {
            return false;
          }
        }
      }
      return true;
    };

    return checkNestedObjects(data as Record<string, unknown>);
  } catch {
    return false;
  }
};

// Dosya yükleme güvenliği - gelişmiş versiyon
export const validateFileUpload = (file: File): boolean => {
  // Dosya boyutu kontrolü
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  if (!file || file.size > MAX_FILE_SIZE) {
    return false;
  }

  // Dosya tipi kontrolü
  const allowedTypes = new Set([
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf'
  ]);

  if (!allowedTypes.has(file.type)) {
    return false;
  }

  // Dosya adı kontrolü
  const filename = file.name.toLowerCase();
  const forbiddenExtensions = [
    '.exe', '.dll', '.so', '.sh', '.bat', '.cmd', '.msi',
    '.vbs', '.js', '.php', '.py', '.pl', '.rb', '.asp'
  ];

  if (forbiddenExtensions.some(ext => filename.endsWith(ext))) {
    return false;
  }

  // Dosya adı uzunluğu kontrolü
  if (filename.length > 255) {
    return false;
  }

  return true;
}; 