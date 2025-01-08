import { NextResponse } from 'next/server';
import axios from 'axios';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const response = await axios.get('https://api.coingecko.com/api/v3/coins/list');
    return NextResponse.json(response.data);
  } catch (error) {
    console.error('CoinGecko API Error:', error);
    return NextResponse.json({ error: 'Coin listesi alınamadı' }, { status: 500 });
  }
} 