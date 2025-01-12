# Analyst MOAI 🗿

A sophisticated AI-powered crypto market analyst built with Next.js and Solana Web3. The application provides real-time technical analysis, price predictions, and market insights for cryptocurrency traders.

## Features

- 🤖 AI-powered technical analysis using GPT-4
- 📊 Real-time TradingView charts integration
- 💎 Solana wallet integration (Phantom & Solflare)
- 🔒 Token-gated access (requires MOAI token holdings)
- 🌐 Multi-language support (English & Turkish)
- ⚡ Real-time market data from multiple sources
- 🛡️ Rate limiting and DDoS protection
- 📱 Responsive design for all devices

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Solana Web3.js
- OpenAI GPT-4
- TradingView Charts
- Upstash Redis
- Tailwind CSS

## Prerequisites

- Node.js 18+
- npm or yarn
- Solana wallet (Phantom or Solflare)
- Required API keys (see below)

## Required API Keys

You'll need the following API keys:

- OpenAI API Key
- Upstash Redis REST URL and Token

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
OPENAI_API_KEY=your_openai_api_key
UPSTASH_REDIS_REST_URL=your_upstash_redis_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_token
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW_MS=900000
```

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/analyst-moai.git
cd analyst-moai
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Run the development server:
```bash
npm run dev
# or
yarn dev
```

4. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Security Features

- Server-side API key protection
- Rate limiting with Redis
- IP-based request tracking
- Input validation and sanitization
- Secure wallet connection handling
- Token-gated access control

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License

[MIT](https://choosealicense.com/licenses/mit/)

## Disclaimer

This project is for educational purposes only. Trading cryptocurrencies involves substantial risk and is not suitable for every investor.
