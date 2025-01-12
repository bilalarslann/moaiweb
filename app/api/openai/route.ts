import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function POST(req: Request) {
  try {
    // Validate request body
    let body;
    try {
      body = await req.json();
    } catch (e) {
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }

    if (!body.messages || !Array.isArray(body.messages)) {
      return NextResponse.json({ error: 'Missing or invalid messages array' }, { status: 400 });
    }

    // Validate model
    const model = body.model || "gpt-3.5-turbo";
    const temperature = parseFloat(body.temperature) || 0.7;
    const max_tokens = parseInt(body.max_tokens) || 1000;

    // Make OpenAI API call
    const completion = await openai.chat.completions.create({
      model,
      messages: body.messages,
      temperature,
      max_tokens,
      response_format: body.response_format || undefined
    });

    if (!completion.choices || !completion.choices[0]?.message) {
      throw new Error('Invalid response from OpenAI API');
    }

    // Return minimal response structure
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
    
    // Simplified error response
    return NextResponse.json({
      error: error.message || 'Internal server error'
    }, {
      status: error.status || 500
    });
  }
} 