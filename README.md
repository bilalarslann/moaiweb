# MOAI Web

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
- Copy `.env.example` to `.env`
- Fill in the required environment variables

3. Set up prompts:
- Copy `config/prompts.template.json` to `config/prompts.json`
- Customize the prompts in `prompts.json` as needed
- Note: `prompts.json` is gitignored to keep your prompts private

4. Run the development server:
```bash
npm run dev
```

## Environment Variables

Required environment variables:
- `NEXT_PUBLIC_OPENAI_API_KEY`: Your OpenAI API key
- `NEXT_PUBLIC_COINGECKO_API_KEY`: Your CoinGecko API key
- Other variables as specified in `.env.example`

## Project Structure

- `app/`: Next.js app directory
  - `analyst-moai/`: Analyst MOAI page
  - `journalist-moai/`: Journalist MOAI page
- `config/`: Configuration files
  - `prompts.template.json`: Template for AI prompts
  - `prompts.json`: Your customized prompts (gitignored)
- `types/`: TypeScript type definitions
