import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// Initialize OpenAI with API key from environment variable
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
  dangerouslyAllowBrowser: false
});

// Configure for Edge runtime
export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    // Parse request body
    const body = await req.json();

    // Validate request
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key is not configured' },
        { status: 500 }
      );
    }

    if (!body.messages || !Array.isArray(body.messages)) {
      return NextResponse.json(
        { error: 'Missing or invalid messages array' },
        { status: 400 }
      );
    }

    // Make OpenAI API call
    const completion = await openai.chat.completions.create({
      model: body.model || "gpt-3.5-turbo",
      messages: body.messages,
      temperature: body.temperature || 0.7,
      max_tokens: body.max_tokens || 1000,
      response_format: body.response_format || undefined
    });

    // Return response
    return NextResponse.json({
      choices: [{
        message: {
          role: completion.choices[0].message.role,
          content: completion.choices[0].message.content
        }
      }]
    });

  } catch (error: any) {
    console.error('OpenAI API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.status || 500 }
    );
  }
} 