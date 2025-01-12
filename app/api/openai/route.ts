import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// Validate environment variables
if (!process.env.OPENAI_API_KEY) {
  console.error('OPENAI_API_KEY is not set in environment variables');
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  dangerouslyAllowBrowser: false
});

export const config = {
  runtime: 'edge',
  regions: ['iad1'], // US East (N. Virginia)
};

export async function POST(req: Request) {
  // Add CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
  };

  // Handle OPTIONS request for CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers, status: 204 });
  }

  try {
    // Validate request body
    let body;
    try {
      body = await req.json();
    } catch (e) {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }), 
        { status: 400, headers }
      );
    }

    if (!body.messages || !Array.isArray(body.messages)) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid messages array' }), 
        { status: 400, headers }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key is not configured' }), 
        { status: 500, headers }
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

    // Validate response
    if (!completion.choices?.[0]?.message) {
      throw new Error('Invalid response from OpenAI API');
    }

    // Return response
    return new Response(
      JSON.stringify({
        choices: [{
          message: {
            role: completion.choices[0].message.role,
            content: completion.choices[0].message.content
          }
        }]
      }),
      { status: 200, headers }
    );

  } catch (error: any) {
    console.error('OpenAI API Error:', error);

    // Handle different types of errors
    let status = 500;
    let message = 'Internal server error';

    if (error.response) {
      status = error.response.status;
      message = error.response.data?.error?.message || error.message;
    } else if (error.message) {
      message = error.message;
    }

    return new Response(
      JSON.stringify({ error: message }),
      { status, headers }
    );
  }
} 