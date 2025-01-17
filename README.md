# MOAI AI Assistant Platform

MOAI is an AI-powered platform featuring multiple specialized assistants for cryptocurrency analysis and news tracking.

## Features

- **Journalist MOAI**: Real-time crypto news aggregator and analyzer
- **Analyst MOAI**: Technical analysis and price prediction assistant
- **Secure API Gateway**: Rate-limited and protected API proxy
- **TradingView Integration**: Real-time charts and technical analysis tools
- **Multi-language Support**: English and Turkish language support
- **Token-gated Access**: Exclusive features for MOAI token holders

## Tech Stack

- Next.js 14
- TypeScript
- Express.js
- OpenAI API
- CoinGecko API
- TradingView Widget
- Solana Web3.js

## Prerequisites

- Node.js >= 18
- NPM or Yarn
- Solana Wallet (Phantom or Solflare)

## Environment Variables

Create `.env` files in both root and api-gateway directories:

Root `.env`:
```env
NEXT_PUBLIC_TRADINGVIEW_SCRIPT_HASH=your_hash
```

API Gateway `.env`:
```env
PORT=3005
ALLOWED_ORIGINS=http://localhost:3000
OPENAI_API_KEY=your_openai_key
```

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/moai.git
cd moai
```

2. Install dependencies:
```bash
# Install frontend dependencies
npm install

# Install API Gateway dependencies
cd api-gateway
npm install
```

3. Start the development servers:
```bash
# Start API Gateway (in api-gateway directory)
npm run dev

# Start Next.js frontend (in root directory)
npm run dev
```

4. Open http://localhost:3000 in your browser

## Security Features

- API Key encryption and rotation
- Rate limiting
- CORS protection
- XSS prevention
- Input validation
- JWT authentication
- Security headers
- Origin validation

## Deployment

The project is configured for deployment on Netlify with environment variables set in the Netlify dashboard.

## License

MIT License - see LICENSE file for details
