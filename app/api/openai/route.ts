import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { rateLimit } from '@/lib/rate-limit';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function POST(req: Request) {
  try {
    // Rate limiting
    const limiter = await rateLimit(req);
    if (!limiter.success) {
      return new NextResponse(JSON.stringify({ error: 'Too many requests' }), {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': limiter.limit.toString(),
          'X-RateLimit-Remaining': limiter.remaining.toString(),
          'X-RateLimit-Reset': limiter.reset.toString(),
        },
      });
    }

    // Validate request body
    const body = await req.json();
    if (!body.messages || !Array.isArray(body.messages)) {
      return new NextResponse(JSON.stringify({ error: 'Invalid request body' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Make OpenAI API call
    const completion = await openai.chat.completions.create({
      model: body.model || "gpt-3.5-turbo",
      messages: body.messages,
      temperature: body.temperature || 0.7,
      max_tokens: body.max_tokens || 1000,
    });

    return new NextResponse(JSON.stringify(completion), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('OpenAI API Error:', error);
    return new NextResponse(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
} 