import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// Initialize OpenAI with API key from environment variable
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
  dangerouslyAllowBrowser: false
});

// Configure for Edge runtime
export const runtime = 'edge';

// Helper function to create a standardized response
const createResponse = (data: any, status = 200) => {
  return new Response(JSON.stringify({
    statusCode: status,
    body: JSON.stringify(data)
  }), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
};

export async function POST(req: Request) {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return createResponse({}, 204);
  }

  try {
    // Parse request body
    const body = await req.json();

    // Validate request
    if (!process.env.OPENAI_API_KEY) {
      return createResponse({ error: 'OpenAI API key is not configured' }, 500);
    }

    if (!body.messages || !Array.isArray(body.messages)) {
      return createResponse({ error: 'Missing or invalid messages array' }, 400);
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
    return createResponse({
      choices: [{
        message: {
          role: completion.choices[0].message.role,
          content: completion.choices[0].message.content
        }
      }]
    });

  } catch (error: any) {
    console.error('OpenAI API Error:', error);
    
    const errorMessage = error.message || 'Internal server error';
    const statusCode = error.status || 500;
    
    return createResponse({ error: errorMessage }, statusCode);
  }
} 