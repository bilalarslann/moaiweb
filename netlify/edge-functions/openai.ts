import { Context } from '@netlify/edge-functions';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async (request: Request, context: Context) => {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await request.json();
    const { messages } = body;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages,
    });

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('OpenAI Error:', error);
    return new Response(JSON.stringify({ error: 'OpenAI API Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}; 