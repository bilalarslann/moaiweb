import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const coin = searchParams.get('coin');

  if (!coin) {
    return NextResponse.json({ error: 'Coin parametresi gerekli' }, { status: 400 });
  }

  try {
    // Python scriptini çalıştır
    const { stdout, stderr } = await execAsync(`python scripts/scrape_news.py ${coin}`);
    
    if (stderr) {
      console.error('Script error:', stderr);
      return NextResponse.json({ error: 'Haber çekme işlemi başarısız' }, { status: 500 });
    }

    // JSON string'i parse et
    const newsData = JSON.parse(stdout);
    return NextResponse.json(newsData);
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Bir hata oluştu' }, { status: 500 });
  }
} 