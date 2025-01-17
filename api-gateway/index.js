const express = require('express');
const cors = require('cors');
const axios = require('axios');
const helmet = require('helmet');
const crypto = require('crypto');
const { promisify } = require('util');
const scrypt = promisify(crypto.scrypt);
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3005;

// Memory stores
const tokenBlacklist = new Set();
const refreshTokens = new Map();

// JWT configuration
const JWT_SECRET = crypto.randomBytes(64).toString('hex');
const JWT_EXPIRES_IN = '1h';
const REFRESH_TOKEN_EXPIRES_IN = '7d';

// API key yönetimi ve güvenliği
const encryptApiKey = async (key) => {
  const salt = crypto.randomBytes(16);
  const derivedKey = await scrypt(key, salt, 32);
  return {
    encrypted: derivedKey.toString('hex'),
    salt: salt.toString('hex')
  };
};

// API anahtarını doğrula
const validateEncryptedApiKey = async (providedKey, encryptedKey, salt) => {
  const derivedKey = await scrypt(providedKey, Buffer.from(salt, 'hex'), 32);
  return crypto.timingSafeEqual(
    Buffer.from(encryptedKey, 'hex'),
    derivedKey
  );
};

// API anahtarlarını güvenli şekilde yükle
const loadApiKeys = async () => {
  const keys = {
    openai: process.env.OPENAI_API_KEY
  };

  // API anahtarlarının varlığını kontrol et
  if (!keys.openai) {
    console.error('OpenAI API key is missing from environment variables');
    process.exit(1);
  }

  // API anahtarlarını şifrele
  const encryptedKeys = {};
  for (const [name, key] of Object.entries(keys)) {
    encryptedKeys[name] = await encryptApiKey(key);
  }

  return encryptedKeys;
};

// API anahtarı rotasyonu için zamanlanmış görev
const rotateApiKeys = async () => {
  console.log('Rotating API keys...');
  encryptedApiKeys = await loadApiKeys();
};

// Her 24 saatte bir API anahtarlarını döndür
setInterval(rotateApiKeys, 24 * 60 * 60 * 1000);

// API anahtarlarını yükle
let encryptedApiKeys;
(async () => {
  encryptedApiKeys = await loadApiKeys();
})();

// Rate limiting ayarları
const createRateLimiter = (options) => rateLimit({
  windowMs: options.windowMs,
  max: options.max,
  message: options.message,
  standardHeaders: true,
  legacyHeaders: false,
  skipFailedRequests: false,
  keyGenerator: (req) => {
    // IP + User Agent + API Key kombinasyonu
    const key = `${req.ip}-${req.headers['user-agent'] || 'unknown'}-${req.headers['x-api-key'] || 'no-key'}`;
    return crypto.createHash('sha256').update(key).digest('hex');
  }
});

// Global rate limiter
const globalLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 dakika
  max: 100,
  message: 'Too many requests, please try again later.'
});

// API endpoint rate limiter
const apiLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000, // 5 dakika
  max: 30,
  message: 'Too many API requests, please try again later.'
});

// Auth endpoint rate limiter
const authLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 saat
  max: 5,
  message: 'Too many authentication attempts, please try again later.'
});

// Güvenlik başlıkları
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'none'"],
      scriptSrc: ["'self'", "https://s3.tradingview.com", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:", "http:"],
      connectSrc: ["'self'", "https://api.coingecko.com", "wss://*.tradingview.com"],
      fontSrc: ["'self'", "https:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'none'"],
      frameSrc: ["'self'", "https://*.tradingview.com"],
      sandbox: ['allow-forms', 'allow-scripts', 'allow-same-origin'],
      upgradeInsecureRequests: [],
      workerSrc: ["'self'"],
      manifestSrc: ["'self'"],
      prefetchSrc: ["'self'"],
      baseUri: ["'none'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      reportUri: '/api/csp-report'
    },
    reportOnly: false
  },
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: { policy: "same-origin" },
  crossOriginResourcePolicy: { policy: "same-origin" },
  dnsPrefetchControl: { allow: false },
  frameguard: { action: "deny" },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  ieNoOpen: true,
  noSniff: true,
  originAgentCluster: true,
  permittedCrossDomainPolicies: { permittedPolicies: "none" },
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  xssFilter: true
}));

// Hide technology stack and version info
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.removeHeader('X-Powered-By');
  res.removeHeader('Server');
  next();
});

// Özel güvenlik başlıkları
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  res.setHeader('Origin-Agent-Cluster', '?1');
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  res.setHeader('X-Download-Options', 'noopen');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  res.setHeader('Permissions-Policy', 'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()');
  next();
});

