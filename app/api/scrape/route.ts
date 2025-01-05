import { NextResponse } from 'next/server';

export const maxDuration = 30;
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const body = await request.json();
  
  try {
    const response = await fetch('/.netlify/functions/scrape-news', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (err: any) {
    console.error('Error calling scrape function:', err.message);
    return NextResponse.json({ error: err.message });
  }
} 