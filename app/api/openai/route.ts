import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function POST(req: Request) {
  try {
    // Validate request body
    const body = await req.json();
    if (!body.messages || !Array.isArray(body.messages)) {
      return NextResponse.json({ error: 'Invalid request body' }, {
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

    // Extract and format the response
    const formattedResponse = {
      choices: completion.choices.map(choice => ({
        message: {
          role: choice.message.role,
          content: choice.message.content
        },
        finish_reason: choice.finish_reason,
        index: choice.index
      })),
      created: completion.created,
      model: completion.model,
      usage: completion.usage
    };

    return NextResponse.json(formattedResponse, {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('OpenAI API Error:', error);
    
    // Format error response
    const errorResponse = {
      error: error.message || 'Internal server error',
      details: error.response?.data || null
    };

    return NextResponse.json(errorResponse, {
      status: error.status || 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
} 