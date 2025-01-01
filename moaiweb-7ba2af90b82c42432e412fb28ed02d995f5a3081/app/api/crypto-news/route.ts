import { NextResponse } from 'next/server';
import axios from 'axios';

interface NewsItem {
  title: string;
  content: string;
}

const COIN_ID_MAP: { [key: string]: string } = {
  bitcoin: 'bitcoin',
  ethereum: 'ethereum',
  arbitrum: 'arbitrum',
  solana: 'solana',
  avalanche: 'avalanche-2',
  cardano: 'cardano',
  polkadot: 'polkadot'
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const coin = searchParams.get('coin')?.toLowerCase();

  if (!coin || !COIN_ID_MAP[coin]) {
    return NextResponse.json({ error: 'Geçersiz coin parametresi' }, { status: 400 });
  }

  try {
    // CoinGecko API'sini kullan
    const coinId = COIN_ID_MAP[coin];
    const [priceResponse, infoResponse] = await Promise.all([
      axios.get(`https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true&include_last_updated_at=true`),
      axios.get(`https://api.coingecko.com/api/v3/coins/${coinId}?localization=false&tickers=false&community_data=false&developer_data=false`)
    ]);

    const priceData = priceResponse.data[coinId];
    const coinInfo = infoResponse.data;

    const news: NewsItem[] = [
      {
        title: 'Güncel Fiyat ve Değişim',
        content: `Şu anki fiyat: $${priceData.usd.toFixed(2)}\n24 saatlik değişim: ${priceData.usd_24h_change.toFixed(2)}%`
      },
      {
        title: 'Piyasa Bilgisi',
        content: `Piyasa Değeri Sıralaması: #${coinInfo.market_cap_rank}\nPiyasa Değeri: $${coinInfo.market_data.market_cap.usd.toLocaleString()}`
      }
    ];

    if (coinInfo.description?.en) {
      news.push({
        title: 'Coin Hakkında',
        content: coinInfo.description.en.slice(0, 500) + '...'
      });
    }

    return NextResponse.json(news);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Coin verileri alınamadı' }, { status: 500 });
  }
} 