// CORS ayarları
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = process.env.NODE_ENV === 'production'
      ? [process.env.PRODUCTION_DOMAIN].filter(Boolean)
      : ['http://localhost:3000'];

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS policy violation'));
    }
  },
  methods: ['GET', 'POST'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'x-internal-request'
  ],
  credentials: true,
  maxAge: 3600,
  preflightContinue: false,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));

// CORS pre-flight kontrolü
app.options('*', cors(corsOptions));

app.use(express.json());

// Token blacklist kontrolü
const isTokenBlacklisted = (token) => {
  return tokenBlacklist.has(token);
};

// Token'ı blacklist'e ekle
const blacklistToken = (token, expiresIn) => {
  tokenBlacklist.add(token);
  setTimeout(() => {
    tokenBlacklist.delete(token);
  }, expiresIn * 1000);
};

// Refresh token'ı sakla
const storeRefreshToken = (userId, token, expiresIn) => {
  refreshTokens.set(userId, {
    token,
    expiresAt: Date.now() + (expiresIn * 1000)
  });
  setTimeout(() => {
    refreshTokens.delete(userId);
  }, expiresIn * 1000);
};

// Refresh token'ı kontrol et
const validateRefreshToken = (userId, token) => {
  const storedData = refreshTokens.get(userId);
  if (!storedData) return false;
  if (Date.now() > storedData.expiresAt) {
    refreshTokens.delete(userId);
    return false;
  }
  return storedData.token === token;
};

// JWT token oluşturma
const generateTokens = async (userId) => {
  const accessToken = jwt.sign({ userId }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    algorithm: 'HS512',
    issuer: 'moai-api',
    audience: 'moai-client',
    jwtid: crypto.randomBytes(16).toString('hex')
  });

  const refreshToken = jwt.sign({ userId }, JWT_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRES_IN,
    algorithm: 'HS512',
    issuer: 'moai-api',
    audience: 'moai-client',
    jwtid: crypto.randomBytes(16).toString('hex')
  });

  // Refresh token'ı sakla
  storeRefreshToken(userId, refreshToken, 7 * 24 * 60 * 60); // 7 gün

  return { accessToken, refreshToken };
};

// JWT token doğrulama middleware
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    
    // Token'ı doğrula
    const decoded = jwt.verify(token, JWT_SECRET, {
      algorithms: ['HS512'],
      issuer: 'moai-api',
      audience: 'moai-client'
    });

    // Token blacklist kontrolü
    if (isTokenBlacklisted(token)) {
      return res.status(401).json({ error: 'Token has been revoked' });
    }

    // Kullanıcı bilgilerini request'e ekle
    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ error: 'Token expired' });
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    console.error('Token verification error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Middleware to validate API key and internal requests
const validateApiKey = async (req, res, next) => {
  const origin = req.get('origin');
  const referer = req.get('referer');
  const isInternalRequest = req.get('x-internal-request') === 'true';
  
  try {
    // For internal requests, validate origin
    if (isInternalRequest) {
      const allowedOrigins = process.env.NODE_ENV === 'production'
        ? [process.env.PRODUCTION_DOMAIN]
        : ['http://localhost:3000'];

      if (!allowedOrigins.includes(origin) || !referer?.startsWith(origin)) {
        return res.status(403).json({ error: 'Unauthorized internal request' });
      }
      return next();
    }
    
    // For external requests, validate API key
    const apiKey = req.get('x-api-key');
    if (!apiKey) {
      return res.status(401).json({ error: 'API key is required' });
    }

    // API anahtarını doğrula
    const isValid = await validateEncryptedApiKey(
      apiKey,
      encryptedApiKeys.moaiBot.encrypted,
      encryptedApiKeys.moaiBot.salt
    );

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid API key' });
    }
    
    next();
  } catch (error) {
    console.error('Error validating API key:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Apply the middleware to protected routes
app.use('/api/openai', validateApiKey);
app.use('/api/coingecko', validateApiKey);

// Rate limiter'ları uygula
app.use(globalLimiter);
app.use('/api/', apiLimiter);
app.use('/auth/', authLimiter);

// Origin kontrolü middleware
const checkOrigin = (req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = process.env.NODE_ENV === 'production'
    ? ['https://your-production-domain.com']
    : ['http://localhost:3000'];

  if (!origin || !allowedOrigins.includes(origin)) {
    return res.status(403).json({ 
      error: 'Unauthorized origin',
      message: 'Access denied'
    });
  }

  next();
};

app.use(checkOrigin);

// XSS Protection Middleware
const xssProtection = (req, res, next) => {
  // Request body sanitization
  if (req.body && typeof req.body === 'object') {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        // Remove potential XSS vectors
        req.body[key] = req.body[key]
          .replace(/javascript:/gi, '')
          .replace(/data:/gi, '')
          .replace(/vbscript:/gi, '')
          .replace(/onclick/gi, '')
          .replace(/onload/gi, '')
          .replace(/onerror/gi, '')
          .replace(/onmouseover/gi, '')
          .replace(/<script/gi, '')
          .replace(/eval\(/gi, '');
      }
    });
  }
  next();
};

// Request validation middleware
const validateRequest = (req, res, next) => {
  // Content-Type kontrolü
  if (!req.is('application/json')) {
    return res.status(415).json({ 
      error: 'Unsupported Media Type',
      message: 'Content-Type must be application/json'
    });
  }
  
  // Body kontrolü
  if (!req.body || Object.keys(req.body).length === 0) {
    return res.status(400).json({ 
      error: 'Bad Request',
      message: 'Request body is required'
    });
  }

  // Maximum request size check
  const contentLength = parseInt(req.headers['content-length'] || '0');
  if (contentLength > 1024 * 1024) { // 1MB limit
    return res.status(413).json({
      error: 'Payload Too Large',
      message: 'Request body exceeds size limit'
    });
  }
  
  next();
};

// Apply XSS protection to all routes
app.use(xssProtection);

// OpenAI proxy endpoint'i
app.post('/api/openai/chat/completions', validateApiKey, validateRequest, async (req, res) => {
  try {
    // Request body validation
    const { model, messages, response_format } = req.body;
    
    if (!model || !messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ 
        error: 'Bad Request',
        message: 'Invalid request body format. Required fields: model, messages (array)'
      });
    }
    
    // OpenAI'ya istek yap
    const openaiResponse = await axios.post('https://api.openai.com/v1/chat/completions', req.body, {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    // Response headers
    res.set({
      'X-Request-ID': crypto.randomBytes(16).toString('hex'),
      'X-Response-Time': process.hrtime()[0],
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Surrogate-Control': 'no-store'
    });

    // Direkt olarak cevabı dön
    res.json({
      content: openaiResponse.data.choices[0]?.message?.content
    });
  } catch (error) {
    console.error('OpenAI API Error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: 'OpenAI API error',
      message: error.response?.data?.error?.message || error.message,
      details: error.response?.data || 'Internal server error'
    });
  }
});

