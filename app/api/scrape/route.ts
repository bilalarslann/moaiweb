import { NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('Sending request to Netlify function with body:', body);
    
    // Call the Netlify function
    const response = await axios.post('/.netlify/functions/scrape-news', body);
    
    return NextResponse.json(response.data);
  } catch (error) {
    console.error('Error in scrape route:', error);
    
    // Handle Axios errors
    if (axios.isAxiosError(error)) {
      const errorDetails = error.response?.data || error.message;
      console.error('Axios error details:', errorDetails);
      
      return NextResponse.json(
        { error: 'Failed to scrape news', details: errorDetails },
        { status: error.response?.status || 500 }
      );
    }
    
    // Handle other errors
    return NextResponse.json(
      { error: 'Failed to scrape news', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 