import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// OpenAI client'ı oluştur
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function POST(req: Request) {
  try {
    // İç istek kontrolü
    const isInternalRequest = req.headers.get('x-internal-request') === 'true';
    if (!isInternalRequest) {
      return NextResponse.json({ error: 'Unauthorized request' }, { status: 401 });
    }

    const { messages, model, response_format } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Invalid messages format' },
        { status: 400 }
      );
    }

    try {
      const completion = await openai.chat.completions.create({
        messages,
        model: model || 'gpt-3.5-turbo',
        response_format: response_format,
      });

      return NextResponse.json({
        content: completion.choices[0]?.message?.content
      });
    } catch (openaiError: any) {
      console.error('OpenAI API Error:', openaiError);
      return NextResponse.json(
        { 
          error: 'OpenAI API error',
          details: openaiError.message 
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Server error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error.message 
      },
      { status: 500 }
    );
  }
} 