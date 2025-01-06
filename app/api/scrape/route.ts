import { NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Call the Netlify function
    const response = await axios.post('/.netlify/functions/scrape-news', body);
    
    return NextResponse.json(response.data);
  } catch (error) {
    console.error('Error in scrape route:', error);
    return NextResponse.json(
      { error: 'Failed to scrape news' },
      { status: 500 }
    );
  }
} 