// CoinGecko search endpoint'i
app.get('/api/coingecko/search', validateApiKey, async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query) {
      return res.status(400).json({ 
        error: 'Bad Request',
        message: 'Query parameter is required'
      });
    }

    const url = `https://pro-api.coingecko.com/api/v3/search?query=${encodeURIComponent(query)}`;

    const response = await axios.get(url, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'x-cg-pro-api-key': encryptedApiKeys.coingecko.encrypted
      }
    });

    res.json(response.data);
  } catch (error) {
    console.error('CoinGecko Search API Error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: 'CoinGecko Search API error',
      message: error.response?.data?.error || error.message,
      details: error.response?.data || 'Internal server error'
    });
  }
});

// Genel CoinGecko proxy endpoint'i
app.get('/api/coingecko/:endpoint(*)', validateApiKey, async (req, res) => {
  try {
    const { endpoint } = req.params;
    const queryParams = new URLSearchParams(req.query).toString();
    const url = `https://pro-api.coingecko.com/api/v3/${endpoint}${queryParams ? `?${queryParams}` : ''}`;

    const response = await axios.get(url, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'x-cg-pro-api-key': encryptedApiKeys.coingecko.encrypted
      }
    });

    // Rate limit bilgilerini header'lara ekle
    res.set({
      'x-ratelimit-limit': response.headers['x-ratelimit-limit'] || '',
      'x-ratelimit-remaining': response.headers['x-ratelimit-remaining'] || '',
      'x-ratelimit-reset': response.headers['x-ratelimit-reset'] || '',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    res.json(response.data);
  } catch (error) {
    console.error('CoinGecko API Error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: 'CoinGecko API error',
      message: error.response?.data?.error || error.message,
      details: error.response?.data || 'Internal server error'
    });
  }
});

// Health check endpoint'i
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.path}`
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  // Production'da detaylı hata mesajlarını gizle
  const error = process.env.NODE_ENV === 'production'
    ? 'Internal Server Error'
    : err.message;
  
  res.status(500).json({ error });
});

app.listen(port, () => {
  console.log(`API Gateway running on port ${port}`);
  console.log('Security measures enabled:');
  console.log('- CORS protection');
  console.log('- Rate limiting');
  console.log('- API key validation');
  console.log('- Request validation');
  console.log('- Security headers');
  console.log('- Origin validation');
});