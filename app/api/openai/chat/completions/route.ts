import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const MOAI_BOT_TOKEN = process.env.MOAI_BOT_TOKEN;

export async function POST(req: Request) {
  try {
    // Check for MOAI_BOT_TOKEN
    const authHeader = req.headers.get('x-internal-request');
    if (!authHeader || authHeader !== 'true') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { messages, model = "gpt-3.5-turbo", response_format } = await req.json();

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const completion = await openai.chat.completions.create({
      model,
      messages,
      response_format,
    });

    return NextResponse.json({
      content: completion.choices[0].message.content,
    });
  } catch (error: any) {
    console.error('OpenAI API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.status || 500 }
    );
  }
} 